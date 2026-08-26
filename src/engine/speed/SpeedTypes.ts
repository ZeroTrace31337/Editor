/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SpeedCurvePreset =
  | 'Standard'
  | 'Custom'
  | 'Montage'
  | 'Bullet'
  | 'Hero'
  | 'Jump Cut'
  | 'Fast In'
  | 'Fast Out'
  | 'Slow In'
  | 'Slow Out';

export type SpeedTabMode = 'normal' | 'custom' | 'smooth_slow_mo' | 'super_smooth_slow_mo';

export type SlowMotionMode = 'original' | 'smooth' | 'super_smooth';
export type SlowMotionQuality = 'draft' | 'high' | 'ultra';
export type SlowMotionMethod = 'optical_flow' | 'frame_blending' | 'motion_vector';

export interface SlowMotionSettings {
  mode: SlowMotionMode;
  speed: number;             // e.g. 0.75, 0.5, 0.25, 0.125
  quality: SlowMotionQuality;
  method: SlowMotionMethod;
  motionSmoothing: number;   // 0 to 100%
  motionBlur: boolean;
  shutterAngle: number;      // 0 to 360 degrees (default 180)
  preservePitch: boolean;
  muteAudio: boolean;
  isProcessed: boolean;
  processedAt?: number;
}

export interface SpeedRampPoint {
  id: string;
  timeRatio: number; // 0.0 to 1.0 along clip timeline duration
  speed: number;     // e.g. 0.2x to 10.0x
  easeIn?: number;   // 0.0 to 1.0 curvature
  easeOut?: number;
  isHold?: boolean;  // freeze frame hold point
  isBeatSnapped?: boolean;
}

export interface MotionBlurSettings {
  enabled: boolean;
  blurAmount: number;   // 0 to 100%
  shutterAngle: number; // 0 to 360 degrees (180 standard)
  direction: 'speed_auto' | 'horizontal' | 'vertical' | 'radial';
}

export interface ClipSpeedSettings {
  clipId: string;
  activeTab: SpeedTabMode;
  baseSpeed: number;
  reverse: boolean;
  preservePitch: boolean;
  opticalFlow: boolean;
  frameBlending: boolean;
  curvePreset: SpeedCurvePreset;
  rampPoints: SpeedRampPoint[];
  motionBlur: MotionBlurSettings;
  slowMotion: SlowMotionSettings;
}

export const SPEED_PRESETS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 4.0, 8.0];
export const SMOOTH_SLOW_MO_PRESETS = [0.75, 0.5, 0.25];
export const SUPER_SMOOTH_SLOW_MO_PRESETS = [0.5, 0.25, 0.125];

export function createDefaultSlowMotionSettings(): SlowMotionSettings {
  return {
    mode: 'smooth',
    speed: 0.5,
    quality: 'high',
    method: 'optical_flow',
    motionSmoothing: 75,
    motionBlur: false,
    shutterAngle: 180,
    preservePitch: true,
    muteAudio: false,
    isProcessed: false,
  };
}

export function createDefaultSpeedSettings(clipId: string): ClipSpeedSettings {
  return {
    clipId,
    activeTab: 'normal',
    baseSpeed: 1.0,
    reverse: false,
    preservePitch: true,
    opticalFlow: false,
    frameBlending: false,
    curvePreset: 'Standard',
    rampPoints: [
      { id: 'p0', timeRatio: 0.0, speed: 1.0 },
      { id: 'p1', timeRatio: 1.0, speed: 1.0 },
    ],
    motionBlur: {
      enabled: false,
      blurAmount: 50,
      shutterAngle: 180,
      direction: 'speed_auto',
    },
    slowMotion: createDefaultSlowMotionSettings(),
  };
}

export function getPresetRampPoints(preset: SpeedCurvePreset): SpeedRampPoint[] {
  switch (preset) {
    case 'Montage':
      // Fast -> Slow -> Fast -> Slow -> Fast
      return [
        { id: 'm0', timeRatio: 0.0, speed: 2.5 },
        { id: 'm1', timeRatio: 0.25, speed: 0.4 },
        { id: 'm2', timeRatio: 0.5, speed: 3.0 },
        { id: 'm3', timeRatio: 0.75, speed: 0.35 },
        { id: 'm4', timeRatio: 1.0, speed: 2.0 },
      ];
    case 'Bullet':
      // Normal -> Super slow mo -> Fast
      return [
        { id: 'b0', timeRatio: 0.0, speed: 1.0 },
        { id: 'b1', timeRatio: 0.3, speed: 1.0 },
        { id: 'b2', timeRatio: 0.35, speed: 0.15 },
        { id: 'b3', timeRatio: 0.65, speed: 0.15 },
        { id: 'b4', timeRatio: 0.7, speed: 2.0 },
        { id: 'b5', timeRatio: 1.0, speed: 1.0 },
      ];
    case 'Hero':
      // Fast in -> Slow impact -> Normal
      return [
        { id: 'h0', timeRatio: 0.0, speed: 3.5 },
        { id: 'h1', timeRatio: 0.4, speed: 0.4 },
        { id: 'h2', timeRatio: 0.7, speed: 0.6 },
        { id: 'h3', timeRatio: 1.0, speed: 1.0 },
      ];
    case 'Jump Cut':
      return [
        { id: 'j0', timeRatio: 0.0, speed: 1.0 },
        { id: 'j1', timeRatio: 0.3, speed: 4.0 },
        { id: 'j2', timeRatio: 0.6, speed: 1.0 },
        { id: 'j3', timeRatio: 0.8, speed: 5.0 },
        { id: 'j4', timeRatio: 1.0, speed: 1.0 },
      ];
    case 'Fast In':
      return [
        { id: 'fi0', timeRatio: 0.0, speed: 4.0 },
        { id: 'fi1', timeRatio: 0.5, speed: 1.5 },
        { id: 'fi2', timeRatio: 1.0, speed: 1.0 },
      ];
    case 'Fast Out':
      return [
        { id: 'fo0', timeRatio: 0.0, speed: 1.0 },
        { id: 'fo1', timeRatio: 0.5, speed: 1.5 },
        { id: 'fo2', timeRatio: 1.0, speed: 4.0 },
      ];
    case 'Slow In':
      return [
        { id: 'si0', timeRatio: 0.0, speed: 0.3 },
        { id: 'si1', timeRatio: 0.6, speed: 0.8 },
        { id: 'si2', timeRatio: 1.0, speed: 1.0 },
      ];
    case 'Slow Out':
      return [
        { id: 'so0', timeRatio: 0.0, speed: 1.0 },
        { id: 'so1', timeRatio: 0.4, speed: 0.8 },
        { id: 'so2', timeRatio: 1.0, speed: 0.25 },
      ];
    case 'Standard':
    default:
      return [
        { id: 's0', timeRatio: 0.0, speed: 1.0 },
        { id: 's1', timeRatio: 1.0, speed: 1.0 },
      ];
  }
}
