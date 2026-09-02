/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { RationalTime, addRationalTime, subtractRationalTime, compareRationalTime } from '../../../core/time/RationalTime';
import { LuminaError, ErrorCode } from '../../../core/errors/AppErrors';

export type RippleTrimEdge = 'start' | 'end';

/**
 * RippleTrimCommand trims a clip's In or Out point to the playhead and shifts
 * subsequent clips along the timeline to close or expand the gap, preserving sync.
 */
export class RippleTrimCommand implements ICommand {
  public readonly id: string;
  public readonly name: string = 'RippleTrim';
  public readonly description: string;
  public readonly timestamp: number;

  private timelineEngine: TimelineEngine;
  private clipId: string;
  private edge: RippleTrimEdge;
  private playheadTime: RationalTime;

  private prevClipState: {
    timelineStart: RationalTime;
    timelineDuration: RationalTime;
    sourceStart: RationalTime;
    sourceDuration: RationalTime;
  } | null = null;

  private affectedClips: {
    clipId: string;
    originalStart: RationalTime;
  }[] = [];

  constructor(
    timelineEngine: TimelineEngine,
    clipId: string,
    edge: RippleTrimEdge,
    playheadTime: RationalTime
  ) {
    this.id = `cmd_ripple_trim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.timelineEngine = timelineEngine;
    this.clipId = clipId;
    this.edge = edge;
    this.playheadTime = playheadTime;
    this.description = `Ripple Trim ${edge === 'start' ? 'Head (In)' : 'Tail (Out)'} to Playhead`;
    this.timestamp = Date.now();
  }

  public execute(): void {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) {
      throw new LuminaError(ErrorCode.CLIP_NOT_FOUND, `Clip ${this.clipId} not found`, 'Clip not found');
    }

    const { clip, track } = found;
    const clipStart = clip.timelineRange.start;
    const clipEnd = addRationalTime(clipStart, clip.timelineRange.duration);

    // Validate playhead is strictly inside the clip
    if (
      compareRationalTime(this.playheadTime, clipStart) <= 0 ||
      compareRationalTime(this.playheadTime, clipEnd) >= 0
    ) {
      throw new LuminaError(
        ErrorCode.INVALID_RANGE,
        'Playhead must be strictly inside the clip boundaries for ripple trimming',
        'Playhead must be inside the clip to trim'
      );
    }

    this.prevClipState = {
      timelineStart: { ...clip.timelineRange.start },
      timelineDuration: { ...clip.timelineRange.duration },
      sourceStart: { ...clip.sourceRange.start },
      sourceDuration: { ...clip.sourceRange.duration },
    };

    this.affectedClips = [];
    const sequence = this.timelineEngine.getSequence();

    if (this.edge === 'start') {
      // Trim from In to Playhead:
      // Delta to remove is (playheadTime - clipStart)
      const delta = subtractRationalTime(this.playheadTime, clipStart);
      const newDuration = subtractRationalTime(clip.timelineRange.duration, delta);

      // Collect all clips starting after clipStart on unlocked tracks
      for (const t of sequence.tracks) {
        if (t.locked) continue;
        for (const other of t.clips) {
          if (other.id === clip.id) continue;
          if (compareRationalTime(other.timelineRange.start, clipStart) > 0) {
            this.affectedClips.push({
              clipId: other.id,
              originalStart: { ...other.timelineRange.start },
            });
          }
        }
      }

      // Update target clip
      clip.timelineRange = {
        start: clipStart, // moves to playhead's spot in timeline terms, or ripple closes gap
        duration: newDuration,
      };
      clip.sourceRange = {
        start: addRationalTime(clip.sourceRange.start, delta),
        duration: newDuration,
      };

      // Shift subsequent clips left by delta
      for (const aff of this.affectedClips) {
        const c = this.timelineEngine.findClip(aff.clipId);
        if (c) {
          c.clip.timelineRange = {
            start: subtractRationalTime(c.clip.timelineRange.start, delta),
            duration: c.clip.timelineRange.duration,
          };
        }
      }
    } else {
      // Trim from Playhead to Out (Tail):
      // New duration is (playheadTime - clipStart)
      const newDuration = subtractRationalTime(this.playheadTime, clipStart);
      const delta = subtractRationalTime(clip.timelineRange.duration, newDuration);

      // Collect all clips starting after clipStart on unlocked tracks
      for (const t of sequence.tracks) {
        if (t.locked) continue;
        for (const other of t.clips) {
          if (other.id === clip.id) continue;
          if (compareRationalTime(other.timelineRange.start, clipStart) > 0) {
            this.affectedClips.push({
              clipId: other.id,
              originalStart: { ...other.timelineRange.start },
            });
          }
        }
      }

      // Update target clip
      clip.timelineRange = {
        start: clipStart,
        duration: newDuration,
      };
      clip.sourceRange = {
        start: clip.sourceRange.start,
        duration: newDuration,
      };

      // Shift subsequent clips left by delta
      for (const aff of this.affectedClips) {
        const c = this.timelineEngine.findClip(aff.clipId);
        if (c) {
          c.clip.timelineRange = {
            start: subtractRationalTime(c.clip.timelineRange.start, delta),
            duration: c.clip.timelineRange.duration,
          };
        }
      }
    }

    this.timelineEngine.recalculateSequenceDuration();
    this.timelineEngine.setSequence(this.timelineEngine.getSequence());
  }

  public undo(): void {
    if (!this.prevClipState) return;

    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) return;

    found.clip.timelineRange = {
      start: this.prevClipState.timelineStart,
      duration: this.prevClipState.timelineDuration,
    };
    found.clip.sourceRange = {
      start: this.prevClipState.sourceStart,
      duration: this.prevClipState.sourceDuration,
    };

    // Restore positions of affected clips
    for (const aff of this.affectedClips) {
      const c = this.timelineEngine.findClip(aff.clipId);
      if (c) {
        c.clip.timelineRange = {
          start: aff.originalStart,
          duration: c.clip.timelineRange.duration,
        };
      }
    }

    this.timelineEngine.recalculateSequenceDuration();
    this.timelineEngine.setSequence(this.timelineEngine.getSequence());
  }
}
