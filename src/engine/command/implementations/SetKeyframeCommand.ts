/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { Keyframe, KeyframeTrack, createKeyframeTrack, createKeyframe } from '../../../domain/keyframe/Keyframe';
import { RationalTime, compareRationalTime, rationalTimeToSeconds } from '../../../core/time/RationalTime';

export class SetKeyframeCommand implements ICommand {
  public readonly id = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  public readonly name: string;
  public readonly description: string;
  public readonly timestamp = Date.now();

  private timelineEngine: TimelineEngine;
  private clipId: string;
  private propertyPath: string;
  private propertyName: string;
  private keyframeTime: RationalTime;
  private value: any;
  private previousTrackState?: KeyframeTrack<any>;

  constructor(
    timelineEngine: TimelineEngine,
    clipId: string,
    propertyPath: string,
    propertyName: string,
    keyframeTime: RationalTime,
    value: any
  ) {
    this.timelineEngine = timelineEngine;
    this.clipId = clipId;
    this.propertyPath = propertyPath;
    this.propertyName = propertyName;
    this.keyframeTime = keyframeTime;
    this.value = value;
    this.name = `Set Keyframe: ${propertyName}`;
    this.description = `Set keyframe on ${propertyName} at ${rationalTimeToSeconds(keyframeTime).toFixed(2)}s`;
  }

  public async execute(): Promise<void> {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) throw new Error(`Clip ${this.clipId} not found`);

    if (!found.clip.keyframeTracks) {
      found.clip.keyframeTracks = {};
    }

    const currentTrack = found.clip.keyframeTracks[this.propertyPath];
    if (currentTrack) {
      this.previousTrackState = JSON.parse(JSON.stringify(currentTrack));
    } else {
      this.previousTrackState = undefined;
    }

    let track = currentTrack;
    if (!track) {
      track = createKeyframeTrack(this.propertyPath, this.propertyName, this.value);
      found.clip.keyframeTracks[this.propertyPath] = track;
    }

    const kfId = `kf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const targetSec = rationalTimeToSeconds(this.keyframeTime);

    // Replace if keyframe already exists near this timestamp, otherwise insert
    const existingIdx = track.keyframes.findIndex(
      (kf) => Math.abs(rationalTimeToSeconds(kf.time) - targetSec) < 0.03
    );

    if (existingIdx !== -1) {
      track.keyframes[existingIdx].value = this.value;
    } else {
      const newKf = createKeyframe(kfId, this.keyframeTime, this.value);
      track.keyframes.push(newKf);
      track.keyframes.sort((a, b) => compareRationalTime(a.time, b.time));
    }
  }

  public async undo(): Promise<void> {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) throw new Error(`Clip ${this.clipId} not found`);

    if (this.previousTrackState) {
      found.clip.keyframeTracks[this.propertyPath] = JSON.parse(JSON.stringify(this.previousTrackState));
    } else {
      delete found.clip.keyframeTracks[this.propertyPath];
    }
  }
}
