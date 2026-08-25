/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ITransition, TransitionType } from './TransitionTypes';

export class TransitionRegistry {
  private static instance: TransitionRegistry;
  private transitions: Map<TransitionType, ITransition> = new Map();

  private constructor() {
    this.registerDefaults();
  }

  public static getInstance(): TransitionRegistry {
    if (!TransitionRegistry.instance) {
      TransitionRegistry.instance = new TransitionRegistry();
    }
    return TransitionRegistry.instance;
  }

  private registerDefaults(): void {
    // 1. Cross Dissolve
    this.register({
      type: 'cross-dissolve',
      name: 'Cross Dissolve',
      description: 'Smooth optical alpha crossfade between scenes.',
      iconName: 'Blend',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const alpha = isFadeIn ? progress : 1.0 - progress;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 2. Fade to Black (Dip to Black)
    this.register({
      type: 'fade-black',
      name: 'Dip to Black',
      description: 'Dips down into black darkness before revealing next shot.',
      iconName: 'Moon',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const alpha = isFadeIn ? progress : 1.0 - progress;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 3. Fade to White (Dip to White)
    this.register({
      type: 'fade-white',
      name: 'Dip to White',
      description: 'Flashes into overexposed white before resolving.',
      iconName: 'Sun',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        ctx.save();
        ctx.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);
        const flashAlpha = isFadeIn ? 1.0 - progress : progress;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = Math.max(0, Math.min(1, flashAlpha));
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 4. Wipe Left
    this.register({
      type: 'wipe-left',
      name: 'Wipe Left',
      description: 'Directional horizontal wipe boundary from right to left.',
      iconName: 'ChevronLeft',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        ctx.save();
        ctx.beginPath();
        const visibleW = canvasWidth * t;
        ctx.rect(0, 0, visibleW, canvasHeight);
        ctx.clip();
        ctx.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 5. Wipe Right
    this.register({
      type: 'wipe-right',
      name: 'Wipe Right',
      description: 'Directional horizontal wipe boundary from left to right.',
      iconName: 'ChevronRight',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        ctx.save();
        ctx.beginPath();
        const startX = canvasWidth * (1.0 - t);
        ctx.rect(startX, 0, canvasWidth * t, canvasHeight);
        ctx.clip();
        ctx.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 6. Wipe Up
    this.register({
      type: 'wipe-up',
      name: 'Wipe Up',
      description: 'Vertical wipe upwards from bottom to top.',
      iconName: 'ChevronUp',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        ctx.save();
        ctx.beginPath();
        const visibleH = canvasHeight * t;
        ctx.rect(0, 0, canvasWidth, visibleH);
        ctx.clip();
        ctx.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 7. Wipe Down
    this.register({
      type: 'wipe-down',
      name: 'Wipe Down',
      description: 'Vertical wipe downwards from top to bottom.',
      iconName: 'ChevronDown',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        ctx.save();
        ctx.beginPath();
        const startY = canvasHeight * (1.0 - t);
        ctx.rect(0, startY, canvasWidth, canvasHeight * t);
        ctx.clip();
        ctx.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 8. Slide Left (Push)
    this.register({
      type: 'slide-left',
      name: 'Slide Left',
      description: 'Layer smoothly glides across the canvas along horizontal axis.',
      iconName: 'MoveLeft',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        const offsetX = isFadeIn ? canvasWidth * (1.0 - t) : -canvasWidth * (1.0 - t);
        ctx.save();
        ctx.drawImage(sourceCanvas, offsetX, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 9. Slide Right
    this.register({
      type: 'slide-right',
      name: 'Slide Right',
      description: 'Layer smoothly glides in from opposite boundary.',
      iconName: 'MoveRight',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        const offsetX = isFadeIn ? -canvasWidth * (1.0 - t) : canvasWidth * (1.0 - t);
        ctx.save();
        ctx.drawImage(sourceCanvas, offsetX, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 10. Zoom In
    this.register({
      type: 'zoom-in',
      name: 'Zoom In',
      description: 'Dynamic focal scaling transition entering smoothly.',
      iconName: 'Maximize',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        const scale = isFadeIn ? 0.6 + 0.4 * t : 1.0 + 0.4 * (1.0 - t);
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, t));
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.scale(scale, scale);
        ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        ctx.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 11. Zoom Out
    this.register({
      type: 'zoom-out',
      name: 'Zoom Out',
      description: 'Scales down from oversize into frame.',
      iconName: 'Minimize',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        const scale = isFadeIn ? 1.4 - 0.4 * t : 1.0 - 0.4 * (1.0 - t);
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, t));
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.scale(scale, scale);
        ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        ctx.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });
  }

  public register(transition: ITransition): void {
    this.transitions.set(transition.type, transition);
  }

  public getTransition(type: TransitionType): ITransition | undefined {
    return this.transitions.get(type);
  }

  public getAllTransitions(): ITransition[] {
    return Array.from(this.transitions.values());
  }
}
