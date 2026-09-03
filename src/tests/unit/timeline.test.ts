/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Sequence, createDefaultSequence } from '../../domain/timeline/Sequence';
import { createTrack } from '../../domain/timeline/Track';
import { VideoClip, AudioClip } from '../../domain/timeline/Clip';
import { createRationalTime, secondsToRationalTime, rationalTimeToSeconds } from '../../core/time/RationalTime';
import { TimelineEngine } from '../../engine/timeline/TimelineEngine';
import { TimelineCollisionError } from '../../core/errors/AppErrors';
import { createDefaultColorGrade } from '../../domain/color/ColorGrade';
import { createDefaultTransform } from '../../core/math/Transform2D';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function makeTestVideoClip(id: string, trackId: string, name: string, startSec: number, durSec: number): VideoClip {
  return {
    id,
    type: 'video',
    name,
    trackId,
    timelineRange: {
      start: secondsToRationalTime(startSec),
      duration: secondsToRationalTime(durSec),
    },
    sourceRange: {
      start: secondsToRationalTime(0),
      duration: secondsToRationalTime(durSec),
    },
    speed: 1.0,
    opacity: 1.0,
    muted: false,
    locked: false,
    transform: createDefaultTransform(),
    colorGrade: createDefaultColorGrade(),
    effects: [],
    masks: [],
    keyframeTracks: {},
    mediaAssetId: 'test_asset',
  };
}

function makeTestAudioClip(id: string, trackId: string, name: string, startSec: number, durSec: number): AudioClip {
  return {
    id,
    type: 'audio',
    name,
    trackId,
    timelineRange: {
      start: secondsToRationalTime(startSec),
      duration: secondsToRationalTime(durSec),
    },
    sourceRange: {
      start: secondsToRationalTime(0),
      duration: secondsToRationalTime(durSec),
    },
    speed: 1.0,
    opacity: 1.0,
    muted: false,
    locked: false,
    transform: createDefaultTransform(),
    colorGrade: createDefaultColorGrade(),
    effects: [],
    masks: [],
    keyframeTracks: {},
    mediaAssetId: 'test_audio_asset',
    volume: 1.0,
    pan: 0.0,
    fadeInDuration: createRationalTime(0),
    fadeOutDuration: createRationalTime(0),
  };
}

