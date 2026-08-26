/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MaskType =
  | 'rectangle'
  | 'circle'
  | 'ellipse'
  | 'linear'
  | 'mirror'
  | 'polygon'
  | 'star'
  | 'heart'
  | 'custom'
  | 'freehand'
  | 'bezier'
  | 'ai_auto_subject';

export type MaskCombineMode = 'add' | 'subtract' | 'intersect';

export interface MaskPoint {
  x: number; // 0.0 to 1.0 (relative to clip canvas)
  y: number; // 0.0 to 1.0
  inHandle?: { x: number; y: number };
  outHandle?: { x: number; y: number };
}

export interface ClipMask {
  readonly id: string;
  name: string;
  type: MaskType;
  enabled: boolean;
  inverted: boolean;
  combineMode: MaskCombineMode;
  position: { x: number; y: number }; // 0.0 to 1.0 (center)
  size: { width: number; height: number }; // 0.0 to 2.0 (normalized)
  rotation: number; // degrees
  feather: number; // 0 to 100 px
  opacity: number; // 0.0 to 1.0
  expansion: number; // -100 to +100 px
  roundness?: number; // corner radius in px
  points?: MaskPoint[];
  closedPath?: boolean;
  blendMode?: GlobalCompositeOperation;

  // Mask Tracking binding
  trackingClipId?: string;
  trackingTrackId?: string;
  trackingTarget?: 'object' | 'face' | 'person' | 'point';
}

export function createDefaultMask(type: MaskType = 'rectangle', name?: string): ClipMask {
  const id = `mask_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const defaultName =
    name ||
    (type === 'rectangle'
      ? 'Rectangle Mask'
      : type === 'ellipse' || type === 'circle'
      ? 'Ellipse Mask'
      : type === 'linear'
      ? 'Linear Split Mask'
      : type === 'star'
      ? 'Star Mask'
      : type === 'heart'
      ? 'Heart Mask'
      : type === 'ai_auto_subject'
      ? 'AI Subject Mask'
      : type === 'bezier' || type === 'freehand'
      ? 'Bezier Path Mask'
      : 'Custom Mask');

  let points: MaskPoint[] | undefined;
  if (type === 'polygon' || type === 'bezier' || type === 'freehand' || type === 'custom') {
    points = [
      { x: 0.3, y: 0.3, outHandle: { x: 0.4, y: 0.25 } },
      { x: 0.7, y: 0.3, inHandle: { x: 0.6, y: 0.25 }, outHandle: { x: 0.75, y: 0.4 } },
      { x: 0.7, y: 0.7, inHandle: { x: 0.75, y: 0.6 }, outHandle: { x: 0.6, y: 0.75 } },
      { x: 0.3, y: 0.7, inHandle: { x: 0.4, y: 0.75 }, outHandle: { x: 0.25, y: 0.6 } },
    ];
  }

  return {
    id,
    name: defaultName,
    type,
    enabled: true,
    inverted: false,
    combineMode: 'add',
    position: { x: 0.5, y: 0.5 },
    size: { width: 0.5, height: 0.5 },
    rotation: 0,
    feather: 0,
    opacity: 1.0,
    expansion: 0,
    roundness: 0,
    points,
    closedPath: true,
    blendMode: 'source-over',
  };
}
