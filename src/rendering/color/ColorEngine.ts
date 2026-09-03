/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ColorGrade, ColorWheelValue, HslBand, HslColorGrade } from '../../domain/color/ColorGrade';
import { ToneCurveEvaluator } from './ToneCurveEvaluator';
import { LutEngine } from './LutEngine';
import { GPUColorGradingPass } from '../gpu/GPUColorGradingPass';

/**
 * Professional Studio-Grade Real-Time Color Grading & Image Processing Engine
 *
 * Implements real mathematical color science:
 * - Exposure (Physical 2^EV simulation)
 * - Contrast & S-curve tone mapping
 * - Highlights, Shadows, Whites, Blacks zoning
 * - White Balance (Temperature 2000K-10000K & Tint green/magenta balance)
 * - Saturation & Smart Skin-Tone Protected Vibrance
 * - Global Hue 360° rotation
 * - 8-Band Selective HSL (Red, Orange, Yellow, Green, Cyan, Blue, Purple, Magenta)
 * - Tone Curves (Master RGB, Red, Green, Blue splines)
 * - 4-Way Color Wheels (Lift/Shadows, Gamma/Midtones, Gain/Highlights, Offset/Global)
 * - 3D Look-Up Tables (.cube 3D LUTs with trilinear interpolation)
 * - Unsharp Mask Edge Sharpness & Clarity (Local contrast)
 * - Matte Film Fade (Black pedestal lift)
 * - Procedural 35mm Film Grain
 * - Radial Optical Vignette
 */
export class ColorEngine {
  private static lutEngine = LutEngine.getInstance();

  /**
   * Applies complete color grading pipeline to the target canvas context
   */
  public static applyColorGrade(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    grade: ColorGrade | undefined
  ): void {
    if (!grade || this.isGradeNeutral(grade)) {
      return;
    }

    const hasAdvancedPasses =
      this.hasActiveCurves(grade.curves) ||
      this.hasActiveHsl(grade.hsl) ||
      this.hasActiveColorWheels(grade.wheels) ||
      (grade.lutId && grade.lutEnabled !== false) ||
      (grade.highlights || 0) !== 0 ||
      (grade.shadows || 0) !== 0 ||
      (grade.whites || 0) !== 0 ||
      (grade.blacks || 0) !== 0 ||
      (grade.sharpen || 0) > 0 ||
      (grade.clarity || 0) !== 0 ||
      (grade.vibrance || 0) !== 0 ||
      (grade.temperature || 0) !== 0 ||
      (grade.tint || 0) !== 0 ||
      (grade.hue || 0) !== 0 ||
      (grade.fade || 0) > 0;

    if (hasAdvancedPasses) {
      // 1. Try Hardware-Accelerated WebGL2 GPU Shader Pass first (<0.5ms)
      const gpuPass = GPUColorGradingPass.getInstance();
      let handledByGPU = false;
      if (gpuPass.canAccelerate()) {
        handledByGPU = gpuPass.applyGPUColorGrade(ctx, canvasWidth, canvasHeight, grade);
      }

      // 2. CPU fallback if GPU context lost or unsupported
      if (!handledByGPU) {
        this.applyFullPixelGrading(ctx, canvasWidth, canvasHeight, grade);
      }
    } else {
      // Fast-path hardware-accelerated filter pass for simple light/contrast adjustments
      this.applyFastFilter(ctx, canvasWidth, canvasHeight, grade);
    }

    // Procedural Film Grain Overlay
    if ((grade.grain || 0) > 0.5) {
      this.applyGrain(ctx, canvasWidth, canvasHeight, grade.grain);
    }

    // Optical Vignette
    if ((grade.vignette || 0) > 0.005) {
      this.applyVignette(ctx, canvasWidth, canvasHeight, grade.vignette);
    }
  }

