/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ClipSpeedSettings,
  SpeedCurvePreset,
  SpeedRampPoint,
  SpeedTabMode,
  SlowMotionMode,
  SlowMotionQuality,
  SlowMotionMethod,
  createDefaultSpeedSettings,
  getPresetRampPoints,
} from './SpeedTypes';

export class SpeedEngine {
  private static instance: SpeedEngine;
  private speedMap: Map<string, ClipSpeedSettings> = new Map();
  private listeners: Set<() => void> = new Set();

  private constructor() {}

  public static getInstance(): SpeedEngine {
    if (!SpeedEngine.instance) {
      SpeedEngine.instance = new SpeedEngine();
    }
    return SpeedEngine.instance;
  }

  public getSettings(clipId: string): ClipSpeedSettings {
    let settings = this.speedMap.get(clipId);
    if (!settings) {
      settings = createDefaultSpeedSettings(clipId);
      this.speedMap.set(clipId, settings);
    }
    return settings;
  }

  public updateSettings(clipId: string, updates: Partial<ClipSpeedSettings>): void {
    const curr = this.getSettings(clipId);
    Object.assign(curr, updates);
    this.notify();
  }

  public setActiveTab(clipId: string, tab: SpeedTabMode): void {
    const curr = this.getSettings(clipId);
    curr.activeTab = tab;
    if (tab === 'smooth_slow_mo') {
      curr.slowMotion.mode = 'smooth';
      if (curr.slowMotion.speed >= 1.0) {
        curr.slowMotion.speed = 0.5;
      }
      curr.baseSpeed = curr.slowMotion.speed;
      curr.opticalFlow = true;
    } else if (tab === 'super_smooth_slow_mo') {
      curr.slowMotion.mode = 'super_smooth';
      if (curr.slowMotion.speed >= 1.0) {
        curr.slowMotion.speed = 0.25;
      }
      curr.baseSpeed = curr.slowMotion.speed;
      curr.opticalFlow = true;
    }
    this.notify();
  }

  public setSlowMotionMode(clipId: string, mode: SlowMotionMode): void {
    const curr = this.getSettings(clipId);
    curr.slowMotion.mode = mode;
    if (mode === 'original') {
      curr.opticalFlow = false;
    } else {
      curr.opticalFlow = true;
    }
    this.notify();
  }

  public setSlowMotionSpeed(clipId: string, speed: number): void {
    const curr = this.getSettings(clipId);
    curr.slowMotion.speed = Math.max(0.05, Math.min(2.0, speed));
    curr.baseSpeed = curr.slowMotion.speed;
    this.notify();
  }

  public setSlowMotionQuality(clipId: string, quality: SlowMotionQuality): void {
    const curr = this.getSettings(clipId);
    curr.slowMotion.quality = quality;
    this.notify();
  }

  public setSlowMotionMethod(clipId: string, method: SlowMotionMethod): void {
    const curr = this.getSettings(clipId);
    curr.slowMotion.method = method;
    this.notify();
  }

  public setMotionSmoothing(clipId: string, smoothing: number): void {
    const curr = this.getSettings(clipId);
    curr.slowMotion.motionSmoothing = Math.max(0, Math.min(100, smoothing));
    this.notify();
  }

  public setCurvePreset(clipId: string, preset: SpeedCurvePreset): void {
    const curr = this.getSettings(clipId);
    curr.curvePreset = preset;
    curr.rampPoints = getPresetRampPoints(preset);
    this.notify();
  }

  public setBaseSpeed(clipId: string, speed: number): void {
    const curr = this.getSettings(clipId);
    curr.baseSpeed = Math.max(0.05, Math.min(100, speed));
    if (curr.curvePreset === 'Standard') {
      curr.rampPoints = [
        { id: 's0', timeRatio: 0.0, speed: curr.baseSpeed },
        { id: 's1', timeRatio: 1.0, speed: curr.baseSpeed },
      ];
    }
    this.notify();
  }

  public addRampPoint(clipId: string, timeRatio: number, speed: number): SpeedRampPoint {
    const curr = this.getSettings(clipId);
    curr.curvePreset = 'Custom';
    const pt: SpeedRampPoint = {
      id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timeRatio: Math.max(0, Math.min(1, timeRatio)),
      speed: Math.max(0.1, Math.min(20, speed)),
    };
    curr.rampPoints.push(pt);
    curr.rampPoints.sort((a, b) => a.timeRatio - b.timeRatio);
    this.notify();
    return pt;
  }

  public updateRampPoint(clipId: string, pointId: string, updates: Partial<SpeedRampPoint>): void {
    const curr = this.getSettings(clipId);
    const pt = curr.rampPoints.find((p) => p.id === pointId);
    if (!pt) return;
    Object.assign(pt, updates);
    curr.rampPoints.sort((a, b) => a.timeRatio - b.timeRatio);
    this.notify();
  }

  public removeRampPoint(clipId: string, pointId: string): void {
    const curr = this.getSettings(clipId);
    if (curr.rampPoints.length <= 2) return; // Keep endpoints
    curr.rampPoints = curr.rampPoints.filter((p) => p.id !== pointId);
    this.notify();
  }

  /**
   * Evaluates the instantaneous speed factor at a relative normalized position (0.0 to 1.0) along the clip.
   */
  public evaluateSpeedAtRatio(clipId: string, ratio: number): number {
    const curr = this.getSettings(clipId);
    const r = Math.max(0, Math.min(1, ratio));
    const pts = curr.rampPoints;

    if (!pts || pts.length === 0) return curr.baseSpeed;
    if (pts.length === 1) return pts[0].speed;

    if (r <= pts[0].timeRatio) return pts[0].speed;
    if (r >= pts[pts.length - 1].timeRatio) return pts[pts.length - 1].speed;

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      if (r >= p1.timeRatio && r <= p2.timeRatio) {
        const span = p2.timeRatio - p1.timeRatio;
        const localT = span > 0 ? (r - p1.timeRatio) / span : 0;
        // Smooth Hermite / Bezier interpolation
        const smoothT = localT * localT * (3 - 2 * localT);
        return p1.speed + (p2.speed - p1.speed) * smoothT;
      }
    }

    return curr.baseSpeed;
  }

  /**
   * Calculates the exact source media timestamp (in seconds) mapped through the speed ramp curve.
   */
  public evaluateSourceSeconds(
    clipId: string,
    clipLocalSeconds: number,
    clipDurationSec: number,
    sourceStartSec: number,
    sourceDurationSec: number
  ): number {
    const curr = this.getSettings(clipId);
    const ratio = clipDurationSec > 0 ? Math.max(0, Math.min(1, clipLocalSeconds / clipDurationSec)) : 0;

    let mappedRatio = ratio;
    if (curr.curvePreset !== 'Standard' && curr.rampPoints.length > 1) {
      // Numerical integration of speed curve to calculate cumulative time position
      let accum = 0;
      const steps = 20;
      const stepSize = ratio / steps;
      for (let s = 0; s < steps; s++) {
        const midR = (s + 0.5) * stepSize;
        accum += this.evaluateSpeedAtRatio(clipId, midR) * stepSize;
      }
      mappedRatio = Math.max(0, Math.min(1, accum));
    }

    if (curr.reverse) {
      mappedRatio = 1.0 - mappedRatio;
    }

    return sourceStartSec + mappedRatio * sourceDurationSec;
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }
}
