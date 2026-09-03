/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { RationalTime } from '../../../core/time/RationalTime';
import { TimelineClip } from '../../../domain/timeline/Clip';
import { deepClone } from '../../../core/utils/clone';

export class SplitClipCommand implements ICommand {
  public readonly id = `cmd_split_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Split Clip';
  public readonly description: string;
  public readonly timestamp = Date.now();

  private createdRightClipId?: string;
  private originalLeftClipSnapshot: TimelineClip;

  constructor(
    private timelineEngine: TimelineEngine,
    private clipId: string,
    private splitTime: RationalTime
  ) {
    const found = this.timelineEngine.findClip(clipId);
    if (!found) {
      throw new Error(`Clip ${clipId} not found`);
    }
    this.originalLeftClipSnapshot = deepClone(found.clip);
    this.description = `Split clip "${found.clip.name}" at playhead`;
  }

  public execute(): void {
    const { right } = this.timelineEngine.splitClip(this.clipId, this.splitTime);
    this.createdRightClipId = right.id;
  }

  public undo(): void {
    if (this.createdRightClipId) {
      this.timelineEngine.removeClip(this.createdRightClipId);
    }
    // Restore original left clip
    const found = this.timelineEngine.findClip(this.clipId);
    if (found) {
      found.clip.timelineRange = this.originalLeftClipSnapshot.timelineRange;
      found.clip.sourceRange = this.originalLeftClipSnapshot.sourceRange;
    }
  }
}