  /**
   * Quick check if the grade is completely at default/neutral values
   */
  public static isGradeNeutral(g: ColorGrade): boolean {
    if (
      (g.exposure || 0) !== 0 ||
      (g.contrast ?? 1.0) !== 1.0 ||
      (g.brightness || 0) !== 0 ||
      (g.brilliance || 0) !== 0 ||
      (g.saturation ?? 1.0) !== 1.0 ||
      (g.vibrance || 0) !== 0 ||
      (g.temperature || 0) !== 0 ||
      (g.tint || 0) !== 0 ||
      (g.hue || 0) !== 0 ||
      (g.highlights || 0) !== 0 ||
      (g.shadows || 0) !== 0 ||
      (g.whites || 0) !== 0 ||
      (g.blacks || 0) !== 0 ||
      (g.sharpen || 0) !== 0 ||
      (g.clarity || 0) !== 0 ||
      (g.fade || 0) !== 0 ||
      (g.vignette || 0) !== 0 ||
      (g.grain || 0) !== 0
    ) {
      return false;
    }

    if (g.lutId && g.lutEnabled !== false) return false;
    if (this.hasActiveColorWheels(g.wheels)) return false;
    if (this.hasActiveCurves(g.curves)) return false;
    if (this.hasActiveHsl(g.hsl)) return false;

    return true;
  }

  /**
   * Fast CSS filter pass when only basic brightness/contrast/saturation are used
   */
  private static applyFastFilter(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    grade: ColorGrade
  ): void {
    const exp = grade.exposure || 0;
    const brightnessVal = Math.max(0, 100 + (grade.brightness || 0) * 100 + exp * 25);
    const contrastVal = Math.max(0, (grade.contrast ?? 1.0) * 100);
    const satVal = Math.max(0, (grade.saturation ?? 1.0) * 100);

    ctx.save();
    ctx.filter = `brightness(${brightnessVal.toFixed(1)}%) contrast(${contrastVal.toFixed(1)}%) saturate(${satVal.toFixed(1)}%)`;
    ctx.drawImage(ctx.canvas, 0, 0, width, height, 0, 0, width, height);
    ctx.restore();
  }

  /**
   * High-Performance Full Precision Pixel Shader & Grading Pipeline
   */
  private static applyFullPixelGrading(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    grade: ColorGrade
  ): void {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const len = data.length;

    // 1. Precompute Tone Curves LUT (Master, R, G, B)
    const curveLuts = grade.curves ? ToneCurveEvaluator.generateCurveLut(grade.curves) : null;

    // 2. Precompute 256-entry Tone Mapping Table for Exposure, Contrast, Brightness, Brilliance, Highlights, Shadows, Whites, Blacks, Fade
    const expMult = Math.pow(2, grade.exposure || 0);
    const contrastVal = grade.contrast ?? 1.0;
    const brightnessOffset = grade.brightness || 0;
    const brAmount = (grade.brilliance || 0) / 100;
    const hlAmount = (grade.highlights || 0) / 100;
    const shAmount = (grade.shadows || 0) / 100;
    const whAmount = (grade.whites || 0) / 100;
    const blAmount = (grade.blacks || 0) / 100;
    const fadeAmount = Math.max(0, Math.min(1, (grade.fade || 0) / 100));

    const toneLut = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      let v = i / 255.0;

      // Exposure
      v = v * expMult;

      // Brightness & Contrast
      v = ((v - 0.5) * contrastVal) + 0.5 + brightnessOffset;

      // Brilliance (lifts midtones & deep shadows with smooth sinus roll-off)
      if (brAmount !== 0) {
        const brCurve = Math.sin(Math.max(0, Math.min(1, v)) * Math.PI);
        v += brAmount * 0.22 * brCurve;
      }

      // Highlights (protects shadows/midtones, affects upper range > 0.5)
      if (hlAmount !== 0 && v > 0.3) {
        const factor = Math.max(0, (v - 0.3) / 0.7);
        v += hlAmount * 0.35 * (factor * factor);
      }

      // Shadows (protects highlights/midtones, affects lower range < 0.7)
      if (shAmount !== 0 && v < 0.7) {
        const factor = Math.max(0, (0.7 - v) / 0.7);
        v += shAmount * 0.35 * (factor * factor);
      }

      // Whites (controls extreme upper range > 0.75)
      if (whAmount !== 0 && v > 0.6) {
        const factor = Math.max(0, (v - 0.6) / 0.4);
        v += whAmount * 0.4 * (factor * factor);
      }

      // Blacks (controls extreme lower range < 0.25)
      if (blAmount !== 0 && v < 0.4) {
        const factor = Math.max(0, (0.4 - v) / 0.4);
        v += blAmount * 0.4 * (factor * factor);
      }

      // Fade (lift black pedestal)
      if (fadeAmount > 0) {
        v = v * (1 - fadeAmount * 0.4) + fadeAmount * 0.18;
      }

      toneLut[i] = Math.max(0, Math.min(1, v));
    }

