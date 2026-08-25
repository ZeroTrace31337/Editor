/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { RationalTime } from '../../../core/time/RationalTime';

export class TrimClipCommand implements ICommand {
  public readonly id = `cmd_trim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Trim Clip';
  public readonly description: string;
  public readonly timestamp = Date.now();

  private oldTimelineStart: RationalTime;
  private oldDuration: RationalTime;
  private oldSourceIn: RationalTime;

  constructor(
    private timelineEngine: TimelineEngine,
    private clipId: string,
    private newTimelineStart: RationalTime,
    private newDuration: RationalTime,
    private newSourceIn: RationalTime
  ) {
    const found = this.timelineEngine.findClip(clipId);
    if (!found) {
      throw new Error(`Clip ${clipId} not found`);
    }
    this.oldTimelineStart = found.clip.timelineRange.start;
    this.oldDuration = found.clip.timelineRange.duration;
    this.oldSourceIn = found.clip.sourceRange.start;
    this.description = `Trim clip "${found.clip.name}"`;
  }

  public execute(): void {
    this.timelineEngine.trimClip(this.clipId, this.newTimelineStart, this.newDuration, this.newSourceIn);
  }

  public undo(): void {
    this.timelineEngine.trimClip(this.clipId, this.oldTimelineStart, this.oldDuration, this.oldSourceIn);
  }
}
