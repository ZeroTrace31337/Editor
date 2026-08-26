/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class VHSRetroEffect implements IEffect {
  public readonly id = 'vhs-retro';
  public readonly name = 'VHS 80s Tape';
  public readonly category: EffectCategory = 'retro';
  public readonly description = 'Nostalgic 1980s analog tape distortion, chroma noise, and static lines.';
  public readonly iconName = 'Video';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'noise',
      name: 'Tape Noise',
      type: 'range',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50,
      unit: '%',
    },
    {
      id: 'trackingJitter',
      name: 'Tracking Jitter',
      type: 'range',
      min: 0,
      max: 30,
      step: 1,
      defaultValue: 10,
      unit: 'px',
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
    const noise = ((params.noise ?? 50) / 100) * opacity;
    const jitter = (params.trackingJitter ?? 10) * opacity;

    ctx.save();

    // 1. Horizontal static jitter band
    if (jitter > 0) {
      const bandY = ((timeSec * 0.4) % 1.0) * canvasHeight;
      const bandH = 30 + Math.random() * 20;
      const offscreen = document.createElement('canvas');
      offscreen.width = canvasWidth;
      offscreen.height = canvasHeight;
      const offCtx = offscreen.getContext('2d');
      if (offCtx) {
        offCtx.drawImage(ctx.canvas, 0, 0);
        const shift = (Math.random() - 0.5) * jitter * 2;
        ctx.drawImage(offscreen, 0, bandY, canvasWidth, bandH, shift, bandY, canvasWidth, bandH);
      }
    }

    // 2. Analog scanlines
    ctx.fillStyle = `rgba(0, 0, 0, ${noise * 0.25})`;
    for (let y = 0; y < canvasHeight; y += 3) {
      ctx.fillRect(0, y, canvasWidth, 1);
    }

    // 3. VHS Color tint overlay
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = `rgba(50, 30, 90, ${noise * 0.3})`;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.restore();
  }

  public getDefaultParams(): Record<string, any> {
    return { noise: 50, trackingJitter: 10 };
  }
}
