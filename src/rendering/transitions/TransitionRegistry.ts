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

    // 12. Cut
    this.register({
      type: 'cut',
      name: 'Hard Cut',
      description: 'Direct cut with no intermediate interpolation.',
      iconName: 'Scissors',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        if (isFadeIn ? progress >= 0.5 : progress < 0.5) {
          ctx.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);
        }
      },
    });

    // 13. Push
    this.register({
      type: 'push',
      name: 'Push Transition',
      description: 'Pushes the current scene aside as the new clip enters.',
      iconName: 'MoveRight',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        const offsetX = isFadeIn ? canvasWidth * (1.0 - t) : -canvasWidth * t;
        ctx.save();
        ctx.drawImage(sourceCanvas, offsetX, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 14. Camera Pan (Motion)
    this.register({
      type: 'camera-pan',
      name: 'Camera Pan',
      description: 'Fast directional camera whip movement across frame.',
      iconName: 'Camera',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        const panX = isFadeIn ? (1.0 - t) * canvasWidth * 0.8 : -t * canvasWidth * 0.8;
        const blurAmt = Math.sin(t * Math.PI) * 12;
        ctx.save();
        ctx.filter = `blur(${blurAmt}px)`;
        ctx.drawImage(sourceCanvas, panX, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 15. Spin (Motion)
    this.register({
      type: 'spin',
      name: 'Spin Vortex',
      description: 'Rotational vortex transition entering or leaving frame.',
      iconName: 'RotateCw',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        const angle = (1.0 - t) * Math.PI * (isFadeIn ? -1 : 1);
        const scale = 0.5 + 0.5 * t;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, t));
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.rotate(angle);
        ctx.scale(scale, scale);
        ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        ctx.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 16. Shake (Motion)
    this.register({
      type: 'shake',
      name: 'Earthquake Shake',
      description: 'Intense kinetic camera rumble during scene boundary.',
      iconName: 'Activity',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        const intensity = Math.sin(t * Math.PI) * 20;
        const shakeX = (Math.sin(progress * 40) * intensity);
        const shakeY = (Math.cos(progress * 35) * intensity);
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, t));
        ctx.drawImage(sourceCanvas, shakeX, shakeY, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 17. Whip Pan (Motion)
    this.register({
      type: 'whip-pan',
      name: 'Whip Pan Snap',
      description: 'High-speed motion-blurred horizontal camera whip.',
      iconName: 'Zap',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        const ease = Math.pow(t, 3);
        const offsetX = isFadeIn ? (1.0 - ease) * canvasWidth : -ease * canvasWidth;
        ctx.save();
        ctx.filter = `blur(${Math.sin(t * Math.PI) * 16}px)`;
        ctx.drawImage(sourceCanvas, offsetX, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 18. Swipe (Motion)
    this.register({
      type: 'swipe',
      name: 'Diagonal Swipe',
      description: 'Dynamic diagonal angle swipe across viewport.',
      iconName: 'MoveUpRight',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        const offset = (1.0 - t) * canvasWidth;
        ctx.save();
        ctx.drawImage(sourceCanvas, offset, offset * 0.5, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 19. Roll (Motion)
    this.register({
      type: 'roll',
      name: 'Barrel Roll',
      description: 'Dynamic 360-degree barrel roll rotation.',
      iconName: 'RotateCcw',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        const angle = (1.0 - t) * Math.PI * 2;
        ctx.save();
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.rotate(angle);
        ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        ctx.globalAlpha = Math.max(0, Math.min(1, t));
        ctx.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 20. Bounce Transition (Motion)
    this.register({
      type: 'bounce-trans',
      name: 'Spring Bounce',
      description: 'Elastic overshoot spring transition effect.',
      iconName: 'Sparkle',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        const bounce = Math.sin(t * Math.PI * 2.5) * Math.exp(-t * 3) * 0.3;
        const scale = Math.max(0.1, t + bounce);
        ctx.save();
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.scale(scale, scale);
        ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        ctx.globalAlpha = Math.max(0, Math.min(1, t));
        ctx.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 21. Glitch Transition (Stylized)
    this.register({
      type: 'glitch-trans',
      name: 'Cyber Glitch',
      description: 'Digital matrix distortion with RGB offset slicing.',
      iconName: 'Zap',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, t));
        const numSlices = 8;
        const sliceH = canvasHeight / numSlices;
        for (let i = 0; i < numSlices; i++) {
          const glitchOffset = (Math.random() - 0.5) * (1.0 - t) * 60;
          ctx.drawImage(
            sourceCanvas,
            0,
            i * sliceH,
            canvasWidth,
            sliceH,
            glitchOffset,
            i * sliceH,
            canvasWidth,
            sliceH
          );
        }
        ctx.restore();
      },
    });

    // 22. Flash Color (Stylized)
    this.register({
      type: 'flash-color',
      name: 'Color Flash Strobe',
      description: 'Vibrant neon color strobe flash reveal.',
      iconName: 'Sun',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        ctx.save();
        ctx.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);
        const flashAlpha = Math.sin(progress * Math.PI);
        ctx.fillStyle = '#38bdf8';
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = Math.max(0, Math.min(1, flashAlpha * 0.8));
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 23. Light Leak (Stylized)
    this.register({
      type: 'light-leak',
      name: 'Vintage Light Leak',
      description: 'Warm organic 35mm film burn lens flare.',
      iconName: 'Sun',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, t));
        ctx.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);

        const leakGrad = ctx.createRadialGradient(
          canvasWidth * progress,
          canvasHeight * 0.3,
          10,
          canvasWidth * progress,
          canvasHeight * 0.3,
          canvasWidth * 0.7
        );
        leakGrad.addColorStop(0, 'rgba(255, 120, 30, 0.75)');
        leakGrad.addColorStop(0.5, 'rgba(255, 60, 150, 0.4)');
        leakGrad.addColorStop(1, 'rgba(255, 200, 50, 0)');

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = leakGrad;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 24. RGB Split (Stylized)
    this.register({
      type: 'rgb-split',
      name: 'RGB Chromatic Split',
      description: 'Anaglyph chromatic aberration channel separation.',
      iconName: 'Layers',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        const shift = (1.0 - t) * 20;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, t));
        ctx.drawImage(sourceCanvas, -shift, 0, canvasWidth, canvasHeight);
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(sourceCanvas, shift, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 25. Blur Dissolve (Stylized)
    this.register({
      type: 'blur-dissolve',
      name: 'Gaussian Blur Dissolve',
      description: 'Dreamy optical defocus blur transition.',
      iconName: 'Droplet',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        const blurRadius = (1.0 - t) * 24;
        ctx.save();
        ctx.filter = `blur(${blurRadius}px)`;
        ctx.globalAlpha = Math.max(0, Math.min(1, t));
        ctx.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 26. Distortion Warp (Stylized)
    this.register({
      type: 'distortion-warp',
      name: 'Liquid Warp Wave',
      description: 'Fluid waveform liquid warping across boundaries.',
      iconName: 'Waves',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        const scale = 1.0 + Math.sin(t * Math.PI) * 0.2;
        ctx.save();
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.scale(scale, 1 / scale);
        ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        ctx.globalAlpha = Math.max(0, Math.min(1, t));
        ctx.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 27. 3D Cube Flip (Stylized)
    this.register({
      type: 'cube-3d',
      name: '3D Perspective Flip',
      description: 'Three-dimensional perspective rotation.',
      iconName: 'Box',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        const scaleX = Math.cos((1.0 - t) * Math.PI * 0.5);
        ctx.save();
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.scale(Math.max(0.01, scaleX), 1.0);
        ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        ctx.globalAlpha = Math.max(0, Math.min(1, t));
        ctx.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 28. Mask Transition (Advanced)
    this.register({
      type: 'mask-transition',
      name: 'Geometric Mask Reveal',
      description: 'Expanding radial aperture geometric mask.',
      iconName: 'Circle',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        const maxRadius = Math.hypot(canvasWidth / 2, canvasHeight / 2);
        const radius = t * maxRadius;
        ctx.save();
        ctx.beginPath();
        ctx.arc(canvasWidth / 2, canvasHeight / 2, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 29. AI Seamless (Advanced)
    this.register({
      type: 'ai-seamless',
      name: 'AI Flow Morph',
      description: 'Intelligent optical flow motion seamless morphing.',
      iconName: 'Sparkles',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        const zoom = 1.0 + (1.0 - t) * 0.15;
        ctx.save();
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        ctx.globalAlpha = Math.max(0, Math.min(1, t));
        ctx.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      },
    });

    // 30. Beat Snap (Advanced)
    this.register({
      type: 'beat-snap',
      name: 'Beat Impact Flash',
      description: 'Rhythmic bass impact snap with sudden strobe.',
      iconName: 'Music',
      apply: (ctx, sourceCanvas, progress, canvasWidth, canvasHeight, isFadeIn) => {
        const t = isFadeIn ? progress : 1.0 - progress;
        const pop = 1.0 + Math.sin(t * Math.PI) * 0.1;
        ctx.save();
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.scale(pop, pop);
        ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        ctx.globalAlpha = Math.max(0, Math.min(1, t));
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
