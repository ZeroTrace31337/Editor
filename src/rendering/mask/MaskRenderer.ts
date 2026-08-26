/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClipMask } from '../../domain/mask/ClipMask';
import { TrackingEngine } from '../../engine/tracking/TrackingEngine';

/**
 * High-performance geometric, bezier, and tracked masking engine with feather, invert, roundness, combine modes, and shapes.
 */
export class MaskRenderer {
  /**
   * Applies the clip's masks to the canvas context as a clipping path or alpha mask.
   */
  public static applyMasks(
    ctx: CanvasRenderingContext2D,
    masks: ClipMask[] | undefined,
    width: number,
    height: number,
    currentTimeSec = 0
  ): void {
    if (!masks || masks.length === 0) return;

    const activeMasks = masks.filter((m) => m.enabled && m.opacity > 0.01);
    if (activeMasks.length === 0) return;

    // Fast path: Single simple mask
    if (activeMasks.length === 1) {
      this.applySingleMask(ctx, activeMasks[0], width, height, currentTimeSec);
      return;
    }

    // Multi-mask compositing with Combine Modes (Add, Subtract, Intersect)
    for (const mask of activeMasks) {
      if (mask.combineMode === 'subtract') {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        this.renderMaskPath(ctx, mask, width, height, currentTimeSec);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
      } else if (mask.combineMode === 'intersect') {
        this.applySingleMask(ctx, mask, width, height, currentTimeSec);
      } else {
        // Add mode
        this.applySingleMask(ctx, mask, width, height, currentTimeSec);
      }
    }
  }

  private static applySingleMask(
    ctx: CanvasRenderingContext2D,
    mask: ClipMask,
    width: number,
    height: number,
    currentTimeSec = 0
  ): void {
    ctx.save();
    this.renderMaskPath(ctx, mask, width, height, currentTimeSec);

    // Apply feathering if specified
    if (mask.feather > 0) {
      ctx.shadowBlur = mask.feather;
      ctx.shadowColor = 'black';
    }

    if (mask.inverted) {
      ctx.clip('evenodd');
    } else {
      ctx.clip();
    }
  }

