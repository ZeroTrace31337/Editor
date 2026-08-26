/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChromaKeySettings, SingleChromaKey, AI_BACKGROUND_PRESETS } from './ChromaKeyTypes';

export class ChromaKeyRenderer {
  private static bgImageCache: Map<string, HTMLImageElement> = new Map();

  /**
   * Applies real-time chroma keying, matte extraction, spill suppression, and background compositing.
   */
  public static applyChromaKey(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    settings: ChromaKeySettings | undefined
  ): void {
    if (!settings || !settings.enabled || settings.keys.length === 0) return;
    if (settings.matteMode === 'original') return;

    const activeKeys = settings.keys.filter((k) => k.enabled);
    if (activeKeys.length === 0) return;

    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      const len = data.length;

      // Parse RGB values for each active key
      const keyConfigs = activeKeys.map((k) => {
        const rgb = this.hexToRgb(k.keyColor);
        return {
          r: rgb.r,
          g: rgb.g,
          b: rgb.b,
          sim: (k.similarity / 100) * 441.67, // Max RGB distance is sqrt(255^2*3) ~= 441.67
          smooth: Math.max(1, (k.smoothness / 100) * 120),
          spill: k.spillReduction / 100,
          shadowCutoff: (k.shadows / 100) * 50,
          refine: k.refineEdge / 100,
        };
      });

      const isMatteMode = settings.matteMode === 'matte';

      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        let a = data[i + 3];

        if (a === 0) continue;

        let minAlphaMultiplier = 1.0;
        let activeSpill = 0;

        for (let k = 0; k < keyConfigs.length; k++) {
          const cfg = keyConfigs[k];

          // Compute Euclidean color distance in RGB space
          const dr = r - cfg.r;
          const dg = g - cfg.g;
          const db = b - cfg.b;
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);

          // Shadow protection: if luminance is very low, reduce keying
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          let effectiveDist = dist;
          if (lum < cfg.shadowCutoff) {
            effectiveDist += (cfg.shadowCutoff - lum) * 1.5;
          }

          if (effectiveDist < cfg.sim) {
            minAlphaMultiplier = 0.0;
            activeSpill = cfg.spill;
            break;
          } else if (effectiveDist < cfg.sim + cfg.smooth) {
            const edgeT = (effectiveDist - cfg.sim) / cfg.smooth;
            const alphaFac = Math.pow(edgeT, 1.2 + cfg.refine);
            if (alphaFac < minAlphaMultiplier) {
              minAlphaMultiplier = alphaFac;
              activeSpill = cfg.spill * (1.0 - alphaFac);
            }
          }
        }

        // Apply Spill Suppression (desaturate green/blue spill cast on edges)
        if (activeSpill > 0.01) {
          // If predominantly green screen
          if (g > r && g > b) {
            const maxOther = Math.max(r, b);
            data[i + 1] = Math.round(g * (1 - activeSpill) + maxOther * activeSpill);
          } else if (b > r && b > g) {
            // Blue screen spill
            const maxOther = Math.max(r, g);
            data[i + 2] = Math.round(b * (1 - activeSpill) + maxOther * activeSpill);
          }
        }

        if (isMatteMode) {
          // Monochrome Matte output: 255 = keep, 0 = keyed out
          const matteVal = Math.round(minAlphaMultiplier * 255);
          data[i] = matteVal;
          data[i + 1] = matteVal;
          data[i + 2] = matteVal;
          data[i + 3] = 255;
        } else {
          data[i + 3] = Math.round(a * minAlphaMultiplier);
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // If Alpha Grid mode is requested, draw checkerboard behind
      if (settings.matteMode === 'alpha_grid') {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        this.drawCheckerboard(ctx, width, height);
        ctx.restore();
      } else if (!isMatteMode && settings.backgroundType !== 'transparent') {
        // Draw background replacement layer underneath keyed pixels
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        this.drawBackgroundReplacement(ctx, width, height, settings);
        ctx.restore();
      }
    } catch (e) {
      console.warn('[ChromaKeyRenderer] Error executing chroma key pass:', e);
    }
  }

  private static drawCheckerboard(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const size = 16;
    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < w; x += size) {
        const isEven = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0;
        ctx.fillStyle = isEven ? '#1f2430' : '#141824';
        ctx.fillRect(x, y, size, size);
      }
    }
  }

  private static drawBackgroundReplacement(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    settings: ChromaKeySettings
  ): void {
    if (settings.backgroundType === 'color') {
      ctx.fillStyle = settings.backgroundColor || '#111320';
      ctx.fillRect(0, 0, width, height);
    } else if (settings.backgroundType === 'ai_background' || settings.backgroundType === 'image') {
      let uri = settings.backgroundImageUri;
      if (settings.backgroundType === 'ai_background') {
        const preset = AI_BACKGROUND_PRESETS.find((p) => p.id === settings.aiBackgroundPreset);
        uri = preset?.thumbnailUri || AI_BACKGROUND_PRESETS[0].thumbnailUri;
      }

      if (uri) {
        let img = this.bgImageCache.get(uri);
        if (!img) {
          img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = uri;
          this.bgImageCache.set(uri, img);
        }
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, 0, 0, width, height);
        } else {
          ctx.fillStyle = '#0f111a';
          ctx.fillRect(0, 0, width, height);
        }
      }
    }
  }

  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }
}
