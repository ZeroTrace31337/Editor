/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class FilmGrainEffect implements IEffect {
  public readonly id = 'lumina.film_grain';
  public readonly name = '35mm Film Grain';
  public readonly category: EffectCategory = 'stylize';
  public readonly description = 'Overlays organic randomized analog film silver-halide grain texture.';
  public readonly iconName = 'Sparkles';

  private noiseCanvas: HTMLCanvasElement | null = null;

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'intensity',
      name: 'Grain Intensity',
      type: 'range',
      min: 0,
      max: 1.0,
      step: 0.05,
      defaultValue: 0.25,
      keyframeable: true,
    },
    {
      id: 'grainSize',
      name: 'Grain Particle Size',
      type: 'range',
      min: 1,
      max: 4,
      step: 1,
      defaultValue: 1,
    },
    {
      id: 'animated',
      name: 'Dynamic Animation',
      type: 'boolean',
      defaultValue: true,
    },
  ];

  public getDefaultParams(): Record<string, any> {
    return {
      intensity: 0.25,
      grainSize: 1,
      animated: true,
    };
  }

  public apply(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    params: Record<string, any>,
    timeSec: number,
    opacity = 1.0
  ): void {
    const intensity = (params.intensity ?? 0.25) * opacity;
    if (intensity <= 0.01) return;

    const grainSize = Math.max(1, params.grainSize ?? 1);
    const noiseWidth = Math.ceil(canvasWidth / (grainSize * 2));
    const noiseHeight = Math.ceil(canvasHeight / (grainSize * 2));

    if (!this.noiseCanvas) {
      this.noiseCanvas = document.createElement('canvas');
    }
    this.noiseCanvas.width = noiseWidth;
    this.noiseCanvas.height = noiseHeight;
    const nCtx = this.noiseCanvas.getContext('2d');
    if (!nCtx) return;

    const imgData = nCtx.createImageData(noiseWidth, noiseHeight);
    const data = imgData.data;
    const len = data.length;

    // Seeded by timeSec if animated
    const seed = params.animated ? Math.floor(timeSec * 24) : 42;
    let rnd = (seed * 9301 + 49297) % 233280;

    for (let i = 0; i < len; i += 4) {
      rnd = (rnd * 9301 + 49297) % 233280;
      const val = (rnd / 233280) * 255;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }
    nCtx.putImageData(imgData, 0, 0);

    ctx.save();
    ctx.globalAlpha = intensity * 0.45;
    ctx.globalCompositeOperation = 'overlay';
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.noiseCanvas, 0, 0, canvasWidth, canvasHeight);
    ctx.restore();
  }
}
