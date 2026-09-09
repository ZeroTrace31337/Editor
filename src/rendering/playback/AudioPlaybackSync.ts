/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Sequence } from '../../domain/timeline/Sequence';
import { RationalTime, rationalTimeToSeconds } from '../../core/time/RationalTime';
import { MediaRegistry } from '../../engine/media/MediaRegistry';
import { AudioClip, VideoClip } from '../../domain/timeline/Clip';
import { AudioMixerEngine } from '../../engine/audio/AudioMixerEngine';
import { VideoPlaybackManager } from './VideoPlaybackManager';

interface ActiveAudioNode {
  element: HTMLAudioElement;
  clipId: string;
  assetId: string;
  sourceStartSec: number;
}

export class AudioPlaybackSync {
  private static instance: AudioPlaybackSync | null = null;
  private audioElements: Map<string, ActiveAudioNode> = new Map();
  private mixer = AudioMixerEngine.getInstance();
  private isMuted: boolean = false;
  private volume: number = 1.0;

  private constructor() {}

  public static getInstance(): AudioPlaybackSync {
    if (!AudioPlaybackSync.instance) {
      AudioPlaybackSync.instance = new AudioPlaybackSync();
    }
    return AudioPlaybackSync.instance;
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1.0, volume));
    this.mixer.setMasterVolume(this.isMuted ? 0 : this.volume);
    // Directly update volume on all managed audio elements
    for (const entry of this.audioElements.values()) {
      entry.element.volume = this.isMuted ? 0 : this.volume;
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.mixer.setMasterVolume(this.isMuted ? 0 : this.volume);
    for (const entry of this.audioElements.values()) {
      entry.element.muted = muted;
    }
  }

  public getVolume(): number {
    return this.isMuted ? 0 : this.volume;
  }

  public isMute(): boolean {
    return this.isMuted;
  }

  /**
   * Synchronizes active audio tracks AND video clips with audio at current playback time.
   * Returns estimated audio drift in milliseconds.
   */
  public syncAudio(
    sequence: Sequence,
    currentTime: RationalTime,
    isPlaying: boolean,
    mediaRegistry: MediaRegistry
  ): { driftMs: number; activeCount: number } {
    const currentSec = rationalTimeToSeconds(currentTime);
    const activeClipIds = new Set<string>();
    let primaryDriftMs = 0;
    let activeCount = 0;
    const videoManager = VideoPlaybackManager.getInstance();

    for (const track of sequence.tracks) {
      if (!track.visible) continue;

      for (const clip of track.clips) {
        const startSec = rationalTimeToSeconds(clip.timelineRange.start);
        const endSec = startSec + rationalTimeToSeconds(clip.timelineRange.duration);

        if (currentSec >= startSec && currentSec < endSec) {
          activeClipIds.add(clip.id);
          activeCount++;

          const isClipMuted = this.isMuted || track.muted || !!clip.muted;
          const trackVol = track.volume ?? 1.0;
          const clipVol = (clip as AudioClip).volume ?? 1.0;
          const effectiveVolume = isClipMuted ? 0 : Math.max(0, Math.min(1.0, trackVol * clipVol * this.volume));

          if (track.kind === 'audio') {
            // Dedicated audio track clip
            const asset = mediaRegistry.getAsset((clip as AudioClip).mediaAssetId);
            if (!asset || !asset.uri) continue;

            let entry = this.audioElements.get(clip.id);
            if (!entry) {
              const audio = document.createElement('audio');
              if (!asset.uri.startsWith('blob:') && !asset.uri.startsWith('data:')) {
                audio.crossOrigin = 'anonymous';
              }
              audio.preload = 'auto';
              audio.muted = isClipMuted;
              audio.volume = effectiveVolume;
              audio.src = asset.uri;

              entry = {
                element: audio,
                clipId: clip.id,
                assetId: asset.id,
                sourceStartSec: rationalTimeToSeconds(clip.sourceRange.start),
              };

              this.audioElements.set(clip.id, entry);
              // Route through Web Audio graph for EQ, panning, limiter & master analyser
              this.mixer.attachMediaElement(audio, clip.id);
            } else {
              entry.element.muted = isClipMuted;
              entry.element.volume = effectiveVolume;
            }

            const targetOffset = entry.sourceStartSec + (currentSec - startSec) * (clip.speed ?? 1.0);
            const currentAudioTime = entry.element.currentTime;
            const drift = (currentAudioTime - targetOffset) * 1000;
            primaryDriftMs = drift;

            // Update DSP nodes (volume automation, EQ, spatial panning)
            this.mixer.updateClipAudio(clip, currentTime);

            if (isPlaying) {
              if (entry.element.paused) {
                entry.element.play().catch(() => {});
              }

              if (Math.abs(drift) > 150) {
                entry.element.currentTime = Math.max(0, targetOffset);
              } else if (Math.abs(drift) > 40) {
                const nudge = Math.max(-0.08, Math.min(0.08, -drift * 0.001));
                entry.element.playbackRate = Math.max(0.5, (clip.speed ?? 1.0) + nudge);
              } else {
                entry.element.playbackRate = clip.speed ?? 1.0;
              }
            } else {
              if (!entry.element.paused) {
                entry.element.pause();
              }
              if (Math.abs(drift) > 40) {
                entry.element.currentTime = Math.max(0, targetOffset);
              }
            }
          } else if (track.kind === 'video') {
            // Video track clip with embedded audio
            const asset = mediaRegistry.getAsset((clip as VideoClip).mediaAssetId);
            if (asset && asset.uri) {
              const video = videoManager.getVideoElement(asset);
              video.muted = isClipMuted;
              video.volume = effectiveVolume;

              // Attach video element to Web Audio graph for DSP & master visualizer
              this.mixer.attachMediaElement(video, clip.id);
              this.mixer.updateClipAudio(clip, currentTime);
            }
          }
        }
      }
    }

    // Stop and clean up inactive audio elements
    for (const [clipId, entry] of this.audioElements.entries()) {
      if (!activeClipIds.has(clipId)) {
        if (!entry.element.paused) {
          entry.element.pause();
        }
        this.mixer.detachClipAudio(clipId);
        entry.element.removeAttribute('src');
        entry.element.load();
        this.audioElements.delete(clipId);
      }
    }

    return { driftMs: primaryDriftMs, activeCount };
  }

  public pauseAll(): void {
    for (const entry of this.audioElements.values()) {
      if (!entry.element.paused) {
        entry.element.pause();
      }
    }
  }

  public destroy(): void {
    this.pauseAll();
    this.audioElements.clear();
  }
}
