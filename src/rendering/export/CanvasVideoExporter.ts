/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project } from '../../domain/project/Project';
import { TimelineEngine } from '../../engine/timeline/TimelineEngine';
import { CanvasCompositor } from '../compositor/CanvasCompositor';
import { rationalTimeToSeconds, secondsToRationalTime, createRationalTime } from '../../core/time/RationalTime';
import { AudioMixerEngine } from '../../engine/audio/AudioMixerEngine';
import { logger } from '../../core/logging/Logger';
import { audioBufferToWav } from '../../core/utils/audioUtils';
import { MediaRegistry } from '../../engine/media/MediaRegistry';

export interface ExportSettings {
  width: number;
  height: number;
  fps: number;
  bitrate?: number;
  format: 'video/webm;codecs=vp9' | 'video/webm' | 'video/mp4';
  filename: string;
  audioOnly?: boolean;
}

export type ExportProgressCallback = (progress: number, statusText: string) => void;

export class CanvasVideoExporter {
  private timelineEngine: TimelineEngine;
  private compositor: CanvasCompositor;
  private mediaRegistry?: MediaRegistry;
  private isCancelled = false;

  constructor(timelineEngine: TimelineEngine, compositor: CanvasCompositor, mediaRegistry?: MediaRegistry) {
    this.timelineEngine = timelineEngine;
    this.compositor = compositor;
    this.mediaRegistry = mediaRegistry;
  }

  public setMediaRegistry(registry: MediaRegistry): void {
    this.mediaRegistry = registry;
  }

  public cancel(): void {
    this.isCancelled = true;
  }

  /**
   * Mixes all timeline audio tracks offline with volume, pan, fades, and clip timing.
   */
  public async mixSequenceAudioOffline(project: Project): Promise<AudioBuffer | null> {
    const sequence = this.timelineEngine.getSequence();
    const durationSeconds = Math.max(0.5, rationalTimeToSeconds(sequence.duration));
    const sampleRate = 48000;
    const OfflineCtxClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    const offlineCtx = new OfflineCtxClass(2, Math.ceil(sampleRate * durationSeconds), sampleRate);

    let hasAudioToMix = false;

    for (const track of sequence.tracks) {
      if (track.muted || !track.visible) continue;
      const trackVol = track.volume ?? 1.0;
      const trackPan = track.pan ?? 0.0;

      for (const clip of track.clips) {
        if (clip.muted) continue;
        if (clip.type !== 'audio' && clip.type !== 'video') {
          continue;
        }

        let uri = (clip as any).uri;
        let assetType: string | undefined;
        if (this.mediaRegistry) {
          const assetId = (clip as any).mediaAssetId;
          if (assetId) {
            const asset = this.mediaRegistry.getAsset(assetId);
            if (asset) {
              if (asset.type === 'image') continue;
              if (!uri) uri = asset.uri;
              assetType = asset.type;
            }
          }
        }

        if (!uri) continue;

        try {
          const resp = await fetch(uri);
          const arrayBuffer = await resp.arrayBuffer();
          // Decode audio from file
          const decodedBuf = await offlineCtx.decodeAudioData(arrayBuffer);

          const source = offlineCtx.createBufferSource();
          source.buffer = decodedBuf;
          source.playbackRate.value = (clip as any).speed ?? 1.0;

          const gainNode = offlineCtx.createGain();
          const pannerNode = offlineCtx.createStereoPanner();

          const clipVol = (clip as any).volume ?? 1.0;
          const finalVol = Math.max(0, clipVol * trackVol);
          const finalPan = Math.max(-1, Math.min(1, ((clip as any).pan ?? 0.0) + trackPan));

          const clipStartSec = rationalTimeToSeconds(clip.timelineRange.start);
          const clipDurSec = rationalTimeToSeconds(clip.timelineRange.duration);
          const sourceInSec = rationalTimeToSeconds(clip.sourceRange.start);

          const fadeInSec = (clip as any).fadeInDuration ? rationalTimeToSeconds((clip as any).fadeInDuration) : 0;
          const fadeOutSec = (clip as any).fadeOutDuration ? rationalTimeToSeconds((clip as any).fadeOutDuration) : 0;

          // Gain envelope
          if (fadeInSec > 0) {
            gainNode.gain.setValueAtTime(0, clipStartSec);
            gainNode.gain.linearRampToValueAtTime(finalVol, clipStartSec + Math.min(fadeInSec, clipDurSec));
          } else {
            gainNode.gain.setValueAtTime(finalVol, clipStartSec);
          }

          if (fadeOutSec > 0 && fadeOutSec < clipDurSec) {
            gainNode.gain.setValueAtTime(finalVol, clipStartSec + clipDurSec - fadeOutSec);
            gainNode.gain.linearRampToValueAtTime(0, clipStartSec + clipDurSec);
          }

          pannerNode.pan.setValueAtTime(finalPan, clipStartSec);

          source.connect(gainNode);
          gainNode.connect(pannerNode);
          pannerNode.connect(offlineCtx.destination);

          source.start(clipStartSec, sourceInSec, clipDurSec);
          hasAudioToMix = true;
        } catch (e) {
          logger.warn('CanvasVideoExporter', `Skipping audio decode for clip ${clip.name}`, { error: e });
        }
      }
    }

    if (!hasAudioToMix) {
      return null;
    }

    return await offlineCtx.startRendering();
  }

