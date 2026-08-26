/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class LightLeakEffect implements IEffect {
  public readonly id = 'light-leak';
  public readonly name = 'Vintage Light Leak';
  public readonly category: EffectCategory = 'lighting';
  public readonly description = 'Warm film light burn with lens flare.';
  public readonly iconName = 'Sun';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'intensity',
      name: 'Intensity',
      type: 'range',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 60,
      unit: '%',
    },
    {
      id: 'hue',
      name: 'Color Tone',
      type: 'select',
      options: [
        { label: 'Warm Amber', value: 'warm' },
        { label: 'Sunset Magenta', value: 'sunset' },
        { label: 'Neon Cyan', value: 'cyan' },
      ],
      defaultValue: 'warm',
    },
  ];

  public apply(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    params: Record<string, any>,
    timeSec: number,
    opacity = 1.0
  ): void {
    const intensity = ((params.intensity ?? 60) / 100) * opacity;
    if (intensity <= 0) return;

    const tone = params.hue ?? 'warm';
    const shiftX = (Math.sin(timeSec * 0.8) * 0.15 + 0.5) * canvasWidth;
    const shiftY = 0.25 * canvasHeight;

    const grad = ctx.createRadialGradient(
      shiftX,
      shiftY,
      20,
      shiftX,
      shiftY,
      canvasWidth * 0.65
    );

    if (tone === 'warm') {
      grad.addColorStop(0, `rgba(255, 140, 40, ${intensity * 0.8})`);
      grad.addColorStop(0.5, `rgba(255, 60, 120, ${intensity * 0.4})`);
      grad.addColorStop(1, 'rgba(255, 200, 50, 0)');
    } else if (tone === 'sunset') {
      grad.addColorStop(0, `rgba(244, 63, 94, ${intensity * 0.8})`);
      grad.addColorStop(0.5, `rgba(168, 85, 247, ${intensity * 0.4})`);
      grad.addColorStop(1, 'rgba(59, 130, 246, 0)');
    } else {
      grad.addColorStop(0, `rgba(34, 211, 238, ${intensity * 0.8})`);
      grad.addColorStop(0.5, `rgba(99, 102, 241, ${intensity * 0.4})`);
      grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();
  }

  public getDefaultParams(): Record<string, any> {
    return { intensity: 60, hue: 'warm' };
  }
}
