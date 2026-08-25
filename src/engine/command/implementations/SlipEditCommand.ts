/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { RationalTime, addRationalTime } from '../../../core/time/RationalTime';

/**
 * Slip Edit: Adjusts the clip's in and out points within media source footage
 * while keeping its position and duration on the timeline completely unchanged.
 */
export class SlipEditCommand implements ICommand {
  public readonly id: string;
  public readonly name: string = 'SlipEdit';
  public readonly description: string;
  public readonly timestamp: number;
  private timelineEngine: TimelineEngine;
  private clipId: string;
  private offset: RationalTime;
  private originalSourceStart: RationalTime | null = null;

  constructor(timelineEngine: TimelineEngine, clipId: string, offset: RationalTime) {
    this.id = `cmd_slip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.timelineEngine = timelineEngine;
    this.clipId = clipId;
    this.offset = offset;
    this.description = `Slip Edit Clip`;
    this.timestamp = Date.now();
  }

  public execute(): void {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) return;

    this.originalSourceStart = { ...found.clip.sourceRange.start };
    found.clip.sourceRange = {
      start: addRationalTime(found.clip.sourceRange.start, this.offset),
      duration: found.clip.sourceRange.duration,
    };
    this.timelineEngine.setSequence(this.timelineEngine.getSequence());
  }

  public undo(): void {
    if (!this.originalSourceStart) return;
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) return;

    found.clip.sourceRange = {
      start: { ...this.originalSourceStart },
      duration: found.clip.sourceRange.duration,
    };
    this.timelineEngine.setSequence(this.timelineEngine.getSequence());
  }
}
