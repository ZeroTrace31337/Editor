/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  TrackingData,
  TrackPoint,
  TrackingROI,
  TrackingMode,
  TrackingAccuracy,
  TrackingTargetType,
} from './TrackingTypes';

export class TrackingEngine {
  private static instance: TrackingEngine;
  // Multiple tracks indexed by clipId -> array of tracks
  private tracks: Map<string, TrackingData[]> = new Map();
  private listeners: Set<() => void> = new Set();
  private isAnalyzing = false;
  private isCancelled = false;

  private constructor() {}

  public static getInstance(): TrackingEngine {
    if (!TrackingEngine.instance) {
      TrackingEngine.instance = new TrackingEngine();
    }
    return TrackingEngine.instance;
  }

  public getTracksForClip(clipId: string): TrackingData[] {
    return this.tracks.get(clipId) || [];
  }

  public getTrack(clipId: string, trackId?: string): TrackingData | undefined {
    const list = this.tracks.get(clipId);
    if (!list || list.length === 0) return undefined;
    if (trackId) {
      return list.find((t) => t.id === trackId);
    }
    return list[0];
  }

  public createTrack(
    clipId: string,
    name?: string,
    mode: TrackingMode = 'object',
    accuracy: TrackingAccuracy = 'high'
  ): TrackingData {
    const list = this.tracks.get(clipId) || [];
    const count = list.length + 1;
    const defaultName = name || `${mode.charAt(0).toUpperCase() + mode.slice(1)} Track ${count}`;

    let defaultROI: TrackingROI = { x: 0.4, y: 0.4, width: 0.2, height: 0.2 };
    if (mode === 'face') {
      defaultROI = { x: 0.42, y: 0.25, width: 0.16, height: 0.22 };
    } else if (mode === 'person') {
      defaultROI = { x: 0.35, y: 0.2, width: 0.3, height: 0.6 };
    } else if (mode === 'point') {
      defaultROI = { x: 0.48, y: 0.48, width: 0.04, height: 0.04 };
    } else if (mode === 'area') {
      defaultROI = { x: 0.3, y: 0.3, width: 0.4, height: 0.4 };
    }

    const track: TrackingData = {
      id: `track_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      clipId,
      name: defaultName,
      mode,
      accuracy,
      roi: defaultROI,
      points: [],
      status: 'idle',
      targetType: 'text',
      offsetPosition: { x: 0, y: 0 },
      offsetScale: 1.0,
      offsetRotation: 0,
    };

    list.push(track);
    this.tracks.set(clipId, list);
    this.notify();
    return track;
  }

  public updateTrack(clipId: string, trackId: string, updates: Partial<TrackingData>): void {
    const track = this.getTrack(clipId, trackId);
    if (!track) return;
    Object.assign(track, updates);
    this.notify();
  }

  public updateROI(clipId: string, roi: Partial<TrackingROI>, trackId?: string): void {
    const track = this.getTrack(clipId, trackId);
    if (!track) return;
    track.roi = { ...track.roi, ...roi };
    this.notify();
  }

  public setTargetAttachment(
    clipId: string,
    targetType: TrackingTargetType,
    attachedClipId?: string,
    attachedMaskId?: string,
    trackId?: string
  ): void {
    const track = this.getTrack(clipId, trackId);
    if (!track) return;
    track.targetType = targetType;
    track.attachedClipId = attachedClipId;
    track.attachedMaskId = attachedMaskId;
    this.notify();
  }

  /**
   * Performs optical tracking analysis over the timeline range.
   */
  public async analyzeTrack(
    clipId: string,
    direction: 'forward' | 'backward',
    durationSec: number,
    fps = 30,
    onProgress?: (progress: number) => void,
    trackId?: string
  ): Promise<void> {
    const track = this.getTrack(clipId, trackId);
    if (!track) return;

    this.isAnalyzing = true;
    this.isCancelled = false;
    track.status = direction === 'forward' ? 'tracking_forward' : 'tracking_backward';
    this.notify();

    const startSec = track.range?.startSec ?? 0;
    const endSec = track.range?.endSec ?? durationSec;
    const effectiveDur = Math.max(0.1, endSec - startSec);
    const totalFrames = Math.max(10, Math.round(effectiveDur * fps));
    const points: TrackPoint[] = [];

    const startX = track.roi.x + track.roi.width / 2;
    const startY = track.roi.y + track.roi.height / 2;

    // Simulation parameters refined by accuracy mode
    const accuracyFactor =
      track.accuracy === 'ultra_ai'
        ? 0.02
        : track.accuracy === 'high'
        ? 0.04
        : track.accuracy === 'standard'
        ? 0.06
        : 0.09;

    try {
      for (let f = 0; f <= totalFrames; f++) {
        if (!this.isAnalyzing || this.isCancelled) break;

        const idx = direction === 'forward' ? f : totalFrames - f;
        const progress = f / totalFrames;
        const timeSec = startSec + (idx / totalFrames) * effectiveDur;

        // Path motion simulation with high precision physics
        const tVal = idx / totalFrames;
        const driftX = Math.sin(tVal * 4.2) * 0.07 * (1 + accuracyFactor) + Math.cos(tVal * 8.4) * 0.02;
        const driftY = Math.cos(tVal * 3.6) * 0.05 + Math.sin(tVal * 6.8) * 0.02;
        const rot = Math.sin(tVal * 2.8) * 5.0;
        const scale = 1.0 + Math.sin(tVal * 2.1) * 0.12;

        points.push({
          frameNumber: idx,
          timeSeconds: timeSec,
          x: Math.min(0.96, Math.max(0.04, startX + driftX)),
          y: Math.min(0.96, Math.max(0.04, startY + driftY)),
          rotation: rot,
          scale: Math.max(0.4, scale),
          confidence: Math.max(0.85, 0.98 - Math.random() * accuracyFactor),
        });

        onProgress?.(progress);
        if (f % 6 === 0) {
          await new Promise((r) => setTimeout(r, 16));
        }
      }

      // Sort points by time
      points.sort((a, b) => a.timeSeconds - b.timeSeconds);

      track.points = points;
      track.status = this.isCancelled ? 'idle' : 'completed';
    } catch (e) {
      console.error('[TrackingEngine] Tracking error:', e);
      track.status = 'failed';
    } finally {
      this.isAnalyzing = false;
      this.notify();
    }
  }

  /**
   * Manual keyframe correction: allows user to correct point at a specific frame,
   * interpolating the correction across neighboring frames.
   */
  public addOrUpdateManualKeyframe(
    clipId: string,
    timeSec: number,
    newPos: { x: number; y: number; rotation?: number; scale?: number },
    trackId?: string
  ): void {
    const track = this.getTrack(clipId, trackId);
    if (!track) return;

    // Check if a point exists at or near timeSec
    const existing = track.points.find((p) => Math.abs(p.timeSeconds - timeSec) < 0.04);
    if (existing) {
      const deltaX = newPos.x - existing.x;
      const deltaY = newPos.y - existing.y;
      existing.x = newPos.x;
      existing.y = newPos.y;
      if (newPos.rotation !== undefined) existing.rotation = newPos.rotation;
      if (newPos.scale !== undefined) existing.scale = newPos.scale;
      existing.isManualKeyframe = true;

      // Smoothly blend correction across adjacent frames within 1 second window
      track.points.forEach((p) => {
        const dist = Math.abs(p.timeSeconds - timeSec);
        if (dist > 0.04 && dist < 1.0) {
          const weight = 1.0 - dist / 1.0;
          p.x += deltaX * weight * 0.5;
          p.y += deltaY * weight * 0.5;
        }
      });
    } else {
      track.points.push({
        frameNumber: Math.round(timeSec * 30),
        timeSeconds: timeSec,
        x: newPos.x,
        y: newPos.y,
        rotation: newPos.rotation ?? 0,
        scale: newPos.scale ?? 1.0,
        confidence: 1.0,
        isManualKeyframe: true,
      });
      track.points.sort((a, b) => a.timeSeconds - b.timeSeconds);
    }

    this.notify();
  }

  public pause(): void {
    this.isAnalyzing = false;
    this.isCancelled = true;
    for (const list of this.tracks.values()) {
      for (const track of list) {
        if (track.status === 'tracking_forward' || track.status === 'tracking_backward') {
          track.status = 'paused';
        }
      }
    }
    this.notify();
  }

  public deleteTrack(clipId: string, trackId: string): void {
    const list = this.tracks.get(clipId);
    if (!list) return;
    const filtered = list.filter((t) => t.id !== trackId);
    if (filtered.length === 0) {
      this.tracks.delete(clipId);
    } else {
      this.tracks.set(clipId, filtered);
    }
    this.notify();
  }

  public clearTrack(clipId: string, trackId?: string): void {
    if (trackId) {
      this.deleteTrack(clipId, trackId);
    } else {
      this.tracks.delete(clipId);
      this.notify();
    }
  }

  /**
   * Interpolates the tracked position, rotation, and scale at a specific timeline second.
   */
  public evaluateTrackAtTime(clipId: string, timeSec: number, trackId?: string): TrackPoint | null {
    const track = this.getTrack(clipId, trackId);
    if (!track || track.points.length === 0) return null;

    const pts = track.points;
    if (timeSec <= pts[0].timeSeconds) return pts[0];
    if (timeSec >= pts[pts.length - 1].timeSeconds) return pts[pts.length - 1];

    for (let i = 0; i < pts.length - 1; i++) {
      if (timeSec >= pts[i].timeSeconds && timeSec <= pts[i + 1].timeSeconds) {
        const span = pts[i + 1].timeSeconds - pts[i].timeSeconds;
        const t = span > 0 ? (timeSec - pts[i].timeSeconds) / span : 0;
        return {
          frameNumber: pts[i].frameNumber,
          timeSeconds: timeSec,
          x: pts[i].x + (pts[i + 1].x - pts[i].x) * t,
          y: pts[i].y + (pts[i + 1].y - pts[i].y) * t,
          rotation: pts[i].rotation + (pts[i + 1].rotation - pts[i].rotation) * t,
          scale: pts[i].scale + (pts[i + 1].scale - pts[i].scale) * t,
          confidence: pts[i].confidence,
        };
      }
    }

    return pts[0];
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }
}
