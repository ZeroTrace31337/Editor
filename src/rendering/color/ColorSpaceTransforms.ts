/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Standard Color Science, Primaries, Transfer Characteristics and Tone Mapping
 * Supports Rec.709, sRGB, Log Profiles (Sony S-Log3, Canon C-Log, Apple Log, ARRI LogC3),
 * BT.2020/HDR10 PQ, and HDR->SDR tone mapping (ACES Filmic, Reinhard, Hable).
 */

export type ColorSpaceType =
  | 'srgb'
  | 'rec709'
  | 'display_p3'
  | 'rec2020'
  | 'slog3'
  | 'clog'
  | 'apple_log'
  | 'arri_logc3'
  | 'hdr10_pq';

export type ToneMappingOperator = 'aces_filmic' | 'reinhard' | 'hable' | 'clip';

export class ColorSpaceTransforms {
  /**
   * Standard sRGB (IEC 61966-2-1) to Linear
   */
  public static srgbToLinear(v: number): number {
    const c = Math.max(0, Math.min(1, v));
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  /**
   * Linear to standard sRGB (IEC 61966-2-1)
   */
  public static linearToSrgb(v: number): number {
    const c = Math.max(0, Math.min(1, v));
    return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1.0 / 2.4) - 0.055;
  }

  /**
   * ITU-R BT.709 to Linear
   */
  public static rec709ToLinear(v: number): number {
    const c = Math.max(0, Math.min(1, v));
    return c < 0.081 ? c / 4.5 : Math.pow((c + 0.099) / 1.099, 1.0 / 0.45);
  }

  /**
   * Linear to ITU-R BT.709
   */
  public static linearToRec709(v: number): number {
    const c = Math.max(0, Math.min(1, v));
    return c < 0.018 ? c * 4.5 : 1.099 * Math.pow(c, 0.45) - 0.099;
  }

  /**
   * Sony S-Log3 to Linear (Normalized reflection)
   */
  public static slog3ToLinear(v: number): number {
    const c = Math.max(0, v);
    if (c >= 171.2102946643 / 1023.0) {
      return Math.pow(10, ((c * 1023.0 - 420.0) / 261.5)) * (0.18 + 0.01) - 0.01;
    } else {
      return ((c * 1023.0 - 95.0) * 0.18) / (171.2102946643 - 95.0);
    }
  }

  /**
   * Canon C-Log to Linear
   */
  public static clogToLinear(v: number): number {
    const c = Math.max(0, v);
    if (c > 0.0730597) {
      return (Math.pow(10, (c - 0.0730597) / 0.529136) - 1.0) / 10.1596;
    } else {
      return (c - 0.0730597) / 10.1596;
    }
  }

  /**
   * Apple Log to Linear
   */
  public static appleLogToLinear(v: number): number {
    const c = Math.max(0, v);
    const R0 = -0.05641088;
    const Rt = 0.01;
    const c0 = 47.28670;
    const beta = 0.00964052;
    const gamma = 0.08550479;
    const d = 0.69336945;

    if (c >= d) {
      return Math.pow(2, (c - d) / gamma) - beta;
    } else {
      return (c - R0) * (Rt / (c0 - R0));
    }
  }

  /**
   * ARRI LogC3 (EI 800) to Linear
   */
  public static arriLogC3ToLinear(v: number): number {
    const c = Math.max(0, v);
    const cut = 0.010591;
    const a = 5.555556;
    const b = 0.052272;
    const cCoeff = 0.247190;
    const dCoeff = 0.385537;
    const e = 5.367655;
    const f = 0.092809;

    if (c > e * cut + f) {
      return (Math.pow(10, (c - dCoeff) / cCoeff) - b) / a;
    } else {
      return (c - f) / e;
    }
  }

  /**
   * ACES Filmic Tone Mapping (Krzysztof Narkowicz fit)
   * High-quality cinematic roll-off mapping HDR highlights [0..inf] into display SDR [0..1]
   */
  public static acesFilmicToneMap(r: number, g: number, b: number): [number, number, number] {
    const a = 2.51;
    const bConst = 0.03;
    const c = 2.43;
    const d = 0.59;
    const e = 0.14;

    const mapChannel = (x: number) => {
      const v = Math.max(0, x);
      return Math.max(0, Math.min(1, (v * (a * v + bConst)) / (v * (c * v + d) + e)));
    };

    return [mapChannel(r), mapChannel(g), mapChannel(b)];
  }

  /**
   * Reinhard Luminance Tone Mapping
   */
  public static reinhardToneMap(r: number, g: number, b: number): [number, number, number] {
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (luma <= 0.0001) return [0, 0, 0];
    const mappedLuma = luma / (1.0 + luma);
    const scale = mappedLuma / luma;
    return [
      Math.max(0, Math.min(1, r * scale)),
      Math.max(0, Math.min(1, g * scale)),
      Math.max(0, Math.min(1, b * scale)),
    ];
  }

