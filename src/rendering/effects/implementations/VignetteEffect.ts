/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class VignetteEffect implements IEffect {
  public readonly id = 'lumina.vignette';
  public readonly name = 'Cinematic Vignette';
  public readonly category: EffectCategory = 'stylize';
  public readonly description = 'Darkens or tints the outer perimeter to guide viewer focus toward the center.';
  public readonly iconName = 'Circle';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'amount',
      name: 'Vignette Amount',
      type: 'range',
      min: 0,
      max: 1.0,
      step: 0.05,
      defaultValue: 0.5,
      keyframeable: true,
    },
    {
      id: 'radius',
      name: 'Center Radius',
      type: 'range',
      min: 0.1,
      max: 1.5,
      step: 0.05,
      defaultValue: 0.7,
      keyframeable: true,
    },
    {
      id: 'softness',
      name: 'Feather / Softness',
      type: 'range',
      min: 0.1,
      max: 1.0,
      step: 0.05,
      defaultValue: 0.6,
    },
    {
      id: 'color',
      name: 'Vignette Color',
      type: 'color',
      defaultValue: '#000000',
    },
  ];

  public getDefaultParams(): Record<string, any> {
    return {
      amount: 0.5,
      radius: 0.7,
      softness: 0.6,
      color: '#000000',
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
    const amount = (params.amount ?? 0.5) * opacity;
    if (amount <= 0.01) return;

    const radius = params.radius ?? 0.7;
    const softness = params.softness ?? 0.6;
    const color = params.color ?? '#000000';

    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const maxRadius = Math.sqrt(cx * cx + cy * cy);
    const innerRadius = maxRadius * Math.max(0, radius * (1.0 - softness));
    const outerRadius = maxRadius * radius;

    ctx.save();
    const gradient = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, outerRadius);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, color);

    ctx.globalAlpha = amount;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();
  }
}
