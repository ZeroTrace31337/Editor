/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { RationalTime, addRationalTime, subtractRationalTime } from '../../../core/time/RationalTime';

/**
 * Roll Edit: Adjusts the edit point between two adjacent clips on the same track.
 * Extends one clip while trimming the other by the exact same amount.
 * Sequence total duration remains unchanged.
 */
export class RollEditCommand implements ICommand {
  public readonly id: string;
  public readonly name: string = 'RollEdit';
  public readonly description: string;
  public readonly timestamp: number;
  private timelineEngine: TimelineEngine;
  private leftClipId: string;
  private rightClipId: string;
  private delta: RationalTime;
  private prevLeftDuration: RationalTime | null = null;
  private prevRightStart: RationalTime | null = null;
  private prevRightDuration: RationalTime | null = null;
  private prevRightSourceStart: RationalTime | null = null;

  constructor(
    timelineEngine: TimelineEngine,
    leftClipId: string,
    rightClipId: string,
    delta: RationalTime
  ) {
    this.id = `cmd_roll_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.timelineEngine = timelineEngine;
    this.leftClipId = leftClipId;
    this.rightClipId = rightClipId;
    this.delta = delta;
    this.description = `Roll Edit`;
    this.timestamp = Date.now();
  }

  public execute(): void {
    const left = this.timelineEngine.findClip(this.leftClipId);
    const right = this.timelineEngine.findClip(this.rightClipId);
    if (!left || !right) return;

    this.prevLeftDuration = { ...left.clip.timelineRange.duration };
    this.prevRightStart = { ...right.clip.timelineRange.start };
    this.prevRightDuration = { ...right.clip.timelineRange.duration };
    this.prevRightSourceStart = { ...right.clip.sourceRange.start };

    // New durations
    const newLeftDuration = addRationalTime(left.clip.timelineRange.duration, this.delta);
    const newRightStart = addRationalTime(right.clip.timelineRange.start, this.delta);
    const newRightDuration = subtractRationalTime(right.clip.timelineRange.duration, this.delta);

    // Guard minimum 1 frame duration
    if (newLeftDuration.value <= 0 || newRightDuration.value <= 0) return;

    left.clip.timelineRange = {
      start: left.clip.timelineRange.start,
      duration: newLeftDuration,
    };
    left.clip.sourceRange = {
      start: left.clip.sourceRange.start,
      duration: newLeftDuration,
    };

    right.clip.timelineRange = {
      start: newRightStart,
      duration: newRightDuration,
    };
    right.clip.sourceRange = {
      start: addRationalTime(right.clip.sourceRange.start, this.delta),
      duration: newRightDuration,
    };

    this.timelineEngine.setSequence(this.timelineEngine.getSequence());
  }

  public undo(): void {
    const left = this.timelineEngine.findClip(this.leftClipId);
    const right = this.timelineEngine.findClip(this.rightClipId);
    if (!left || !right || !this.prevLeftDuration || !this.prevRightStart || !this.prevRightDuration || !this.prevRightSourceStart) return;

    left.clip.timelineRange = {
      start: left.clip.timelineRange.start,
      duration: this.prevLeftDuration,
    };
    left.clip.sourceRange = {
      start: left.clip.sourceRange.start,
      duration: this.prevLeftDuration,
    };

    right.clip.timelineRange = {
      start: this.prevRightStart,
      duration: this.prevRightDuration,
    };
    right.clip.sourceRange = {
      start: this.prevRightSourceStart,
      duration: this.prevRightDuration,
    };

    this.timelineEngine.setSequence(this.timelineEngine.getSequence());
  }
}
