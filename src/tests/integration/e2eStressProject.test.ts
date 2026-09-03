/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project, createNewProject } from '../../domain/project/Project';
import { ProjectService } from '../../engine/project/ProjectService';
import { createTrack } from '../../domain/timeline/Track';
import {
  VideoClip,
  AudioClip,
  TextClip,
  AdjustmentClip,
  CompoundClip,
} from '../../domain/timeline/Clip';
import { createRationalTime, secondsToRationalTime, rationalTimeToSeconds } from '../../core/time/RationalTime';
import { TimelineEngine } from '../../engine/timeline/TimelineEngine';
import { createDefaultColorGrade } from '../../domain/color/ColorGrade';
import { createDefaultTransform } from '../../core/math/Transform2D';
import { ColorEngine } from '../../rendering/color/ColorEngine';
import { ColorSpaceTransforms } from '../../rendering/color/ColorSpaceTransforms';
import { SplitClipCommand } from '../../engine/command/implementations/SplitClipCommand';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function makeRange(startSec: number, durSec: number) {
  return {
    start: secondsToRationalTime(startSec),
    duration: secondsToRationalTime(durSec),
  };
}

export function runE2EStressProjectIntegrationTests(): { name: string; passed: boolean; details?: string }[] {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  try {
    // 1. PROJECT INITIALIZATION WITH COMPREHENSIVE NLE ASSETS
    const project = createNewProject('VeeCut Ultra Stress Test NLE Project');
    project.settings.canvasWidth = 3840;
    project.settings.canvasHeight = 2160;
    project.settings.frameRate = { numerator: 60, denominator: 1 };

    const seq = project.sequences[0];
    seq.name = 'Master 4K Cinema Sequence';

    // Tracks hierarchy
    const v1 = createTrack('track_v1', 'V1 - A-Roll Main Video', 'video');
    const v2 = createTrack('track_v2', 'V2 - B-Roll Cutaways', 'video');
    const v3 = createTrack('track_v3', 'V3 - Overlays, Graphics & Text', 'video');
    const v4 = createTrack('track_v4', 'V4 - Adjustment Layer', 'video');
    const a1 = createTrack('track_a1', 'A1 - Dialogue & Vocals', 'audio');
    const a2 = createTrack('track_a2', 'A2 - Foley & Sound Effects', 'audio');
    const a3 = createTrack('track_a3', 'A3 - Music Score', 'audio');

    seq.tracks = [v1, v2, v3, v4, a1, a2, a3];
    const engine = new TimelineEngine(seq);

    // Multiple video clips
    const clipA: VideoClip = {
      id: 'clip_a_roll',
      type: 'video',
      name: '4K ProRes Master Cam A',
      trackId: v1.id,
      timelineRange: makeRange(0, 10),
      sourceRange: makeRange(0, 10),
      speed: 1.0,
      opacity: 1.0,
      muted: false,
      locked: false,
      blendMode: 'source-over',
      transform: createDefaultTransform(),
      mediaAssetId: 'asset_prores_4k',
      effects: [],
      masks: [],
      keyframeTracks: {
        scale: {
          propertyPath: 'transform.scale.x',
          propertyName: 'Scale X',
          defaultValue: 1.0,
          keyframes: [
            { id: 'ks1', time: secondsToRationalTime(0), value: 1.0, interpolation: 'smooth' },
            { id: 'ks2', time: secondsToRationalTime(10), value: 1.08, interpolation: 'smooth' },
          ],
        },
      },
      colorGrade: {
        ...createDefaultColorGrade(),
        exposure: 0.4,
        contrast: 1.15,
        temperature: 12,
        tint: -4,
        highlights: -15,
        shadows: 10,
        whites: -5,
        blacks: 5,
        vibrance: 15,
        wheels: {
          lift: { r: 0.02, g: -0.01, b: 0.04, y: 0.01 },
          gamma: { r: 0.0, g: 0.0, b: 0.0, y: 0.0 },
          gain: { r: 0.04, g: 0.02, b: -0.02, y: 0.02 },
          offset: { r: 0.0, g: 0.0, b: 0.0, y: 0.0 },
        },
        curves: {
          master: [{ x: 0, y: 0 }, { x: 0.25, y: 0.2 }, { x: 0.75, y: 0.82 }, { x: 1, y: 1 }],
          red: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
          green: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
          blue: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        },
        hsl: {
          ...createDefaultColorGrade().hsl,
          orange: { hue: 5, saturation: 10, luminance: 5, rangeCenter: 30, rangeWidth: 45, softness: 20 },
          cyan: { hue: -10, saturation: 20, luminance: -5, rangeCenter: 180, rangeWidth: 45, softness: 20 },
        },
      },
    };

    const clipB: VideoClip = {
      id: 'clip_b_roll',
      type: 'video',
      name: 'B-Roll Drone Cutaway',
      trackId: v2.id,
      timelineRange: makeRange(3, 5),
      sourceRange: makeRange(0, 5),
      speed: 1.0,
      opacity: 0.85,
      muted: false,
      locked: false,
      blendMode: 'overlay',
      transform: createDefaultTransform(),
      mediaAssetId: 'asset_drone_aerial',
      colorGrade: createDefaultColorGrade(),
      effects: [],
      masks: [],
      keyframeTracks: {},
    };

    // Text & Title Clip
    const titleClip: TextClip = {
      id: 'clip_title',
      type: 'text',
      name: 'Lower Third Title',
      trackId: v3.id,
      timelineRange: makeRange(1, 4),
      sourceRange: makeRange(0, 4),
      speed: 1.0,
      opacity: 1.0,
      muted: false,
      locked: false,
      transform: createDefaultTransform(),
      colorGrade: createDefaultColorGrade(),
      effects: [],
      masks: [],
      keyframeTracks: {},
      text: 'VeeCut Cinematic Editor',
      fontSize: 48,
      fontFamily: 'Plus Jakarta Sans',
      textColor: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      alignment: 'center',
      animation: 'slide-left',
    };

    // Adjustment Layer (Global Cinematic LUT & Vignette)
    const adjustmentLayer: AdjustmentClip = {
      id: 'clip_adj_layer',
      type: 'adjustment',
      name: 'Master Grade Adjustment Layer',
      trackId: v4.id,
      timelineRange: makeRange(0, 15),
      sourceRange: makeRange(0, 15),
      speed: 1.0,
      opacity: 1.0,
      muted: false,
      locked: false,
      transform: createDefaultTransform(),
      effects: [],
      masks: [],
      keyframeTracks: {},
      colorGrade: {
        ...createDefaultColorGrade(),
        vignette: 0.35,
        grain: 12,
        fade: 8,
      },
    };

    // Second video clip on V1
    const clipA2: VideoClip = {
      id: 'clip_a2_interview',
      type: 'video',
      name: 'Interview Cam Close-up',
      trackId: v1.id,
      timelineRange: makeRange(10, 8),
      sourceRange: makeRange(0, 8),
      speed: 1.0,
      opacity: 1.0,
      muted: false,
      locked: false,
      transform: createDefaultTransform(),
      colorGrade: createDefaultColorGrade(),
      effects: [],
      masks: [],
      keyframeTracks: {},
      mediaAssetId: 'interview_close',
    };

    // Multiple Audio Tracks with Effects & Automation
    const dialogueAudio: AudioClip = {
      id: 'clip_audio_dialogue',
      type: 'audio',
      name: 'Lavalier Mic Dialogue',
      trackId: a1.id,
      timelineRange: makeRange(0, 18),
      sourceRange: makeRange(0, 18),
      speed: 1.0,
      opacity: 1.0,
      muted: false,
      locked: false,
      transform: createDefaultTransform(),
      colorGrade: createDefaultColorGrade(),
      effects: [],
      masks: [],
      keyframeTracks: {},
      mediaAssetId: 'audio_dialogue_wav',
      volume: 1.0,
      pan: 0.0,
      fadeInDuration: createRationalTime(0),
      fadeOutDuration: createRationalTime(0),
    };

    const sfxAudio: AudioClip = {
      id: 'clip_audio_sfx',
      type: 'audio',
      name: 'Whoosh Transition SFX',
      trackId: a2.id,
      timelineRange: makeRange(3, 2),
      sourceRange: makeRange(0, 2),
      speed: 1.0,
      opacity: 1.0,
      muted: false,
      locked: false,
      transform: createDefaultTransform(),
      colorGrade: createDefaultColorGrade(),
      effects: [],
      masks: [],
      keyframeTracks: {},
      mediaAssetId: 'audio_whoosh_wav',
      volume: 0.7,
      pan: 0.4,
      fadeInDuration: createRationalTime(0),
      fadeOutDuration: createRationalTime(0),
    };

    const musicAudio: AudioClip = {
      id: 'clip_audio_music',
      type: 'audio',
      name: 'Orchestral Score',
      trackId: a3.id,
      timelineRange: makeRange(0, 18),
      sourceRange: makeRange(0, 18),
      speed: 1.0,
      opacity: 1.0,
      muted: false,
      locked: false,
      transform: createDefaultTransform(),
      colorGrade: createDefaultColorGrade(),
      effects: [],
      masks: [],
      mediaAssetId: 'audio_music_wav',
      volume: 0.6,
      pan: 0.0,
      fadeInDuration: createRationalTime(0),
      fadeOutDuration: createRationalTime(0),
      keyframeTracks: {
        volume: {
          propertyPath: 'volume',
          propertyName: 'Volume',
          defaultValue: 0.6,
          keyframes: [
            { id: 'kv1', time: secondsToRationalTime(0), value: 0.0, interpolation: 'linear' },
            { id: 'kv2', time: secondsToRationalTime(2), value: 0.6, interpolation: 'linear' },
            { id: 'kv3', time: secondsToRationalTime(16), value: 0.6, interpolation: 'linear' },
            { id: 'kv4', time: secondsToRationalTime(18), value: 0.0, interpolation: 'linear' },
          ],
        },
      },
    };

    // Compound Sub-Sequence Clip
    const compoundClip: CompoundClip = {
      id: 'clip_compound',
      type: 'compound',
      name: 'VFX Composited Compound Clip',
      trackId: v2.id,
      timelineRange: makeRange(9, 6),
      sourceRange: makeRange(0, 6),
      speed: 1.0,
      opacity: 1.0,
      muted: false,
      locked: false,
      transform: createDefaultTransform(),
      colorGrade: createDefaultColorGrade(),
      effects: [],
      masks: [],
      keyframeTracks: {},
      nestedSequenceId: 'sub_seq_vfx_shot',
    };

    // Markers
    seq.markers = [
      { id: 'm1', name: 'Intro Hook', time: secondsToRationalTime(0), color: '#10b981' },
      { id: 'm2', name: 'Drone Transition Cut', time: secondsToRationalTime(3), color: '#3b82f6' },
      { id: 'm3', name: 'Interview Climax', time: secondsToRationalTime(12), color: '#f59e0b' },
      { id: 'm4', name: 'Credits Roll', time: secondsToRationalTime(17), color: '#8b5cf6' },
    ];

    // Populate engine
    engine.addClip(v1.id, clipA);
    engine.addClip(v1.id, clipA2);
    engine.addClip(v2.id, clipB);
    engine.addClip(v2.id, compoundClip);
    engine.addClip(v3.id, titleClip);
    engine.addClip(v4.id, adjustmentLayer);
    engine.addClip(a1.id, dialogueAudio);
    engine.addClip(a2.id, sfxAudio);
    engine.addClip(a3.id, musicAudio);

    assert(seq.tracks.length === 7, 'Must have 7 tracks');
    assert(rationalTimeToSeconds(engine.getSequence().duration) === 18, 'Sequence duration must calculate to 18 seconds');

    // 2. TIMELINE EDIT OPERATIONS EXECUTION
    // Split clipA at 4.0s
    const splitCmd = new SplitClipCommand(engine, 'clip_a_roll', secondsToRationalTime(4));
    splitCmd.execute();
    assert(v1.clips.length === 3, 'V1 must now contain 3 clips after split');

    // Undo Split
    splitCmd.undo();
    assert(v1.clips.length === 2, 'V1 must revert back to 2 clips after undo');

    // 3. PERSISTENCE & SERIALIZATION ROUNDTRIP (Via ProjectService)
    const serializedJson = ProjectService.serialize(project);
    assert(serializedJson.length > 2000, 'Serialized stress project must contain extensive JSON data');

    const reloadedProject: Project = ProjectService.deserialize(serializedJson);
    assert(reloadedProject.metadata.name === 'VeeCut Ultra Stress Test NLE Project', 'Project title matches');
    assert(reloadedProject.sequences[0].tracks.length === 7, 'All 7 tracks restored');
    assert(reloadedProject.sequences[0].markers.length === 4, 'All 4 markers restored');

    // 4. COLOR GRADING & COLOR SCIENCE EVALUATION
    const sampleRgb: [number, number, number] = [0.3, 0.4, 0.5];
    const evaluatedRgb = ColorEngine.evaluateRgbSample(...sampleRgb, clipA.colorGrade!);
    assert(evaluatedRgb[0] > 0 && evaluatedRgb[1] > 0 && evaluatedRgb[2] > 0, 'Color evaluation produces valid RGB');

    // ACES Filmic Tone Mapping verification for HDR
    const hdrSample: [number, number, number] = [3.5, 2.1, 1.4];
    const acesOutput = ColorSpaceTransforms.acesFilmicToneMap(...hdrSample);
    assert(acesOutput[0] <= 1.0 && acesOutput[1] <= 1.0 && acesOutput[2] <= 1.0, 'ACES tone mapping bounds within 1.0');

    // 5. RENDER & EXPORT SPECIFICATION VERIFICATION
    const fpsValue = reloadedProject.settings.frameRate.numerator / reloadedProject.settings.frameRate.denominator;
    const exportConfig = {
      width: reloadedProject.settings.canvasWidth,
      height: reloadedProject.settings.canvasHeight,
      fps: fpsValue,
      duration: rationalTimeToSeconds(reloadedProject.sequences[0].duration),
      totalFrames: Math.ceil(rationalTimeToSeconds(reloadedProject.sequences[0].duration) * fpsValue),
    };

    assert(exportConfig.width === 3840, 'Export width 3840');
    assert(exportConfig.height === 2160, 'Export height 2160');
    assert(exportConfig.fps === 60, 'Export FPS 60');
    assert(exportConfig.totalFrames === 1080, 'Export must render 1080 4K 60fps frames');

    results.push({
      name: 'E2E Stress Test: Full Project LifeCycle (Multi-Clip, Tracks, Color, Masks, Keyframes, Audio, Markers, Export Verification)',
      passed: true,
    });
  } catch (err: any) {
    results.push({
      name: 'E2E Stress Test: Full Project LifeCycle (Multi-Clip, Tracks, Color, Masks, Keyframes, Audio, Markers, Export Verification)',
      passed: false,
      details: err.message,
    });
  }

  return results;
}
