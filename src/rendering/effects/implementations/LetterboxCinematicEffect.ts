/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class LetterboxCinematicEffect implements IEffect {
  public readonly id = 'cinematic-letterbox';
  public readonly name = 'Cinemascope Letterbox';
  public readonly category: EffectCategory = 'cinematic';
  public readonly description = 'Classic 2.39:1 widescreen anamorphic black matte bars.';
  public readonly iconName = 'Film';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'aspectRatio',
      name: 'Aspect Format',
      type: 'select',
      options: [
        { label: '2.39:1 Anamorphic', value: '2.39' },
        { label: '2.00:1 Univisium', value: '2.00' },
        { label: '1.85:1 Academy Flat', value: '1.85' },
        { label: '4:3 Classic TV', value: '1.33' },
      ],
      defaultValue: '2.39',
    },
    {
      id: 'barColor',
      name: 'Matte Color',
      type: 'color',
      defaultValue: '#000000',
    },
  ];

  public apply(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    params: Record<string, any>,
    _timeSec: number,
    opacity = 1.0
  ): void {
    if (opacity <= 0) return;
    const ratioStr = params.aspectRatio ?? '2.39';
    const targetRatio = parseFloat(ratioStr);
    const currentRatio = canvasWidth / canvasHeight;

    ctx.save();
    ctx.fillStyle = params.barColor ?? '#000000';
    ctx.globalAlpha = opacity;

    if (currentRatio < targetRatio) {
      // Horizontal bars top/bottom
      const activeHeight = canvasWidth / targetRatio;
      const barHeight = (canvasHeight - activeHeight) / 2;
      if (barHeight > 0) {
        ctx.fillRect(0, 0, canvasWidth, barHeight);
        ctx.fillRect(0, canvasHeight - barHeight, canvasWidth, barHeight);
      }
    } else {
      // Vertical pillarboxes
      const activeWidth = canvasHeight * targetRatio;
      const barWidth = (canvasWidth - activeWidth) / 2;
      if (barWidth > 0) {
        ctx.fillRect(0, 0, barWidth, canvasHeight);
        ctx.fillRect(canvasWidth - barWidth, 0, barWidth, canvasHeight);
      }
    }

    ctx.restore();
  }

  public getDefaultParams(): Record<string, any> {
    return { aspectRatio: '2.39', barColor: '#000000' };
  }
}
