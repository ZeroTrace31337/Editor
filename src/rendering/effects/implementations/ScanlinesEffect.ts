/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class ScanlinesEffect implements IEffect {
  public readonly id = 'scanlines';
  public readonly name = 'CRT Scanlines';
  public readonly category: EffectCategory = 'glitch';
  public readonly description = 'Classic cathode ray tube monitor scanline raster.';
  public readonly iconName = 'Tv';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'spacing',
      name: 'Line Spacing',
      type: 'range',
      min: 2,
      max: 12,
      step: 1,
      defaultValue: 4,
      unit: 'px',
    },
    {
      id: 'intensity',
      name: 'Intensity',
      type: 'range',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 40,
      unit: '%',
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
    const intensity = ((params.intensity ?? 40) / 100) * opacity;
    if (intensity <= 0) return;

    const spacing = params.spacing ?? 4;
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${intensity})`;

    for (let y = 0; y < canvasHeight; y += spacing) {
      ctx.fillRect(0, y, canvasWidth, 1);
    }

    ctx.restore();
  }

  public getDefaultParams(): Record<string, any> {
    return { spacing: 4, intensity: 40 };
  }
}
