/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { TimelineClip } from '../../../domain/timeline/Clip';
import { addRationalTime } from '../../../core/time/RationalTime';

export class DuplicateClipCommand implements ICommand {
  public readonly id = `cmd_dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Duplicate Clip';
  public readonly description: string;
  public readonly timestamp = Date.now();
  public duplicatedClipId: string = '';

  constructor(
    private timelineEngine: TimelineEngine,
    private sourceClipId: string
  ) {
    this.description = `Duplicate clip ${sourceClipId}`;
  }

  public execute(): void {
    const sequence = this.timelineEngine.getSequence();
    let sourceClip: TimelineClip | null = null;
    let trackId: string = '';

    for (const track of sequence.tracks) {
      const found = track.clips.find((c) => c.id === this.sourceClipId);
      if (found) {
        sourceClip = found;
        trackId = track.id;
        break;
      }
    }

    if (!sourceClip) {
      throw new Error(`Clip ${this.sourceClipId} not found to duplicate`);
    }

    const newId = `clip_dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.duplicatedClipId = newId;

    // Deep clone clip
    const cloned: TimelineClip = JSON.parse(JSON.stringify(sourceClip));
    (cloned as any).id = newId;
    cloned.name = `${sourceClip.name} (Copy)`;
    cloned.timelineRange = {
      start: addRationalTime(sourceClip.timelineRange.start, sourceClip.timelineRange.duration),
      duration: { ...sourceClip.timelineRange.duration },
    };

    this.timelineEngine.addClip(trackId, cloned);
  }

  public undo(): void {
    if (this.duplicatedClipId) {
      this.timelineEngine.removeClip(this.duplicatedClipId);
    }
  }
}
