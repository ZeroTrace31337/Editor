/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { RationalTime, addRationalTime, subtractRationalTime, compareRationalTime, createRationalTime } from '../../../core/time/RationalTime';

export class NudgeClipCommand implements ICommand {
  public readonly id: string;
  public readonly name: string = 'NudgeClip';
  public readonly description: string;
  public readonly timestamp: number;

  private timelineEngine: TimelineEngine;
  private clipId: string;
  private offset: RationalTime;
  private isForward: boolean;
  private prevStart: RationalTime | null = null;

  constructor(timelineEngine: TimelineEngine, clipId: string, offset: RationalTime, isForward: boolean) {
    this.id = `cmd_nudge_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.timelineEngine = timelineEngine;
    this.clipId = clipId;
    this.offset = offset;
    this.isForward = isForward;
    this.description = `Nudge Clip ${isForward ? 'Forward' : 'Backward'}`;
    this.timestamp = Date.now();
  }

  public execute(): void {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) return;

    this.prevStart = { ...found.clip.timelineRange.start };

    let newStart: RationalTime;
    if (this.isForward) {
      newStart = addRationalTime(found.clip.timelineRange.start, this.offset);
    } else {
      newStart = subtractRationalTime(found.clip.timelineRange.start, this.offset);
      if (compareRationalTime(newStart, createRationalTime(0)) < 0) {
        newStart = createRationalTime(0);
      }
    }

    found.clip.timelineRange = {
      start: newStart,
      duration: found.clip.timelineRange.duration,
    };

    this.timelineEngine.recalculateSequenceDuration();
    this.timelineEngine.setSequence(this.timelineEngine.getSequence());
  }

  public undo(): void {
    if (!this.prevStart) return;
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) return;

    found.clip.timelineRange = {
      start: this.prevStart,
      duration: found.clip.timelineRange.duration,
    };

    this.timelineEngine.recalculateSequenceDuration();
    this.timelineEngine.setSequence(this.timelineEngine.getSequence());
  }
}
