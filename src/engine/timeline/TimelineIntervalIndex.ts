/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  RationalTime,
  compareRationalTime,
  addRationalTime,
  rationalTimeToSeconds,
} from '../../core/time/RationalTime';
import { TimelineClip } from '../../domain/timeline/Clip';
import { Track } from '../../domain/timeline/Track';
import { Sequence } from '../../domain/timeline/Sequence';

export interface IndexedClipEntry {
  clip: TimelineClip;
  track: Track;
  startSec: number;
  endSec: number;
  startRational: RationalTime;
  endRational: RationalTime;
}

export class TimelineIntervalIndex {
  private static instances: WeakMap<Sequence, TimelineIntervalIndex> = new WeakMap();
  private entriesByTrack: Map<string, IndexedClipEntry[]> = new Map();
  private allVisualEntries: IndexedClipEntry[] = [];
  private sequenceVersion: number = 0;
  private lastIndexedClipsCount: number = 0;

  constructor(sequence: Sequence) {
    this.buildIndex(sequence);
  }

  public static getForSequence(sequence: Sequence): TimelineIntervalIndex {
    let index = this.instances.get(sequence);
    if (!index) {
      index = new TimelineIntervalIndex(sequence);
      this.instances.set(sequence, index);
    } else {
      // Quick check if clip count changed
      let totalClips = 0;
      for (const t of sequence.tracks) totalClips += t.clips.length;
      if (totalClips !== index.lastIndexedClipsCount) {
        index.buildIndex(sequence);
      }
    }
    return index;
  }

  public buildIndex(sequence: Sequence): void {
    this.entriesByTrack.clear();
    this.allVisualEntries = [];
    let totalClips = 0;

    for (const track of sequence.tracks) {
      const trackEntries: IndexedClipEntry[] = [];

      for (const clip of track.clips) {
        totalClips++;
        const startRational = clip.timelineRange.start;
        const endRational = addRationalTime(startRational, clip.timelineRange.duration);
        const startSec = rationalTimeToSeconds(startRational);
        const endSec = rationalTimeToSeconds(endRational);

        const entry: IndexedClipEntry = {
          clip,
          track,
          startSec,
          endSec,
          startRational,
          endRational,
        };

        trackEntries.push(entry);

        if (track.kind === 'video' && track.visible && !clip.muted) {
          this.allVisualEntries.push(entry);
        }
      }

      // Sort by start time for binary search
      trackEntries.sort((a, b) => a.startSec - b.startSec);
      this.entriesByTrack.set(track.id, trackEntries);
    }

    // Sort all visual entries by start time, and tiebreak by track ID for deterministic layering
    this.allVisualEntries.sort((a, b) => {
      if (Math.abs(a.startSec - b.startSec) > 0.0001) {
        return a.startSec - b.startSec;
      }
      return a.track.id.localeCompare(b.track.id);
    });

    this.lastIndexedClipsCount = totalClips;
    this.sequenceVersion++;
  }

  /**
   * Fast query for active visual clips at a given time using binary search & interval overlap
   */
  public queryActiveVisualLayers(time: RationalTime): { clip: TimelineClip; track: Track }[] {
    const timeSec = rationalTimeToSeconds(time);
    const active: { clip: TimelineClip; track: Track }[] = [];

    // Filter visual entries that contain timeSec
    for (let i = 0; i < this.allVisualEntries.length; i++) {
      const entry = this.allVisualEntries[i];
      // Since entries are sorted by startSec, if entry.startSec > timeSec + 0.0001, we can't necessarily break because durations vary,
      // but interval check is extremely fast with primitive numbers:
      if (entry.startSec <= timeSec && entry.endSec > timeSec) {
        // Precise rational check for boundaries
        if (
          compareRationalTime(time, entry.startRational) >= 0 &&
          compareRationalTime(time, entry.endRational) < 0
        ) {
          active.push({ clip: entry.clip, track: entry.track });
        }
      }
    }

    // Sort layers from bottom track to top track
    active.sort((a, b) => a.track.id.localeCompare(b.track.id));
    return active;
  }

  /**
   * Look ahead in timeline to find upcoming clips in the next [windowSeconds]
   */
  public queryUpcomingVisualClips(currentTime: RationalTime, windowSeconds: number = 3.0): TimelineClip[] {
    const timeSec = rationalTimeToSeconds(currentTime);
    const maxSec = timeSec + windowSeconds;
    const upcoming: TimelineClip[] = [];

    for (let i = 0; i < this.allVisualEntries.length; i++) {
      const entry = this.allVisualEntries[i];
      if (entry.startSec > timeSec && entry.startSec <= maxSec) {
        upcoming.push(entry.clip);
      }
    }

    return upcoming;
  }
}
