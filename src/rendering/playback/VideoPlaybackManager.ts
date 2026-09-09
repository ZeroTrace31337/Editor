/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MediaRegistry } from '../../engine/media/MediaRegistry';
import { MediaAsset } from '../../domain/media/MediaAsset';
import { PlaybackDiagnostics } from './PlaybackDiagnostics';

export interface VideoElementState {
  element: HTMLVideoElement;
  assetId: string;
  uri: string;
  isPreloaded: boolean;
  lastUsedTimestamp: number;
  lastSeekRequestedTime: number;
  isSeeking: boolean;
}

export class VideoPlaybackManager {
  private static instance: VideoPlaybackManager | null = null;
  private pool: Map<string, VideoElementState> = new Map();
  private maxPooledElements = 16;
  private proxyEnabled = true;
  private masterVolume = 1.0;
  private isMasterMuted = false;

  private constructor() {}

  public static getInstance(): VideoPlaybackManager {
    if (!VideoPlaybackManager.instance) {
      VideoPlaybackManager.instance = new VideoPlaybackManager();
    }
    return VideoPlaybackManager.instance;
  }

  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1.0, vol));
    for (const entry of this.pool.values()) {
      entry.element.volume = this.masterVolume;
    }
  }

  public setMasterMuted(muted: boolean): void {
    this.isMasterMuted = muted;
    for (const entry of this.pool.values()) {
      entry.element.muted = muted;
    }
  }

  public getVideoElementIfActive(assetId: string): HTMLVideoElement | null {
    const entry = this.pool.get(assetId);
    return entry ? entry.element : null;
  }

  public setProxyEnabled(enabled: boolean): void {
    this.proxyEnabled = enabled;
  }

  public isProxyEnabled(): boolean {
    return this.proxyEnabled;
  }

  /**
   * Retrieves or instantiates an HTMLVideoElement for a given media asset,
   * preferring proxy URI when enabled for preview.
   */
  public getVideoElement(asset: MediaAsset): HTMLVideoElement {
    const activeUri =
      this.proxyEnabled && asset.proxyUri
        ? asset.proxyUri
        : asset.uri;

    let entry = this.pool.get(asset.id);

    if (entry && entry.uri !== activeUri) {
      // Asset URI changed (e.g. proxy generated or regenerated)
      entry.element.src = activeUri;
      entry.uri = activeUri;
      entry.isPreloaded = false;
    }

    if (!entry) {
      this.evictOldestIfNeeded();

      const video = document.createElement('video');
      // Set crossOrigin only for non-blob remote resources
      if (!activeUri.startsWith('blob:') && !activeUri.startsWith('data:')) {
        video.crossOrigin = 'anonymous';
      }
      video.muted = this.isMasterMuted;
      video.volume = this.masterVolume;
      video.playsInline = true;
      video.preload = 'auto';
      video.src = activeUri;

      // Safe fallback if crossOrigin causes media error on non-CORS servers
      video.addEventListener('error', () => {
        if (video.crossOrigin) {
          video.removeAttribute('crossorigin');
          video.src = activeUri;
          video.load();
        }
      });

      entry = {
        element: video,
        assetId: asset.id,
        uri: activeUri,
        isPreloaded: false,
        lastUsedTimestamp: Date.now(),
        lastSeekRequestedTime: -1,
        isSeeking: false,
      };

      video.addEventListener('seeking', () => {
        if (entry) entry.isSeeking = true;
      });

      video.addEventListener('seeked', () => {
        if (entry) entry.isSeeking = false;
      });

      this.pool.set(asset.id, entry);
    }

    entry.lastUsedTimestamp = Date.now();
    return entry.element;
  }

  /**
   * Synchronizes an HTMLVideoElement to the target source time with zero-stutter rate-adjustment.
   *
   * CRITICAL OPTIMIZATION:
   * Instead of repeatedly setting `video.currentTime = targetSeconds` (which forces hardware decoder flush),
   * if the engine is playing, we allow `video.play()` and keep the rate steady.
   * We ONLY seek if the drift exceeds 250ms or when paused!
   */
  public syncVideoPlayback(
    video: HTMLVideoElement,
    targetSourceSeconds: number,
    isPlaying: boolean,
    playbackSpeed: number = 1.0
  ): { driftMs: number; readyState: number } {
    const entry = Array.from(this.pool.values()).find((e) => e.element === video);
    const now = performance.now();
    const currentVideoTime = video.currentTime;
    const driftSec = currentVideoTime - targetSourceSeconds;
    const driftMs = driftSec * 1000;

    if (!isPlaying) {
      // Paused state: ensure video is paused and display exact frame
      if (!video.paused) {
        video.pause();
      }
      if (Math.abs(driftSec) > 0.04) {
        if (!entry || !entry.isSeeking || Math.abs(currentVideoTime - targetSourceSeconds) > 0.08) {
          video.currentTime = Math.max(0, targetSourceSeconds);
        }
      }
      return { driftMs, readyState: video.readyState };
    }

    // PLAYING STATE:
    // Ensure video element is playing
    if (video.paused && video.readyState >= 2) {
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Autoplay policy or quick abort - benign
        });
      }
    }

    // Steady Zero-Stutter Drift Handling:
    // If drift is small (< 60ms), maintain exact playback rate to avoid micro-stutter.
    if (Math.abs(driftSec) > 0.25) {
      // Large drift (e.g. after a large jump or initial play): perform single coordinated seek
      if (!entry || !entry.isSeeking) {
        if (entry) entry.lastSeekRequestedTime = now;
        video.currentTime = Math.max(0, targetSourceSeconds);
      }
      video.playbackRate = playbackSpeed;
    } else if (Math.abs(driftSec) > 0.06) {
      // Gentle nudge (max ±5%) to smoothly pull back into lock without pausing decoder
      const nudgeFactor = Math.max(-0.05, Math.min(0.05, -driftSec * 0.4));
      video.playbackRate = Math.max(0.2, playbackSpeed * (1.0 + nudgeFactor));
    } else {
      // In lockstep with authoritative clock: maintain exact playback speed
      if (Math.abs(video.playbackRate - playbackSpeed) > 0.005) {
        video.playbackRate = playbackSpeed;
      }
    }

    return { driftMs, readyState: video.readyState };
  }

  /**
   * Lookahead preloader: Prepares upcoming video elements in the next 1-3 seconds
   * so clip-to-clip transitions have zero latency and zero frame drops.
   */
  public preloadUpcomingAssets(assets: MediaAsset[], targetStartSeconds: number[]): void {
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const startSec = targetStartSeconds[i] ?? 0;
      const video = this.getVideoElement(asset);

      const entry = this.pool.get(asset.id);
      if (entry && !entry.isPreloaded) {
        if (video.readyState < 2) {
          video.load();
        }
        if (Math.abs(video.currentTime - startSec) > 0.1) {
          video.currentTime = Math.max(0, startSec);
        }
        entry.isPreloaded = true;
      }
    }
  }

  /**
   * Pauses all video elements in the pool (e.g. when playback stops)
   */
  public pauseAll(): void {
    for (const entry of this.pool.values()) {
      if (!entry.element.paused) {
        entry.element.pause();
      }
    }
  }

  private evictOldestIfNeeded(): void {
    if (this.pool.size < this.maxPooledElements) return;

    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, entry] of this.pool.entries()) {
      if (entry.element.paused && entry.lastUsedTimestamp < oldestTime) {
        oldestTime = entry.lastUsedTimestamp;
        oldestId = id;
      }
    }

    if (oldestId) {
      const entry = this.pool.get(oldestId);
      if (entry) {
        entry.element.removeAttribute('src');
        entry.element.load();
        this.pool.delete(oldestId);
      }
    }
  }

  public destroy(): void {
    for (const entry of this.pool.values()) {
      entry.element.pause();
      entry.element.removeAttribute('src');
      entry.element.load();
    }
    this.pool.clear();
  }
}
