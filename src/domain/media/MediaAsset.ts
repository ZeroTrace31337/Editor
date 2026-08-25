/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RationalTime } from '../../core/time/RationalTime';

export type MediaType = 'video' | 'audio' | 'image';

export interface VideoStreamMetadata {
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrate?: number;
  rotation?: number;
}

export interface AudioStreamMetadata {
  sampleRate: number;
  channels: number;
  codec: string;
  bitrate?: number;
}

export interface MediaAsset {
  id: string;
  name: string;
  uri: string; // ObjectURL, file path, or web blob URI
  type: MediaType;
  fileSize: number;
  duration: RationalTime;
  videoMetadata?: VideoStreamMetadata;
  audioMetadata?: AudioStreamMetadata;
  thumbnailUrl?: string;
  waveformPeaks?: number[]; // Normalized -1.0 to +1.0 audio peaks for fast waveform rendering
  isOffline: boolean;
  importedAt: string;
}
