/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class MotionBlurEffect implements IEffect {
  public readonly id = 'lumina.motion_blur';
  public readonly name = 'Directional Motion Blur';
  public readonly category: EffectCategory = 'blur';
  public readonly description = 'Simulates camera or velocity shutter motion blur along a customizable angle.';
  public readonly iconName = 'Wind';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'distance',
      name: 'Blur Distance',
      type: 'range',
      min: 1,
      max: 60,
      step: 1,
      defaultValue: 15,
      unit: 'px',
    },
    {
      id: 'angle',
      name: 'Motion Angle',
      type: 'range',
      min: 0,
      max: 360,
      step: 1,
      defaultValue: 0,
      unit: '°',
    },
  ];

  public getDefaultParams(): Record<string, any> {
    return { distance: 15, angle: 0 };
  }

  public apply(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    params: Record<string, any>,
    timeSec: number,
    opacity = 1.0
  ): void {
    const dist = (params.distance ?? 15) * opacity;
    const angleRad = ((params.angle ?? 0) * Math.PI) / 180;
    if (dist <= 0) return;

    const dx = Math.cos(angleRad);
    const dy = Math.sin(angleRad);
    const samples = Math.min(16, Math.max(4, Math.floor(dist)));

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;
    const tCtx = tempCanvas.getContext('2d');
    if (!tCtx) return;

    tCtx.drawImage(ctx.canvas, 0, 0);

    ctx.save();
    ctx.globalAlpha = 1.0 / samples;
    for (let i = 1; i <= samples; i++) {
      const offset = (i / samples - 0.5) * dist;
      ctx.drawImage(tempCanvas, dx * offset, dy * offset);
    }
    ctx.restore();
  }
}
