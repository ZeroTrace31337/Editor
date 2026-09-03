/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RationalTime, rationalTimeToSeconds } from '../../core/time/RationalTime';
import { TimelineClip, VideoClip, ImageClip, TextClip } from '../../domain/timeline/Clip';
import { MediaRegistry } from '../../engine/media/MediaRegistry';
import { Sequence } from '../../domain/timeline/Sequence';
import { RenderGraphCompiler } from '../instructions/RenderGraphCompiler';
import { RenderInstructionTree, ClipRenderInstruction } from '../instructions/RenderInstruction';
import { applyTransformMatrix } from '../../core/math/Transform2D';
import { ColorEngine } from '../color/ColorEngine';
import { MaskRenderer } from '../mask/MaskRenderer';
import { EffectRegistry } from '../effects/EffectRegistry';
import { TransitionRegistry } from '../transitions/TransitionRegistry';
import { RenderCache } from '../cache/RenderCache';
import { StabilizationEngine } from '../../engine/stabilization/StabilizationEngine';
import { ChromaKeyRenderer } from '../chroma/ChromaKeyRenderer';
import { TrackingEngine } from '../../engine/tracking/TrackingEngine';
import { SmoothSlowMoEngine } from '../../engine/speed/SmoothSlowMoEngine';
import { VideoPlaybackManager } from '../playback/VideoPlaybackManager';
import { PlaybackDiagnostics } from '../playback/PlaybackDiagnostics';

export class CanvasCompositor {
  private mediaRegistry: MediaRegistry;
  private effectRegistry = EffectRegistry.getInstance();
  private transitionRegistry = TransitionRegistry.getInstance();
  private renderCache = RenderCache.getInstance();
  private videoPlaybackManager = VideoPlaybackManager.getInstance();
  private diagnostics = PlaybackDiagnostics.getInstance();

  private videoElementPool: Map<string, HTMLVideoElement> = new Map();
  private imageElementPool: Map<string, HTMLImageElement> = new Map();
  private layerCanvas: HTMLCanvasElement;
  private layerCtx: CanvasRenderingContext2D | null;
  private isPlaying: boolean = false;

  constructor(mediaRegistry: MediaRegistry) {
    this.mediaRegistry = mediaRegistry;
    this.layerCanvas = document.createElement('canvas');
    this.layerCtx = this.layerCanvas.getContext('2d');
  }

  public setIsPlaying(isPlaying: boolean): void {
    this.isPlaying = isPlaying;
  }

  /**
   * Evaluates the sequence at the given timestamp and renders onto target Canvas.
   */
  public renderSequence(
    ctx: CanvasRenderingContext2D,
    sequence: Sequence,
    currentTime: RationalTime,
    canvasWidth: number,
    canvasHeight: number,
    bypassColorGradeAndEffects = false,
    isPlaying = false
  ): void {
    this.isPlaying = isPlaying;
    const frameStart = this.diagnostics.recordFrameStart();
    const tCompileStart = performance.now();

    // 1. Compile Render Graph into pure instruction tree
    const instructionTree = RenderGraphCompiler.compile(sequence, currentTime, canvasWidth, canvasHeight);
    const compileTimeMs = performance.now() - tCompileStart;

    // 2. Execute Render Instructions
    const tRenderStart = performance.now();
    this.executeInstructionTree(ctx, instructionTree, bypassColorGradeAndEffects);
    const renderTimeMs = performance.now() - tRenderStart;

    this.diagnostics.recordFrameEnd(frameStart, {
      timelineMs: compileTimeMs,
      renderMs: renderTimeMs,
    });
  }

  /**
   * Executes a pre-compiled RenderInstructionTree.
   * This exact same method is executed for both interactive preview and final video export!
   */
  public executeInstructionTree(
    ctx: CanvasRenderingContext2D,
    tree: RenderInstructionTree,
    bypassColorGradeAndEffects = false
  ): void {
    const { width, height, instructions, timestamp } = tree;

    // Ensure layer canvas matches target size
    if (this.layerCanvas.width !== width || this.layerCanvas.height !== height) {
      this.layerCanvas.width = width;
      this.layerCanvas.height = height;
    }

    for (const instruction of instructions) {
      if (instruction.kind === 'clear') {
        ctx.save();
        ctx.fillStyle = instruction.color;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      } else if (instruction.kind === 'clip') {
        this.renderClipLayer(ctx, instruction, width, height, timestamp, bypassColorGradeAndEffects);
      }
    }
  }

