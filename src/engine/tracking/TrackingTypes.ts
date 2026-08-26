/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TrackingMode = 'object' | 'face' | 'person' | 'point' | 'area';
export type TrackingAccuracy = 'draft' | 'standard' | 'high' | 'ultra_ai';
export type TrackingTargetType = 'text' | 'sticker' | 'image' | 'blur' | 'mosaic' | 'mask' | 'effect' | 'graphic';

export interface TrackingROI {
  x: number; // 0.0 to 1.0 (normalized center or bounding box)
  y: number;
  width: number;
  height: number;
}

export interface TrackPoint {
  frameNumber: number;
  timeSeconds: number;
  x: number;          // Normalized 0.0 to 1.0 (Canvas center)
  y: number;
  rotation: number;   // In degrees
  scale: number;      // 1.0 default
  confidence: number; // 0.0 to 1.0
  isManualKeyframe?: boolean; // User manually corrected this point
}

export interface TrackingRange {
  startSec: number;
  endSec: number;
}

export interface TrackingData {
  id: string;
  clipId: string;
  name: string;
  mode: TrackingMode;
  accuracy: TrackingAccuracy;
  roi: TrackingROI;
  range?: TrackingRange;
  points: TrackPoint[]; // Keyframe points along time
  targetType?: TrackingTargetType;
  attachedClipId?: string; // Clip ID attached to follow this track
  attachedMaskId?: string; // Mask ID attached to follow this track
  status: 'idle' | 'tracking_forward' | 'tracking_backward' | 'completed' | 'paused' | 'failed';
  offsetPosition?: { x: number; y: number };
  offsetScale?: number;
  offsetRotation?: number;
}
