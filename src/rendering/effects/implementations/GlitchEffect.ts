/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class GlitchEffect implements IEffect {
  public readonly id = 'lumina.glitch';
  public readonly name = 'Digital Signal Glitch';
  public readonly category: EffectCategory = 'distortion';
  public readonly description = 'Simulates digital video compression breakdown, slice shifts, and color tearing.';
  public readonly iconName = 'Zap';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'intensity',
      name: 'Glitch Intensity',
      type: 'range',
      min: 0.1,
      max: 2.0,
      step: 0.1,
      defaultValue: 0.8,
    },
    {
      id: 'speed',
      name: 'Glitch Frequency',
      type: 'range',
      min: 1,
      max: 30,
      step: 1,
      defaultValue: 10,
    },
  ];

  public getDefaultParams(): Record<string, any> {
    return { intensity: 0.8, speed: 10 };
  }

  public apply(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    params: Record<string, any>,
    timeSec: number,
    opacity = 1.0
  ): void {
    const intensity = (params.intensity ?? 0.8) * opacity;
    const speed = params.speed ?? 10;
    if (intensity <= 0) return;

    const seed = Math.floor(timeSec * speed);
    const numSlices = Math.floor(4 + (seed % 7) * intensity);

    const temp = document.createElement('canvas');
    temp.width = canvasWidth;
    temp.height = canvasHeight;
    const tCtx = temp.getContext('2d');
    if (!tCtx) return;
    tCtx.drawImage(ctx.canvas, 0, 0);

    for (let i = 0; i < numSlices; i++) {
      const sliceY = ((seed * (i + 1) * 37) % canvasHeight);
      const sliceH = Math.min(canvasHeight - sliceY, Math.floor(10 + (seed % 30) * intensity));
      const shiftX = Math.sin(seed + i * 2.3) * 35 * intensity;

      ctx.save();
      ctx.drawImage(temp, 0, sliceY, canvasWidth, sliceH, shiftX, sliceY, canvasWidth, sliceH);
      ctx.restore();
    }
  }
}
