/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class ChromaKeyEffect implements IEffect {
  public readonly id = 'lumina.chroma_key';
  public readonly name = 'Chroma Key (Green/Blue Screen)';
  public readonly category: EffectCategory = 'keying';
  public readonly description = 'High-precision green/blue screen matte extraction with spill suppression.';
  public readonly iconName = 'Scissors';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'keyColor',
      name: 'Key Color',
      type: 'color',
      defaultValue: '#00ff00',
    },
    {
      id: 'tolerance',
      name: 'Color Tolerance',
      type: 'range',
      min: 0.05,
      max: 0.9,
      step: 0.01,
      defaultValue: 0.35,
    },
    {
      id: 'softness',
      name: 'Edge Softness',
      type: 'range',
      min: 0.0,
      max: 0.4,
      step: 0.01,
      defaultValue: 0.08,
    },
    {
      id: 'spillSuppression',
      name: 'Spill Suppression',
      type: 'range',
      min: 0.0,
      max: 1.0,
      step: 0.05,
      defaultValue: 0.7,
    },
  ];

  public getDefaultParams(): Record<string, any> {
    return {
      keyColor: '#00ff00',
      tolerance: 0.35,
      softness: 0.08,
      spillSuppression: 0.7,
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
    const keyHex = (params.keyColor || '#00ff00').replace('#', '');
    const keyR = parseInt(keyHex.substring(0, 2), 16) / 255;
    const keyG = parseInt(keyHex.substring(2, 4), 16) / 255;
    const keyB = parseInt(keyHex.substring(4, 6), 16) / 255;

    const tolerance = params.tolerance ?? 0.35;
    const softness = Math.max(0.001, params.softness ?? 0.08);
    const spill = params.spillSuppression ?? 0.7;

    const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255;
      const g = d[i + 1] / 255;
      const b = d[i + 2] / 255;

      // Euclidean distance to key color
      const dist = Math.sqrt((r - keyR) ** 2 + (g - keyG) ** 2 + (b - keyB) ** 2);

      let alpha = 1.0;
      if (dist < tolerance) {
        alpha = 0.0;
      } else if (dist < tolerance + softness) {
        alpha = (dist - tolerance) / softness;
      }

      // Despill green reflection on edges
      if (keyG > keyR && keyG > keyB && spill > 0) {
        const maxRB = Math.max(r, b);
        if (g > maxRB) {
          d[i + 1] = Math.round((g * (1 - spill) + maxRB * spill) * 255);
        }
      }

      d[i + 3] = Math.round(d[i + 3] * (1 - opacity + opacity * alpha));
    }

    ctx.putImageData(imgData, 0, 0);
  }
}
