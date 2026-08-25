/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Vector2D {
  x: number;
  y: number;
}

export interface CropRect {
  left: number;   // 0.0 to 1.0 (percentage from left edge)
  top: number;    // 0.0 to 1.0 (percentage from top edge)
  right: number;  // 0.0 to 1.0 (percentage from right edge)
  bottom: number; // 0.0 to 1.0 (percentage from bottom edge)
}

export interface Transform2D {
  position: Vector2D; // Pixel offset from anchor (0,0 is center)
  scale: Vector2D;    // 1.0 is 100%
  rotation: number;   // Angle in degrees (-180 to +180)
  anchor: Vector2D;   // Normalized (0.5, 0.5 is center)
  flipH?: boolean;
  flipV?: boolean;
  crop?: CropRect;
}

export function createDefaultTransform(): Transform2D {
  return {
    position: { x: 0, y: 0 },
    scale: { x: 1.0, y: 1.0 },
    rotation: 0,
    anchor: { x: 0.5, y: 0.5 },
    flipH: false,
    flipV: false,
    crop: { left: 0, top: 0, right: 0, bottom: 0 },
  };
}

export function applyTransformMatrix(
  ctx: CanvasRenderingContext2D,
  transform: Transform2D,
  canvasWidth: number,
  canvasHeight: number,
  mediaWidth: number,
  mediaHeight: number
): void {
  const centerX = canvasWidth / 2 + transform.position.x;
  const centerY = canvasHeight / 2 + transform.position.y;

  ctx.translate(centerX, centerY);
  ctx.rotate((transform.rotation * Math.PI) / 180);

  const scaleX = (transform.flipH ? -1 : 1) * (transform.scale?.x ?? 1.0);
  const scaleY = (transform.flipV ? -1 : 1) * (transform.scale?.y ?? 1.0);
  ctx.scale(scaleX, scaleY);

  // If crop is present, apply clipping rectangle to media area
  if (
    transform.crop &&
    (transform.crop.left > 0 || transform.crop.top > 0 || transform.crop.right > 0 || transform.crop.bottom > 0)
  ) {
    const cropX = -mediaWidth * (transform.anchor?.x ?? 0.5) + mediaWidth * transform.crop.left;
    const cropY = -mediaHeight * (transform.anchor?.y ?? 0.5) + mediaHeight * transform.crop.top;
    const cropW = Math.max(1, mediaWidth * (1 - transform.crop.left - transform.crop.right));
    const cropH = Math.max(1, mediaHeight * (1 - transform.crop.top - transform.crop.bottom));
    ctx.beginPath();
    ctx.rect(cropX, cropY, cropW, cropH);
    ctx.clip();
  }

  // Draw centered around anchor point
  const drawX = -mediaWidth * (transform.anchor?.x ?? 0.5);
  const drawY = -mediaHeight * (transform.anchor?.y ?? 0.5);
  ctx.translate(drawX, drawY);
}
