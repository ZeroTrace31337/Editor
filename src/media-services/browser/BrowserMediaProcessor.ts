/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMediaProcessor, MediaProbeResult } from '../contracts/IMediaProcessor';
import { secondsToRationalTime } from '../../core/time/RationalTime';
import { LuminaError, ErrorCode } from '../../core/errors/AppErrors';
import { logger } from '../../core/logging/Logger';

export class BrowserMediaProcessor implements IMediaProcessor {
  private audioContext: AudioContext | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    return this.audioContext;
  }

  public async probeMedia(fileOrUri: File | Blob | string, name: string): Promise<MediaProbeResult> {
    const extension = name.split('.').pop()?.toLowerCase() || '';
    const isVideo = ['mp4', 'mov', 'webm', 'mkv', 'm4v', 'avi', 'wmv', 'flv', '3gp', 'ogv', 'ts'].includes(extension) ||
      (fileOrUri instanceof Blob && fileOrUri.type.startsWith('video/'));
    const isAudio = ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac', 'opus', 'wma', 'aiff'].includes(extension) ||
      (fileOrUri instanceof Blob && fileOrUri.type.startsWith('audio/'));
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'avif'].includes(extension) ||
      (fileOrUri instanceof Blob && fileOrUri.type.startsWith('image/'));

    let uri: string;
    let shouldRevoke = false;
    if (typeof fileOrUri === 'string') {
      uri = fileOrUri;
    } else {
      uri = URL.createObjectURL(fileOrUri);
      shouldRevoke = false; // Kept open for playback/render session
    }

    try {
      if (isVideo) {
        return await this.probeVideo(uri);
      } else if (isAudio) {
        return await this.probeAudio(fileOrUri, uri);
      } else if (isImage) {
        return await this.probeImage(uri);
      } else {
        // Fallback probe
        return await this.probeVideo(uri).catch(() => this.probeImage(uri)).catch(() => this.probeAudio(fileOrUri, uri));
      }
    } catch (err: any) {
      logger.error('BrowserMediaProcessor', `Failed to probe media: ${name}`, { error: err.message });
      throw new LuminaError(
        ErrorCode.INVALID_MEDIA,
        `Failed to probe file ${name}: ${err.message}`,
        'Unable to import this file. The format may be unsupported or corrupted.'
      );
    }
  }

  private probeVideo(uri: string): Promise<MediaProbeResult> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';

      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          cleanup();
          // Provide fallback duration if video loaded partially
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            resolve({
              type: 'video',
              duration: secondsToRationalTime(video.duration || 5.0),
              videoMetadata: {
                width: video.videoWidth || 1920,
                height: video.videoHeight || 1080,
                fps: 30,
                codec: 'h264/avc',
              },
              audioMetadata: {
                sampleRate: 48000,
                channels: 2,
                codec: 'aac',
              },
              thumbnailUrl: '',
            });
            return;
          }
          reject(new Error('Video metadata probe timed out. Please check file format.'));
        }
      }, 12000);

      const cleanup = () => {
        clearTimeout(timeout);
        video.onloadedmetadata = null;
        video.onerror = null;
        video.onseeked = null;
      };

      const captureFrameThumbnail = () => {
        let thumb = '';
        try {
          const width = video.videoWidth || 1920;
          const height = video.videoHeight || 1080;
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 360 / width);
          canvas.width = Math.max(160, Math.round(width * scale));
          canvas.height = Math.max(90, Math.round(height * scale));
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            thumb = canvas.toDataURL('image/jpeg', 0.85);
          }
        } catch (e) {
          console.warn('Could not generate canvas thumbnail', e);
        }
        return thumb;
      };

      video.onloadedmetadata = () => {
        const durationSec = isFinite(video.duration) && video.duration > 0 ? video.duration : 10.0;
        const width = video.videoWidth || 1920;
        const height = video.videoHeight || 1080;
        const durationRational = secondsToRationalTime(durationSec);

        const seekTarget = Math.min(0.2, Math.max(0, durationSec * 0.05));
        
        const finish = () => {
          if (resolved) return;
          resolved = true;
          const thumb = captureFrameThumbnail();
          cleanup();
          resolve({
            type: 'video',
            duration: durationRational,
            videoMetadata: {
              width,
              height,
              fps: 30,
              codec: 'h264/avc',
            },
            audioMetadata: {
              sampleRate: 48000,
              channels: 2,
              codec: 'aac',
            },
            thumbnailUrl: thumb,
          });
        };

        video.onseeked = finish;
        // Also fallback in case onseeked doesn't fire immediately
        setTimeout(finish, 800);

        try {
          video.currentTime = seekTarget;
        } catch {
          finish();
        }
      };

      video.onerror = () => {
        cleanup();
        reject(new Error('HTML5 Video decoding error during probe'));
      };

      video.src = uri;
      video.load();
    });
  }

  private async probeAudio(fileOrUri: File | Blob | string, uri: string): Promise<MediaProbeResult> {
    let arrayBuffer: ArrayBuffer;
    if (typeof fileOrUri === 'string') {
      const resp = await fetch(uri);
      arrayBuffer = await resp.arrayBuffer();
    } else {
      arrayBuffer = await fileOrUri.arrayBuffer();
    }

    const audioCtx = this.getAudioContext();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

    const durationSec = audioBuffer.duration;
    const durationRational = secondsToRationalTime(durationSec);
    const waveformPeaks = this.extractWaveformPeaks(audioBuffer, 100);

    return {
      type: 'audio',
      duration: durationRational,
      audioMetadata: {
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        codec: 'pcm',
      },
      waveformPeaks,
    };
  }

  private probeImage(uri: string): Promise<MediaProbeResult> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const durationRational = secondsToRationalTime(5.0);

        let thumb = uri;
        try {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 360 / img.width);
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            thumb = canvas.toDataURL('image/jpeg', 0.85);
          }
        } catch {}

        resolve({
          type: 'image',
          duration: durationRational,
          videoMetadata: {
            width: img.width,
            height: img.height,
            fps: 1,
            codec: 'raster',
          },
          thumbnailUrl: thumb,
        });
      };

      img.onerror = () => reject(new Error('Image decode error during probe'));
      img.src = uri;
    });
  }

  public async generateThumbnail(uri: string, timestampSeconds: number): Promise<string> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.muted = true;
      video.crossOrigin = 'anonymous';
      video.src = uri;
      video.currentTime = Math.max(0, timestampSeconds);

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 160;
          canvas.height = Math.round(160 * (video.videoHeight / (video.videoWidth || 1)));
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
            return;
          }
        } catch {}
        resolve('');
      };

      video.onerror = () => resolve('');
    });
  }

  public async generateWaveform(uri: string, samplesCount = 100): Promise<number[]> {
    try {
      const resp = await fetch(uri);
      const buffer = await resp.arrayBuffer();
      const audioCtx = this.getAudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(buffer);
      return this.extractWaveformPeaks(audioBuffer, samplesCount);
    } catch {
      return Array(samplesCount).fill(0.2);
    }
  }

  private extractWaveformPeaks(audioBuffer: AudioBuffer, samplesCount: number): number[] {
    const rawData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(rawData.length / samplesCount);
    const peaks: number[] = [];

    for (let i = 0; i < samplesCount; i++) {
      const start = i * blockSize;
      let max = 0;
      for (let j = 0; j < blockSize; j++) {
        const val = Math.abs(rawData[start + j] || 0);
        if (val > max) max = val;
      }
      peaks.push(Math.min(1.0, Number(max.toFixed(3))));
    }

    return peaks;
  }
}