  /**
   * Renders a single clip layer with transform, color grade, effects stack, blend mode, and transitions.
   */
  private renderClipLayer(
    ctx: CanvasRenderingContext2D,
    instr: ClipRenderInstruction,
    canvasWidth: number,
    canvasHeight: number,
    currentTime: RationalTime,
    bypassColorGradeAndEffects = false
  ): void {
    if (!this.layerCtx) return;

    // Clear temporary layer canvas
    this.layerCtx.save();
    this.layerCtx.clearRect(0, 0, canvasWidth, canvasHeight);

    const { clip, evaluatedTransform, evaluatedColorGrade, evaluatedEffects, evaluatedMasks, evaluatedOpacity, blendMode, sourceSeconds } = instr;

    // Check if clip follows a motion track
    let finalTransform = { ...evaluatedTransform };
    if (clip.attachedToClipId) {
      const trackingEngine = TrackingEngine.getInstance();
      const currentSec = rationalTimeToSeconds(currentTime);
      const trackPoint = trackingEngine.evaluateTrackAtTime(clip.attachedToClipId, currentSec, clip.attachedToTrackId);
      if (trackPoint) {
        finalTransform = {
          ...finalTransform,
          position: {
            x: (trackPoint.x - 0.5) * canvasWidth,
            y: (trackPoint.y - 0.5) * canvasHeight,
          },
          rotation: finalTransform.rotation + trackPoint.rotation,
          scale: {
            x: finalTransform.scale.x * trackPoint.scale,
            y: finalTransform.scale.y * trackPoint.scale,
          },
        };
      }
    }

    // 1. Render Base Media / Text / Adjustment content onto layer context
    if (clip.type === 'video') {
      this.drawVideo(this.layerCtx, canvasWidth, canvasHeight, clip as VideoClip, sourceSeconds, finalTransform);
    } else if (clip.type === 'image') {
      this.drawImage(this.layerCtx, canvasWidth, canvasHeight, clip as ImageClip, finalTransform);
    } else if (clip.type === 'text') {
      this.drawText(this.layerCtx, canvasWidth, canvasHeight, clip as TextClip, finalTransform, sourceSeconds);
    } else if (clip.type === 'adjustment') {
      // Snapshot the current canvas below this layer so effects/grade apply to everything beneath
      this.layerCtx.drawImage(ctx.canvas, 0, 0, canvasWidth, canvasHeight);
    }

    // 1b. Apply Real-time Chroma Keying & Background Matting
    if (clip.chromaKey && clip.chromaKey.enabled) {
      ChromaKeyRenderer.applyChromaKey(this.layerCtx, canvasWidth, canvasHeight, clip.chromaKey);
    }

    if (!bypassColorGradeAndEffects) {
      // 2. Apply Color Grading (Color Wheels, Curves, HSL, LUT, Temp/Tint)
      ColorEngine.applyColorGrade(this.layerCtx, canvasWidth, canvasHeight, evaluatedColorGrade);

      // 3. Apply Sequential Effects Stack
      const timeSec = sourceSeconds;
      for (const fxInstance of evaluatedEffects) {
        if (!fxInstance.enabled) continue;
        const effectDef = this.effectRegistry.getEffect(fxInstance.effectId);
        if (effectDef) {
          effectDef.apply(this.layerCtx, canvasWidth, canvasHeight, fxInstance.params, timeSec, fxInstance.opacity ?? 1.0);
        }
      }
    }

    // 4. Apply Mask clipping (supports rectangle, ellipse, bezier, feather, invert, combine modes)
    if (evaluatedMasks && evaluatedMasks.length > 0) {
      const currentSec = rationalTimeToSeconds(currentTime);
      MaskRenderer.applyMasks(this.layerCtx, evaluatedMasks, canvasWidth, canvasHeight, currentSec);
    }

    this.layerCtx.restore();

    // 5. Handle Active Transitions (In / Out) or Composite directly to main Canvas
    ctx.save();
    ctx.globalAlpha = evaluatedOpacity;
    ctx.globalCompositeOperation = blendMode || 'source-over';

    if (instr.transitionIn) {
      const trans = this.transitionRegistry.getTransition(instr.transitionIn.transition.type);
      if (trans) {
        trans.apply(ctx, this.layerCanvas, instr.transitionIn.progress, canvasWidth, canvasHeight, true);
        ctx.restore();
        return;
      }
    }

    if (instr.transitionOut) {
      const trans = this.transitionRegistry.getTransition(instr.transitionOut.transition.type);
      if (trans) {
        trans.apply(ctx, this.layerCanvas, instr.transitionOut.progress, canvasWidth, canvasHeight, false);
        ctx.restore();
        return;
      }
    }

    // Standard Direct Composite
    ctx.drawImage(this.layerCanvas, 0, 0, canvasWidth, canvasHeight);
    ctx.restore();
  }

