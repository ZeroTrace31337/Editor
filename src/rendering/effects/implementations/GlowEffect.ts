/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class GlowEffect implements IEffect {
  public readonly id = 'lumina.glow';
  public readonly name = 'Luma Glow / Bloom';
  public readonly category: EffectCategory = 'lighting';
  public readonly description = 'Extracts high-luminance highlights and blooms them with radiant soft light.';
  public readonly iconName = 'Sun';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'intensity',
      name: 'Glow Intensity',
      type: 'range',
      min: 0,
      max: 3.0,
      step: 0.05,
      defaultValue: 1.2,
      keyframeable: true,
    },
    {
      id: 'radius',
      name: 'Bloom Radius',
      type: 'range',
      min: 2,
      max: 80,
      step: 2,
      defaultValue: 24,
      unit: 'px',
      keyframeable: true,
    },
    {
      id: 'threshold',
      name: 'Threshold',
      type: 'range',
      min: 0.0,
      max: 1.0,
      step: 0.05,
      defaultValue: 0.4,
    },
    {
      id: 'colorTint',
      name: 'Tint Color',
      type: 'color',
      defaultValue: '#ffd166',
    },
  ];

  public getDefaultParams(): Record<string, any> {
    return {
      intensity: 1.2,
      radius: 24,
      threshold: 0.4,
      colorTint: '#ffd166',
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
    const intensity = (params.intensity ?? 1.2) * opacity;
    const radius = params.radius ?? 24;
    if (intensity <= 0.01) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Draw current canvas
    tempCtx.drawImage(ctx.canvas, 0, 0);

    // Apply high pass / brightness filter + blur
    tempCtx.globalCompositeOperation = 'source-over';
    tempCtx.filter = `brightness(140%) contrast(150%) blur(${radius}px)`;
    tempCtx.drawImage(tempCanvas, 0, 0);

    ctx.save();
    ctx.globalAlpha = Math.min(1.0, intensity * 0.7);
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(tempCanvas, 0, 0);

    // Add extra color overlay bloom if selected
    if (params.colorTint && params.colorTint !== '#ffffff') {
      ctx.globalAlpha = Math.min(0.5, intensity * 0.3);
      ctx.fillStyle = params.colorTint;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    ctx.restore();
  }
}
