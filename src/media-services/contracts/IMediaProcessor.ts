/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MediaAsset, MediaType, VideoStreamMetadata, AudioStreamMetadata } from '../../domain/media/MediaAsset';
import { RationalTime } from '../../core/time/RationalTime';

export interface MediaProbeResult {
  duration: RationalTime;
  type: MediaType;
  videoMetadata?: VideoStreamMetadata;
  audioMetadata?: AudioStreamMetadata;
  thumbnailUrl?: string;
  waveformPeaks?: number[];
}

export interface ExportJobOptions {
  projectId: string;
  width: number;
  height: number;
  fps: number;
  format: 'mp4' | 'webm';
  quality: 'draft' | 'standard' | 'high';
}

export interface ExportProgress {
  progress: number; // 0.0 to 1.0
  currentFrame: number;
  totalFrames: number;
  fps: number;
  status: 'pending' | 'rendering' | 'encoding' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

export interface IMediaProcessor {
  probeMedia(file: File | Blob | string, name: string): Promise<MediaProbeResult>;
  generateThumbnail(uri: string, timestampSeconds: number): Promise<string>;
  generateWaveform(uri: string, samplesCount?: number): Promise<number[]>;
}
