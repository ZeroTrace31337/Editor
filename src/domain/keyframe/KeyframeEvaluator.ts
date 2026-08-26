/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RationalTime, rationalTimeToSeconds, compareRationalTime, createRationalTime } from '../../core/time/RationalTime';
import { Keyframe, KeyframeTrack, KeyframeInterpolation } from './Keyframe';
import { TimelineClip } from '../timeline/Clip';

export interface ClipKeyframePoint {
  readonly id: string;
  readonly propertyPath: string;
  readonly propertyName: string;
  readonly time: RationalTime;
  readonly value: any;
  readonly interpolation: KeyframeInterpolation;
}

/**
 * High-performance Keyframe Interpolation & Curve Sampling Engine
 */
export class KeyframeEvaluator {
  /**
   * Evaluates a numeric keyframe track at a given clip-relative timestamp.
   */
  public static evaluateNumber(track: KeyframeTrack<number>, time: RationalTime): number {
    if (!track.keyframes || track.keyframes.length === 0) {
      return track.defaultValue;
    }

    if (track.keyframes.length === 1) {
      return track.keyframes[0].value;
    }

    // If time is before or equal to first keyframe
    if (compareRationalTime(time, track.keyframes[0].time) <= 0) {
      return track.keyframes[0].value;
    }

    // If time is after or equal to last keyframe
    const lastKf = track.keyframes[track.keyframes.length - 1];
    if (compareRationalTime(time, lastKf.time) >= 0) {
      return lastKf.value;
    }

    // Find surrounding keyframes (left and right)
    let leftIndex = 0;
    for (let i = 0; i < track.keyframes.length - 1; i++) {
      if (
        compareRationalTime(time, track.keyframes[i].time) >= 0 &&
        compareRationalTime(time, track.keyframes[i + 1].time) <= 0
      ) {
        leftIndex = i;
        break;
      }
    }

    const kfA = track.keyframes[leftIndex];
    const kfB = track.keyframes[leftIndex + 1];

    const tA = rationalTimeToSeconds(kfA.time);
    const tB = rationalTimeToSeconds(kfB.time);
    const tCurrent = rationalTimeToSeconds(time);

    const span = tB - tA;
    if (span <= 0.000001) return kfA.value;

    const normalizedT = Math.max(0, Math.min(1, (tCurrent - tA) / span));

    return this.interpolateValue(kfA.value, kfB.value, normalizedT, kfA.interpolation, kfA, kfB);
  }

  /**
   * Interpolates between two numbers according to the specified curve algorithm.
   */
  public static interpolateValue(
    vA: number,
    vB: number,
    t: number,
    interpolation: KeyframeInterpolation,
    kfA?: Keyframe<number>,
    kfB?: Keyframe<number>
  ): number {
    switch (interpolation) {
      case 'step':
      case 'hold':
        return t < 1.0 ? vA : vB;

      case 'linear':
        return vA + (vB - vA) * t;

      case 'easeIn':
        // Smooth cubic ease in
        return vA + (vB - vA) * (t * t * t);

      case 'easeOut':
        // Smooth cubic ease out
        const invT = 1 - t;
        return vA + (vB - vA) * (1 - invT * invT * invT);

      case 'easeInOut':
        // Smooth S-curve (cubic Hermite smoothstep)
        const smoothT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        return vA + (vB - vA) * smoothT;

      case 'smooth':
        // Quintic smoothstep (Ken Perlin's smootherstep)
        const perlinT = t * t * t * (t * (t * 6 - 15) + 10);
        return vA + (vB - vA) * perlinT;

      case 'custom':
      case 'bezier':
      default:
        // Cubic bezier interpolation with control points
        const easeBezierT = this.sampleCubicBezier(
          t,
          kfA?.outTangent?.x ?? 0.33,
          kfA?.outTangent?.y ?? 0.0,
          kfB?.inTangent?.x ?? -0.33,
          kfB?.inTangent?.y ?? 0.0
        );
        return vA + (vB - vA) * easeBezierT;
    }
  }

  /**
   * Evaluates normalized cubic bezier progress (0..1) -> (0..1)
   */
  private static sampleCubicBezier(
    t: number,
    outX: number,
    outY: number,
    inX: number,
    inY: number
  ): number {
    const p1y = Math.max(-1, Math.min(2, 0.0 + outY));
    const p2y = Math.max(-1, Math.min(2, 1.0 + inY));

    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    // y progress calculation
    const y = 3 * uu * t * p1y + 3 * u * tt * p2y + ttt;
    return Math.max(0, Math.min(1, y));
  }

  /**
   * Check if a property has a keyframe at the exact given timestamp (within threshold)
   */
  public static hasKeyframeAt(
    track: KeyframeTrack<any> | undefined,
    time: RationalTime,
    thresholdSec = 0.04
  ): Keyframe<any> | undefined {
    if (!track || !track.keyframes) return undefined;
    const targetSec = rationalTimeToSeconds(time);
    return track.keyframes.find((kf) => Math.abs(rationalTimeToSeconds(kf.time) - targetSec) <= thresholdSec);
  }

  /**
   * Find previous and next keyframe times around current time for a single track
   */
  public static getNeighborKeyframes(
    track: KeyframeTrack<any> | undefined,
    time: RationalTime
  ): { prev?: Keyframe<any>; next?: Keyframe<any> } {
    if (!track || !track.keyframes || track.keyframes.length === 0) return {};

    const currentSec = rationalTimeToSeconds(time);
    let prev: Keyframe<any> | undefined;
    let next: Keyframe<any> | undefined;

    for (const kf of track.keyframes) {
      const kfSec = rationalTimeToSeconds(kf.time);
      if (kfSec < currentSec - 0.005) {
        prev = kf;
      } else if (kfSec > currentSec + 0.005 && !next) {
        next = kf;
      }
    }

    return { prev, next };
  }

  /**
   * Retrieves all keyframes across all tracks on a clip, sorted chronologically.
   */
  public static getAllKeyframesForClip(clip: TimelineClip | undefined | null): ClipKeyframePoint[] {
    if (!clip || !clip.keyframeTracks) return [];
    const points: ClipKeyframePoint[] = [];

    for (const [propertyPath, track] of Object.entries(clip.keyframeTracks)) {
      if (!track || !track.keyframes) continue;
      for (const kf of track.keyframes) {
        points.push({
          id: kf.id,
          propertyPath,
          propertyName: track.propertyName,
          time: kf.time,
          value: kf.value,
          interpolation: kf.interpolation,
        });
      }
    }

    return points.sort((a, b) => compareRationalTime(a.time, b.time));
  }

  /**
   * Find previous and next keyframe across ALL tracks on a clip.
   */
  public static getNeighborKeyframesAcrossClip(
    clip: TimelineClip | undefined | null,
    time: RationalTime
  ): { prev?: ClipKeyframePoint; next?: ClipKeyframePoint } {
    const all = this.getAllKeyframesForClip(clip);
    if (all.length === 0) return {};

    const currentSec = rationalTimeToSeconds(time);
    let prev: ClipKeyframePoint | undefined;
    let next: ClipKeyframePoint | undefined;

    for (const pt of all) {
      const ptSec = rationalTimeToSeconds(pt.time);
      if (ptSec < currentSec - 0.005) {
        prev = pt;
      } else if (ptSec > currentSec + 0.005 && !next) {
        next = pt;
      }
    }

    return { prev, next };
  }
}
