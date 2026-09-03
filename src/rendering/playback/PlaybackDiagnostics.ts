/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PlaybackMetrics {
  currentFps: number;
  targetFps: number;
  frameDurationMs: number;
  droppedFrames: number;
  skippedFrames: number;
  decodeLatencyMs: number;
  renderLatencyMs: number;
  timelineProcessingMs: number;
  effectsProcessingMs: number;
  audioSyncMs: number;
  mainThreadWorkloadMs: number;
  bufferState: 'buffering' | 'ready' | 'stalled';
  videoReadyState: number; // 0-4 HTMLMediaElement.readyState
  seekLatencyMs: number;
  memoryUsedMb?: number;
  memoryLimitMb?: number;
  qualityLevel: 'Full' | 'Half' | 'Quarter' | 'Eighth';
  isAutoPerformanceActive: boolean;
}

export type MetricsListener = (metrics: PlaybackMetrics) => void;

export class PlaybackDiagnostics {
  private static instance: PlaybackDiagnostics | null = null;

  private metrics: PlaybackMetrics = {
    currentFps: 60,
    targetFps: 60,
    frameDurationMs: 16.67,
    droppedFrames: 0,
    skippedFrames: 0,
    decodeLatencyMs: 0,
    renderLatencyMs: 0,
    timelineProcessingMs: 0,
    effectsProcessingMs: 0,
    audioSyncMs: 0,
    mainThreadWorkloadMs: 0,
    bufferState: 'ready',
    videoReadyState: 4,
    seekLatencyMs: 0,
    qualityLevel: 'Full',
    isAutoPerformanceActive: false,
  };

  private listeners: Set<MetricsListener> = new Set();
  private frameTimes: number[] = [];
  private lastFrameTimestamp: number = 0;
  private droppedFrameCounter: number = 0;
  private skippedFrameCounter: number = 0;
  private consecutiveSlowFrames: number = 0;
  private isDebugOverlayEnabled: boolean = false;

  private constructor() {
    // Check local storage for persistent debug HUD preference if in dev
    try {
      this.isDebugOverlayEnabled = localStorage.getItem('veecut_debug_playback_hud') === 'true';
    } catch {}
  }

  public static getInstance(): PlaybackDiagnostics {
    if (!PlaybackDiagnostics.instance) {
      PlaybackDiagnostics.instance = new PlaybackDiagnostics();
    }
    return PlaybackDiagnostics.instance;
  }

  public setTargetFps(target: number): void {
    this.metrics.targetFps = Math.max(1, target);
  }

  public getTargetFps(): number {
    return this.metrics.targetFps;
  }

  public isDebugEnabled(): boolean {
    return this.isDebugOverlayEnabled;
  }

  public setDebugEnabled(enabled: boolean): void {
    this.isDebugOverlayEnabled = enabled;
    try {
      localStorage.setItem('veecut_debug_playback_hud', enabled ? 'true' : 'false');
    } catch {}
    this.notify();
  }

  public toggleDebugEnabled(): boolean {
    this.setDebugEnabled(!this.isDebugOverlayEnabled);
    return this.isDebugOverlayEnabled;
  }

  /**
   * Called at the start of each frame render
   */
  public recordFrameStart(): number {
    return performance.now();
  }

