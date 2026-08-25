/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { TimelineClip } from '../../../domain/timeline/Clip';
import { RationalTime, subtractRationalTime, compareRationalTime } from '../../../core/time/RationalTime';
import { LuminaError, ErrorCode } from '../../../core/errors/AppErrors';

export class RippleDeleteCommand implements ICommand {
  public readonly id: string;
  public readonly name: string = 'RippleDelete';
  public readonly description: string;
  public readonly timestamp: number;
  private timelineEngine: TimelineEngine;
  private targetClipId: string;
  private deletedClip: TimelineClip | null = null;
  private originalTrackId: string | null = null;
  private affectedClips: { clipId: string; originalStart: RationalTime; originalTrackId: string }[] = [];

  constructor(timelineEngine: TimelineEngine, targetClipId: string) {
    this.id = `cmd_ripple_delete_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.timelineEngine = timelineEngine;
    this.targetClipId = targetClipId;
    this.description = `Ripple Delete Clip`;
    this.timestamp = Date.now();
  }

  public execute(): void {
    const found = this.timelineEngine.findClip(this.targetClipId);
    if (!found) {
      throw new LuminaError(ErrorCode.CLIP_NOT_FOUND, `Clip ${this.targetClipId} not found`, 'Clip not found');
    }

    const { clip, track } = found;
    this.deletedClip = JSON.parse(JSON.stringify(clip));
    this.originalTrackId = track.id;

    const clipStart = clip.timelineRange.start;
    const clipDuration = clip.timelineRange.duration;

    // Collect all subsequent clips on targeted / unlocked tracks
    this.affectedClips = [];
    const sequence = this.timelineEngine.getSequence();

    // Check companion linked audio/video clip if any
    let companionClipId: string | undefined;
    if (clip.type === 'video' && (clip as any).audioLinkedClipId) {
      companionClipId = (clip as any).audioLinkedClipId;
    }

    for (const t of sequence.tracks) {
      if (t.locked) continue;
      for (const otherClip of t.clips) {
        if (otherClip.id === clip.id || otherClip.id === companionClipId) continue;
        if (compareRationalTime(otherClip.timelineRange.start, clipStart) > 0) {
          this.affectedClips.push({
            clipId: otherClip.id,
            originalStart: { ...otherClip.timelineRange.start },
            originalTrackId: t.id,
          });
        }
      }
    }

    // Remove primary clip
    this.timelineEngine.removeClip(this.targetClipId);

    // Remove companion clip if exists
    if (companionClipId) {
      this.timelineEngine.removeClip(companionClipId);
    }

    // Shift all downstream clips left by clipDuration
    for (const aff of this.affectedClips) {
      const c = this.timelineEngine.findClip(aff.clipId);
      if (c) {
        c.clip.timelineRange = {
          start: subtractRationalTime(c.clip.timelineRange.start, clipDuration),
          duration: c.clip.timelineRange.duration,
        };
      }
    }

    this.timelineEngine.setSequence(this.timelineEngine.getSequence());
  }

  public undo(): void {
    if (!this.deletedClip || !this.originalTrackId) return;

    // Shift downstream clips back to the right
    for (const aff of this.affectedClips) {
      const c = this.timelineEngine.findClip(aff.clipId);
      if (c) {
        c.clip.timelineRange = {
          start: aff.originalStart,
          duration: c.clip.timelineRange.duration,
        };
      }
    }

    // Re-add deleted clip
    this.timelineEngine.addClip(this.originalTrackId, this.deletedClip);
  }
}
