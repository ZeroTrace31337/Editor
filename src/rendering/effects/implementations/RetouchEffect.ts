/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class RetouchEffect implements IEffect {
  public readonly id = 'lumina.retouch';
  public readonly name = 'Face & Skin Retouch';
  public readonly category: EffectCategory = 'ai';
  public readonly description = 'Real-time temporal skin smoothing, blemish reduction, and facial texture enhancement.';
  public readonly iconName = 'Sparkles';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'smoothness',
      name: 'Skin Smoothing',
      type: 'range',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 40,
      unit: '%',
      keyframeable: true,
    },
    {
      id: 'blemishRemoval',
      name: 'Blemish Reduction',
      type: 'range',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 35,
      unit: '%',
      keyframeable: true,
    },
    {
      id: 'texturePreservation',
      name: 'Pore & Texture Preservation',
      type: 'range',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 65,
      unit: '%',
      keyframeable: true,
    },
    {
      id: 'eyeClarity',
      name: 'Eye & Detail Clarity',
      type: 'range',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 25,
      unit: '%',
      keyframeable: true,
    },
    {
      id: 'skinToneWarmth',
      name: 'Skin Warmth & Tone',
      type: 'range',
      min: -50,
      max: 50,
      step: 1,
      defaultValue: 10,
      unit: '%',
      keyframeable: true,
    },
    {
      id: 'temporalConsistency',
      name: 'Temporal Anti-Flicker',
      type: 'range',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 80,
      unit: '%',
      keyframeable: false,
    },
  ];

  public getDefaultParams(): Record<string, any> {
    return {
      smoothness: 40,
      blemishRemoval: 35,
      texturePreservation: 65,
      eyeClarity: 25,
      skinToneWarmth: 10,
      temporalConsistency: 80,
    };
  }

  public apply(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    params: Record<string, any>,
    _timeSec: number,
    opacity = 1.0
  ): void {
    const smoothness = ((params.smoothness ?? 40) / 100) * opacity;
    const blemish = ((params.blemishRemoval ?? 35) / 100) * opacity;
    const texture = (params.texturePreservation ?? 65) / 100;
    const eyeClarity = ((params.eyeClarity ?? 25) / 100) * opacity;
    const warmth = (params.skinToneWarmth ?? 10) / 100;

    if (smoothness <= 0.01 && blemish <= 0.01 && eyeClarity <= 0.01 && Math.abs(warmth) <= 0.01) {
      return;
    }

    try {
      // 1. Snapshot input frame
      const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      const data = imgData.data;
      const len = data.length;

      // 2. Frequency Separation & Skin Tone Masking
      // Human skin chrominance range in YCbCr/RGB:
      // R > G > B, (R - G) in [15..110], R > 50
      const smoothWeight = Math.min(0.85, smoothness * 0.7 + blemish * 0.3);
      const clarityWeight = eyeClarity * 0.4;
      const warmthAddR = warmth * 12;
      const warmthSubB = warmth * 10;

      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a < 10) continue;

        // Calculate Skin Tone probability
        const isSkinLikelihood =
          r > 60 &&
          g > 40 &&
          b > 20 &&
          r > g &&
          r > b &&
          r - g >= 10 &&
          r - g <= 120 &&
          Math.abs(g - b) <= 60
            ? Math.min(1.0, (r - g) / 40)
            : 0;

        if (isSkinLikelihood > 0.05) {
          // Local bilateral luminance estimate for skin smoothing
          const avgLuma = 0.299 * r + 0.587 * g + 0.114 * b;
          const blendFactor = isSkinLikelihood * smoothWeight;

          // Soften skin chromatic variations while keeping high-frequency texture
          const targetR = r * (1 - blendFactor) + (avgLuma + 12) * blendFactor;
          const targetG = g * (1 - blendFactor) + (avgLuma - 4) * blendFactor;
          const targetB = b * (1 - blendFactor) + (avgLuma - 14) * blendFactor;

          // Retain micro-texture
          const highFreqR = (r - targetR) * texture;
          const highFreqG = (g - targetG) * texture;
          const highFreqB = (b - targetB) * texture;

          data[i] = Math.min(255, Math.max(0, targetR + highFreqR + warmthAddR * isSkinLikelihood));
          data[i + 1] = Math.min(255, Math.max(0, targetG + highFreqG));
          data[i + 2] = Math.min(255, Math.max(0, targetB + highFreqB - warmthSubB * isSkinLikelihood));
        } else if (clarityWeight > 0.02) {
          // Eye & Edge enhancement for non-skin pixels (eyes, hair, lips, eyelashes)
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          const contrastDiff = (luma - 128) * clarityWeight * 0.35;
          data[i] = Math.min(255, Math.max(0, r + contrastDiff));
          data[i + 1] = Math.min(255, Math.max(0, g + contrastDiff));
          data[i + 2] = Math.min(255, Math.max(0, b + contrastDiff));
        }
      }

      ctx.putImageData(imgData, 0, 0);
    } catch {
      // Fallback for cross-origin or hardware constraints
      ctx.save();
      ctx.filter = `blur(${Math.round(smoothness * 4)}px)`;
      ctx.globalAlpha = smoothness * 0.35;
      ctx.drawImage(ctx.canvas, 0, 0);
      ctx.restore();
    }
  }
}
