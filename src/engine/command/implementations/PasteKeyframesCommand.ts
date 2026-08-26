/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { KeyframeTrack, cloneKeyframeTrack, cloneKeyframe } from '../../../domain/keyframe/Keyframe';
import { RationalTime, addRationalTime, subtractRationalTime, compareRationalTime, rationalTimeToSeconds, secondsToRationalTime } from '../../../core/time/RationalTime';

export class PasteKeyframesCommand implements ICommand {
  public readonly id = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Paste Keyframes';
  public readonly description: string;
  public readonly timestamp = Date.now();

  private timelineEngine: TimelineEngine;
  private targetClipId: string;
  private sourceTracks: Record<string, KeyframeTrack<any>>;
  private pasteOffset?: RationalTime; // If provided, offsets keyframe times relative to paste position
  private previousTracksState?: Record<string, KeyframeTrack<any>>;

  constructor(
    timelineEngine: TimelineEngine,
    targetClipId: string,
    sourceTracks: Record<string, KeyframeTrack<any>>,
    pasteOffset?: RationalTime
  ) {
    this.timelineEngine = timelineEngine;
    this.targetClipId = targetClipId;
    this.sourceTracks = JSON.parse(JSON.stringify(sourceTracks));
    this.pasteOffset = pasteOffset;
    this.description = `Paste animation to clip ${targetClipId}`;
  }

  public async execute(): Promise<void> {
    const found = this.timelineEngine.findClip(this.targetClipId);
    if (!found) throw new Error(`Clip ${this.targetClipId} not found`);

    if (!found.clip.keyframeTracks) {
      found.clip.keyframeTracks = {};
    }

    this.previousTracksState = JSON.parse(JSON.stringify(found.clip.keyframeTracks));

    // Determine base offset if pasting at a specific playhead time
    for (const [propPath, srcTrack] of Object.entries(this.sourceTracks)) {
      let destTrack = found.clip.keyframeTracks[propPath];
      if (!destTrack) {
        destTrack = {
          propertyPath: srcTrack.propertyPath,
          propertyName: srcTrack.propertyName,
          defaultValue: srcTrack.defaultValue,
          keyframes: [],
        };
        found.clip.keyframeTracks[propPath] = destTrack;
      }

      const firstKfTimeSec = srcTrack.keyframes.length > 0 ? rationalTimeToSeconds(srcTrack.keyframes[0].time) : 0;

      for (const kf of srcTrack.keyframes) {
        let newTime: RationalTime;
        if (this.pasteOffset) {
          const kfOffsetSec = rationalTimeToSeconds(kf.time) - firstKfTimeSec;
          const targetSec = rationalTimeToSeconds(this.pasteOffset) + kfOffsetSec;
          newTime = secondsToRationalTime(targetSec);
        } else {
          newTime = { ...kf.time };
        }

        const newKf = cloneKeyframe(kf, undefined, newTime);

        // Remove any existing keyframe at almost exact same time
        destTrack.keyframes = destTrack.keyframes.filter(
          (k) => Math.abs(rationalTimeToSeconds(k.time) - rationalTimeToSeconds(newTime)) > 0.03
        );
        destTrack.keyframes.push(newKf);
      }

      destTrack.keyframes.sort((a, b) => compareRationalTime(a.time, b.time));
    }
  }

  public async undo(): Promise<void> {
    const found = this.timelineEngine.findClip(this.targetClipId);
    if (!found) throw new Error(`Clip ${this.targetClipId} not found`);

    if (this.previousTracksState) {
      found.clip.keyframeTracks = JSON.parse(JSON.stringify(this.previousTracksState));
    }
  }
}