  /**
   * Exports timeline audio tracks only into a pristine 16-bit PCM WAV master.
   */
  public async exportAudioOnly(
    project: Project,
    onProgress?: ExportProgressCallback
  ): Promise<Blob> {
    onProgress?.(0.1, 'Analyzing audio timeline tracks...');
    const mixedBuffer = await this.mixSequenceAudioOffline(project);

    if (!mixedBuffer) {
      // Return a short silent WAV if no audio was present
      onProgress?.(0.5, 'Synthesizing audio master...');
      const ctx = new AudioContext();
      const empty = ctx.createBuffer(2, ctx.sampleRate, ctx.sampleRate);
      ctx.close();
      onProgress?.(1.0, 'Audio export complete!');
      return audioBufferToWav(empty);
    }

    onProgress?.(0.7, 'Encoding PCM WAV broadcast master...');
    const wavBlob = audioBufferToWav(mixedBuffer);
    onProgress?.(1.0, 'Audio export complete!');
    return wavBlob;
  }

  public async exportVideo(
    project: Project,
    settings: ExportSettings,
    onProgress?: ExportProgressCallback
  ): Promise<Blob> {
    this.isCancelled = false;
    const sequence = this.timelineEngine.getSequence();
    const durationSeconds = Math.max(1, rationalTimeToSeconds(sequence.duration));
    const totalFrames = Math.ceil(durationSeconds * settings.fps);

    logger.info('CanvasVideoExporter', `Starting export: ${totalFrames} frames at ${settings.fps} FPS`, {
      width: settings.width,
      height: settings.height,
    });

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = settings.width;
    offscreenCanvas.height = settings.height;
    const ctx = offscreenCanvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to create 2D canvas context for export');
    }

    // Determine best supported mime type based on user request and browser support
    let mimeType = 'video/webm';
    const candidateMimes = [
      settings.format,
      settings.format === 'video/mp4' ? 'video/mp4;codecs=avc1' : null,
      settings.format === 'video/mp4' ? 'video/mp4' : null,
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ].filter(Boolean) as string[];

    for (const candidate of candidateMimes) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidate)) {
        mimeType = candidate;
        break;
      }
    }

    const stream = offscreenCanvas.captureStream(settings.fps);

    // Pre-mix all audio tracks offline and stream alongside the canvas frames
    let audioSourceNode: AudioBufferSourceNode | null = null;
    let exportAudioCtx: AudioContext | null = null;

    try {
      onProgress?.(0.05, 'Preparing multi-track audio mixdown...');
      const mixedBuffer = await this.mixSequenceAudioOffline(project);
      if (mixedBuffer) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        exportAudioCtx = new AudioCtxClass();
        const dest = exportAudioCtx.createMediaStreamDestination();
        audioSourceNode = exportAudioCtx.createBufferSource();
        audioSourceNode.buffer = mixedBuffer;
        audioSourceNode.connect(dest);

        const audioTracks = dest.stream.getAudioTracks();
        if (audioTracks.length > 0) {
          stream.addTrack(audioTracks[0]);
        }
      }
    } catch (e) {
      logger.warn('CanvasVideoExporter', 'Audio mixdown destination could not be attached', { error: e });
    }

    const targetBitrate = settings.bitrate || (settings.width >= 3840 ? 35000000 : settings.width >= 2560 ? 18000000 : 8000000);

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: targetBitrate,
    });

    const recordedChunks: Blob[] = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    // Synchronize media recorder and audio playback start
    mediaRecorder.start();
    if (audioSourceNode) {
      audioSourceNode.start(0);
    }

    const frameDurationSec = 1 / settings.fps;
    const targetFrameMs = 1000 / settings.fps;
    const exportStartTime = performance.now();

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      if (this.isCancelled) {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
        stream.getTracks().forEach((track) => track.stop());
        throw new Error('Export was cancelled by the user');
      }

      const frameTimeSec = frameIndex * frameDurationSec;
      const currentRationalTime = secondsToRationalTime(frameTimeSec);

      this.compositor.renderSequence(ctx, sequence, currentRationalTime, settings.width, settings.height);

      const progress = (frameIndex + 1) / totalFrames;
      onProgress?.(progress, `Rendering frame ${frameIndex + 1} of ${totalFrames} (${Math.round(progress * 100)}%)`);

      // Drift-free pacing mathematically synchronized with real-time audio playback
      const targetWallClockTime = exportStartTime + (frameIndex + 1) * targetFrameMs;
      const sleepMs = Math.max(1, targetWallClockTime - performance.now());
      await new Promise((r) => setTimeout(r, sleepMs));
    }

    return new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => {
        if (audioSourceNode) {
          try { audioSourceNode.stop(); } catch {}
        }
        if (exportAudioCtx) {
          try { exportAudioCtx.close(); } catch {}
        }
        stream.getTracks().forEach((track) => track.stop());
        const finalBlob = new Blob(recordedChunks, { type: mimeType });
        logger.info('CanvasVideoExporter', `Export completed: ${finalBlob.size} bytes`, {
          type: mimeType,
        });
        onProgress?.(1.0, 'Export completed!');
        resolve(finalBlob);
      };

      mediaRecorder.onerror = (err) => {
        if (audioSourceNode) {
          try { audioSourceNode.stop(); } catch {}
        }
        if (exportAudioCtx) {
          try { exportAudioCtx.close(); } catch {}
        }
        stream.getTracks().forEach((track) => track.stop());
        logger.error('CanvasVideoExporter', 'MediaRecorder export error', { error: err });
        reject(err);
      };

      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    });
  }
}
