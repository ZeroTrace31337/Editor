/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class SharpenEffect implements IEffect {
  public readonly id = 'lumina.sharpen';
  public readonly name = 'Edge Sharpen';
  public readonly category: EffectCategory = 'utility';
  public readonly description = 'Enhances high-frequency edge contrast to increase apparent crispness and definition.';
  public readonly iconName = 'Zap';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'amount',
      name: 'Sharpen Amount',
      type: 'range',
      min: 0,
      max: 2.0,
      step: 0.1,
      defaultValue: 0.8,
      keyframeable: true,
    },
  ];

  public getDefaultParams(): Record<string, any> {
    return {
      amount: 0.8,
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
    const amount = (params.amount ?? 0.8) * opacity;
    if (amount <= 0.01) return;

    // Convolution sharpen filter approximation using unsharp mask overlay
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(ctx.canvas, 0, 0);

    // High pass simulation
    ctx.save();
    ctx.filter = 'contrast(160%) brightness(105%)';
    ctx.globalAlpha = Math.min(1.0, amount * 0.5);
    ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();
  }
}
