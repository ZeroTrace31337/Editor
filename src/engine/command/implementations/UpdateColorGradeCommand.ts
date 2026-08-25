/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { ColorGrade } from '../../../domain/color/ColorGrade';

export class UpdateColorGradeCommand implements ICommand {
  public readonly id = `cmd_color_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Update Color Grade';
  public readonly description = 'Modify color wheels / exposure / balance';
  public readonly timestamp = Date.now();

  private oldColorGrade: ColorGrade;

  constructor(
    private timelineEngine: TimelineEngine,
    private clipId: string,
    private newColorGrade: ColorGrade
  ) {
    const found = this.timelineEngine.findClip(clipId);
    if (!found) {
      throw new Error(`Clip ${clipId} not found`);
    }
    this.oldColorGrade = JSON.parse(JSON.stringify(found.clip.colorGrade));
  }

  public execute(): void {
    const found = this.timelineEngine.findClip(this.clipId);
    if (found) {
      found.clip.colorGrade = JSON.parse(JSON.stringify(this.newColorGrade));
    }
  }

  public undo(): void {
    const found = this.timelineEngine.findClip(this.clipId);
    if (found) {
      found.clip.colorGrade = JSON.parse(JSON.stringify(this.oldColorGrade));
    }
  }
}