  private static renderMaskPath(
    ctx: CanvasRenderingContext2D,
    mask: ClipMask,
    width: number,
    height: number,
    currentTimeSec = 0
  ): void {
    let posX = mask.position.x;
    let posY = mask.position.y;
    let rot = mask.rotation;
    let scaleX = 1.0;
    let scaleY = 1.0;

    // Integrate with Motion Tracker if mask is tracked
    if (mask.trackingClipId) {
      const trackingEngine = TrackingEngine.getInstance();
      const pt = trackingEngine.evaluateTrackAtTime(mask.trackingClipId, currentTimeSec, mask.trackingTrackId);
      if (pt) {
        posX = pt.x;
        posY = pt.y;
        rot += pt.rotation;
        scaleX *= pt.scale;
        scaleY *= pt.scale;
      }
    }

    const centerX = posX * width;
    const centerY = posY * height;
    const maskW = Math.max(4, (mask.size.width * width + mask.expansion) * scaleX);
    const maskH = Math.max(4, (mask.size.height * height + mask.expansion) * scaleY);

    ctx.beginPath();

    // Inverted mask: outer rectangle creates negative space
    if (mask.inverted) {
      ctx.rect(0, 0, width, height);
    }

    ctx.translate(centerX, centerY);
    if (rot !== 0) {
      ctx.rotate((rot * Math.PI) / 180);
    }

    const type = mask.type as string;

    if (type === 'rectangle') {
      const halfW = maskW / 2;
      const halfH = maskH / 2;
      const radius = Math.min(halfW, halfH, mask.roundness || 0);
      if (radius > 0 && (ctx as any).roundRect) {
        (ctx as any).roundRect(-halfW, -halfH, maskW, maskH, radius);
      } else {
        ctx.rect(-halfW, -halfH, maskW, maskH);
      }
    } else if (type === 'ellipse' || type === 'circle') {
      const radiusX = maskW / 2;
      const radiusY = type === 'circle' ? radiusX : maskH / 2;
      ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    } else if (type === 'linear') {
      const halfW = maskW / 2;
      const halfH = maskH / 2;
      ctx.rect(-halfW * 4, -halfH * 4, halfW * 8, halfH * 4);
    } else if (type === 'mirror') {
      const halfW = maskW / 2;
      const halfH = maskH / 2;
      ctx.rect(-halfW * 4, -halfH, halfW * 8, maskH);
    } else if (type === 'star') {
      const spikes = 5;
      const outerRadius = maskW / 2;
      const innerRadius = outerRadius * 0.4;
      let r = (Math.PI / 2) * 3;
      let x = 0;
      let y = 0;
      const step = Math.PI / spikes;

      ctx.moveTo(0, -outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = Math.cos(r) * outerRadius;
        y = Math.sin(r) * outerRadius;
        ctx.lineTo(x, y);
        r += step;

        x = Math.cos(r) * innerRadius;
        y = Math.sin(r) * innerRadius;
        ctx.lineTo(x, y);
        r += step;
      }
      ctx.lineTo(0, -outerRadius);
      ctx.closePath();
    } else if (type === 'heart') {
      const scale = maskW / 200;
      ctx.moveTo(0, -30 * scale);
      ctx.bezierCurveTo(0, -60 * scale, -50 * scale, -90 * scale, -90 * scale, -60 * scale);
      ctx.bezierCurveTo(-140 * scale, -20 * scale, -100 * scale, 50 * scale, 0, 100 * scale);
      ctx.bezierCurveTo(100 * scale, 50 * scale, 140 * scale, -20 * scale, 90 * scale, -60 * scale);
      ctx.bezierCurveTo(50 * scale, -90 * scale, 0, -60 * scale, 0, -30 * scale);
      ctx.closePath();
    } else if (type === 'ai_auto_subject') {
      // AI Subject silhouette mask (smooth organic humanoid contour)
      const scale = maskW / 200;
      ctx.moveTo(0, -90 * scale);
      ctx.bezierCurveTo(35 * scale, -90 * scale, 35 * scale, -45 * scale, 25 * scale, -30 * scale);
      ctx.bezierCurveTo(75 * scale, -10 * scale, 85 * scale, 40 * scale, 85 * scale, 100 * scale);
      ctx.lineTo(-85 * scale, 100 * scale);
      ctx.bezierCurveTo(-85 * scale, 40 * scale, -75 * scale, -10 * scale, -25 * scale, -30 * scale);
      ctx.bezierCurveTo(-35 * scale, -45 * scale, -35 * scale, -90 * scale, 0, -90 * scale);
      ctx.closePath();
    } else if (
      (type === 'polygon' || type === 'bezier' || type === 'freehand' || type === 'custom') &&
      mask.points &&
      mask.points.length > 1
    ) {
      const pts = mask.points;
      const startX = (pts[0].x - 0.5) * maskW;
      const startY = (pts[0].y - 0.5) * maskH;
      ctx.moveTo(startX, startY);

      for (let i = 1; i < pts.length; i++) {
        const ptX = (pts[i].x - 0.5) * maskW;
        const ptY = (pts[i].y - 0.5) * maskH;
        if (pts[i].inHandle || pts[i - 1].outHandle) {
          const cp1x = ((pts[i - 1].outHandle?.x ?? pts[i - 1].x) - 0.5) * maskW;
          const cp1y = ((pts[i - 1].outHandle?.y ?? pts[i - 1].y) - 0.5) * maskH;
          const cp2x = ((pts[i].inHandle?.x ?? pts[i].x) - 0.5) * maskW;
          const cp2y = ((pts[i].inHandle?.y ?? pts[i].y) - 0.5) * maskH;
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ptX, ptY);
        } else {
          ctx.lineTo(ptX, ptY);
        }
      }

      if (mask.closedPath !== false) {
        ctx.closePath();
      }
    }
  }
}
