/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { KeyframeTrack } from '../../../domain/keyframe/Keyframe';

export class ClearKeyframeTrackCommand implements ICommand {
  public readonly id = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Clear Keyframe Track';
  public readonly description: string;
  public readonly timestamp = Date.now();

  private timelineEngine: TimelineEngine;
  private clipId: string;
  private propertyPath?: string; // If undefined, clears ALL keyframe tracks on the clip
  private previousTracksState?: Record<string, KeyframeTrack<any>>;

  constructor(
    timelineEngine: TimelineEngine,
    clipId: string,
    propertyPath?: string
  ) {
    this.timelineEngine = timelineEngine;
    this.clipId = clipId;
    this.propertyPath = propertyPath;
    this.description = propertyPath ? `Clear keyframes on ${propertyPath}` : 'Clear all clip keyframes';
  }

  public async execute(): Promise<void> {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) throw new Error(`Clip ${this.clipId} not found`);

    if (!found.clip.keyframeTracks) return;

    this.previousTracksState = JSON.parse(JSON.stringify(found.clip.keyframeTracks));

    if (this.propertyPath) {
      delete found.clip.keyframeTracks[this.propertyPath];
    } else {
      found.clip.keyframeTracks = {};
    }
  }

  public async undo(): Promise<void> {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) throw new Error(`Clip ${this.clipId} not found`);

    if (this.previousTracksState) {
      found.clip.keyframeTracks = JSON.parse(JSON.stringify(this.previousTracksState));
    }
  }
}
