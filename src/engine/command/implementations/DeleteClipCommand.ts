/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { TimelineClip } from '../../../domain/timeline/Clip';
import { deepClone } from '../../../core/utils/clone';

export class DeleteClipCommand implements ICommand {
  public readonly id = `cmd_del_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Delete Clip';
  public readonly description: string;
  public readonly timestamp = Date.now();

  private deletedClip: TimelineClip;
  private trackId: string;
  private originalIndex: number;

  constructor(private timelineEngine: TimelineEngine, private clipId: string) {
    const found = this.timelineEngine.findClip(clipId);
    if (!found) {
      throw new Error(`Clip ${clipId} not found`);
    }
    this.deletedClip = deepClone(found.clip);
    this.trackId = found.track.id;
    this.originalIndex = found.index;
    this.description = `Delete clip "${found.clip.name}"`;
  }

  public execute(): void {
    this.timelineEngine.removeClip(this.clipId);
  }

  public undo(): void {
    this.timelineEngine.addClip(this.trackId, this.deletedClip, this.originalIndex);
  }
}