    // 3. White Balance multipliers (Temperature & Tint)
    const temp = (grade.temperature || 0) / 100; // -1 to 1 (cool to warm)
    const tint = (grade.tint || 0) / 100;       // -1 to 1 (green to magenta)

    const tempR = 1.0 + (temp > 0 ? temp * 0.35 : temp * 0.2);
    const tempG = 1.0 - (tint * 0.25);
    const tempB = 1.0 + (temp < 0 ? -temp * 0.35 : -temp * 0.2) + (tint > 0 ? tint * 0.15 : 0);

    // 4. Saturation, Vibrance & Global Hue parameters
    const sat = grade.saturation ?? 1.0;
    const vibrance = (grade.vibrance || 0) / 100; // -1 to 1
    const hueAngle = ((grade.hue || 0) * Math.PI) / 180; // Radians
    const cosHue = Math.cos(hueAngle);
    const sinHue = Math.sin(hueAngle);

    // 5. 8-Band HSL Pre-checks
    const hasHsl = this.hasActiveHsl(grade.hsl);
    const hslBands = grade.hsl;

    // 6. Color Wheels Parameters
    const wheels = grade.wheels;
    const hasWheels = this.hasActiveColorWheels(wheels);

    // 7. 3D LUT Lookup
    const lut = (grade.lutId && grade.lutEnabled !== false) ? this.lutEngine.getLut(grade.lutId) : undefined;
    const lutIntensity = grade.lutIntensity ?? 1.0;

