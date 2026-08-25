/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MaskType = 'rectangle' | 'ellipse' | 'polygon' | 'bezier';

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
  position: { x: number; y: number }; // 0.0 to 1.0 (center)
  size: { width: number; height: number }; // 0.0 to 2.0 (normalized)
  rotation: number; // degrees
  feather: number; // 0 to 100 px
  opacity: number; // 0.0 to 1.0
  expansion: number; // -100 to +100 px
  points?: MaskPoint[];
  blendMode?: GlobalCompositeOperation;
}

export function createDefaultMask(type: MaskType = 'rectangle', name?: string): ClipMask {
  const id = `mask_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const defaultName = name || (type === 'rectangle' ? 'Rectangle Mask' : type === 'ellipse' ? 'Ellipse Mask' : 'Custom Mask');

  let points: MaskPoint[] | undefined;
  if (type === 'polygon' || type === 'bezier') {
    points = [
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.3 },
      { x: 0.7, y: 0.7 },
      { x: 0.3, y: 0.7 },
    ];
  }

  return {
    id,
    name: defaultName,
    type,
    enabled: true,
    inverted: false,
    position: { x: 0.5, y: 0.5 },
    size: { width: 0.5, height: 0.5 },
    rotation: 0,
    feather: 0,
    opacity: 1.0,
    expansion: 0,
    points,
    blendMode: 'source-over',
  };
}
