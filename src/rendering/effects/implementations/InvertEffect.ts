/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class InvertEffect implements IEffect {
  public readonly id = 'lumina.invert';
  public readonly name = 'Color Negative Invert';
  public readonly category: EffectCategory = 'stylize';
  public readonly description = 'Inverts color luminance and chromatic values into photographic negatives.';
  public readonly iconName = 'Contrast';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'amount',
      name: 'Invert Amount',
      type: 'range',
      min: 0,
      max: 1.0,
      step: 0.05,
      defaultValue: 1.0,
      keyframeable: true,
    },
  ];

  public getDefaultParams(): Record<string, any> {
    return { amount: 1.0 };
  }

  public apply(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    params: Record<string, any>,
    _timeSec: number,
    opacity = 1.0
  ): void {
    const amount = (params.amount ?? 1.0) * opacity;
    if (amount <= 0.01) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(ctx.canvas, 0, 0);

    ctx.save();
    ctx.globalAlpha = amount;
    ctx.filter = 'invert(100%)';
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();
  }
}
