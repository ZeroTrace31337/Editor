/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class AISceneRelightEffect implements IEffect {
  public readonly id = 'ai-relight';
  public readonly name = 'AI Virtual Keylight';
  public readonly category: EffectCategory = 'ai';
  public readonly description = 'Intelligent directional studio light simulation.';
  public readonly iconName = 'Sparkles';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'lightColor',
      name: 'Light Color',
      type: 'color',
      defaultValue: '#fef08a',
    },
    {
      id: 'intensity',
      name: 'Light Intensity',
      type: 'range',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50,
      unit: '%',
    },
    {
      id: 'position',
      name: 'Light Source Angle',
      type: 'range',
      min: 0,
      max: 360,
      step: 5,
      defaultValue: 45,
      unit: 'deg',
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
    const intensity = ((params.intensity ?? 50) / 100) * opacity;
    if (intensity <= 0) return;

    const angleDeg = params.position ?? 45;
    const angleRad = (angleDeg * Math.PI) / 180;
    const color = params.lightColor ?? '#fef08a';

    const sourceX = canvasWidth / 2 + Math.cos(angleRad) * (canvasWidth * 0.45);
    const sourceY = canvasHeight / 2 + Math.sin(angleRad) * (canvasHeight * 0.45);

    const grad = ctx.createRadialGradient(
      sourceX,
      sourceY,
      10,
      sourceX,
      sourceY,
      canvasWidth * 0.75
    );

    grad.addColorStop(0, color);
    grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = intensity;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();
  }

  public getDefaultParams(): Record<string, any> {
    return { lightColor: '#fef08a', intensity: 50, position: 45 };
  }
}
