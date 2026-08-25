/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { KeyframeTrack } from '../../../domain/keyframe/Keyframe';

export class RemoveKeyframeCommand implements ICommand {
  public readonly id = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Remove Keyframe';
  public readonly description: string;
  public readonly timestamp = Date.now();

  private timelineEngine: TimelineEngine;
  private clipId: string;
  private propertyPath: string;
  private keyframeId: string;
  private previousTrackState?: KeyframeTrack<any>;

  constructor(
    timelineEngine: TimelineEngine,
    clipId: string,
    propertyPath: string,
    keyframeId: string
  ) {
    this.timelineEngine = timelineEngine;
    this.clipId = clipId;
    this.propertyPath = propertyPath;
    this.keyframeId = keyframeId;
    this.description = `Remove keyframe ${keyframeId} on ${propertyPath}`;
  }

  public async execute(): Promise<void> {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) throw new Error(`Clip ${this.clipId} not found`);

    const track = found.clip.keyframeTracks?.[this.propertyPath];
    if (!track) return;

    this.previousTrackState = JSON.parse(JSON.stringify(track));
    track.keyframes = track.keyframes.filter((kf) => kf.id !== this.keyframeId);
  }

  public async undo(): Promise<void> {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) throw new Error(`Clip ${this.clipId} not found`);

    if (this.previousTrackState) {
      found.clip.keyframeTracks[this.propertyPath] = JSON.parse(JSON.stringify(this.previousTrackState));
    }
  }
}
