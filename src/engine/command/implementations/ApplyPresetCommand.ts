/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { FilterPreset } from '../../../domain/preset/Preset';
import { ColorGrade } from '../../../domain/color/ColorGrade';
import { EffectInstance } from '../../../rendering/effects/EffectTypes';

export class ApplyPresetCommand implements ICommand {
  public readonly id = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  public readonly name: string;
  public readonly description: string;
  public readonly timestamp = Date.now();

  private timelineEngine: TimelineEngine;
  private clipId: string;
  private preset: FilterPreset;
  private previousColorGrade?: ColorGrade;
  private previousEffects?: EffectInstance[];

  constructor(timelineEngine: TimelineEngine, clipId: string, preset: FilterPreset) {
    this.timelineEngine = timelineEngine;
    this.clipId = clipId;
    this.preset = preset;
    this.name = `Apply Preset: ${preset.name}`;
    this.description = `Apply look preset "${preset.name}"`;
  }

  public async execute(): Promise<void> {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) throw new Error(`Clip ${this.clipId} not found`);

    this.previousColorGrade = JSON.parse(JSON.stringify(found.clip.colorGrade));
    this.previousEffects = JSON.parse(JSON.stringify(found.clip.effects || []));

    found.clip.colorGrade = JSON.parse(JSON.stringify(this.preset.colorGrade));
    if (this.preset.effects && this.preset.effects.length > 0) {
      found.clip.effects = JSON.parse(JSON.stringify(this.preset.effects));
    }
  }

  public async undo(): Promise<void> {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) throw new Error(`Clip ${this.clipId} not found`);

    if (this.previousColorGrade) {
      found.clip.colorGrade = JSON.parse(JSON.stringify(this.previousColorGrade));
    }
    if (this.previousEffects) {
      found.clip.effects = JSON.parse(JSON.stringify(this.previousEffects));
    }
  }
}
