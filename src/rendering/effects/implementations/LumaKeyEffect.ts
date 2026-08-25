/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class LumaKeyEffect implements IEffect {
  public readonly id = 'lumina.luma_key';
  public readonly name = 'Luma Key (Black/White Keyer)';
  public readonly category: EffectCategory = 'keying';
  public readonly description = 'Keys out shadows or highlights based on luminance thresholds.';
  public readonly iconName = 'Sun';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'keyMode',
      name: 'Key Mode',
      type: 'select',
      options: [
        { label: 'Key Out Shadows (Black)', value: 'shadows' },
        { label: 'Key Out Highlights (White)', value: 'highlights' },
      ],
      defaultValue: 'shadows',
    },
    {
      id: 'threshold',
      name: 'Luminance Threshold',
      type: 'range',
      min: 0.0,
      max: 1.0,
      step: 0.01,
      defaultValue: 0.15,
    },
    {
      id: 'softness',
      name: 'Transition Softness',
      type: 'range',
      min: 0.0,
      max: 0.5,
      step: 0.01,
      defaultValue: 0.1,
    },
  ];

  public getDefaultParams(): Record<string, any> {
    return {
      keyMode: 'shadows',
      threshold: 0.15,
      softness: 0.1,
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
    const isShadows = params.keyMode !== 'highlights';
    const thresh = params.threshold ?? 0.15;
    const softness = Math.max(0.001, params.softness ?? 0.1);

    const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      const luma = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      let alpha = 1.0;

      if (isShadows) {
        if (luma < thresh) {
          alpha = 0.0;
        } else if (luma < thresh + softness) {
          alpha = (luma - thresh) / softness;
        }
      } else {
        if (luma > thresh) {
          alpha = 0.0;
        } else if (luma > thresh - softness) {
          alpha = (thresh - luma) / softness;
        }
      }

      d[i + 3] = Math.round(d[i + 3] * (1 - opacity + opacity * alpha));
    }

    ctx.putImageData(imgData, 0, 0);
  }
}
