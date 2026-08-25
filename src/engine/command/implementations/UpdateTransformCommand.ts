/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { Transform2D } from '../../../core/math/Transform2D';

export class UpdateTransformCommand implements ICommand {
  public readonly id = `cmd_trans_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Update Transform';
  public readonly description = 'Modify clip position / scale / rotation';
  public readonly timestamp = Date.now();

  private oldTransform: Transform2D;

  constructor(
    private timelineEngine: TimelineEngine,
    private clipId: string,
    private newTransform: Transform2D
  ) {
    const found = this.timelineEngine.findClip(clipId);
    if (!found) {
      throw new Error(`Clip ${clipId} not found`);
    }
    this.oldTransform = JSON.parse(JSON.stringify(found.clip.transform));
  }

  public execute(): void {
    const found = this.timelineEngine.findClip(this.clipId);
    if (found) {
      found.clip.transform = JSON.parse(JSON.stringify(this.newTransform));
    }
  }

  public undo(): void {
    const found = this.timelineEngine.findClip(this.clipId);
    if (found) {
      found.clip.transform = JSON.parse(JSON.stringify(this.oldTransform));
    }
  }
}