export function runTimelineUnitTests(): { name: string; passed: boolean; details?: string }[] {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  // 1. Clip Collision Detection
  try {
    const seq = createDefaultSequence('Test Collisions');
    const track = createTrack('V1', 'Main Video', 'video');
    seq.tracks = [track];
    const engine = new TimelineEngine(seq);

    const clip1 = makeTestVideoClip('c1', track.id, 'Clip 1', 0, 5);
    engine.addClip(track.id, clip1);

    let caughtError = false;
    try {
      // Overlapping clip from 3s to 8s (collides with 0..5s)
      const clipOverlap = makeTestVideoClip('c_overlap', track.id, 'Overlap', 3, 5);
      engine.addClip(track.id, clipOverlap);
    } catch (err: any) {
      if (
        err instanceof TimelineCollisionError ||
        err?.name === 'TimelineCollisionError' ||
        err?.code === 'TIMELINE_COLLISION' ||
        err?.message?.includes('overlaps')
      ) {
        caughtError = true;
      }
    }

    assert(caughtError, 'Expected TimelineCollisionError when adding overlapping clip');

    // Non-overlapping clip from 5s to 10s should succeed
    const clip2 = makeTestVideoClip('c2', track.id, 'Clip 2', 5, 5);
    engine.addClip(track.id, clip2);
    assert(track.clips.length === 2, 'Two non-overlapping clips must be present');

    results.push({ name: 'Timeline: Collision Detection on Track', passed: true });
  } catch (err: any) {
    results.push({ name: 'Timeline: Collision Detection on Track', passed: false, details: err.message });
  }

  // 2. Snapping Calculations
  try {
    const seq = createDefaultSequence('Test Snapping');
    const track = createTrack('V1', 'Video', 'video');
    seq.tracks = [track];
    const engine = new TimelineEngine(seq);

    const clip1 = makeTestVideoClip('c1', track.id, 'Clip 1', 2, 4);
    engine.addClip(track.id, clip1);

    // Sequence marker at 10.0s
    seq.markers = [
      { id: 'm1', name: 'Beat Drop', time: secondsToRationalTime(10), color: '#3b82f6' },
    ];

    const playheadTime = secondsToRationalTime(7.5);

    // Snap to 0 (near 0.05s)
    const snapZero = engine.calculateSnap(secondsToRationalTime(0.05), playheadTime, 0.15);
    assert(snapZero.didSnap && rationalTimeToSeconds(snapZero.snappedTime) === 0, 'Should snap to timeline start (0s)');

    // Snap to clip in-point (near 1.95s, target 2.0s)
    const snapClipIn = engine.calculateSnap(secondsToRationalTime(1.95), playheadTime, 0.15);
    assert(snapClipIn.didSnap && rationalTimeToSeconds(snapClipIn.snappedTime) === 2.0, 'Should snap to clip in-point (2.0s)');

    // Snap to clip out-point (near 6.05s, target 6.0s)
    const snapClipOut = engine.calculateSnap(secondsToRationalTime(6.05), playheadTime, 0.15);
    assert(snapClipOut.didSnap && rationalTimeToSeconds(snapClipOut.snappedTime) === 6.0, 'Should snap to clip out-point (6.0s)');

    // Snap to playhead (near 7.45s, target 7.5s)
    const snapPlayhead = engine.calculateSnap(secondsToRationalTime(7.45), playheadTime, 0.15);
    assert(snapPlayhead.didSnap && rationalTimeToSeconds(snapPlayhead.snappedTime) === 7.5, 'Should snap to playhead (7.5s)');

    // Snap to sequence marker (near 10.08s, target 10.0s)
    const snapMarker = engine.calculateSnap(secondsToRationalTime(10.08), playheadTime, 0.15);
    assert(snapMarker.didSnap && rationalTimeToSeconds(snapMarker.snappedTime) === 10.0, 'Should snap to sequence marker (10.0s)');

    results.push({ name: 'Timeline: Magnetic Snapping to Start, Clips, Playhead & Markers', passed: true });
  } catch (err: any) {
    results.push({ name: 'Timeline: Magnetic Snapping to Start, Clips, Playhead & Markers', passed: false, details: err.message });
  }

  // 3. Multi-track Clip Query at Timestamp
  try {
    const seq = createDefaultSequence('Test Multi-track Query');
    const v1 = createTrack('V1', 'Video 1', 'video');
    const v2 = createTrack('V2', 'Overlay Video', 'video');
    const a1 = createTrack('A1', 'Background Audio', 'audio');
    seq.tracks = [v1, v2, a1];
    const engine = new TimelineEngine(seq);

    const cV1 = makeTestVideoClip('cv1', v1.id, 'V1 Clip', 0, 10);
    const cV2 = makeTestVideoClip('cv2', v2.id, 'V2 Overlay', 3, 4); // 3s to 7s
    const cA1 = makeTestAudioClip('ca1', a1.id, 'A1 Audio', 0, 15);

    engine.addClip(v1.id, cV1);
    engine.addClip(v2.id, cV2);
    engine.addClip(a1.id, cA1);

    // Query at t = 5.0s (all three clips active)
    const activeAt5 = engine.getClipsAtTime(secondsToRationalTime(5.0));
    assert(activeAt5.length === 3, `Expected 3 clips active at 5.0s, found ${activeAt5.length}`);

    // Query at t = 1.0s (only V1 and A1 active)
    const activeAt1 = engine.getClipsAtTime(secondsToRationalTime(1.0));
    assert(activeAt1.length === 2, `Expected 2 clips active at 1.0s, found ${activeAt1.length}`);

    // Query at t = 12.0s (only A1 active)
    const activeAt12 = engine.getClipsAtTime(secondsToRationalTime(12.0));
    assert(activeAt12.length === 1 && activeAt12[0].clip.id === 'ca1', 'Expected only audio clip active at 12.0s');

    // Total sequence duration check: max end is A1 (15.0s)
    assert(rationalTimeToSeconds(engine.getSequence().duration) === 15.0, 'Sequence duration must match maximum clip end (15.0s)');

    results.push({ name: 'Timeline: Multi-Track Playhead Clip Retrieval & Duration Aggregation', passed: true });
  } catch (err: any) {
    results.push({ name: 'Timeline: Multi-Track Playhead Clip Retrieval & Duration Aggregation', passed: false, details: err.message });
  }

  return results;
}
