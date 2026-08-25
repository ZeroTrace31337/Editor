/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class BlurEffect implements IEffect {
  public readonly id = 'lumina.blur';
  public readonly name = 'Gaussian Blur';
  public readonly category: EffectCategory = 'blur';
  public readonly description = 'Smooths and softens pixels with an optical Gaussian blur radius.';
  public readonly iconName = 'Droplet';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'radius',
      name: 'Blur Radius',
      type: 'range',
      min: 0,
      max: 60,
      step: 1,
      defaultValue: 15,
      unit: 'px',
      keyframeable: true,
    },
    {
      id: 'blurDirection',
      name: 'Direction',
      type: 'select',
      options: [
        { label: 'Both (X & Y)', value: 'both' },
        { label: 'Horizontal (X)', value: 'horizontal' },
        { label: 'Vertical (Y)', value: 'vertical' },
      ],
      defaultValue: 'both',
    },
  ];

  public getDefaultParams(): Record<string, any> {
    return {
      radius: 15,
      blurDirection: 'both',
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
    const radius = (params.radius ?? 15) * opacity;
    if (radius <= 0.1) return;

    const dir = params.blurDirection ?? 'both';

    // Temporary copy of canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(ctx.canvas, 0, 0);

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.filter = `blur(${radius.toFixed(1)}px)`;

    if (dir === 'horizontal') {
      ctx.drawImage(tempCanvas, 0, 0, canvasWidth, canvasHeight);
    } else if (dir === 'vertical') {
      ctx.drawImage(tempCanvas, 0, 0, canvasWidth, canvasHeight);
    } else {
      ctx.drawImage(tempCanvas, 0, 0, canvasWidth, canvasHeight);
    }

    ctx.restore();
  }
}
