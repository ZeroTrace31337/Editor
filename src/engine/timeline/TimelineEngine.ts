/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  RationalTime,
  TimeRange,
  addRationalTime,
  subtractRationalTime,
  compareRationalTime,
  rationalTimeToSeconds,
  createRationalTime,
} from '../../core/time/RationalTime';
import { TimelineClip, VideoClip, AudioClip, createBaseClip } from '../../domain/timeline/Clip';
import { Track } from '../../domain/timeline/Track';
import { Sequence } from '../../domain/timeline/Sequence';
import { LuminaError, ErrorCode, TimelineCollisionError } from '../../core/errors/AppErrors';
import { logger } from '../../core/logging/Logger';

export class TimelineEngine {
  private sequence: Sequence;
  private listeners: Set<() => void> = new Set();

  constructor(sequence: Sequence) {
    this.sequence = sequence;
  }

  public setSequence(sequence: Sequence, notify: boolean = true): void {
    if (this.sequence === sequence) return;
    this.sequence = sequence;
    this.recalculateSequenceDuration();
    if (notify) {
      this.notify();
    }
  }

  public getSequence(): Sequence {
    return this.sequence;
  }

  public getTrack(trackId: string): Track | undefined {
    return this.sequence.tracks.find((t) => t.id === trackId);
  }

  public findClip(clipId: string): { clip: TimelineClip; track: Track; index: number } | undefined {
    for (const track of this.sequence.tracks) {
      const index = track.clips.findIndex((c) => c.id === clipId);
      if (index !== -1) {
        return { clip: track.clips[index], track, index };
      }
    }
    return undefined;
  }

  /**
   * Adds a clip to a track, checking for overlap collisions.
   */
  public addClip(trackId: string, clip: TimelineClip, insertIndex?: number): void {
    const track = this.getTrack(trackId);
    if (!track) {
      throw new LuminaError(ErrorCode.TIMELINE_COLLISION, `Track ${trackId} not found`, 'Track not found');
    }

    // Check collision with existing clips on same track
    const clipEnd = addRationalTime(clip.timelineRange.start, clip.timelineRange.duration);
    for (const existing of track.clips) {
      if (existing.id === clip.id) continue;
      const existEnd = addRationalTime(existing.timelineRange.start, existing.timelineRange.duration);
      if (
        compareRationalTime(clip.timelineRange.start, existEnd) < 0 &&
        compareRationalTime(existing.timelineRange.start, clipEnd) < 0
      ) {
        throw new TimelineCollisionError(trackId, `Clip overlaps with existing clip "${existing.name}"`);
      }
    }

    clip.trackId = trackId;
    if (insertIndex !== undefined && insertIndex >= 0) {
      track.clips.splice(insertIndex, 0, clip);
    } else {
      track.clips.push(clip);
    }

    // Maintain clips sorted by start time
    track.clips.sort((a, b) => compareRationalTime(a.timelineRange.start, b.timelineRange.start));

    this.recalculateSequenceDuration();
    this.notify();
    logger.info('TimelineEngine', `Added clip "${clip.name}" to track ${track.name}`, { clipId: clip.id });
  }

  /**
   * Removes a clip from the timeline.
   */
  public removeClip(clipId: string): { clip: TimelineClip; trackId: string; index: number } | undefined {
    const found = this.findClip(clipId);
    if (!found) return undefined;

    const { clip, track, index } = found;
    track.clips.splice(index, 1);

    this.recalculateSequenceDuration();
    this.notify();
    logger.info('TimelineEngine', `Removed clip "${clip.name}" from track ${track.name}`, { clipId });
    return { clip, trackId: track.id, index };
  }

