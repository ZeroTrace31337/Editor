/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory, EffectParamDef } from '../EffectTypes';

export class BodyOutlineGlowEffect implements IEffect {
  public readonly id = 'body-outline-glow';
  public readonly name = 'Body Tracking Aura';
  public readonly category: EffectCategory = 'tracking';
  public readonly description = 'Dynamic luminescent neon outline aura hugging silhouettes.';
  public readonly iconName = 'User';

  public readonly parameters: EffectParamDef[] = [
    {
      id: 'glowColor',
      name: 'Aura Color',
      type: 'color',
      defaultValue: '#38bdf8',
    },
    {
      id: 'glowRadius',
      name: 'Aura Thickness',
      type: 'range',
      min: 2,
      max: 40,
      step: 1,
      defaultValue: 16,
      unit: 'px',
    },
    {
      id: 'pulseSpeed',
      name: 'Pulse Speed',
      type: 'range',
      min: 0,
      max: 10,
      step: 0.5,
      defaultValue: 3,
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
    const pulseSpeed = params.pulseSpeed ?? 3;
    const pulse = 0.7 + 0.3 * Math.sin(timeSec * pulseSpeed);
    const radius = (params.glowRadius ?? 16) * pulse * opacity;
    const color = params.glowColor ?? '#38bdf8';

    if (radius <= 0) return;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = radius * 1.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, radius * 0.25);
    ctx.globalAlpha = opacity * 0.85;

    // Draw stylized silhouette body outline
    const cx = canvasWidth / 2;
    const cy = canvasHeight * 0.55;
    const headRadius = canvasHeight * 0.12;

    ctx.beginPath();
    // Head aura
    ctx.arc(cx, cy - headRadius * 1.8, headRadius, 0, Math.PI * 2);
    // Torso and shoulder sweep
    ctx.moveTo(cx - headRadius * 2.2, cy + headRadius * 2.2);
    ctx.quadraticCurveTo(cx - headRadius * 1.5, cy - headRadius * 0.5, cx - headRadius * 0.8, cy - headRadius * 0.7);
    ctx.lineTo(cx + headRadius * 0.8, cy - headRadius * 0.7);
    ctx.quadraticCurveTo(cx + headRadius * 1.5, cy - headRadius * 0.5, cx + headRadius * 2.2, cy + headRadius * 2.2);
    ctx.stroke();

    ctx.restore();
  }

  public getDefaultParams(): Record<string, any> {
    return { glowColor: '#38bdf8', glowRadius: 16, pulseSpeed: 3 };
  }
}
