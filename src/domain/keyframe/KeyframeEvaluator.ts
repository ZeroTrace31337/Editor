/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RationalTime, rationalTimeToSeconds, compareRationalTime } from '../../core/time/RationalTime';
import { Keyframe, KeyframeTrack, KeyframeInterpolation } from './Keyframe';

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
        // Quadratic ease in
        return vA + (vB - vA) * (t * t);

      case 'easeOut':
        // Quadratic ease out
        return vA + (vB - vA) * (t * (2 - t));

      case 'easeInOut':
        // Smooth S-curve (cubic hermite smoothstep)
        const smoothT = t * t * (3 - 2 * t);
        return vA + (vB - vA) * smoothT;

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
    // Standard cubic bezier formula: B(t) = (1-t)^3 * P0 + 3(1-t)^2 * t * P1 + 3(1-t) * t^2 * P2 + t^3 * P3
    // Here P0 = (0,0), P1 = (0.33 + outX, outY), P2 = (0.66 + inX, 1.0 + inY), P3 = (1,1)
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
   * Check if a property has a keyframe at the exact given timestamp (within small threshold)
   */
  public static hasKeyframeAt(track: KeyframeTrack<any> | undefined, time: RationalTime, thresholdSec = 0.03): Keyframe<any> | undefined {
    if (!track || !track.keyframes) return undefined;
    const targetSec = rationalTimeToSeconds(time);
    return track.keyframes.find((kf) => Math.abs(rationalTimeToSeconds(kf.time) - targetSec) <= thresholdSec);
  }

  /**
   * Find previous and next keyframe times around current time
   */
  public static getNeighborKeyframes(track: KeyframeTrack<any> | undefined, time: RationalTime): { prev?: Keyframe<any>; next?: Keyframe<any> } {
    if (!track || !track.keyframes || track.keyframes.length === 0) return {};

    const currentSec = rationalTimeToSeconds(time);
    let prev: Keyframe<any> | undefined;
    let next: Keyframe<any> | undefined;

    for (const kf of track.keyframes) {
      const kfSec = rationalTimeToSeconds(kf.time);
      if (kfSec < currentSec - 0.001) {
        prev = kf;
      } else if (kfSec > currentSec + 0.001 && !next) {
        next = kf;
      }
    }

    return { prev, next };
  }
}