  /**
   * Moves a clip to a new start time and optionally a new track.
   */
  public moveClip(clipId: string, newTrackId: string, newStartTime: RationalTime): void {
    const found = this.findClip(clipId);
    if (!found) {
      throw new LuminaError(ErrorCode.TIMELINE_COLLISION, `Clip ${clipId} not found`, 'Clip not found');
    }

    const { clip, track } = found;
    // Temporarily remove from current track
    const removed = this.removeClip(clipId);
    if (!removed) return;

    const originalTrackId = track.id;
    const originalStart = clip.timelineRange.start;

    try {
      clip.timelineRange = {
        start: newStartTime,
        duration: clip.timelineRange.duration,
      };
      this.addClip(newTrackId, clip);
    } catch (err) {
      // Revert if collision occurred
      clip.timelineRange = {
        start: originalStart,
        duration: clip.timelineRange.duration,
      };
      this.addClip(originalTrackId, clip);
      throw err;
    }
  }

  /**
   * Trims a clip's in/out points.
   */
  public trimClip(
    clipId: string,
    newTimelineStart: RationalTime,
    newDuration: RationalTime,
    newSourceIn: RationalTime
  ): void {
    const found = this.findClip(clipId);
    if (!found) {
      throw new LuminaError(ErrorCode.TIMELINE_COLLISION, `Clip ${clipId} not found`, 'Clip not found');
    }

    const { clip, track } = found;
    const originalTimelineRange = { ...clip.timelineRange };
    const originalSourceRange = { ...clip.sourceRange };

    // Validate duration is positive
    if (newDuration.value <= 0n) {
      throw new LuminaError(ErrorCode.INVALID_RANGE, 'Clip duration must be greater than zero', 'Duration is too short');
    }

    // Check overlap with neighbors on the same track
    const newEnd = addRationalTime(newTimelineStart, newDuration);
    for (const other of track.clips) {
      if (other.id === clipId) continue;
      const otherEnd = addRationalTime(other.timelineRange.start, other.timelineRange.duration);
      if (
        compareRationalTime(newTimelineStart, otherEnd) < 0 &&
        compareRationalTime(other.timelineRange.start, newEnd) < 0
      ) {
        throw new TimelineCollisionError(track.id, 'Trimming causes collision with adjacent clip');
      }
    }

    clip.timelineRange = { start: newTimelineStart, duration: newDuration };
    clip.sourceRange = { start: newSourceIn, duration: newDuration };

    track.clips.sort((a, b) => compareRationalTime(a.timelineRange.start, b.timelineRange.start));
    this.recalculateSequenceDuration();
    this.notify();
    logger.info('TimelineEngine', `Trimmed clip "${clip.name}"`, {
      clipId,
      newTimelineStart: rationalTimeToSeconds(newTimelineStart),
      newDuration: rationalTimeToSeconds(newDuration),
    });
  }

  /**
   * Splits a clip at a given timeline timestamp.
   */
  public splitClip(clipId: string, splitTimelineTime: RationalTime): { left: TimelineClip; right: TimelineClip } {
    const found = this.findClip(clipId);
    if (!found) {
      throw new LuminaError(ErrorCode.TIMELINE_COLLISION, `Clip ${clipId} not found`, 'Clip not found');
    }

    const { clip, track } = found;
    const clipStart = clip.timelineRange.start;
    const clipEnd = addRationalTime(clipStart, clip.timelineRange.duration);

    // Verify split point is strictly inside the clip
    if (
      compareRationalTime(splitTimelineTime, clipStart) <= 0 ||
      compareRationalTime(splitTimelineTime, clipEnd) >= 0
    ) {
      throw new LuminaError(
        ErrorCode.INVALID_RANGE,
        'Split point must be strictly inside the clip boundaries',
        'Playhead must be inside the selected clip to split it'
      );
    }

    const leftDuration = subtractRationalTime(splitTimelineTime, clipStart);
    const rightDuration = subtractRationalTime(clipEnd, splitTimelineTime);

    // Calculate source offsets
    const leftSourceRange: TimeRange = {
      start: clip.sourceRange.start,
      duration: leftDuration,
    };
    const rightSourceStart = addRationalTime(clip.sourceRange.start, leftDuration);
    const rightSourceRange: TimeRange = {
      start: rightSourceStart,
      duration: rightDuration,
    };

    // Modify existing clip to be left side
    clip.timelineRange = { start: clipStart, duration: leftDuration };
    clip.sourceRange = leftSourceRange;

    // Create new right side clip
    const rightClipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const rightClip: TimelineClip = {
      ...JSON.parse(JSON.stringify(clip)),
      id: rightClipId,
      name: `${clip.name} (Part 2)`,
      timelineRange: { start: splitTimelineTime, duration: rightDuration },
      sourceRange: rightSourceRange,
    };

    this.addClip(track.id, rightClip);
    return { left: clip, right: rightClip };
  }

