/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { EffectInstance } from '../../../rendering/effects/EffectTypes';

export class UpdateEffectsCommand implements ICommand {
  public readonly id = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Update Effects Stack';
  public readonly description: string;
  public readonly timestamp = Date.now();

  private timelineEngine: TimelineEngine;
  private clipId: string;
  private newEffects: EffectInstance[];
  private previousEffects: EffectInstance[] = [];

  constructor(timelineEngine: TimelineEngine, clipId: string, newEffects: EffectInstance[]) {
    this.timelineEngine = timelineEngine;
    this.clipId = clipId;
    this.newEffects = JSON.parse(JSON.stringify(newEffects));
    this.description = `Update effects stack (${newEffects.length} effects)`;
  }

  public async execute(): Promise<void> {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) throw new Error(`Clip ${this.clipId} not found`);

    this.previousEffects = JSON.parse(JSON.stringify(found.clip.effects || []));
    found.clip.effects = JSON.parse(JSON.stringify(this.newEffects));
  }

  public async undo(): Promise<void> {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) throw new Error(`Clip ${this.clipId} not found`);

    found.clip.effects = JSON.parse(JSON.stringify(this.previousEffects));
  }
}
