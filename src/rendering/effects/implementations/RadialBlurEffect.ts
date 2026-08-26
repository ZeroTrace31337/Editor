/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class RadialBlurEffect implements IEffect {
  public readonly id = 'radial-blur';
  public readonly name = 'Radial Zoom Blur';
  public readonly category: EffectCategory = 'blur';
  public readonly description = 'Circular zoom blur originating from center focal point.';
  public readonly iconName = 'Focus';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'strength',
      name: 'Strength',
      type: 'range',
      min: 0,
      max: 50,
      step: 1,
      defaultValue: 15,
      unit: 'px',
    },
    {
      id: 'iterations',
      name: 'Quality Steps',
      type: 'range',
      min: 2,
      max: 8,
      step: 1,
      defaultValue: 4,
    },
  ];

  public apply(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    params: Record<string, any>,
    _timeSec: number,
    opacity = 1.0
  ): void {
    const strength = (params.strength ?? 15) * opacity;
    if (strength <= 0) return;

    const iterations = params.iterations ?? 4;
    const offscreen = document.createElement('canvas');
    offscreen.width = canvasWidth;
    offscreen.height = canvasHeight;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    offCtx.drawImage(ctx.canvas, 0, 0);

    ctx.save();
    ctx.globalAlpha = 1.0 / (iterations + 1);

    for (let i = 1; i <= iterations; i++) {
      const scale = 1.0 + (i * strength * 0.005);
      ctx.save();
      ctx.translate(canvasWidth / 2, canvasHeight / 2);
      ctx.scale(scale, scale);
      ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
      ctx.drawImage(offscreen, 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }

  public getDefaultParams(): Record<string, any> {
    return { strength: 15, iterations: 4 };
  }
}