  /**
   * Called when a frame completes rendering
   */
  public recordFrameEnd(
    frameStartTime: number,
    details?: {
      decodeMs?: number;
      renderMs?: number;
      timelineMs?: number;
      effectsMs?: number;
      audioSyncMs?: number;
      videoReadyState?: number;
      bufferState?: 'buffering' | 'ready' | 'stalled';
    }
  ): void {
    const now = performance.now();
    const frameDuration = now - frameStartTime;

    if (this.lastFrameTimestamp > 0) {
      const deltaFromLast = now - this.lastFrameTimestamp;
      this.frameTimes.push(deltaFromLast);
      if (this.frameTimes.length > 60) {
        this.frameTimes.shift();
      }

      // Dropped frame detection: frame interval took longer than 1.5x target interval
      const targetInterval = 1000 / this.metrics.targetFps;
      if (deltaFromLast > targetInterval * 1.6) {
        const estimatedDropped = Math.floor(deltaFromLast / targetInterval) - 1;
        if (estimatedDropped > 0) {
          this.droppedFrameCounter += estimatedDropped;
        }
        this.consecutiveSlowFrames++;
      } else {
        this.consecutiveSlowFrames = Math.max(0, this.consecutiveSlowFrames - 1);
      }
    }
    this.lastFrameTimestamp = now;

    // Calculate rolling FPS
    let avgDelta = 16.67;
    if (this.frameTimes.length > 0) {
      const sum = this.frameTimes.reduce((a, b) => a + b, 0);
      avgDelta = sum / this.frameTimes.length;
    }
    const rollingFps = avgDelta > 0 ? Math.min(120, Math.round((1000 / avgDelta) * 10) / 10) : 60;

    // Memory info where browser supports it
    let memoryUsedMb: number | undefined;
    let memoryLimitMb: number | undefined;
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const mem = (performance as any).memory;
      memoryUsedMb = Math.round(mem.usedJSHeapSize / (1024 * 1024));
      memoryLimitMb = Math.round(mem.jsHeapSizeLimit / (1024 * 1024));
    }

    this.metrics = {
      ...this.metrics,
      currentFps: rollingFps,
      frameDurationMs: Math.round(frameDuration * 10) / 10,
      droppedFrames: this.droppedFrameCounter,
      skippedFrames: this.skippedFrameCounter,
      decodeLatencyMs: Math.round((details?.decodeMs ?? 0) * 10) / 10,
      renderLatencyMs: Math.round((details?.renderMs ?? frameDuration) * 10) / 10,
      timelineProcessingMs: Math.round((details?.timelineMs ?? 0) * 10) / 10,
      effectsProcessingMs: Math.round((details?.effectsMs ?? 0) * 10) / 10,
      audioSyncMs: Math.round((details?.audioSyncMs ?? 0) * 10) / 10,
      mainThreadWorkloadMs: Math.round(frameDuration * 10) / 10,
      bufferState: details?.bufferState ?? 'ready',
      videoReadyState: details?.videoReadyState ?? 4,
      memoryUsedMb,
      memoryLimitMb,
    };

    this.notify();
  }

  public recordSkippedFrame(): void {
    this.skippedFrameCounter++;
    this.metrics.skippedFrames = this.skippedFrameCounter;
    this.notify();
  }

  public recordSeekLatency(latencyMs: number): void {
    this.metrics.seekLatencyMs = Math.round(latencyMs * 10) / 10;
    this.notify();
  }

  public setQualityLevel(level: 'Full' | 'Half' | 'Quarter' | 'Eighth'): void {
    this.metrics.qualityLevel = level;
    this.notify();
  }

  public setAutoPerformanceActive(active: boolean): void {
    this.metrics.isAutoPerformanceActive = active;
    this.notify();
  }

  public getConsecutiveSlowFrames(): number {
    return this.consecutiveSlowFrames;
  }

  public resetConsecutiveSlowFrames(): void {
    this.consecutiveSlowFrames = 0;
  }

  public resetCounters(): void {
    this.droppedFrameCounter = 0;
    this.skippedFrameCounter = 0;
    this.consecutiveSlowFrames = 0;
    this.frameTimes = [];
    this.lastFrameTimestamp = 0;
    this.metrics.droppedFrames = 0;
    this.metrics.skippedFrames = 0;
    this.notify();
  }

  public getMetrics(): PlaybackMetrics {
    return { ...this.metrics };
  }

  public subscribe(listener: MetricsListener): () => void {
    this.listeners.add(listener);
    listener(this.metrics);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) {
      l(this.metrics);
    }
  }
}
