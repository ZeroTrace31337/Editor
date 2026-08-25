/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class EdgeDetectEffect implements IEffect {
  public readonly id = 'lumina.edge_detect';
  public readonly name = 'Sobel Edge Detect';
  public readonly category: EffectCategory = 'stylize';
  public readonly description = 'Highlights high-contrast luminance contours and edges for a stylized blueprint / neon look.';
  public readonly iconName = 'Grid';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'intensity',
      name: 'Edge Intensity',
      type: 'range',
      min: 0,
      max: 2.0,
      step: 0.1,
      defaultValue: 1.0,
      keyframeable: true,
    },
    {
      id: 'edgeColor',
      name: 'Edge Color',
      type: 'color',
      defaultValue: '#00f0ff',
    },
  ];

  public getDefaultParams(): Record<string, any> {
    return {
      intensity: 1.0,
      edgeColor: '#00f0ff',
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
    const intensity = (params.intensity ?? 1.0) * opacity;
    if (intensity <= 0.01) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(ctx.canvas, 0, 0);

    // Invert & high-contrast difference pass to extract edges
    ctx.save();
    ctx.filter = 'contrast(200%) invert(100%)';
    ctx.globalAlpha = 0.5 * opacity;
    ctx.globalCompositeOperation = 'difference';
    ctx.drawImage(tempCanvas, 2, 2);

    if (params.edgeColor && params.edgeColor !== '#ffffff') {
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = params.edgeColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    ctx.restore();
  }
}