    // Main Per-Pixel Processing Loop
    for (let i = 0; i < len; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // A. Apply Tone Curves (if active)
      if (curveLuts) {
        r = curveLuts.rLut[r];
        g = curveLuts.gLut[g];
        b = curveLuts.bLut[b];

        r = curveLuts.masterLut[r];
        g = curveLuts.masterLut[g];
        b = curveLuts.masterLut[b];
      }

      // B. Apply Primary Tonal Curve LUT (Exposure, Contrast, Brightness, Highlights, Shadows, Whites, Blacks, Fade)
      let normR = toneLut[r];
      let normG = toneLut[g];
      let normB = toneLut[b];

      // C. White Balance (Temperature & Tint)
      normR = Math.max(0, Math.min(1, normR * tempR));
      normG = Math.max(0, Math.min(1, normG * tempG));
      normB = Math.max(0, Math.min(1, normB * tempB));

      // D. Color Wheels (Lift, Gamma, Gain, Offset)
      if (hasWheels && wheels) {
        const luma = 0.2126 * normR + 0.7152 * normG + 0.0722 * normB;

        // Lift (Shadows)
        const wLift = Math.max(0, 1 - luma) * Math.max(0, 1 - luma);
        if (wheels.lift) {
          normR += wheels.lift.r * wLift * 0.4 + wheels.lift.y * wLift * 0.3;
          normG += wheels.lift.g * wLift * 0.4 + wheels.lift.y * wLift * 0.3;
          normB += wheels.lift.b * wLift * 0.4 + wheels.lift.y * wLift * 0.3;
        }

        // Gain (Highlights)
        const wGain = luma * luma;
        if (wheels.gain) {
          normR += wheels.gain.r * wGain * 0.4 + wheels.gain.y * wGain * 0.3;
          normG += wheels.gain.g * wGain * 0.4 + wheels.gain.y * wGain * 0.3;
          normB += wheels.gain.b * wGain * 0.4 + wheels.gain.y * wGain * 0.3;
        }

        // Gamma (Midtones)
        const wGamma = 4.0 * luma * (1.0 - luma);
        if (wheels.gamma) {
          normR += wheels.gamma.r * wGamma * 0.35 + wheels.gamma.y * wGamma * 0.25;
          normG += wheels.gamma.g * wGamma * 0.35 + wheels.gamma.y * wGamma * 0.25;
          normB += wheels.gamma.b * wGamma * 0.35 + wheels.gamma.y * wGamma * 0.25;
        }

        // Offset (Global)
        if (wheels.offset) {
          normR += wheels.offset.r * 0.25 + wheels.offset.y * 0.2;
          normG += wheels.offset.g * 0.25 + wheels.offset.y * 0.2;
          normB += wheels.offset.b * 0.25 + wheels.offset.y * 0.2;
        }

        normR = Math.max(0, Math.min(1, normR));
        normG = Math.max(0, Math.min(1, normG));
        normB = Math.max(0, Math.min(1, normB));
      }

      // E. Saturation, Vibrance & Global Hue Rotation in HSL space
      if (sat !== 1.0 || vibrance !== 0 || hueAngle !== 0 || hasHsl) {
        let [h, s, l] = this.rgbToHsl(normR, normG, normB);

        // Global Hue rotation
        if (hueAngle !== 0) {
          h = (h + (grade.hue || 0) + 360) % 360;
        }

        // 8-Band Selective HSL Grading
        if (hasHsl && hslBands) {
          const bandKeys: (keyof HslColorGrade)[] = [
            'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'magenta',
          ];

          for (const k of bandKeys) {
            const band = hslBands[k];
            if (!band) continue;
            if (band.hue === 0 && band.saturation === 0 && band.luminance === 0) continue;

            const center = band.rangeCenter;
            let diff = Math.abs(h - center);
            if (diff > 180) diff = 360 - diff;

            const halfWidth = (band.rangeWidth || 45) / 2;
            const softness = band.softness || 20;

            if (diff < halfWidth + softness) {
              let weight = 1.0;
              if (diff > halfWidth) {
                weight = 1.0 - (diff - halfWidth) / softness;
              }

              h = (h + band.hue * weight + 360) % 360;
              s = Math.max(0, Math.min(1, s + (band.saturation / 100) * weight));
              l = Math.max(0, Math.min(1, l + (band.luminance / 100) * weight));
            }
          }
        }

        // Saturation scaling
        s *= sat;

        // Vibrance: intelligently boosts lower-saturated colors while protecting skin tones & already vibrant areas
        if (vibrance !== 0) {
          const isSkinTone = (h >= 15 && h <= 50) ? 0.6 : 1.0;
          const vibBoost = vibrance * (1.0 - s) * isSkinTone;
          s = Math.max(0, Math.min(1, s + vibBoost));
        }

        s = Math.max(0, Math.min(1, s));
        l = Math.max(0, Math.min(1, l));

        [normR, normG, normB] = this.hslToRgb(h, s, l);
      }

      // F. 3D Look-Up Table (LUT) with Trilinear Interpolation
      if (lut) {
        [normR, normG, normB] = this.lutEngine.sampleLut3D(lut, normR, normG, normB, lutIntensity);
      }

      data[i] = Math.round(Math.max(0, Math.min(255, normR * 255)));
      data[i + 1] = Math.round(Math.max(0, Math.min(255, normG * 255)));
      data[i + 2] = Math.round(Math.max(0, Math.min(255, normB * 255)));
    }

    ctx.putImageData(imgData, 0, 0);

