/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { TimelineClip, ImageClip } from '../../../domain/timeline/Clip';
import {
  RationalTime,
  secondsToRationalTime,
  rationalTimeToSeconds,
  addRationalTime,
  subtractRationalTime,
  compareRationalTime,
  createRationalTime,
} from '../../../core/time/RationalTime';
import { MediaRegistry } from '../../media/MediaRegistry';
import { Project } from '../../../domain/project/Project';

export class FreezeFrameCommand implements ICommand {
  public readonly id = `cmd_freeze_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Freeze Frame';
  public readonly description: string;
  public readonly timestamp = Date.now();

  private createdFreezeClipId?: string;
  private originalLeftClipSnapshot?: TimelineClip;
  private createdRightClipId?: string;
  private downstreamShiftClips: { clipId: string; originalStart: RationalTime }[] = [];
  private generatedAssetId?: string;

  constructor(
    private timelineEngine: TimelineEngine,
    private mediaRegistry: MediaRegistry,
    private project: Project,
    private targetClipId: string,
    private freezeTimestamp: RationalTime,
    private freezeDurationSec: number = 3.0,
    private snapshotDataUrl?: string
  ) {
    const found = this.timelineEngine.findClip(targetClipId);
    this.description = `Freeze frame on ${found?.clip.name || 'clip'} for ${freezeDurationSec}s`;
  }

  public execute(): void {
    const found = this.timelineEngine.findClip(this.targetClipId);
    if (!found) {
      throw new Error(`Clip ${this.targetClipId} not found`);
    }

    const { clip, track } = found;
    this.originalLeftClipSnapshot = JSON.parse(JSON.stringify(clip));

    const freezeDuration = secondsToRationalTime(this.freezeDurationSec);
    const clipStart = clip.timelineRange.start;
    const clipEnd = addRationalTime(clipStart, clip.timelineRange.duration);

    // 1. Create or register Freeze Frame Still Media Asset
    let assetUri = this.snapshotDataUrl;
    if (!assetUri) {
      // Fallback placeholder image canvas if data URL not directly provided
      const canvas = document.createElement('canvas');
      canvas.width = this.project.settings.canvasWidth || 1920;
      canvas.height = this.project.settings.canvasHeight || 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#a5b4fc';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`FREEZE FRAME [${clip.name}]`, canvas.width / 2, canvas.height / 2);
      }
      assetUri = canvas.toDataURL('image/png');
    }

    this.generatedAssetId = `asset_freeze_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const freezeAsset = {
      id: this.generatedAssetId,
      name: `Freeze - ${clip.name}`,
      type: 'image' as const,
      uri: assetUri,
      thumbnailUrl: assetUri,
      duration: freezeDuration,
      fileSize: 102400,
      importedAt: new Date().toISOString(),
      isOffline: false,
      videoMetadata: {
        width: this.project.settings.canvasWidth || 1920,
        height: this.project.settings.canvasHeight || 1080,
        fps: 30,
        codec: 'png',
      },
    };

    this.mediaRegistry.registerAsset(freezeAsset);
    if (this.project.mediaPool) {
      this.project.mediaPool.push(freezeAsset as any);
    }

    // 2. Determine split positioning
    const isAtStart = compareRationalTime(this.freezeTimestamp, clipStart) <= 0;
    const isAtEnd = compareRationalTime(this.freezeTimestamp, clipEnd) >= 0;

    let freezeInsertStart = this.freezeTimestamp;
    let rightDuration = createRationalTime(0);

    if (isAtStart) {
      freezeInsertStart = clipStart;
    } else if (isAtEnd) {
      freezeInsertStart = clipEnd;
    } else {
      // Split in middle
      const leftDuration = subtractRationalTime(this.freezeTimestamp, clipStart);
      rightDuration = subtractRationalTime(clipEnd, this.freezeTimestamp);

      // Modify existing clip to left side
      clip.timelineRange = { start: clipStart, duration: leftDuration };
      clip.sourceRange = { start: clip.sourceRange.start, duration: leftDuration };

      // Create right side clip
      this.createdRightClipId = `clip_split_r_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const rightClip: TimelineClip = {
        ...JSON.parse(JSON.stringify(clip)),
        id: this.createdRightClipId,
        name: `${clip.name} (Part 2)`,
        timelineRange: {
          start: addRationalTime(this.freezeTimestamp, freezeDuration),
          duration: rightDuration,
        },
        sourceRange: {
          start: addRationalTime(clip.sourceRange.start, leftDuration),
          duration: rightDuration,
        },
      };
      this.timelineEngine.addClip(track.id, rightClip);
    }

    // 3. Create Freeze Image Clip
    this.createdFreezeClipId = `clip_freeze_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const freezeClip: ImageClip = {
      id: this.createdFreezeClipId,
      name: `❄️ Freeze - ${clip.name}`,
      type: 'image',
      mediaAssetId: this.generatedAssetId,
      trackId: track.id,
      timelineRange: {
        start: freezeInsertStart,
        duration: freezeDuration,
      },
      sourceRange: {
        start: createRationalTime(0),
        duration: freezeDuration,
      },
      transform: JSON.parse(JSON.stringify(clip.transform || {})),
      colorGrade: JSON.parse(JSON.stringify(clip.colorGrade || {})),
      effects: JSON.parse(JSON.stringify(clip.effects || [])),
      opacity: clip.opacity ?? 1.0,
      blendMode: clip.blendMode || 'source-over',
      speed: 1.0,
      muted: false,
      locked: false,
      masks: [],
      keyframeTracks: {},
    };

    this.timelineEngine.addClip(track.id, freezeClip);

    // 4. Shift all downstream clips on track
    this.downstreamShiftClips = [];
    const splitCutoff = isAtStart ? clipStart : isAtEnd ? clipEnd : this.freezeTimestamp;

    for (const other of track.clips) {
      if (
        other.id === clip.id ||
        other.id === this.createdFreezeClipId ||
        other.id === this.createdRightClipId
      ) {
        continue;
      }
      if (compareRationalTime(other.timelineRange.start, splitCutoff) >= 0) {
        this.downstreamShiftClips.push({
          clipId: other.id,
          originalStart: { ...other.timelineRange.start },
        });
        other.timelineRange = {
          start: addRationalTime(other.timelineRange.start, freezeDuration),
          duration: other.timelineRange.duration,
        };
      }
    }

    this.timelineEngine.setSequence(this.timelineEngine.getSequence());
  }

  public undo(): void {
    // 1. Remove created freeze clip
    if (this.createdFreezeClipId) {
      this.timelineEngine.removeClip(this.createdFreezeClipId);
    }

    // 2. Remove created right split clip if any
    if (this.createdRightClipId) {
      this.timelineEngine.removeClip(this.createdRightClipId);
    }

    // 3. Restore original left clip snapshot
    if (this.originalLeftClipSnapshot) {
      const found = this.timelineEngine.findClip(this.targetClipId);
      if (found) {
        found.clip.timelineRange = this.originalLeftClipSnapshot.timelineRange;
        found.clip.sourceRange = this.originalLeftClipSnapshot.sourceRange;
      }
    }

    // 4. Shift downstream clips back
    for (const item of this.downstreamShiftClips) {
      const found = this.timelineEngine.findClip(item.clipId);
      if (found) {
        found.clip.timelineRange = {
          start: item.originalStart,
          duration: found.clip.timelineRange.duration,
        };
      }
    }

    this.timelineEngine.setSequence(this.timelineEngine.getSequence());
  }
}
