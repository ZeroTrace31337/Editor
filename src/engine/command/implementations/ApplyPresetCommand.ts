/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { FilterPreset, ActiveFilterConfig } from '../../../domain/preset/Preset';
import { ColorGrade } from '../../../domain/color/ColorGrade';
import { EffectInstance } from '../../../rendering/effects/EffectTypes';
import { PresetManager } from '../../preset/PresetManager';

export class ApplyPresetCommand implements ICommand {
  public readonly id = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  public readonly name: string;
  public readonly description: string;
  public readonly timestamp = Date.now();

  private timelineEngine: TimelineEngine;
  private clipId: string;
  private preset: FilterPreset;
  private intensity: number;
  private previousColorGrade?: ColorGrade;
  private previousEffects?: EffectInstance[];
  private previousBaseColorGrade?: ColorGrade;
  private previousBaseEffects?: EffectInstance[];
  private previousActiveFilter?: ActiveFilterConfig;

  constructor(timelineEngine: TimelineEngine, clipId: string, preset: FilterPreset, intensity = 1.0) {
    this.timelineEngine = timelineEngine;
    this.clipId = clipId;
    this.preset = preset;
    this.intensity = intensity;
    this.name = `Apply Preset: ${preset.name} (${Math.round(intensity * 100)}%)`;
    this.description = `Apply look preset "${preset.name}" at ${Math.round(intensity * 100)}% intensity`;
  }

  public async execute(): Promise<void> {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) throw new Error(`Clip ${this.clipId} not found`);

    this.previousColorGrade = JSON.parse(JSON.stringify(found.clip.colorGrade));
    this.previousEffects = JSON.parse(JSON.stringify(found.clip.effects || []));
    this.previousBaseColorGrade = found.clip.baseColorGrade ? JSON.parse(JSON.stringify(found.clip.baseColorGrade)) : undefined;
    this.previousBaseEffects = found.clip.baseEffects ? JSON.parse(JSON.stringify(found.clip.baseEffects)) : undefined;
    this.previousActiveFilter = found.clip.activeFilter ? JSON.parse(JSON.stringify(found.clip.activeFilter)) : undefined;

    const pm = PresetManager.getInstance();
    pm.applyPresetToClip(found.clip, this.preset, this.intensity);
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
    found.clip.baseColorGrade = this.previousBaseColorGrade ? JSON.parse(JSON.stringify(this.previousBaseColorGrade)) : undefined;
    found.clip.baseEffects = this.previousBaseEffects ? JSON.parse(JSON.stringify(this.previousBaseEffects)) : undefined;
    found.clip.activeFilter = this.previousActiveFilter ? JSON.parse(JSON.stringify(this.previousActiveFilter)) : undefined;
  }
}
