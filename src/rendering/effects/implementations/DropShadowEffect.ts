/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class DropShadowEffect implements IEffect {
  public readonly id = 'lumina.drop_shadow';
  public readonly name = 'Drop Shadow';
  public readonly category: EffectCategory = 'stylize';
  public readonly description = 'Projects a dimensional Gaussian blurred drop shadow behind the layer.';
  public readonly iconName = 'Box';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'offsetX',
      name: 'Offset X',
      type: 'range',
      min: -100,
      max: 100,
      step: 1,
      defaultValue: 15,
      unit: 'px',
      keyframeable: true,
    },
    {
      id: 'offsetY',
      name: 'Offset Y',
      type: 'range',
      min: -100,
      max: 100,
      step: 1,
      defaultValue: 15,
      unit: 'px',
      keyframeable: true,
    },
    {
      id: 'blur',
      name: 'Shadow Blur',
      type: 'range',
      min: 0,
      max: 80,
      step: 1,
      defaultValue: 20,
      unit: 'px',
      keyframeable: true,
    },
    {
      id: 'shadowColor',
      name: 'Shadow Color',
      type: 'color',
      defaultValue: '#000000',
    },
    {
      id: 'shadowOpacity',
      name: 'Shadow Opacity',
      type: 'range',
      min: 0,
      max: 1.0,
      step: 0.05,
      defaultValue: 0.6,
      keyframeable: true,
    },
  ];

  public getDefaultParams(): Record<string, any> {
    return {
      offsetX: 15,
      offsetY: 15,
      blur: 20,
      shadowColor: '#000000',
      shadowOpacity: 0.6,
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
    const shadowOpacity = (params.shadowOpacity ?? 0.6) * opacity;
    if (shadowOpacity <= 0.01) return;

    const ox = params.offsetX ?? 15;
    const oy = params.offsetY ?? 15;
    const blur = params.blur ?? 20;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(ctx.canvas, 0, 0);

    ctx.save();
    ctx.shadowColor = params.shadowColor ?? '#000000';
    ctx.shadowOffsetX = ox;
    ctx.shadowOffsetY = oy;
    ctx.shadowBlur = blur;
    ctx.globalAlpha = shadowOpacity;
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();
  }
}
