/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project } from '../../domain/project/Project';
import { TimelineEngine } from '../../engine/timeline/TimelineEngine';
import { CanvasCompositor } from '../compositor/CanvasCompositor';
import { rationalTimeToSeconds, secondsToRationalTime, createRationalTime } from '../../core/time/RationalTime';
import { logger } from '../../core/logging/Logger';

export interface ExportSettings {
  width: number;
  height: number;
  fps: number;
  format: 'video/webm;codecs=vp9' | 'video/webm' | 'video/mp4';
  filename: string;
}

export type ExportProgressCallback = (progress: number, statusText: string) => void;

export class CanvasVideoExporter {
  private timelineEngine: TimelineEngine;
  private compositor: CanvasCompositor;
  private isCancelled = false;

  constructor(timelineEngine: TimelineEngine, compositor: CanvasCompositor) {
    this.timelineEngine = timelineEngine;
    this.compositor = compositor;
  }

  public cancel(): void {
    this.isCancelled = true;
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

    // Try supported mime types
    let mimeType = 'video/webm';
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
      mimeType = 'video/mp4;codecs=avc1';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mimeType = 'video/webm;codecs=vp9';
    }

    const stream = offscreenCanvas.captureStream(settings.fps);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8000000, // 8 Mbps for 1080p high quality
    });

    const recordedChunks: Blob[] = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.start();

    const frameDurationSec = 1 / settings.fps;

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      if (this.isCancelled) {
        mediaRecorder.stop();
        throw new Error('Export was cancelled by the user');
      }

      const frameTimeSec = frameIndex * frameDurationSec;
      const currentRationalTime = secondsToRationalTime(frameTimeSec);

      this.compositor.renderSequence(ctx, sequence, currentRationalTime, settings.width, settings.height);

      const progress = (frameIndex + 1) / totalFrames;
      onProgress?.(progress, `Rendering frame ${frameIndex + 1} of ${totalFrames} (${Math.round(progress * 100)}%)`);

      // Yield frame rendering time to browser
      await new Promise((r) => setTimeout(r, 16));
    }

    return new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => {
        const finalBlob = new Blob(recordedChunks, { type: mimeType });
        logger.info('CanvasVideoExporter', `Export completed: ${finalBlob.size} bytes`, {
          type: mimeType,
        });
        onProgress?.(1.0, 'Export completed!');
        resolve(finalBlob);
      };

      mediaRecorder.onerror = (err) => {
        logger.error('CanvasVideoExporter', 'MediaRecorder export error', { error: err });
        reject(err);
      };

      mediaRecorder.stop();
    });
  }
}