  private drawVideo(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    clip: VideoClip,
    sourceSeconds: number,
    transform: any
  ): void {
    const asset = this.mediaRegistry.getAsset(clip.mediaAssetId);
    if (!asset || asset.isOffline) {
      this.drawOfflinePlaceholder(ctx, canvasWidth, canvasHeight, clip.name);
      return;
    }

    const video = this.videoPlaybackManager.getVideoElement(asset);
    this.videoPlaybackManager.syncVideoPlayback(
      video,
      sourceSeconds,
      this.isPlaying,
      clip.speed ?? 1.0
    );

    const mediaWidth = asset.videoMetadata?.width || canvasWidth;
    const mediaHeight = asset.videoMetadata?.height || canvasHeight;

    let effectiveTransform = { ...transform };

    // Apply real-time optical flow & gyro stabilization compensation
    if (clip.stabilization && clip.stabilization.enabled) {
      const stabEngine = StabilizationEngine.getInstance();
      const stabData = stabEngine.evaluateStabilization(clip.id, sourceSeconds, canvasWidth, canvasHeight);
      if (!stabData.isBypassed) {
        effectiveTransform = {
          ...effectiveTransform,
          position: {
            x: (effectiveTransform.position?.x || 0) + stabData.offsetX,
            y: (effectiveTransform.position?.y || 0) + stabData.offsetY,
          },
          rotation: (effectiveTransform.rotation || 0) + stabData.rotation,
          scale: {
            x: (effectiveTransform.scale?.x || 1.0) * stabData.scale,
            y: (effectiveTransform.scale?.y || 1.0) * stabData.scale,
          },
        };
      }
    }

    ctx.save();
    applyTransformMatrix(ctx, effectiveTransform, canvasWidth, canvasHeight, mediaWidth, mediaHeight);
    try {
      // Evaluate smooth optical-flow interpolated frame if active
      const slowMoEngine = SmoothSlowMoEngine.getInstance();
      const renderSource = slowMoEngine.getInterpolatedFrame(video, clip, sourceSeconds, mediaWidth, mediaHeight);
      ctx.drawImage(renderSource, 0, 0, mediaWidth, mediaHeight);
    } catch {
      try {
        ctx.drawImage(video, 0, 0, mediaWidth, mediaHeight);
      } catch {}
    }
    ctx.restore();
  }