    // G. Sharpness & Clarity (Unsharp Mask Convolution)
    const sharpenVal = grade.sharpen || 0;
    const clarityVal = grade.clarity || 0;
    if (sharpenVal > 0.01 || Math.abs(clarityVal) > 0.01) {
      this.applySharpenAndClarity(ctx, width, height, sharpenVal, clarityVal);
    }
  }

  /**
   * Fast Unsharp Mask Edge Enhancement for Sharpen & Clarity
   */
  private static applySharpenAndClarity(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    sharpen: number,
    clarity: number
  ): void {
    const factor = (sharpen * 0.6) + (clarity * 0.4);
    if (Math.abs(factor) < 0.01) return;

    const imgData = ctx.getImageData(0, 0, width, height);
    const src = new Uint8ClampedArray(imgData.data);
    const dst = imgData.data;

    // 3x3 Laplacian / Unsharp Kernel
    const k = factor * 0.8;
    const center = 1 + 4 * k;
    const edge = -k;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        const up = ((y - 1) * width + x) * 4;
        const down = ((y + 1) * width + x) * 4;
        const left = (y * width + (x - 1)) * 4;
        const right = (y * width + (x + 1)) * 4;

        for (let c = 0; c < 3; c++) {
          const val =
            src[idx + c] * center +
            (src[up + c] + src[down + c] + src[left + c] + src[right + c]) * edge;
          dst[idx + c] = Math.max(0, Math.min(255, val));
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Applies procedural 35mm film grain overlay
   */
  private static applyGrain(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    amount: number
  ): void {
    const intensity = Math.min(1, Math.max(0, amount / 100));
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = intensity * 0.35;

    // Procedural noise grain pattern
    const grainCanvas = document.createElement('canvas');
    const gSize = 128;
    grainCanvas.width = gSize;
    grainCanvas.height = gSize;
    const gCtx = grainCanvas.getContext('2d');
    if (gCtx) {
      const gImg = gCtx.createImageData(gSize, gSize);
      const gData = gImg.data;
      for (let i = 0; i < gData.length; i += 4) {
        const noise = Math.floor(Math.random() * 255);
        gData[i] = noise;
        gData[i + 1] = noise;
        gData[i + 2] = noise;
        gData[i + 3] = 255;
      }
      gCtx.putImageData(gImg, 0, 0);
      const pat = ctx.createPattern(grainCanvas, 'repeat');
      if (pat) {
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, width, height);
      }
    }
    ctx.restore();
  }

  /**
   * Applies smooth cinematic optical vignette
   */
  public static applyVignette(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    amount: number
  ): void {
    const intensity = Math.max(0, Math.min(1, amount));
    if (intensity <= 0) return;

    ctx.save();
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.max(cx, cy);

    const gradient = ctx.createRadialGradient(cx, cy, radius * 0.35, cx, cy, radius * 1.15);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.7, `rgba(0, 0, 0, ${(intensity * 0.45).toFixed(3)})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${(intensity * 0.9).toFixed(3)})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  private static hasActiveColorWheels(wheels: ColorGrade['wheels']): boolean {
    if (!wheels) return false;
    const { lift, gamma, gain, offset } = wheels;
    const check = (w?: ColorWheelValue) =>
      w && (Math.abs(w.r) > 0.01 || Math.abs(w.g) > 0.01 || Math.abs(w.b) > 0.01 || Math.abs(w.y) > 0.01);
    return Boolean(check(lift) || check(gamma) || check(gain) || check(offset));
  }

  private static hasActiveCurves(curves: ColorGrade['curves']): boolean {
    if (!curves) return false;
    return (
      curves.master?.length > 2 ||
      curves.red?.length > 2 ||
      curves.green?.length > 2 ||
      curves.blue?.length > 2
    );
  }

  private static hasActiveHsl(hsl: HslColorGrade | undefined): boolean {
    if (!hsl) return false;
    const bands: (keyof HslColorGrade)[] = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'magenta'];
    return bands.some((b) => {
      const band = hsl[b];
      return band && (Math.abs(band.hue) > 0.5 || Math.abs(band.saturation) > 0.5 || Math.abs(band.luminance) > 0.5);
    });
  }

  // --- Fast HSL <-> RGB Color Conversion Utilities ---

  private static rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h *= 60;
    }

    return [h, s, l];
  }

  private static hslToRgb(h: number, s: number, l: number): [number, number, number] {
    if (s === 0) {
      return [l, l, l];
    }

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const normH = h / 360.0;

    const r = hue2rgb(p, q, normH + 1 / 3);
    const g = hue2rgb(p, q, normH);
    const b = hue2rgb(p, q, normH - 1 / 3);

    return [r, g, b];
  }

  /**
   * Evaluates a single normalized [0..1] RGB sample through the complete grading pipeline.
   */
  public static evaluateRgbSample(
    r: number,
    g: number,
    b: number,
    grade: ColorGrade,
    curveLuts: ReturnType<typeof ToneCurveEvaluator.generateCurveLut> | null = null
  ): [number, number, number] {
    let normR = Math.max(0, Math.min(1, r));
    let normG = Math.max(0, Math.min(1, g));
    let normB = Math.max(0, Math.min(1, b));

    // A. Curves
    if (curveLuts) {
      const rIdx = Math.round(normR * 255);
      const gIdx = Math.round(normG * 255);
      const bIdx = Math.round(normB * 255);

      normR = curveLuts.rLut[rIdx] / 255;
      normG = curveLuts.gLut[gIdx] / 255;
      normB = curveLuts.bLut[bIdx] / 255;

      const mIdxR = Math.round(normR * 255);
      const mIdxG = Math.round(normG * 255);
      const mIdxB = Math.round(normB * 255);

      normR = curveLuts.masterLut[mIdxR] / 255;
      normG = curveLuts.masterLut[mIdxG] / 255;
      normB = curveLuts.masterLut[mIdxB] / 255;
    }

    // B. Basic Tone Mapping (Exposure, Contrast, Brightness, Brilliance, Highlights, Shadows, Whites, Blacks, Fade)
    const expMult = Math.pow(2, grade.exposure || 0);
    const contrastVal = grade.contrast ?? 1.0;
    const brightnessOffset = grade.brightness || 0;
    const brAmount = (grade.brilliance || 0) / 100;
    const hlAmount = (grade.highlights || 0) / 100;
    const shAmount = (grade.shadows || 0) / 100;
    const whAmount = (grade.whites || 0) / 100;
    const blAmount = (grade.blacks || 0) / 100;
    const fadeAmount = Math.max(0, Math.min(1, (grade.fade || 0) / 100));

    const applyTone = (v: number) => {
      let val = v * expMult;
      val = (val - 0.5) * contrastVal + 0.5 + brightnessOffset;

      if (brAmount !== 0) {
        const brCurve = Math.sin(Math.max(0, Math.min(1, val)) * Math.PI);
        val += brAmount * 0.22 * brCurve;
      }
      if (hlAmount !== 0 && val > 0.3) {
        const factor = Math.max(0, (val - 0.3) / 0.7);
        val += hlAmount * 0.35 * (factor * factor);
      }
      if (shAmount !== 0 && val < 0.7) {
        const factor = Math.max(0, (0.7 - val) / 0.7);
        val += shAmount * 0.35 * (factor * factor);
      }
      if (whAmount !== 0 && val > 0.6) {
        const factor = Math.max(0, (val - 0.6) / 0.4);
        val += whAmount * 0.4 * (factor * factor);
      }
      if (blAmount !== 0 && val < 0.4) {
        const factor = Math.max(0, (0.4 - val) / 0.4);
        val += blAmount * 0.4 * (factor * factor);
      }
      if (fadeAmount > 0) {
        val = val * (1 - fadeAmount * 0.4) + fadeAmount * 0.18;
      }
      return Math.max(0, Math.min(1, val));
    };

    normR = applyTone(normR);
    normG = applyTone(normG);
    normB = applyTone(normB);

    // C. White Balance
    const temp = (grade.temperature || 0) / 100;
    const tint = (grade.tint || 0) / 100;
    const tempR = 1.0 + (temp > 0 ? temp * 0.35 : temp * 0.2);
    const tempG = 1.0 - tint * 0.25;
    const tempB = 1.0 + (temp < 0 ? -temp * 0.35 : -temp * 0.2) + (tint > 0 ? tint * 0.15 : 0);

    normR = Math.max(0, Math.min(1, normR * tempR));
    normG = Math.max(0, Math.min(1, normG * tempG));
    normB = Math.max(0, Math.min(1, normB * tempB));

    // D. Color Wheels
    const wheels = grade.wheels;
    if (wheels && this.hasActiveColorWheels(wheels)) {
      const luma = 0.2126 * normR + 0.7152 * normG + 0.0722 * normB;

      if (wheels.lift) {
        const wLift = Math.max(0, 1 - luma) * Math.max(0, 1 - luma);
        normR += wheels.lift.r * wLift * 0.4 + wheels.lift.y * wLift * 0.3;
        normG += wheels.lift.g * wLift * 0.4 + wheels.lift.y * wLift * 0.3;
        normB += wheels.lift.b * wLift * 0.4 + wheels.lift.y * wLift * 0.3;
      }
      if (wheels.gain) {
        const wGain = luma * luma;
        normR += wheels.gain.r * wGain * 0.4 + wheels.gain.y * wGain * 0.3;
        normG += wheels.gain.g * wGain * 0.4 + wheels.gain.y * wGain * 0.3;
        normB += wheels.gain.b * wGain * 0.4 + wheels.gain.y * wGain * 0.3;
      }
      if (wheels.gamma) {
        const wGamma = 4.0 * luma * (1.0 - luma);
        normR += wheels.gamma.r * wGamma * 0.35 + wheels.gamma.y * wGamma * 0.25;
        normG += wheels.gamma.g * wGamma * 0.35 + wheels.gamma.y * wGamma * 0.25;
        normB += wheels.gamma.b * wGamma * 0.35 + wheels.gamma.y * wGamma * 0.25;
      }
      if (wheels.offset) {
        normR += wheels.offset.r * 0.25 + wheels.offset.y * 0.2;
        normG += wheels.offset.g * 0.25 + wheels.offset.y * 0.2;
        normB += wheels.offset.b * 0.25 + wheels.offset.y * 0.2;
      }

      normR = Math.max(0, Math.min(1, normR));
      normG = Math.max(0, Math.min(1, normG));
      normB = Math.max(0, Math.min(1, normB));
    }

    // E. HSL & Vibrance
    const sat = grade.saturation ?? 1.0;
    const vibrance = (grade.vibrance || 0) / 100;
    const hueShift = grade.hue || 0;
    const hasHsl = this.hasActiveHsl(grade.hsl);

    if (sat !== 1.0 || vibrance !== 0 || hueShift !== 0 || hasHsl) {
      let [h, s, l] = this.rgbToHsl(normR, normG, normB);

      if (hueShift !== 0) {
        h = (h + hueShift + 360) % 360;
      }

      if (hasHsl && grade.hsl) {
        const bandKeys: (keyof HslColorGrade)[] = [
          'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'magenta',
        ];
        for (const k of bandKeys) {
          const band = grade.hsl[k];
          if (!band) continue;
          if (band.hue === 0 && band.saturation === 0 && band.luminance === 0) continue;

          let diff = Math.abs(h - band.rangeCenter);
          if (diff > 180) diff = 360 - diff;
          const halfWidth = (band.rangeWidth || 45) / 2;
          const softness = band.softness || 20;

          if (diff < halfWidth + softness) {
            const weight = diff <= halfWidth ? 1.0 : 1.0 - (diff - halfWidth) / softness;
            h = (h + band.hue * weight + 360) % 360;
            s = Math.max(0, Math.min(1, s + (band.saturation / 100) * weight));
            l = Math.max(0, Math.min(1, l + (band.luminance / 100) * weight));
          }
        }
      }

      s *= sat;
      if (vibrance !== 0) {
        const isSkinTone = h >= 15 && h <= 50 ? 0.6 : 1.0;
        const vibBoost = vibrance * (1.0 - s) * isSkinTone;
        s = Math.max(0, Math.min(1, s + vibBoost));
      }

      s = Math.max(0, Math.min(1, s));
      l = Math.max(0, Math.min(1, l));

      [normR, normG, normB] = this.hslToRgb(h, s, l);
    }

    // F. Base LUT sampling if active
    if (grade.lutId && grade.lutEnabled !== false) {
      const baseLut = this.lutEngine.getLut(grade.lutId);
      if (baseLut) {
        [normR, normG, normB] = this.lutEngine.sampleLut3D(baseLut, normR, normG, normB, grade.lutIntensity ?? 1.0);
      }
    }

    return [normR, normG, normB];
  }

  /**
   * Exports the entire active ColorGrade as an industry-standard .cube 3D Look-Up Table file.
   */
  public static exportGradeToCube(grade: ColorGrade, size = 33, title = 'VeeCut Studio Grade'): string {
    const curveLuts = grade.curves ? ToneCurveEvaluator.generateCurveLut(grade.curves) : null;
    const lines: string[] = [];

    lines.push(`# VeeCut Professional 3D Look-Up Table`);
    lines.push(`# Generated at ${new Date().toISOString()}`);
    lines.push(`TITLE "${title.replace(/"/g, '')}"`);
    lines.push(`LUT_3D_SIZE ${size}`);
    lines.push(`DOMAIN_MIN 0.0 0.0 0.0`);
    lines.push(`DOMAIN_MAX 1.0 1.0 1.0`);
    lines.push(``);

    for (let b = 0; b < size; b++) {
      for (let g = 0; g < size; g++) {
        for (let r = 0; r < size; r++) {
          const inR = r / (size - 1);
          const inG = g / (size - 1);
          const inB = b / (size - 1);

          const [outR, outG, outB] = this.evaluateRgbSample(inR, inG, inB, grade, curveLuts);
          lines.push(`${outR.toFixed(6)} ${outG.toFixed(6)} ${outB.toFixed(6)}`);
        }
      }
    }

    return lines.join('\n');
  }
}
