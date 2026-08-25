/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RationalTime } from '../../core/time/RationalTime';
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

export class CanvasCompositor {
  private mediaRegistry: MediaRegistry;
  private effectRegistry = EffectRegistry.getInstance();
  private transitionRegistry = TransitionRegistry.getInstance();
  private renderCache = RenderCache.getInstance();

  private videoElementPool: Map<string, HTMLVideoElement> = new Map();
  private imageElementPool: Map<string, HTMLImageElement> = new Map();
  private layerCanvas: HTMLCanvasElement;
  private layerCtx: CanvasRenderingContext2D | null;

  constructor(mediaRegistry: MediaRegistry) {
    this.mediaRegistry = mediaRegistry;
    this.layerCanvas = document.createElement('canvas');
    this.layerCtx = this.layerCanvas.getContext('2d');
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
    bypassColorGradeAndEffects = false
  ): void {
    // 1. Compile Render Graph into pure instruction tree
    const instructionTree = RenderGraphCompiler.compile(sequence, currentTime, canvasWidth, canvasHeight);

    // 2. Execute Render Instructions
    this.executeInstructionTree(ctx, instructionTree, bypassColorGradeAndEffects);
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

    // 1. Render Base Media / Text / Adjustment content onto layer context
    if (clip.type === 'video') {
      this.drawVideo(this.layerCtx, canvasWidth, canvasHeight, clip as VideoClip, sourceSeconds, evaluatedTransform);
    } else if (clip.type === 'image') {
      this.drawImage(this.layerCtx, canvasWidth, canvasHeight, clip as ImageClip, evaluatedTransform);
    } else if (clip.type === 'text') {
      this.drawText(this.layerCtx, canvasWidth, canvasHeight, clip as TextClip, evaluatedTransform, sourceSeconds);
    } else if (clip.type === 'adjustment') {
      // Snapshot the current canvas below this layer so effects/grade apply to everything beneath
      this.layerCtx.drawImage(ctx.canvas, 0, 0, canvasWidth, canvasHeight);
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

    // 4. Apply Mask clipping
    if (evaluatedMasks && evaluatedMasks.length > 0) {
      MaskRenderer.applyMasks(this.layerCtx, evaluatedMasks, canvasWidth, canvasHeight);
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

    let video = this.videoElementPool.get(asset.id);
    if (!video) {
      video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.src = asset.uri;
      this.videoElementPool.set(asset.id, video);
    }

    if (Math.abs(video.currentTime - sourceSeconds) > 0.05) {
      video.currentTime = sourceSeconds;
    }

    const mediaWidth = asset.videoMetadata?.width || canvasWidth;
    const mediaHeight = asset.videoMetadata?.height || canvasHeight;

    ctx.save();
    applyTransformMatrix(ctx, transform, canvasWidth, canvasHeight, mediaWidth, mediaHeight);
    try {
      ctx.drawImage(video, 0, 0, mediaWidth, mediaHeight);
    } catch {}
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
    let animAlpha = 1.0;
    const anim = clip.animation || 'none';
    const animDur = clip.animationDuration || 0.6;

    if (anim === 'fade') {
      animAlpha = Math.min(1.0, sourceSeconds / animDur);
    } else if (anim === 'slide-up') {
      const progress = Math.min(1.0, sourceSeconds / animDur);
      animOffsetY = (1.0 - Math.pow(progress, 2)) * 60;
      animAlpha = progress;
    } else if (anim === 'slide-down') {
      const progress = Math.min(1.0, sourceSeconds / animDur);
      animOffsetY = -(1.0 - Math.pow(progress, 2)) * 60;
      animAlpha = progress;
    } else if (anim === 'pop') {
      const progress = Math.min(1.0, sourceSeconds / animDur);
      animScale = progress < 1.0 ? 0.2 + 0.8 * Math.sin(progress * Math.PI * 0.5) * 1.15 : 1.0;
      animAlpha = Math.min(1.0, progress * 1.5);
    } else if (anim === 'bounce') {
      const progress = Math.min(1.0, sourceSeconds / animDur);
      const bounce = Math.abs(Math.sin(progress * Math.PI * 3)) * (1.0 - progress) * 30;
      animOffsetY = -bounce;
    }

    ctx.globalAlpha = (ctx.globalAlpha || 1.0) * animAlpha;

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
    };

    // Split text into lines
    let fullText = clip.text || '';
    if (anim === 'typewriter') {
      const typeDuration = clip.animationDuration || 2.0;
      const progress = Math.min(1.0, Math.max(0, sourceSeconds / typeDuration));
      const visibleChars = Math.floor(fullText.length * progress);
      fullText = fullText.substring(0, visibleChars);
    }

    const lines = fullText.split('\n');
    const fontSize = clip.fontSize || 48;
    const fontFamily = clip.fontFamily || 'Inter, sans-serif';
    const fontWeight = clip.fontWeight || '600';
    const fontStyle = clip.fontStyle || 'normal';
    const lineHeight = clip.lineHeight ? fontSize * clip.lineHeight : fontSize * 1.25;

    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = clip.alignment || 'center';
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
      const bgX = centerX - maxWidth / 2 - pad;
      const bgY = centerY - totalHeight / 2 - pad / 2;
      const bgW = maxWidth + pad * 2;
      const bgH = totalHeight + pad;

      ctx.save();
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

    // Configure drop shadow
    if (clip.shadowColor && clip.shadowColor !== 'transparent') {
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

    // Render each line of text
    const startY = centerY - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, index) => {
      const lineY = startY + index * lineHeight;
      let textX = centerX;
      if (clip.alignment === 'left') {
        textX = centerX - maxWidth / 2;
      } else if (clip.alignment === 'right') {
        textX = centerX + maxWidth / 2;
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
      ctx.fillStyle = clip.textColor || '#ffffff';
      ctx.fillText(line, textX, lineY);
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
