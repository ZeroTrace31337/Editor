/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StabilizationPreset = 'auto' | 'minimal' | 'recommended' | 'strong' | 'custom';

export type CameraMotionType = 'handheld' | 'shake' | 'pan' | 'tilt' | 'rotation' | 'mixed';

export interface RollingShutterSettings {
  enabled: boolean;
  strength: number; // 0 to 100%
  motionAnalysis: boolean;
}

export interface StabilizationSettings {
  enabled: boolean;
  preset: StabilizationPreset;
  amount: number;       // 0 to 100%
  smoothness: number;   // 0 to 100%
  crop: number;         // 0 to 100%
  zoom: number;         // 1.0 to 1.5x (auto/manual scale)
  autoZoom: boolean;
  cameraMotion: CameraMotionType;
  rollingShutter: RollingShutterSettings;
  aiStabilization: boolean;
  motionCompensation: boolean;
  autoCrop: boolean;
  beforeAfterComparison: boolean; // compare original vs stabilized
}

export interface StabilizationAnalysisFrame {
  frame: number;
  timeSeconds: number;
  dx: number;        // Camera horizontal jitter offset
  dy: number;        // Camera vertical jitter offset
  dRot: number;      // Camera rotation jitter in degrees
  dScale: number;    // Scale fluctuation
  rollingShear: number;
}

export interface StabilizationClipData {
  clipId: string;
  settings: StabilizationSettings;
  status: 'idle' | 'analyzing' | 'ready' | 'error';
  progress: number; // 0.0 to 1.0
  analysisFrames: StabilizationAnalysisFrame[];
  analyzedDuration: number;
  errorMessage?: string;
}

export function createDefaultStabilizationSettings(preset: StabilizationPreset = 'recommended'): StabilizationSettings {
  switch (preset) {
    case 'minimal':
      return {
        enabled: true,
        preset: 'minimal',
        amount: 30,
        smoothness: 40,
        crop: 10,
        zoom: 1.05,
        autoZoom: true,
        cameraMotion: 'handheld',
        rollingShutter: { enabled: false, strength: 20, motionAnalysis: true },
        aiStabilization: false,
        motionCompensation: true,
        autoCrop: true,
        beforeAfterComparison: false,
      };
    case 'strong':
      return {
        enabled: true,
        preset: 'strong',
        amount: 85,
        smoothness: 90,
        crop: 30,
        zoom: 1.2,
        autoZoom: true,
        cameraMotion: 'shake',
        rollingShutter: { enabled: true, strength: 75, motionAnalysis: true },
        aiStabilization: true,
        motionCompensation: true,
        autoCrop: true,
        beforeAfterComparison: false,
      };
    case 'auto':
      return {
        enabled: true,
        preset: 'auto',
        amount: 60,
        smoothness: 70,
        crop: 18,
        zoom: 1.1,
        autoZoom: true,
        cameraMotion: 'mixed',
        rollingShutter: { enabled: true, strength: 50, motionAnalysis: true },
        aiStabilization: true,
        motionCompensation: true,
        autoCrop: true,
        beforeAfterComparison: false,
      };
    case 'custom':
      return {
        enabled: true,
        preset: 'custom',
        amount: 50,
        smoothness: 50,
        crop: 15,
        zoom: 1.1,
        autoZoom: true,
        cameraMotion: 'handheld',
        rollingShutter: { enabled: false, strength: 30, motionAnalysis: true },
        aiStabilization: false,
        motionCompensation: true,
        autoCrop: true,
        beforeAfterComparison: false,
      };
    case 'recommended':
    default:
      return {
        enabled: true,
        preset: 'recommended',
        amount: 65,
        smoothness: 75,
        crop: 20,
        zoom: 1.12,
        autoZoom: true,
        cameraMotion: 'handheld',
        rollingShutter: { enabled: true, strength: 40, motionAnalysis: true },
        aiStabilization: true,
        motionCompensation: true,
        autoCrop: true,
        beforeAfterComparison: false,
      };
  }
}
