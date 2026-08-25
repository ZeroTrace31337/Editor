/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class BloomEffect implements IEffect {
  public readonly id = 'lumina.bloom';
  public readonly name = 'Atmospheric Bloom & Luma Glow';
  public readonly category: EffectCategory = 'lighting';
  public readonly description = 'Extracts high-luminance highlights and spreads organic optical light bloom.';
  public readonly iconName = 'Sun';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'threshold',
      name: 'Highlight Threshold',
      type: 'range',
      min: 0.2,
      max: 0.95,
      step: 0.05,
      defaultValue: 0.6,
    },
    {
      id: 'radius',
      name: 'Bloom Spread Radius',
      type: 'range',
      min: 5,
      max: 60,
      step: 2,
      defaultValue: 24,
      unit: 'px',
    },
    {
      id: 'intensity',
      name: 'Bloom Intensity',
      type: 'range',
      min: 0.1,
      max: 2.5,
      step: 0.1,
      defaultValue: 1.2,
    },
  ];

  public getDefaultParams(): Record<string, any> {
    return { threshold: 0.6, radius: 24, intensity: 1.2 };
  }

  public apply(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    params: Record<string, any>,
    timeSec: number,
    opacity = 1.0
  ): void {
    const threshold = params.threshold ?? 0.6;
    const radius = (params.radius ?? 24) * opacity;
    const intensity = (params.intensity ?? 1.2) * opacity;
    if (radius <= 1 || intensity <= 0) return;

    // 1. Extract highlights into temporary canvas
    const lumaCanvas = document.createElement('canvas');
    lumaCanvas.width = canvasWidth;
    lumaCanvas.height = canvasHeight;
    const lCtx = lumaCanvas.getContext('2d');
    if (!lCtx) return;

    const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const luma = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      if (luma < threshold) {
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
        d[i + 3] = 0;
      } else {
        const factor = (luma - threshold) / (1 - threshold);
        d[i] = Math.round(d[i] * factor);
        d[i + 1] = Math.round(d[i + 1] * factor);
        d[i + 2] = Math.round(d[i + 2] * factor);
        d[i + 3] = Math.round(255 * factor);
      }
    }
    lCtx.putImageData(imgData, 0, 0);

    // 2. Blend blurred highlights on top with screen/lighter mode
    ctx.save();
    ctx.filter = `blur(${radius}px)`;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = Math.min(1.0, intensity);
    ctx.drawImage(lumaCanvas, 0, 0);
    ctx.restore();
  }
}
