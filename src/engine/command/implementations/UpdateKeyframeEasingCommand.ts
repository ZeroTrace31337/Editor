/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { KeyframeInterpolation, KeyframeTrack } from '../../../domain/keyframe/Keyframe';

export class UpdateKeyframeEasingCommand implements ICommand {
  public readonly id = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Update Keyframe Easing';
  public readonly description: string;
  public readonly timestamp = Date.now();

  private timelineEngine: TimelineEngine;
  private clipId: string;
  private propertyPath: string;
  private keyframeId: string;
  private interpolation: KeyframeInterpolation;
  private inTangent?: { x: number; y: number };
  private outTangent?: { x: number; y: number };
  private previousTrackState?: KeyframeTrack<any>;

  constructor(
    timelineEngine: TimelineEngine,
    clipId: string,
    propertyPath: string,
    keyframeId: string,
    interpolation: KeyframeInterpolation,
    inTangent?: { x: number; y: number },
    outTangent?: { x: number; y: number }
  ) {
    this.timelineEngine = timelineEngine;
    this.clipId = clipId;
    this.propertyPath = propertyPath;
    this.keyframeId = keyframeId;
    this.interpolation = interpolation;
    this.inTangent = inTangent;
    this.outTangent = outTangent;
    this.description = `Set easing to ${interpolation} on ${propertyPath}`;
  }

  public async execute(): Promise<void> {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) throw new Error(`Clip ${this.clipId} not found`);

    const track = found.clip.keyframeTracks?.[this.propertyPath];
    if (!track) return;

    this.previousTrackState = JSON.parse(JSON.stringify(track));

    const kf = track.keyframes.find((k) => k.id === this.keyframeId);
    if (kf) {
      kf.interpolation = this.interpolation;
      if (this.inTangent) kf.inTangent = { ...this.inTangent };
      if (this.outTangent) kf.outTangent = { ...this.outTangent };
    }
  }

  public async undo(): Promise<void> {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) throw new Error(`Clip ${this.clipId} not found`);

    if (this.previousTrackState && found.clip.keyframeTracks) {
      found.clip.keyframeTracks[this.propertyPath] = JSON.parse(JSON.stringify(this.previousTrackState));
    }
  }
}
