/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimelineEngine } from '../../engine/timeline/TimelineEngine';
import { createDefaultSequence } from '../../domain/timeline/Sequence';
import { createTrack } from '../../domain/timeline/Track';
import { VideoClip } from '../../domain/timeline/Clip';
import { createRationalTime, secondsToRationalTime, rationalTimeToSeconds } from '../../core/time/RationalTime';
import { createDefaultColorGrade } from '../../domain/color/ColorGrade';
import { createDefaultTransform } from '../../core/math/Transform2D';
import { SplitClipCommand } from '../../engine/command/implementations/SplitClipCommand';
import { DeleteClipCommand } from '../../engine/command/implementations/DeleteClipCommand';
import { RippleDeleteCommand } from '../../engine/command/implementations/RippleDeleteCommand';
import { RollEditCommand } from '../../engine/command/implementations/RollEditCommand';
import { SlipEditCommand } from '../../engine/command/implementations/SlipEditCommand';
import { SlideEditCommand } from '../../engine/command/implementations/SlideEditCommand';
import { CommandManager } from '../../engine/command/CommandManager';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function makeTestClip(id: string, trackId: string, name: string, startSec: number, durSec: number): VideoClip {
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

export async function runCommandsUnitTests(): Promise<{ name: string; passed: boolean; details?: string }[]> {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  // 1. SplitClipCommand Test
  try {
    const seq = createDefaultSequence('Test Split');
    const track = createTrack('V1', 'Video 1', 'video');
    seq.tracks = [track];
    const engine = new TimelineEngine(seq);

    const clip1 = makeTestClip('c1', track.id, 'Clip 1', 0, 10);
    engine.addClip(track.id, clip1);

    const splitCmd = new SplitClipCommand(engine, 'c1', secondsToRationalTime(4));
    splitCmd.execute();

    assert(track.clips.length === 2, 'Split must produce exactly two clips on track');
    assert(rationalTimeToSeconds(track.clips[0].timelineRange.duration) === 4, 'Left clip duration must be 4s');
    assert(rationalTimeToSeconds(track.clips[1].timelineRange.start) === 4, 'Right clip start must be 4s');
    assert(rationalTimeToSeconds(track.clips[1].timelineRange.duration) === 6, 'Right clip duration must be 6s');

    // Test Undo
    splitCmd.undo();
    assert(track.clips.length === 1, 'Undo split must restore original single clip');
    assert(rationalTimeToSeconds(track.clips[0].timelineRange.duration) === 10, 'Restored clip duration must be 10s');

    results.push({ name: 'Commands: SplitClipCommand (Execute & Undo)', passed: true });
  } catch (err: any) {
    results.push({ name: 'Commands: SplitClipCommand (Execute & Undo)', passed: false, details: err.message });
  }

  // 2. RippleDeleteCommand Test
  try {
    const seq = createDefaultSequence('Test Ripple Delete');
    const track = createTrack('V1', 'Video 1', 'video');
    seq.tracks = [track];
    const engine = new TimelineEngine(seq);

    const clipA = makeTestClip('cA', track.id, 'Clip A', 0, 4);
    const clipB = makeTestClip('cB', track.id, 'Clip B', 4, 4);
    const clipC = makeTestClip('cC', track.id, 'Clip C', 8, 4);

    engine.addClip(track.id, clipA);
    engine.addClip(track.id, clipB);
    engine.addClip(track.id, clipC);

    assert(rationalTimeToSeconds(engine.getSequence().duration) === 12, 'Initial sequence duration must be 12s');

    // Ripple delete Middle Clip (clipB)
    const rippleCmd = new RippleDeleteCommand(engine, 'cB');
    rippleCmd.execute();

    assert(track.clips.length === 2, 'Track should now have 2 clips');
    assert(track.clips.find((c) => c.id === 'cB') === undefined, 'Clip B must be removed');
    const foundC = track.clips.find((c) => c.id === 'cC');
    assert(foundC !== undefined, 'Clip C must remain on track');
    assert(rationalTimeToSeconds(foundC!.timelineRange.start) === 4, 'Clip C start must shift left to 4s');
    assert(rationalTimeToSeconds(engine.getSequence().duration) === 8, 'Sequence duration must now be 8s');

    // Test Undo
    rippleCmd.undo();
    assert(track.clips.length === 3, 'Undo must restore 3 clips');
    const restoredB = track.clips.find((c) => c.id === 'cB');
    const restoredC = track.clips.find((c) => c.id === 'cC');
    assert(restoredB !== undefined && rationalTimeToSeconds(restoredB.timelineRange.start) === 4, 'Clip B restored at 4s');
    assert(restoredC !== undefined && rationalTimeToSeconds(restoredC.timelineRange.start) === 8, 'Clip C restored at 8s');
    assert(rationalTimeToSeconds(engine.getSequence().duration) === 12, 'Sequence duration restored to 12s');

    results.push({ name: 'Commands: RippleDeleteCommand (Execute, Downstream Ripple, & Undo)', passed: true });
  } catch (err: any) {
    results.push({ name: 'Commands: RippleDeleteCommand (Execute, Downstream Ripple, & Undo)', passed: false, details: err.message });
  }

  // 3. RollEditCommand Test
  try {
    const seq = createDefaultSequence('Test Roll');
    const track = createTrack('V1', 'Video 1', 'video');
    seq.tracks = [track];
    const engine = new TimelineEngine(seq);

    const clipLeft = makeTestClip('cL', track.id, 'Left', 0, 5);
    const clipRight = makeTestClip('cR', track.id, 'Right', 5, 5);
    engine.addClip(track.id, clipLeft);
    engine.addClip(track.id, clipRight);

    // Roll boundary +1 second to the right
    const rollCmd = new RollEditCommand(engine, 'cL', 'cR', secondsToRationalTime(1));
    rollCmd.execute();

    assert(rationalTimeToSeconds(clipLeft.timelineRange.duration) === 6, 'Left clip duration must now be 6s');
    assert(rationalTimeToSeconds(clipRight.timelineRange.start) === 6, 'Right clip start must now be 6s');
    assert(rationalTimeToSeconds(clipRight.timelineRange.duration) === 4, 'Right clip duration must now be 4s');
    assert(rationalTimeToSeconds(engine.getSequence().duration) === 10, 'Sequence duration must remain exactly 10s');

    // Test Undo
    rollCmd.undo();
    assert(rationalTimeToSeconds(clipLeft.timelineRange.duration) === 5, 'Left clip duration restored to 5s');
    assert(rationalTimeToSeconds(clipRight.timelineRange.start) === 5, 'Right clip start restored to 5s');
    assert(rationalTimeToSeconds(clipRight.timelineRange.duration) === 5, 'Right clip duration restored to 5s');

    results.push({ name: 'Commands: RollEditCommand (Preserve Total Duration)', passed: true });
  } catch (err: any) {
    results.push({ name: 'Commands: RollEditCommand (Preserve Total Duration)', passed: false, details: err.message });
  }

  // 4. SlipEditCommand Test
  try {
    const seq = createDefaultSequence('Test Slip');
    const track = createTrack('V1', 'Video 1', 'video');
    seq.tracks = [track];
    const engine = new TimelineEngine(seq);

    const clip = makeTestClip('c1', track.id, 'Slip Target', 2, 5);
    engine.addClip(track.id, clip);

    // Slip source footage by +2 seconds
    const slipCmd = new SlipEditCommand(engine, 'c1', secondsToRationalTime(2));
    slipCmd.execute();

    assert(rationalTimeToSeconds(clip.timelineRange.start) === 2, 'Timeline start position must be strictly unchanged');
    assert(rationalTimeToSeconds(clip.timelineRange.duration) === 5, 'Timeline duration must be strictly unchanged');
    assert(rationalTimeToSeconds(clip.sourceRange.start) === 2, 'Source range in-point shifted by 2s');
    assert(rationalTimeToSeconds(clip.sourceRange.duration) === 5, 'Source range duration remains 5s');

    // Test Undo
    slipCmd.undo();
    assert(rationalTimeToSeconds(clip.sourceRange.start) === 0, 'Source start restored to 0s');

    results.push({ name: 'Commands: SlipEditCommand (In-Place Source Shift)', passed: true });
  } catch (err: any) {
    results.push({ name: 'Commands: SlipEditCommand (In-Place Source Shift)', passed: false, details: err.message });
  }

  // 5. SlideEditCommand Test
  try {
    const seq = createDefaultSequence('Test Slide');
    const track = createTrack('V1', 'Video 1', 'video');
    seq.tracks = [track];
    const engine = new TimelineEngine(seq);

    const prevClip = makeTestClip('p1', track.id, 'Prev', 0, 4);
    const midClip = makeTestClip('m1', track.id, 'Mid', 4, 4);
    const nextClip = makeTestClip('n1', track.id, 'Next', 8, 4);

    engine.addClip(track.id, prevClip);
    engine.addClip(track.id, midClip);
    engine.addClip(track.id, nextClip);

    // Slide middle clip by +1 second
    const slideCmd = new SlideEditCommand(engine, 'p1', 'm1', 'n1', secondsToRationalTime(1));
    slideCmd.execute();

    assert(rationalTimeToSeconds(prevClip.timelineRange.duration) === 5, 'Prev clip extends to 5s');
    assert(rationalTimeToSeconds(midClip.timelineRange.start) === 5, 'Mid clip moves to 5s');
    assert(rationalTimeToSeconds(midClip.timelineRange.duration) === 4, 'Mid clip duration remains exactly 4s');
    assert(rationalTimeToSeconds(nextClip.timelineRange.start) === 9, 'Next clip starts at 9s');
    assert(rationalTimeToSeconds(nextClip.timelineRange.duration) === 3, 'Next clip shortened to 3s');
    assert(rationalTimeToSeconds(engine.getSequence().duration) === 12, 'Total sequence duration preserved at 12s');

    // Test Undo
    slideCmd.undo();
    assert(rationalTimeToSeconds(prevClip.timelineRange.duration) === 4, 'Prev clip restored to 4s');
    assert(rationalTimeToSeconds(midClip.timelineRange.start) === 4, 'Mid clip restored to 4s');
    assert(rationalTimeToSeconds(nextClip.timelineRange.start) === 8, 'Next clip restored to 8s');
    assert(rationalTimeToSeconds(nextClip.timelineRange.duration) === 4, 'Next clip restored to 4s');

    results.push({ name: 'Commands: SlideEditCommand (Adjust Neighbors & Preserve Timing)', passed: true });
  } catch (err: any) {
    results.push({ name: 'Commands: SlideEditCommand (Adjust Neighbors & Preserve Timing)', passed: false, details: err.message });
  }

  // 6. CommandManager Undo / Redo Multi-step
  try {
    const manager = new CommandManager(50);
    manager.clear();

    const seq = createDefaultSequence('Test Stack');
    const track = createTrack('V1', 'Video 1', 'video');
    seq.tracks = [track];
    const engine = new TimelineEngine(seq);

    const clip = makeTestClip('del_target', track.id, 'Delete Me', 0, 5);
    engine.addClip(track.id, clip);

    const deleteCmd = new DeleteClipCommand(engine, 'del_target');
    await manager.execute(deleteCmd);

    assert(track.clips.length === 0, 'Clip must be deleted via manager');
    assert(manager.canUndo() === true, 'Manager canUndo must be true');

    await manager.undo();
    assert(track.clips.length === 1, 'Manager undo must restore clip');
    assert(manager.canRedo() === true, 'Manager canRedo must be true');

    await manager.redo();
    assert(track.clips.length === 0, 'Manager redo must re-delete clip');

    results.push({ name: 'Commands: CommandManager (Execute, Undo, Redo History Lifecycle)', passed: true });
  } catch (err: any) {
    results.push({ name: 'Commands: CommandManager (Execute, Undo, Redo History Lifecycle)', passed: false, details: err.message });
  }

  return results;
}
