/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  RationalTime,
  createRationalTime,
  secondsToRationalTime,
  rationalTimeToSeconds,
  compareRationalTime,
  addRationalTime,
} from '../../core/time/RationalTime';
import { Sequence } from '../../domain/timeline/Sequence';
import { logger } from '../../core/logging/Logger';
import { PlaybackDiagnostics } from './PlaybackDiagnostics';
import { VideoPlaybackManager } from './VideoPlaybackManager';
import { AudioPlaybackSync } from './AudioPlaybackSync';
import { TimelineIntervalIndex } from '../../engine/timeline/TimelineIntervalIndex';
import { MediaRegistry } from '../../engine/media/MediaRegistry';
import { VideoClip } from '../../domain/timeline/Clip';

export type PlaybackState = 'playing' | 'paused';
export type TimeUpdateListener = (time: RationalTime) => void;
export type PlaybackStateListener = (state: PlaybackState) => void;
export type FrameRenderListener = (currentTime: RationalTime, isPlaying: boolean) => void;

export class PlaybackEngine {
  private currentTime: RationalTime = createRationalTime(0);
  private state: PlaybackState = 'paused';
  private sequence: Sequence;
  private animationFrameId: number | null = null;
  private lastPerfTime: number = 0;
  private timeListeners: Set<TimeUpdateListener> = new Set();
  private stateListeners: Set<PlaybackStateListener> = new Set();
  private frameListeners: Set<FrameRenderListener> = new Set();
  private volume: number = 1.0;
  private isMuted: boolean = false;
  private playbackRate: number = 1.0;
  private targetFps: number = 60;
  private lastUiNotifyTime: number = 0;
  private lastLookaheadCheckTime: number = 0;

  private diagnostics = PlaybackDiagnostics.getInstance();
  private videoManager = VideoPlaybackManager.getInstance();
  private audioSync = AudioPlaybackSync.getInstance();
  private mediaRegistry: MediaRegistry | null = null;

  constructor(sequence: Sequence, mediaRegistry?: MediaRegistry) {
    this.sequence = sequence;
    if (mediaRegistry) {
      this.mediaRegistry = mediaRegistry;
    }
    const fps = sequence.frameRate ? sequence.frameRate.numerator / sequence.frameRate.denominator : 60;
    this.targetFps = Math.round(fps) || 60;
    this.diagnostics.setTargetFps(this.targetFps);
  }

  public setMediaRegistry(registry: MediaRegistry): void {
    this.mediaRegistry = registry;
  }

  public setSequence(sequence: Sequence): void {
    this.sequence = sequence;
    const fps = sequence.frameRate ? sequence.frameRate.numerator / sequence.frameRate.denominator : 60;
    this.targetFps = Math.round(fps) || 60;
    this.diagnostics.setTargetFps(this.targetFps);

    if (compareRationalTime(this.currentTime, this.sequence.duration) > 0) {
      this.seek(createRationalTime(0));
    }
  }

  public getSequence(): Sequence {
    return this.sequence;
  }

  public getCurrentTime(): RationalTime {
    return this.currentTime;
  }

  public getState(): PlaybackState {
    return this.state;
  }

  public isPlaying(): boolean {
    return this.state === 'playing';
  }

  public getIsPlaying(): boolean {
    return this.state === 'playing';
  }

  public getPlaybackRate(): number {
    return this.playbackRate;
  }

  public setPlaybackRate(rate: number): void {
    this.playbackRate = Math.max(0.1, Math.min(8.0, rate));
  }

  public play(): void {
    if (this.state === 'playing') return;

    // If at end of sequence, loop back to start
    if (
      this.sequence.duration.value > 0n &&
      compareRationalTime(this.currentTime, this.sequence.duration) >= 0
    ) {
      this.currentTime = createRationalTime(0);
    }

    this.state = 'playing';
    this.lastPerfTime = performance.now();
    this.lastUiNotifyTime = this.lastPerfTime;
    this.lastLookaheadCheckTime = this.lastPerfTime;
    this.startLoop();
    this.notifyState();
    logger.info('PlaybackEngine', 'Playback started');
  }

  public pause(): void {
    if (this.state === 'paused') return;
    this.state = 'paused';
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.videoManager.pauseAll();
    this.audioSync.pauseAll();
    this.notifyState();
    this.notifyTime(true); // Always notify UI immediately on pause
    this.notifyFrame();
    logger.info('PlaybackEngine', 'Playback paused', { time: rationalTimeToSeconds(this.currentTime) });
  }

