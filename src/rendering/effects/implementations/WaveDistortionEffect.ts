/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class WaveDistortionEffect implements IEffect {
  public readonly id = 'wave-distortion';
  public readonly name = 'Wave Warp';
  public readonly category: EffectCategory = 'distortion';
  public readonly description = 'Liquid wave ripple distortion effect.';
  public readonly iconName = 'Waves';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'frequency',
      name: 'Frequency',
      type: 'range',
      min: 1,
      max: 50,
      step: 1,
      defaultValue: 10,
    },
    {
      id: 'amplitude',
      name: 'Amplitude',
      type: 'range',
      min: 0,
      max: 50,
      step: 1,
      defaultValue: 15,
      unit: 'px',
    },
    {
      id: 'speed',
      name: 'Speed',
      type: 'range',
      min: 0,
      max: 10,
      step: 0.5,
      defaultValue: 2,
    },
  ];

  public apply(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    params: Record<string, any>,
    timeSec: number,
    opacity = 1.0
  ): void {
    const amplitude = (params.amplitude ?? 15) * opacity;
    if (amplitude <= 0) return;

    const frequency = params.frequency ?? 10;
    const speed = params.speed ?? 2;

    const offscreen = document.createElement('canvas');
    offscreen.width = canvasWidth;
    offscreen.height = canvasHeight;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    offCtx.drawImage(ctx.canvas, 0, 0);

    const slices = 40;
    const sliceHeight = canvasHeight / slices;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    for (let i = 0; i < slices; i++) {
      const y = i * sliceHeight;
      const offset = Math.sin((i / slices) * frequency + timeSec * speed) * amplitude;
      ctx.drawImage(
        offscreen,
        0,
        y,
        canvasWidth,
        sliceHeight,
        offset,
        y,
        canvasWidth,
        sliceHeight
      );
    }
  }

  public getDefaultParams(): Record<string, any> {
    return { frequency: 10, amplitude: 15, speed: 2 };
  }
}
