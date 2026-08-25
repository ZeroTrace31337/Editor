/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClipMask } from '../../domain/mask/ClipMask';

/**
 * High-performance geometric and bezier masking engine with feather and invert support.
 */
export class MaskRenderer {
  /**
   * Applies the clip's masks to the canvas context as a clipping path or alpha mask.
   */
  public static applyMasks(
    ctx: CanvasRenderingContext2D,
    masks: ClipMask[] | undefined,
    width: number,
    height: number
  ): void {
    if (!masks || masks.length === 0) return;

    // Filter enabled masks
    const activeMasks = masks.filter((m) => m.enabled && m.opacity > 0.01);
    if (activeMasks.length === 0) return;

    for (const mask of activeMasks) {
      this.applySingleMask(ctx, mask, width, height);
    }
  }

  private static applySingleMask(
    ctx: CanvasRenderingContext2D,
    mask: ClipMask,
    width: number,
    height: number
  ): void {
    const centerX = mask.position.x * width;
    const centerY = mask.position.y * height;
    const maskW = Math.max(2, mask.size.width * width + mask.expansion);
    const maskH = Math.max(2, mask.size.height * height + mask.expansion);

    ctx.save();
    ctx.beginPath();

    // If inverted, define outer box first to create hole
    if (mask.inverted) {
      ctx.rect(0, 0, width, height);
    }

    ctx.translate(centerX, centerY);
    if (mask.rotation !== 0) {
      ctx.rotate((mask.rotation * Math.PI) / 180);
    }

    if (mask.type === 'rectangle') {
      const halfW = maskW / 2;
      const halfH = maskH / 2;
      ctx.rect(-halfW, -halfH, maskW, maskH);
    } else if (mask.type === 'ellipse') {
      const radiusX = maskW / 2;
      const radiusY = maskH / 2;
      ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    } else if ((mask.type === 'polygon' || mask.type === 'bezier') && mask.points && mask.points.length > 2) {
      const pts = mask.points;
      const startX = (pts[0].x - 0.5) * maskW;
      const startY = (pts[0].y - 0.5) * maskH;
      ctx.moveTo(startX, startY);

      for (let i = 1; i < pts.length; i++) {
        const ptX = (pts[i].x - 0.5) * maskW;
        const ptY = (pts[i].y - 0.5) * maskH;
        if (mask.type === 'bezier' && pts[i].inHandle && pts[i - 1].outHandle) {
          const cp1x = (pts[i - 1].outHandle!.x - 0.5) * maskW;
          const cp1y = (pts[i - 1].outHandle!.y - 0.5) * maskH;
          const cp2x = (pts[i].inHandle!.x - 0.5) * maskW;
          const cp2y = (pts[i].inHandle!.y - 0.5) * maskH;
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ptX, ptY);
        } else {
          ctx.lineTo(ptX, ptY);
        }
      }
      ctx.closePath();
    }

    ctx.restore();

    // Clip to path (evenodd if inverted)
    if (mask.inverted) {
      ctx.clip('evenodd');
    } else {
      ctx.clip();
    }
  }
}
