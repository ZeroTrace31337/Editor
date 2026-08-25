/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { RationalTime, addRationalTime, subtractRationalTime } from '../../../core/time/RationalTime';

/**
 * Slide Edit: Moves a clip along the timeline between two neighboring clips,
 * trimming the preceding clip's tail and extending the following clip's head.
 * The middle clip's duration and in/out points remain unchanged.
 */
export class SlideEditCommand implements ICommand {
  public readonly id: string;
  public readonly name: string = 'SlideEdit';
  public readonly description: string;
  public readonly timestamp: number;
  private timelineEngine: TimelineEngine;
  private prevClipId: string;
  private middleClipId: string;
  private nextClipId: string;
  private delta: RationalTime;
  private prevStates: {
    prevDuration: RationalTime;
    middleStart: RationalTime;
    nextStart: RationalTime;
    nextDuration: RationalTime;
    nextSourceStart: RationalTime;
  } | null = null;

  constructor(
    timelineEngine: TimelineEngine,
    prevClipId: string,
    middleClipId: string,
    nextClipId: string,
    delta: RationalTime
  ) {
    this.id = `cmd_slide_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.timelineEngine = timelineEngine;
    this.prevClipId = prevClipId;
    this.middleClipId = middleClipId;
    this.nextClipId = nextClipId;
    this.delta = delta;
    this.description = `Slide Edit Clip`;
    this.timestamp = Date.now();
  }

  public execute(): void {
    const prev = this.timelineEngine.findClip(this.prevClipId);
    const middle = this.timelineEngine.findClip(this.middleClipId);
    const next = this.timelineEngine.findClip(this.nextClipId);
    if (!prev || !middle || !next) return;

    this.prevStates = {
      prevDuration: { ...prev.clip.timelineRange.duration },
      middleStart: { ...middle.clip.timelineRange.start },
      nextStart: { ...next.clip.timelineRange.start },
      nextDuration: { ...next.clip.timelineRange.duration },
      nextSourceStart: { ...next.clip.sourceRange.start },
    };

    const newPrevDuration = addRationalTime(prev.clip.timelineRange.duration, this.delta);
    const newMiddleStart = addRationalTime(middle.clip.timelineRange.start, this.delta);
    const newNextStart = addRationalTime(next.clip.timelineRange.start, this.delta);
    const newNextDuration = subtractRationalTime(next.clip.timelineRange.duration, this.delta);

    if (newPrevDuration.value <= 0 || newNextDuration.value <= 0) return;

    prev.clip.timelineRange = {
      start: prev.clip.timelineRange.start,
      duration: newPrevDuration,
    };
    prev.clip.sourceRange = {
      start: prev.clip.sourceRange.start,
      duration: newPrevDuration,
    };

    middle.clip.timelineRange = {
      start: newMiddleStart,
      duration: middle.clip.timelineRange.duration,
    };

    next.clip.timelineRange = {
      start: newNextStart,
      duration: newNextDuration,
    };
    next.clip.sourceRange = {
      start: addRationalTime(next.clip.sourceRange.start, this.delta),
      duration: newNextDuration,
    };

    this.timelineEngine.setSequence(this.timelineEngine.getSequence());
  }

  public undo(): void {
    if (!this.prevStates) return;
    const prev = this.timelineEngine.findClip(this.prevClipId);
    const middle = this.timelineEngine.findClip(this.middleClipId);
    const next = this.timelineEngine.findClip(this.nextClipId);
    if (!prev || !middle || !next) return;

    prev.clip.timelineRange = {
      start: prev.clip.timelineRange.start,
      duration: this.prevStates.prevDuration,
    };
    prev.clip.sourceRange = {
      start: prev.clip.sourceRange.start,
      duration: this.prevStates.prevDuration,
    };

    middle.clip.timelineRange = {
      start: this.prevStates.middleStart,
      duration: middle.clip.timelineRange.duration,
    };

    next.clip.timelineRange = {
      start: this.prevStates.nextStart,
      duration: this.prevStates.nextDuration,
    };
    next.clip.sourceRange = {
      start: this.prevStates.nextSourceStart,
      duration: this.prevStates.nextDuration,
    };

    this.timelineEngine.setSequence(this.timelineEngine.getSequence());
  }
}
