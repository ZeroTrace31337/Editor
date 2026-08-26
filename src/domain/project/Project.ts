/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FrameRate, COMMON_FRAME_RATES } from '../../core/time/RationalTime';
import { Sequence, createDefaultSequence } from '../timeline/Sequence';
import { MediaAsset } from '../media/MediaAsset';
import { createTrack } from '../timeline/Track';

export type AspectRatioPreset = '16:9' | '9:16' | '1:1' | '4:3' | '4:5' | '21:9';

export interface ProjectSettings {
  canvasWidth: number;
  canvasHeight: number;
  aspectRatio: AspectRatioPreset;
  frameRate: FrameRate;
  audioSampleRate: number;
  workingColorSpace: 'Rec.709' | 'sRGB' | 'DisplayP3';
}

export interface ProjectMetadata {
  id: string;
  name: string;
  schemaVersion: string;
  createdAt: string;
  modifiedAt: string;
  author?: string;
}

export interface Project {
  metadata: ProjectMetadata;
  settings: ProjectSettings;
  mediaPool: MediaAsset[];
  sequences: Sequence[];
  activeSequenceId: string;
}

export function createNewProject(name = 'Untitled Project'): Project {
  const defaultSequence = createDefaultSequence();
  // Initialize with standard video and audio tracks
  defaultSequence.tracks = [
    createTrack('track_v2', 'Video 2', 'video'),
    createTrack('track_v1', 'Video 1', 'video'),
    createTrack('track_a1', 'Audio 1', 'audio'),
    createTrack('track_a2', 'Audio 2', 'audio'),
  ];

  return {
    metadata: {
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name,
      schemaVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      author: 'Lumina User',
    },
    settings: {
      canvasWidth: 1920,
      canvasHeight: 1080,
      aspectRatio: '16:9',
      frameRate: COMMON_FRAME_RATES.FPS_30,
      audioSampleRate: 48000,
      workingColorSpace: 'Rec.709',
    },
    mediaPool: [],
    sequences: [defaultSequence],
    activeSequenceId: defaultSequence.id,
  };
}