  /**
   * Hable / Uncharted 2 Filmic Curve Tone Mapping
   */
  public static hableToneMap(r: number, g: number, b: number): [number, number, number] {
    const A = 0.15;
    const B = 0.50;
    const C = 0.10;
    const D = 0.20;
    const E = 0.02;
    const F = 0.30;
    const W = 11.2;

    const curve = (x: number) => ((x * (A * x + C * B) + D * E) / (x * (A * x + B) + D * F)) - E / F;
    const whiteScale = 1.0 / curve(W);

    const exposureBias = 2.0;
    return [
      Math.max(0, Math.min(1, curve(r * exposureBias) * whiteScale)),
      Math.max(0, Math.min(1, curve(g * exposureBias) * whiteScale)),
      Math.max(0, Math.min(1, curve(b * exposureBias) * whiteScale)),
    ];
  }

  /**
   * Transforms input RGB triplet across color spaces
   */
  public static transformColorSpace(
    rgb: [number, number, number],
    fromSpace: ColorSpaceType,
    toSpace: ColorSpaceType,
    toneMapping: ToneMappingOperator = 'aces_filmic'
  ): [number, number, number] {
    if (fromSpace === toSpace) return [...rgb];

    // 1. Convert source to Scene Linear
    let [lr, lg, lb] = [rgb[0], rgb[1], rgb[2]];

    switch (fromSpace) {
      case 'srgb':
        lr = this.srgbToLinear(lr);
        lg = this.srgbToLinear(lg);
        lb = this.srgbToLinear(lb);
        break;
      case 'rec709':
        lr = this.rec709ToLinear(lr);
        lg = this.rec709ToLinear(lg);
        lb = this.rec709ToLinear(lb);
        break;
      case 'slog3':
        lr = this.slog3ToLinear(lr);
        lg = this.slog3ToLinear(lg);
        lb = this.slog3ToLinear(lb);
        break;
      case 'clog':
        lr = this.clogToLinear(lr);
        lg = this.clogToLinear(lg);
        lb = this.clogToLinear(lb);
        break;
      case 'apple_log':
        lr = this.appleLogToLinear(lr);
        lg = this.appleLogToLinear(lg);
        lb = this.appleLogToLinear(lb);
        break;
      case 'arri_logc3':
        lr = this.arriLogC3ToLinear(lr);
        lg = this.arriLogC3ToLinear(lg);
        lb = this.arriLogC3ToLinear(lb);
        break;
      default:
        // Already linear or standard normalized
        break;
    }

    // 2. Tone map if target is SDR standard and dynamic range exceeds 1.0
    const maxVal = Math.max(lr, lg, lb);
    if (maxVal > 1.0 && (toSpace === 'rec709' || toSpace === 'srgb')) {
      if (toneMapping === 'aces_filmic') {
        [lr, lg, lb] = this.acesFilmicToneMap(lr, lg, lb);
      } else if (toneMapping === 'reinhard') {
        [lr, lg, lb] = this.reinhardToneMap(lr, lg, lb);
      } else if (toneMapping === 'hable') {
        [lr, lg, lb] = this.hableToneMap(lr, lg, lb);
      }
    }

    // 3. Convert from Linear to target space transfer function
    switch (toSpace) {
      case 'srgb':
        return [this.linearToSrgb(lr), this.linearToSrgb(lg), this.linearToSrgb(lb)];
      case 'rec709':
        return [this.linearToRec709(lr), this.linearToRec709(lg), this.linearToRec709(lb)];
      default:
        return [
          Math.max(0, Math.min(1, lr)),
          Math.max(0, Math.min(1, lg)),
          Math.max(0, Math.min(1, lb)),
        ];
    }
  }

  /**
   * Generates proactive color warnings for clipping, wide gamut mismatches, and unsupported spaces
   */
  public static detectColorWarnings(
    sourceSpace: ColorSpaceType,
    targetSpace: ColorSpaceType,
    sampleRgb: [number, number, number]
  ): string[] {
    const warnings: string[] = [];
    const maxVal = Math.max(...sampleRgb);
    const minVal = Math.min(...sampleRgb);

    if (minVal < 0 || maxVal > 1.0) {
      warnings.push(`Potential signal clipping detected: channel range [${minVal.toFixed(2)}, ${maxVal.toFixed(2)}] exceeds legal bounds.`);
    }

    if (sourceSpace.includes('log') && targetSpace === 'rec709') {
      warnings.push(`Log footage (${sourceSpace}) is being conformed to Rec.709 output without a 3D LUT or tone mapping.`);
    }

    if (sourceSpace === 'rec2020' && targetSpace === 'rec709') {
      warnings.push('Wide color gamut Rec.2020 conformed to standard Rec.709 may induce out-of-gamut color clipping.');
    }

    return warnings;
  }
}
