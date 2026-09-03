/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project, createNewProject } from '../../domain/project/Project';
import { ProjectService } from '../../engine/project/ProjectService';
import { createTrack } from '../../domain/timeline/Track';
import { VideoClip, AudioClip } from '../../domain/timeline/Clip';
import { createRationalTime, secondsToRationalTime, rationalTimeToSeconds } from '../../core/time/RationalTime';
import { createDefaultColorGrade } from '../../domain/color/ColorGrade';
import { createDefaultTransform } from '../../core/math/Transform2D';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function runProjectSerializationUnitTests(): { name: string; passed: boolean; details?: string }[] {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  // 1. Full Project Serialization & Deserialization
  try {
    const project = createNewProject('VeeCut Feature Film');
    project.settings.canvasWidth = 3840;
    project.settings.canvasHeight = 2160;
    project.settings.frameRate = { numerator: 24, denominator: 1 };

    const seq = project.sequences[0];
    const vTrack = createTrack('V1', 'Main Video Track', 'video');
    const aTrack = createTrack('A1', 'Dialogue Track', 'audio');
    seq.tracks = [vTrack, aTrack];

    // Rich Video Clip with custom color grade and transform
    const vClip: VideoClip = {
      id: 'v_clip_1',
      type: 'video',
      name: 'Scene 1 Take 1',
      trackId: vTrack.id,
      timelineRange: {
        start: secondsToRationalTime(0),
        duration: secondsToRationalTime(12),
      },
      sourceRange: {
        start: secondsToRationalTime(0),
        duration: secondsToRationalTime(12),
      },
      speed: 1.0,
      opacity: 0.95,
      muted: false,
      locked: false,
      blendMode: 'screen',
      transform: createDefaultTransform(),
      mediaAssetId: 'asset_cam_a',
      colorGrade: {
        ...createDefaultColorGrade(),
        exposure: 0.65,
        contrast: 1.15,
        temperature: 18,
        tint: -5,
        wheels: {
          lift: { r: 0.05, g: 0.02, b: -0.01, y: 0.02 },
          gamma: { r: 0.0, g: 0.0, b: 0.0, y: 0.0 },
          gain: { r: 0.02, g: 0.04, b: 0.08, y: 0.05 },
          offset: { r: 0.0, g: 0.0, b: 0.0, y: 0.0 },
        },
      },
      effects: [],
      masks: [],
      keyframeTracks: {},
    };

    // Rich Audio Clip with keyframed volume
    const aClip: AudioClip = {
      id: 'a_clip_1',
      type: 'audio',
      name: 'Production Boom',
      trackId: aTrack.id,
      timelineRange: {
        start: secondsToRationalTime(0),
        duration: secondsToRationalTime(12),
      },
      sourceRange: {
        start: secondsToRationalTime(0),
        duration: secondsToRationalTime(12),
      },
      speed: 1.0,
      opacity: 1.0,
      muted: false,
      locked: false,
      transform: createDefaultTransform(),
      colorGrade: createDefaultColorGrade(),
      effects: [],
      masks: [],
      mediaAssetId: 'asset_audio_boom',
      volume: 0.85,
      pan: -0.15,
      fadeInDuration: createRationalTime(0),
      fadeOutDuration: createRationalTime(0),
      keyframeTracks: {
        volume: {
          propertyPath: 'volume',
          propertyName: 'Volume',
          defaultValue: 1.0,
          keyframes: [
            { id: 'k1', time: secondsToRationalTime(0), value: 0.0, interpolation: 'linear' },
            { id: 'k2', time: secondsToRationalTime(1.5), value: 0.85, interpolation: 'linear' },
          ],
        },
      },
    };

    vTrack.clips.push(vClip);
    aTrack.clips.push(aClip);

    // Sequence Marker
    seq.markers = [
      { id: 'm1', name: 'Director Cue', time: secondsToRationalTime(6.0), color: '#ef4444' },
    ];

    // Serialize using ProjectService (with lossless BigInt RationalTime preservation)
    const jsonString = ProjectService.serialize(project);
    assert(jsonString.length > 500, 'Serialized JSON must contain complete state');

    // Deserialize back to object
    const deserialized: Project = ProjectService.deserialize(jsonString);

    // Verifications
    assert(deserialized.metadata.name === 'VeeCut Feature Film', 'Project name must match');
    assert(deserialized.settings.canvasWidth === 3840, 'Canvas width 3840 preserved');
    assert(deserialized.settings.canvasHeight === 2160, 'Canvas height 2160 preserved');
    assert(deserialized.sequences.length === 1, 'Sequences array preserved');

    const desSeq = deserialized.sequences[0];
    assert(desSeq.tracks.length === 2, 'Two tracks preserved');

    const desVTrack = desSeq.tracks[0];
    const desVClip = desVTrack.clips[0] as VideoClip;
    assert(desVClip.id === 'v_clip_1', 'Video clip ID preserved');
    assert(desVClip.colorGrade?.exposure === 0.65, 'Color grade exposure preserved');
    assert(desVClip.colorGrade?.wheels.gain.b === 0.08, 'Color wheel gain blue component preserved');
    assert(desVClip.blendMode === 'screen', 'Blend mode preserved');

    const desATrack = desSeq.tracks[1];
    const desAClip = desATrack.clips[0] as AudioClip;
    assert(desAClip.keyframeTracks?.volume?.keyframes?.length === 2, 'Audio keyframes preserved');
    assert(desSeq.markers.length === 1 && desSeq.markers[0].name === 'Director Cue', 'Sequence markers preserved');

    results.push({ name: 'Project: Serialization & Deserialization Deep Fidelity', passed: true });
  } catch (err: any) {
    results.push({ name: 'Project: Serialization & Deserialization Deep Fidelity', passed: false, details: err.message });
  }

  // 2. Backward Compatibility & Schema Migration
  try {
    const legacyProjectJson = {
      metadata: {
        id: 'legacy_proj_1',
        name: 'Old Project',
        schemaVersion: '0.9.0',
        createdAt: '2025-01-01T00:00:00.000Z',
        modifiedAt: '2025-01-01T00:00:00.000Z',
      },
      settings: {
        canvasWidth: 1920,
        canvasHeight: 1080,
        aspectRatio: '16:9',
        frameRate: { numerator: 30, denominator: 1 },
        audioSampleRate: 48000,
        workingColorSpace: 'Rec.709',
      },
      sequences: [
        {
          id: 's1',
          name: 'Main',
          timecodeFormat: 'smpte_30',
          duration: { __bigint: '3600000', timescale: 120000 },
          tracks: [
            {
              id: 't1',
              name: 'Track 1',
              kind: 'video',
              muted: false,
              locked: false,
              visible: true,
              solo: false,
              isTargeted: false,
              volume: 1.0,
              clips: [],
            },
          ],
        },
      ],
      mediaPool: [],
      activeSequenceId: 's1',
    };

    const parsed = ProjectService.deserialize(JSON.stringify(legacyProjectJson));
    assert(parsed.metadata.name === 'Old Project', 'Legacy project name restored');
    assert(parsed.settings.canvasWidth === 1920, 'Legacy canvas width 1920 restored');

    results.push({ name: 'Project: Schema Migration & Backward Compatibility', passed: true });
  } catch (err: any) {
    results.push({ name: 'Project: Schema Migration & Backward Compatibility', passed: false, details: err.message });
  }

  return results;
}
