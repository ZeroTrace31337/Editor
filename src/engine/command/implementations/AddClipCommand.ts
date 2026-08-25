/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { TimelineClip } from '../../../domain/timeline/Clip';

export class AddClipCommand implements ICommand {
  public readonly id = `cmd_add_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Add Clip';
  public readonly description: string;
  public readonly timestamp = Date.now();

  constructor(
    private timelineEngine: TimelineEngine,
    private trackId: string,
    private clip: TimelineClip,
    private insertIndex?: number
  ) {
    this.description = `Add clip "${clip.name}" to track`;
  }

  public execute(): void {
    this.timelineEngine.addClip(this.trackId, this.clip, this.insertIndex);
  }

  public undo(): void {
    this.timelineEngine.removeClip(this.clip.id);
  }
}
