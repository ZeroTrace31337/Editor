/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class PixelateEffect implements IEffect {
  public readonly id = 'lumina.pixelate';
  public readonly name = 'Pixelation / Mosaic (Censor)';
  public readonly category: EffectCategory = 'stylize';
  public readonly description = 'Downsamples image resolution into stylized mosaic blocks or privacy pixelation.';
  public readonly iconName = 'Grid';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'blockSize',
      name: 'Pixel Block Size',
      type: 'range',
      min: 2,
      max: 64,
      step: 2,
      defaultValue: 16,
      unit: 'px',
    },
  ];

  public getDefaultParams(): Record<string, any> {
    return { blockSize: 16 };
  }

  public apply(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    params: Record<string, any>,
    timeSec: number,
    opacity = 1.0
  ): void {
    const size = Math.max(2, Math.round((params.blockSize ?? 16) * opacity));
    if (size <= 1) return;

    const w = Math.max(1, Math.floor(canvasWidth / size));
    const h = Math.max(1, Math.floor(canvasHeight / size));

    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = w;
    smallCanvas.height = h;
    const sCtx = smallCanvas.getContext('2d');
    if (!sCtx) return;

    sCtx.imageSmoothingEnabled = false;
    sCtx.drawImage(ctx.canvas, 0, 0, w, h);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(smallCanvas, 0, 0, w, h, 0, 0, canvasWidth, canvasHeight);
    ctx.restore();
  }
}
