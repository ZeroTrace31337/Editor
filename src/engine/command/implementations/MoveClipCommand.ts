/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { RationalTime, rationalTimeToSeconds } from '../../../core/time/RationalTime';

export class MoveClipCommand implements ICommand {
  public readonly id = `cmd_move_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Move Clip';
  public readonly description: string;
  public readonly timestamp = Date.now();

  private previousTrackId: string;
  private previousStart: RationalTime;

  constructor(
    private timelineEngine: TimelineEngine,
    private clipId: string,
    private newTrackId: string,
    private newStartTime: RationalTime
  ) {
    const found = this.timelineEngine.findClip(clipId);
    if (!found) {
      throw new Error(`Clip ${clipId} not found`);
    }
    this.previousTrackId = found.track.id;
    this.previousStart = found.clip.timelineRange.start;
    this.description = `Move clip to ${rationalTimeToSeconds(newStartTime).toFixed(2)}s`;
  }

  public execute(): void {
    this.timelineEngine.moveClip(this.clipId, this.newTrackId, this.newStartTime);
  }

  public undo(): void {
    this.timelineEngine.moveClip(this.clipId, this.previousTrackId, this.previousStart);
  }
}
