/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class FisheyeEffect implements IEffect {
  public readonly id = 'lumina.fisheye';
  public readonly name = 'Fisheye & Barrel Distortion';
  public readonly category: EffectCategory = 'distortion';
  public readonly description = 'Simulates an ultra-wide angle curved fisheye camera lens.';
  public readonly iconName = 'Eye';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'strength',
      name: 'Lens Curvature',
      type: 'range',
      min: -1.0,
      max: 2.0,
      step: 0.05,
      defaultValue: 0.6,
    },
  ];

  public getDefaultParams(): Record<string, any> {
    return { strength: 0.6 };
  }

  public apply(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    params: Record<string, any>,
    timeSec: number,
    opacity = 1.0
  ): void {
    const strength = (params.strength ?? 0.6) * opacity;
    if (Math.abs(strength) < 0.01) return;

    const srcData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const dstData = ctx.createImageData(canvasWidth, canvasHeight);
    const src = srcData.data;
    const dst = dstData.data;

    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);

    for (let y = 0; y < canvasHeight; y++) {
      for (let x = 0; x < canvasWidth; x++) {
        const dx = (x - cx) / cx;
        const dy = (y - cy) / cy;
        const r = Math.sqrt(dx * dx + dy * dy);

        let nr = r;
        if (r < 1.0) {
          nr = r * (1.0 + strength * r * r);
        }

        const sx = Math.round(cx + (dx / (r || 1)) * nr * cx);
        const sy = Math.round(cy + (dy / (r || 1)) * nr * cy);

        const dIdx = (y * canvasWidth + x) * 4;
        if (sx >= 0 && sx < canvasWidth && sy >= 0 && sy < canvasHeight) {
          const sIdx = (sy * canvasWidth + sx) * 4;
          dst[dIdx] = src[sIdx];
          dst[dIdx + 1] = src[sIdx + 1];
          dst[dIdx + 2] = src[sIdx + 2];
          dst[dIdx + 3] = src[sIdx + 3];
        }
      }
    }

    ctx.putImageData(dstData, 0, 0);
  }
}
