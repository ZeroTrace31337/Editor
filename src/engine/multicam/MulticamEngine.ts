/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimelineEngine } from '../timeline/TimelineEngine';
import { ProjectService } from '../project/ProjectService';
import { MediaAsset } from '../../domain/media/MediaAsset';
import { TimelineClip, createBaseClip } from '../../domain/timeline/Clip';
import { createRationalTime, RationalTime, addRationalTime, rationalTimeToSeconds } from '../../core/time/RationalTime';
import { logger } from '../../core/logging/Logger';

export interface MulticamAngle {
  id: string;
  name: string; // e.g. "Camera A - Wide", "Camera B - Close-up"
  mediaAssetId: string;
  syncOffset: number; // offset in seconds
  colorTag: string;
}

export interface MulticamSequenceData {
  id: string;
  name: string;
  angles: MulticamAngle[];
  activeAngleIndex: number;
  audioSourceAngleIndex: number;
}

export class MulticamEngine {
  private static instance: MulticamEngine | null = null;
  private multicamSequences: Map<string, MulticamSequenceData> = new Map();
  private activeSequenceId: string | null = null;

  public static getInstance(): MulticamEngine {
    if (!MulticamEngine.instance) {
      MulticamEngine.instance = new MulticamEngine();
    }
    return MulticamEngine.instance;
  }

  private constructor() {
    this.initSampleMulticam();
  }

  private initSampleMulticam() {
    const defaultSeq: MulticamSequenceData = {
      id: 'multicam_main',
      name: 'Studio Interview Multicam (4-Cam)',
      activeAngleIndex: 0,
      audioSourceAngleIndex: 0,
      angles: [
        { id: 'ang_1', name: 'Angle 1: Main Host Wide', mediaAssetId: 'sample_video_1', syncOffset: 0, colorTag: '#06b6d4' },
        { id: 'ang_2', name: 'Angle 2: Guest Close-up', mediaAssetId: 'sample_video_2', syncOffset: 0, colorTag: '#ec4899' },
        { id: 'ang_3', name: 'Angle 3: Over-the-shoulder', mediaAssetId: 'sample_video_3', syncOffset: 0, colorTag: '#eab308' },
        { id: 'ang_4', name: 'Angle 4: Studio Overhead', mediaAssetId: 'sample_video_4', syncOffset: 0, colorTag: '#a855f7' },
      ],
    };
    this.multicamSequences.set(defaultSeq.id, defaultSeq);
    this.activeSequenceId = defaultSeq.id;
  }

  public getActiveMulticam(): MulticamSequenceData | null {
    if (!this.activeSequenceId) return null;
    return this.multicamSequences.get(this.activeSequenceId) || null;
  }

  public setActiveAngle(angleIndex: number, timelineEngine?: TimelineEngine, projectService?: ProjectService, currentTime?: RationalTime): void {
    const current = this.getActiveMulticam();
    if (!current || angleIndex < 0 || angleIndex >= current.angles.length) return;

    current.activeAngleIndex = angleIndex;
    const chosenAngle = current.angles[angleIndex];

    logger.info('MulticamEngine', `Switched active camera angle to [${angleIndex + 1}]: ${chosenAngle.name}`);

    // If live editing on timeline, apply or cut the active angle onto the primary video track
    if (timelineEngine && projectService && currentTime) {
      try {
        const seq = timelineEngine.getSequence();
        const vTrack = seq.tracks.find((t) => t.kind === 'video');
        if (vTrack) {
          const activeClips = timelineEngine.getClipsAtTime(currentTime);
          const topClip = activeClips.find((c) => c.track.id === vTrack.id)?.clip;
          if (topClip) {
            topClip.name = `[${chosenAngle.name}] ${topClip.name.replace(/\[Angle \d+\] /g, '')}`;
            (topClip as any).mediaAssetId = chosenAngle.mediaAssetId;
            projectService.setProject({ ...projectService.getProject() });
          }
        }
      } catch (err) {
        logger.warn('MulticamEngine', 'Failed to auto-cut angle on timeline', { error: err });
      }
    }
  }

  public setAudioSourceAngle(angleIndex: number): void {
    const current = this.getActiveMulticam();
    if (!current || angleIndex < 0 || angleIndex >= current.angles.length) return;
    current.audioSourceAngleIndex = angleIndex;
    logger.info('MulticamEngine', `Set master audio sync source to angle ${angleIndex + 1}`);
  }
}
