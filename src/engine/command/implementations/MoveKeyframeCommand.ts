/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { KeyframeTrack } from '../../../domain/keyframe/Keyframe';
import { RationalTime, compareRationalTime, rationalTimeToSeconds } from '../../../core/time/RationalTime';

export class MoveKeyframeCommand implements ICommand {
  public readonly id = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Move Keyframe';
  public readonly description: string;
  public readonly timestamp = Date.now();

  private timelineEngine: TimelineEngine;
  private clipId: string;
  private propertyPath: string;
  private keyframeId: string;
  private newTime: RationalTime;
  private previousTrackState?: KeyframeTrack<any>;

  constructor(
    timelineEngine: TimelineEngine,
    clipId: string,
    propertyPath: string,
    keyframeId: string,
    newTime: RationalTime
  ) {
    this.timelineEngine = timelineEngine;
    this.clipId = clipId;
    this.propertyPath = propertyPath;
    this.keyframeId = keyframeId;
    this.newTime = newTime;
    this.description = `Move keyframe to ${rationalTimeToSeconds(newTime).toFixed(2)}s on ${propertyPath}`;
  }

  public async execute(): Promise<void> {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) throw new Error(`Clip ${this.clipId} not found`);

    const track = found.clip.keyframeTracks?.[this.propertyPath];
    if (!track) return;

    this.previousTrackState = JSON.parse(JSON.stringify(track));

    const kf = track.keyframes.find((k) => k.id === this.keyframeId);
    if (kf) {
      kf.time = { ...this.newTime };
      track.keyframes.sort((a, b) => compareRationalTime(a.time, b.time));
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
