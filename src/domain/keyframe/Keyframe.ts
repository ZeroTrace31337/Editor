/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RationalTime, rationalTimeToSeconds, secondsToRationalTime, compareRationalTime, createRationalTime } from '../../core/time/RationalTime';

export type KeyframeInterpolation = 'linear' | 'bezier' | 'step' | 'easeIn' | 'easeOut' | 'easeInOut' | 'hold';

export interface Keyframe<T = number> {
  readonly id: string;
  time: RationalTime; // Time offset relative to clip start
  value: T;
  interpolation: KeyframeInterpolation;
  inTangent?: { x: number; y: number }; // Bezier handle offset
  outTangent?: { x: number; y: number }; // Bezier handle offset
}

export interface KeyframeTrack<T = number> {
  readonly propertyPath: string; // e.g. "transform.position.x", "colorGrade.exposure", "effects[0].params.radius"
  readonly propertyName: string; // Human readable name e.g. "Position X"
  defaultValue: T;
  keyframes: Keyframe<T>[];
}

export function createKeyframe<T>(
  id: string,
  time: RationalTime,
  value: T,
  interpolation: KeyframeInterpolation = 'bezier'
): Keyframe<T> {
  return {
    id,
    time,
    value,
    interpolation,
    inTangent: { x: -0.33, y: 0 },
    outTangent: { x: 0.33, y: 0 },
  };
}

export function createKeyframeTrack<T>(
  propertyPath: string,
  propertyName: string,
  defaultValue: T,
  initialKeyframes: Keyframe<T>[] = []
): KeyframeTrack<T> {
  return {
    propertyPath,
    propertyName,
    defaultValue,
    keyframes: [...initialKeyframes].sort((a, b) => compareRationalTime(a.time, b.time)),
  };
}
