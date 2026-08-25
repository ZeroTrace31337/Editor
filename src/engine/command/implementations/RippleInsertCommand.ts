/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { TimelineClip } from '../../../domain/timeline/Clip';
import { RationalTime, addRationalTime, compareRationalTime } from '../../../core/time/RationalTime';

export class RippleInsertCommand implements ICommand {
  public readonly id: string;
  public readonly name: string = 'RippleInsert';
  public readonly description: string;
  public readonly timestamp: number;
  private timelineEngine: TimelineEngine;
  private targetTrackId: string;
  private clip: TimelineClip;
  private insertTime: RationalTime;
  private affectedClips: { clipId: string; originalStart: RationalTime }[] = [];

  constructor(
    timelineEngine: TimelineEngine,
    targetTrackId: string,
    clip: TimelineClip,
    insertTime: RationalTime
  ) {
    this.id = `cmd_ripple_insert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.timelineEngine = timelineEngine;
    this.targetTrackId = targetTrackId;
    this.clip = clip;
    this.insertTime = insertTime;
    this.description = `Ripple Insert Clip: ${clip.name}`;
    this.timestamp = Date.now();
  }

  public execute(): void {
    const sequence = this.timelineEngine.getSequence();
    const clipDuration = this.clip.timelineRange.duration;

    this.affectedClips = [];

    // Find all clips starting at or after insertTime on unlocked tracks
    for (const track of sequence.tracks) {
      if (track.locked) continue;
      for (const c of track.clips) {
        if (compareRationalTime(c.timelineRange.start, this.insertTime) >= 0) {
          this.affectedClips.push({
            clipId: c.id,
            originalStart: { ...c.timelineRange.start },
          });
        }
      }
    }

    // Shift downstream clips right
    for (const aff of this.affectedClips) {
      const c = this.timelineEngine.findClip(aff.clipId);
      if (c) {
        c.clip.timelineRange = {
          start: addRationalTime(c.clip.timelineRange.start, clipDuration),
          duration: c.clip.timelineRange.duration,
        };
      }
    }

    // Set clip position and add to target track
    this.clip.timelineRange = {
      start: { ...this.insertTime },
      duration: this.clip.timelineRange.duration,
    };
    this.clip.trackId = this.targetTrackId;
    this.timelineEngine.addClip(this.targetTrackId, this.clip);
  }

  public undo(): void {
    // Remove inserted clip
    this.timelineEngine.removeClip(this.clip.id);

    // Restore downstream clip positions
    for (const aff of this.affectedClips) {
      const c = this.timelineEngine.findClip(aff.clipId);
      if (c) {
        c.clip.timelineRange = {
          start: aff.originalStart,
          duration: c.clip.timelineRange.duration,
        };
      }
    }

    this.timelineEngine.setSequence(this.timelineEngine.getSequence());
  }
}
