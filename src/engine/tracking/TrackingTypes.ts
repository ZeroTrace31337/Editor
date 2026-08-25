/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TrackingMode = 'point' | 'planar' | 'object';
export type TrackingTargetType = 'text' | 'image' | 'blur' | 'mosaic' | 'mask' | 'effect';

export interface TrackingROI {
  x: number; // 0.0 to 1.0 (normalized)
  y: number;
  width: number;
  height: number;
}

export interface TrackPoint {
  frameNumber: number;
  timeSeconds: number;
  x: number;       // Normalized 0.0 to 1.0
  y: number;
  rotation: number; // In degrees
  scale: number;    // 1.0 default
  confidence: number; // 0.0 to 1.0
}

export interface TrackingData {
  id: string;
  clipId: string;
  name: string;
  mode: TrackingMode;
  roi: TrackingROI;
  points: TrackPoint[]; // Keyframe points along time
  targetType?: TrackingTargetType;
  attachedClipId?: string; // Clip ID attached to follow this track
  status: 'idle' | 'tracking_forward' | 'tracking_backward' | 'completed' | 'paused';
}