  private drawImage(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    clip: ImageClip,
    transform: any
  ): void {
    const asset = this.mediaRegistry.getAsset(clip.mediaAssetId);
    if (!asset || asset.isOffline) {
      this.drawOfflinePlaceholder(ctx, canvasWidth, canvasHeight, clip.name);
      return;
    }

    let img = this.imageElementPool.get(asset.id);
    if (!img) {
      img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = asset.uri;
      this.imageElementPool.set(asset.id, img);
    }

    const mediaWidth = asset.videoMetadata?.width || img.naturalWidth || canvasWidth;
    const mediaHeight = asset.videoMetadata?.height || img.naturalHeight || canvasHeight;

    ctx.save();
    applyTransformMatrix(ctx, transform, canvasWidth, canvasHeight, mediaWidth, mediaHeight);
    try {
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, 0, 0, mediaWidth, mediaHeight);
      }
    } catch {}
    ctx.restore();
  }

  private drawText(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    clip: TextClip,
    transform: any,
    sourceSeconds: number = 0
  ): void {
    ctx.save();

    // Kinetic typography animation calculations
    let animOffsetX = 0;
    let animOffsetY = 0;
    let animScale = 1.0;
    let animRotate = 0;
    let animAlpha = 1.0;
    let animBlur = 0;
    const anim = clip.animation || 'none';
    const animDur = Math.max(0.1, clip.animationDuration || 0.6);
    const progress = Math.min(1.0, Math.max(0, sourceSeconds / animDur));

    if (anim === 'fade') {
      animAlpha = progress;
    } else if (anim === 'slide-up') {
      animOffsetY = (1.0 - Math.pow(progress, 2)) * 80;
      animAlpha = progress;
    } else if (anim === 'slide-down') {
      animOffsetY = -(1.0 - Math.pow(progress, 2)) * 80;
      animAlpha = progress;
    } else if (anim === 'slide-left') {
      animOffsetX = (1.0 - Math.pow(progress, 2)) * 120;
      animAlpha = progress;
    } else if (anim === 'slide-right') {
      animOffsetX = -(1.0 - Math.pow(progress, 2)) * 120;
      animAlpha = progress;
    } else if (anim === 'zoom-in') {
      animScale = 0.3 + 0.7 * progress;
      animAlpha = progress;
    } else if (anim === 'zoom-out') {
      animScale = 1.6 - 0.6 * progress;
      animAlpha = progress;
    } else if (anim === 'pop') {
      animScale = progress < 1.0 ? 0.2 + 0.8 * Math.sin(progress * Math.PI * 0.5) * 1.15 : 1.0;
      animAlpha = Math.min(1.0, progress * 1.5);
    } else if (anim === 'bounce') {
      const bounce = Math.abs(Math.sin(progress * Math.PI * 3)) * (1.0 - progress) * 35;
      animOffsetY = -bounce;
      animAlpha = Math.min(1.0, progress * 2);
    } else if (anim === 'blur') {
      animBlur = (1.0 - progress) * 20;
      animAlpha = progress;
    } else if (anim === 'rotate') {
      animRotate = (1.0 - progress) * -Math.PI * 0.5;
      animAlpha = progress;
      animScale = 0.5 + 0.5 * progress;
    } else if (anim === 'glitch') {
      if (progress < 1.0 && Math.random() > 0.4) {
        animOffsetX = (Math.random() - 0.5) * 20;
        animOffsetY = (Math.random() - 0.5) * 10;
      }
    }

    // Loop animations
    const loopAnim = clip.loopAnimation || 'none';
    if (loopAnim === 'pulse') {
      animScale *= 1.0 + Math.sin(sourceSeconds * 4) * 0.08;
    } else if (loopAnim === 'float') {
      animOffsetY += Math.sin(sourceSeconds * 2.5) * 12;
    } else if (loopAnim === 'shake') {
      animOffsetX += Math.sin(sourceSeconds * 16) * 4;
      animOffsetY += Math.cos(sourceSeconds * 14) * 3;
    }

    ctx.globalAlpha = (ctx.globalAlpha || 1.0) * animAlpha;
    if (animBlur > 0) {
      ctx.filter = `blur(${animBlur}px)`;
    }

    const modifiedTransform = {
      ...transform,
      position: {
        x: (transform?.position?.x || 0) + animOffsetX,
        y: (transform?.position?.y || 0) + animOffsetY,
      },
      scale: {
        x: (transform?.scale?.x || 1.0) * animScale,
        y: (transform?.scale?.y || 1.0) * animScale,
      },
      rotation: (transform?.rotation || 0) + (animRotate * 180) / Math.PI,
    };

    // Text content preparation
    let fullText = clip.text || '';
    if (anim === 'typewriter') {
      const typeDuration = clip.animationDuration || 2.0;
      const typeProgress = Math.min(1.0, Math.max(0, sourceSeconds / typeDuration));
      const visibleChars = Math.floor(fullText.length * typeProgress);
      fullText = fullText.substring(0, visibleChars);
    } else if (anim === 'word-reveal') {
      const words = fullText.split(' ');
      const wordProgress = Math.min(1.0, Math.max(0, sourceSeconds / animDur));
      const visibleWords = Math.ceil(words.length * wordProgress);
      fullText = words.slice(0, visibleWords).join(' ');
    }

    const lines = fullText.split('\n');
    const fontSize = clip.fontSize || 48;
    const fontFamily = clip.fontFamily || 'Inter, sans-serif';
    const fontWeight = clip.fontWeight || '600';
    const fontStyle = clip.fontStyle || 'normal';
    const lineHeight = clip.lineHeight ? fontSize * clip.lineHeight : fontSize * 1.25;

    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = clip.alignment === 'justify' ? 'center' : clip.alignment || 'center';
    ctx.textBaseline = 'middle';

    // Measure total text bounds for background box
    let maxWidth = 0;
    lines.forEach((line) => {
      const metrics = ctx.measureText(line);
      if (metrics.width > maxWidth) maxWidth = metrics.width;
    });

    const totalHeight = Math.max(fontSize, lines.length * lineHeight);
    const boxW = Math.max(maxWidth + 40, 200);
    const boxH = Math.max(totalHeight + 20, 80);

    applyTransformMatrix(ctx, modifiedTransform, canvasWidth, canvasHeight, boxW, boxH);

    const centerX = boxW / 2;
    const centerY = boxH / 2;

    // Draw background rounded box if specified
    if (clip.backgroundColor && clip.backgroundColor !== 'transparent') {
      const pad = clip.backgroundPadding ?? 16;
      const radius = clip.backgroundRadius ?? 8;
      const bgOpacity = clip.backgroundOpacity ?? 1.0;
      const bgX = centerX - maxWidth / 2 - pad;
      const bgY = centerY - totalHeight / 2 - pad / 2;
      const bgW = maxWidth + pad * 2;
      const bgH = totalHeight + pad;

      ctx.save();
      ctx.globalAlpha = (ctx.globalAlpha || 1.0) * bgOpacity;
      ctx.fillStyle = clip.backgroundColor;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(bgX, bgY, bgW, bgH, radius);
      } else {
        ctx.rect(bgX, bgY, bgW, bgH);
      }
      ctx.fill();
      ctx.restore();
    }

    // Configure drop shadow & glow
    if (clip.glowColor && clip.glowBlur) {
      ctx.shadowColor = clip.glowColor;
      ctx.shadowBlur = (clip.glowBlur ?? 16) * (clip.glowIntensity ?? 1.0);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else if (clip.shadowColor && clip.shadowColor !== 'transparent') {
      ctx.shadowColor = clip.shadowColor;
      ctx.shadowBlur = clip.shadowBlur ?? 8;
      ctx.shadowOffsetX = clip.shadowOffsetX ?? 2;
      ctx.shadowOffsetY = clip.shadowOffsetY ?? 2;
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    }

    // Gradient or Solid Fill
    let fillStyle: string | CanvasGradient = clip.textColor || '#ffffff';
    if (clip.gradientType === 'linear' && clip.gradientColors && clip.gradientColors.length >= 2) {
      const angle = ((clip.gradientAngle ?? 0) * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const grad = ctx.createLinearGradient(
        centerX - (maxWidth / 2) * cos,
        centerY - (totalHeight / 2) * sin,
        centerX + (maxWidth / 2) * cos,
        centerY + (totalHeight / 2) * sin
      );
      clip.gradientColors.forEach((col, idx) => {
        grad.addColorStop(idx / (clip.gradientColors!.length - 1), col);
      });
      fillStyle = grad;
    } else if (clip.gradientType === 'radial' && clip.gradientColors && clip.gradientColors.length >= 2) {
      const radGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, maxWidth / 2);
      clip.gradientColors.forEach((col, idx) => {
        radGrad.addColorStop(idx / (clip.gradientColors!.length - 1), col);
      });
      fillStyle = radGrad;
    }

    // Render Curved Text
    if (clip.curvedText && clip.curveAmount && clip.curveAmount !== 0) {
      const curveRad = Math.max(100, 500 - Math.abs(clip.curveAmount) * 3.5);
      const direction = clip.curveAmount > 0 ? 1 : -1;
      const textToCurve = lines.join(' ');
      const totalChars = textToCurve.length;
      const arcAngle = (maxWidth / curveRad) * direction;
      const startAngle = -Math.PI / 2 - arcAngle / 2;

      ctx.save();
      ctx.translate(centerX, centerY + (direction > 0 ? curveRad : -curveRad));

      for (let i = 0; i < totalChars; i++) {
        const char = textToCurve[i];
        const charAngle = startAngle + (i / Math.max(1, totalChars - 1)) * arcAngle;
        ctx.save();
        ctx.rotate(charAngle + Math.PI / 2);
        ctx.translate(0, direction > 0 ? -curveRad : curveRad);

        if (clip.strokeWidth && clip.strokeWidth > 0 && clip.strokeColor) {
          ctx.lineWidth = clip.strokeWidth;
          ctx.strokeStyle = clip.strokeColor;
          ctx.strokeText(char, 0, 0);
        }

        ctx.fillStyle = fillStyle;
        ctx.fillText(char, 0, 0);
        ctx.restore();
      }
      ctx.restore();
      ctx.restore();
      return;
    }

    // Render each line of text
    const startY = centerY - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, index) => {
      let lineY = startY + index * lineHeight;
      let textX = centerX;
      if (clip.alignment === 'left') {
        textX = centerX - maxWidth / 2;
      } else if (clip.alignment === 'right') {
        textX = centerX + maxWidth / 2;
      }

      // Text Warp (Wave / Arch)
      if (clip.textWarp === 'wave') {
        lineY += Math.sin((index + sourceSeconds * 3)) * (clip.warpIntensity ?? 12);
      } else if (clip.textWarp === 'arch') {
        textX += Math.sin((index / Math.max(1, lines.length)) * Math.PI) * (clip.warpIntensity ?? 10);
      }

      // Draw stroke / outline if present
      if (clip.strokeWidth && clip.strokeWidth > 0 && clip.strokeColor) {
        ctx.save();
        ctx.lineWidth = clip.strokeWidth;
        ctx.strokeStyle = clip.strokeColor;
        ctx.lineJoin = 'round';
        ctx.strokeText(line, textX, lineY);
        ctx.restore();
      }

      // Fill text
      ctx.fillStyle = fillStyle;
      ctx.fillText(line, textX, lineY);

      // Underline
      if (clip.underline) {
        ctx.save();
        ctx.strokeStyle = typeof fillStyle === 'string' ? fillStyle : '#ffffff';
        ctx.lineWidth = Math.max(2, fontSize * 0.06);
        ctx.beginPath();
        const lineMetrics = ctx.measureText(line);
        const uX = clip.alignment === 'left' ? textX : textX - lineMetrics.width / 2;
        ctx.moveTo(uX, lineY + fontSize * 0.55);
        ctx.lineTo(uX + lineMetrics.width, lineY + fontSize * 0.55);
        ctx.stroke();
        ctx.restore();
      }
    });

    ctx.restore();
  }

  private drawOfflinePlaceholder(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    clipName: string
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, canvasWidth - 40, canvasHeight - 40);

    ctx.fillStyle = '#ef4444';
    ctx.font = '700 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MEDIA OFFLINE', canvasWidth / 2, canvasHeight / 2 - 20);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '500 18px sans-serif';
    ctx.fillText(clipName, canvasWidth / 2, canvasHeight / 2 + 25);
    ctx.restore();
  }
}