  public togglePlayPause(): void {
    if (this.isPlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }

  public togglePlay(): void {
    this.togglePlayPause();
  }

  /**
   * Subscribes to time and state updates.
   * UI components receive throttled updates during playback to prevent React re-render thrashing,
   * while receiving instant updates when paused or seeked.
   */
  public subscribe(listener: (time: RationalTime, isPlaying: boolean) => void): () => void {
    const timeUnsub = this.onTimeUpdate((time) => {
      listener(time, this.isPlaying());
    });
    const stateUnsub = this.onStateChange((state) => {
      listener(this.currentTime, state === 'playing');
    });

    return () => {
      timeUnsub();
      stateUnsub();
    };
  }

  /**
   * Dedicated high-frequency frame listener for PreviewMonitor canvas rendering and playhead animation.
   * Runs at full display refresh rate (60/120 FPS) without triggering React re-renders of the editor.
   */
  public onFrame(listener: FrameRenderListener): () => void {
    this.frameListeners.add(listener);
    return () => this.frameListeners.delete(listener);
  }

  public seek(time: RationalTime): void {
    const seekStart = performance.now();
    let clampedTime = time;
    if (clampedTime.value < 0n) {
      clampedTime = createRationalTime(0);
    }
    if (this.sequence.duration.value > 0n && compareRationalTime(clampedTime, this.sequence.duration) > 0) {
      clampedTime = this.sequence.duration;
    }

    this.currentTime = clampedTime;

    // Check media audio sync
    if (this.mediaRegistry) {
      this.audioSync.syncAudio(this.sequence, this.currentTime, false, this.mediaRegistry);
    }

    this.notifyTime(true);
    this.notifyFrame();
    this.diagnostics.recordSeekLatency(performance.now() - seekStart);
  }

  public seekSeconds(seconds: number): void {
    this.seek(secondsToRationalTime(seconds));
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    this.audioSync.setVolume(this.getVolume());
  }

  public getVolume(): number {
    return this.isMuted ? 0 : this.volume;
  }

  public toggleMute(): void {
    this.isMuted = !this.isMuted;
    this.audioSync.setMuted(this.isMuted);
  }

  public isMute(): boolean {
    return this.isMuted;
  }

  private startLoop(): void {
    const loop = (now: number) => {
      if (this.state !== 'playing') return;

      const deltaMs = now - this.lastPerfTime;
      this.lastPerfTime = now;

      // Drop obsolete frame calculations if main thread stalled excessively
      if (deltaMs > 250) {
        this.diagnostics.recordSkippedFrame();
      }

      const deltaSeconds = (Math.min(deltaMs, 100) / 1000) * this.playbackRate;
      const deltaRational = secondsToRationalTime(deltaSeconds);
      const nextTime = addRationalTime(this.currentTime, deltaRational);

      // Check if reached sequence duration
      if (
        this.sequence.duration.value > 0n &&
        compareRationalTime(nextTime, this.sequence.duration) >= 0
      ) {
        this.currentTime = this.sequence.duration;
        this.notifyTime(true);
        this.notifyFrame();
        this.pause();
        return;
      }

      this.currentTime = nextTime;

      // 1. Sync Audio Graph
      let audioSyncOffset = 0;
      if (this.mediaRegistry) {
        const audioStatus = this.audioSync.syncAudio(this.sequence, this.currentTime, true, this.mediaRegistry);
        audioSyncOffset = audioStatus.driftMs;
      }

      // 2. High-Frequency Frame Rendering (Direct Canvas & Playhead, 60/120 FPS)
      this.notifyFrame();

      // 3. Lookahead Preloading for upcoming video clips (runs every ~500ms)
      if (now - this.lastLookaheadCheckTime > 500) {
        this.lastLookaheadCheckTime = now;
        this.runLookaheadPreload();
      }

      // 4. Rate-limited UI Notification (~8-10 updates/sec for React components)
      // This prevents the entire React tree from re-rendering 60 times a second!
      if (now - this.lastUiNotifyTime >= 100) {
        this.lastUiNotifyTime = now;
        this.notifyTime(false);
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Pre-warms video decoders for clips in the next 1-3 seconds
   */
  private runLookaheadPreload(): void {
    if (!this.mediaRegistry) return;

    const intervalIndex = TimelineIntervalIndex.getForSequence(this.sequence);
    const upcomingClips = intervalIndex.queryUpcomingVisualClips(this.currentTime, 3.0);

    const assetsToPreload = [];
    const targetStartSecs = [];

    for (const clip of upcomingClips) {
      if (clip.type === 'video') {
        const asset = this.mediaRegistry.getAsset((clip as VideoClip).mediaAssetId);
        if (asset) {
          assetsToPreload.push(asset);
          targetStartSecs.push(rationalTimeToSeconds(clip.sourceRange.start));
        }
      }
    }

    if (assetsToPreload.length > 0) {
      this.videoManager.preloadUpcomingAssets(assetsToPreload, targetStartSecs);
    }
  }

  public onTimeUpdate(listener: TimeUpdateListener): () => void {
    this.timeListeners.add(listener);
    return () => this.timeListeners.delete(listener);
  }

  public onStateChange(listener: PlaybackStateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private notifyTime(forceImmediate: boolean = false): void {
    this.timeListeners.forEach((l) => l(this.currentTime));
  }

  private notifyState(): void {
    this.stateListeners.forEach((l) => l(this.state));
  }

  private notifyFrame(): void {
    for (const l of this.frameListeners) {
      l(this.currentTime, this.isPlaying());
    }
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.videoManager.destroy();
    this.audioSync.destroy();
    this.timeListeners.clear();
    this.stateListeners.clear();
    this.frameListeners.clear();
  }
}