  /**
   * Finds all active clips at a specific timeline timestamp T.
   */
  public getClipsAtTime(time: RationalTime): { clip: TimelineClip; track: Track }[] {
    const results: { clip: TimelineClip; track: Track }[] = [];

    for (const track of this.sequence.tracks) {
      if (!track.visible && track.kind === 'video') continue;
      if (track.muted && track.kind === 'audio') continue;

      for (const clip of track.clips) {
        if (clip.muted) continue;
        const start = clip.timelineRange.start;
        const end = addRationalTime(start, clip.timelineRange.duration);
        if (compareRationalTime(time, start) >= 0 && compareRationalTime(time, end) < 0) {
          results.push({ clip, track });
        }
      }
    }

    return results;
  }

  /**
   * Snapping engine: finds nearest snap points within threshold.
   */
  public calculateSnap(
    targetTime: RationalTime,
    playheadTime: RationalTime,
    thresholdSeconds = 0.15,
    excludeClipId?: string
  ): { snappedTime: RationalTime; didSnap: boolean; snapTargetName?: string } {
    const targetSec = rationalTimeToSeconds(targetTime);
    let closestDiff = thresholdSeconds;
    let bestSnap = targetTime;
    let didSnap = false;
    let snapTargetName: string | undefined;

    // Snap to 0 (timeline start)
    if (Math.abs(targetSec) < closestDiff) {
      closestDiff = Math.abs(targetSec);
      bestSnap = createRationalTime(0);
      didSnap = true;
      snapTargetName = 'Timeline Start';
    }

    // Snap to Playhead
    const playheadSec = rationalTimeToSeconds(playheadTime);
    if (Math.abs(targetSec - playheadSec) < closestDiff) {
      closestDiff = Math.abs(targetSec - playheadSec);
      bestSnap = playheadTime;
      didSnap = true;
      snapTargetName = 'Playhead';
    }

    // Snap to existing clip boundaries
    for (const track of this.sequence.tracks) {
      for (const clip of track.clips) {
        if (clip.id === excludeClipId) continue;

        const startSec = rationalTimeToSeconds(clip.timelineRange.start);
        const endSec = rationalTimeToSeconds(addRationalTime(clip.timelineRange.start, clip.timelineRange.duration));

        if (Math.abs(targetSec - startSec) < closestDiff) {
          closestDiff = Math.abs(targetSec - startSec);
          bestSnap = clip.timelineRange.start;
          didSnap = true;
          snapTargetName = `${clip.name} (In)`;
        }

        if (Math.abs(targetSec - endSec) < closestDiff) {
          closestDiff = Math.abs(targetSec - endSec);
          bestSnap = addRationalTime(clip.timelineRange.start, clip.timelineRange.duration);
          didSnap = true;
          snapTargetName = `${clip.name} (Out)`;
        }
      }
    }

    return { snappedTime: bestSnap, didSnap, snapTargetName };
  }

  public recalculateSequenceDuration(): void {
    let maxEnd = createRationalTime(0);
    for (const track of this.sequence.tracks) {
      for (const clip of track.clips) {
        const clipEnd = addRationalTime(clip.timelineRange.start, clip.timelineRange.duration);
        if (compareRationalTime(clipEnd, maxEnd) > 0) {
          maxEnd = clipEnd;
        }
      }
    }
    this.sequence.duration = maxEnd;
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}
