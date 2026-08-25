/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class ChromaticAberrationEffect implements IEffect {
  public readonly id = 'lumina.chromatic_aberration';
  public readonly name = 'Chromatic Aberration';
  public readonly category: EffectCategory = 'distortion';
  public readonly description = 'Simulates optical lens chromatic dispersion by offsetting Red and Blue color channels.';
  public readonly iconName = 'Layers';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'offset',
      name: 'Dispersion Offset',
      type: 'range',
      min: 0,
      max: 30,
      step: 1,
      defaultValue: 8,
      unit: 'px',
      keyframeable: true,
    },
    {
      id: 'angle',
      name: 'Shift Angle',
      type: 'range',
      min: 0,
      max: 360,
      step: 5,
      defaultValue: 0,
      unit: 'deg',
    },
  ];

  public getDefaultParams(): Record<string, any> {
    return {
      offset: 8,
      angle: 0,
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
    const offset = (params.offset ?? 8) * opacity;
    if (offset <= 0.2) return;

    const angleRad = ((params.angle ?? 0) * Math.PI) / 180;
    const dx = Math.cos(angleRad) * offset;
    const dy = Math.sin(angleRad) * offset;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(ctx.canvas, 0, 0);

    ctx.save();
    // Red Channel Pass
    ctx.globalAlpha = 0.5 * opacity;
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(tempCanvas, dx, dy);

    // Cyan / Blue Channel Pass
    ctx.drawImage(tempCanvas, -dx, -dy);
    ctx.restore();
  }
}
