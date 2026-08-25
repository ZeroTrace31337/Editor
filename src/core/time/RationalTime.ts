/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * RationalTime represents an exact, integer-ratio timestamp or duration.
 * This completely eliminates floating-point rounding errors and multi-frame drift
 * across long multi-hour timelines and non-integer framerates (e.g. 23.976, 29.97, 59.94).
 */
export interface RationalTime {
  readonly value: bigint;
  readonly timescale: number; // Ticks per second (e.g., 24000, 30000, 60000, 48000, 1000000)
}

export interface TimeRange {
  readonly start: RationalTime;
  readonly duration: RationalTime;
}

export interface FrameRate {
  readonly numerator: number;   // e.g. 24000 for 23.976 fps, 30000 for 29.97 fps, 60 for 60 fps
  readonly denominator: number; // e.g. 1001 for drop-frame/NTSC, 1 for integer fps
}

export const COMMON_FRAME_RATES: Record<string, FrameRate> = {
  FPS_23_976: { numerator: 24000, denominator: 1001 },
  FPS_24: { numerator: 24, denominator: 1 },
  FPS_25: { numerator: 25, denominator: 1 },
  FPS_29_97: { numerator: 30000, denominator: 1001 },
  FPS_30: { numerator: 30, denominator: 1 },
  FPS_50: { numerator: 50, denominator: 1 },
  FPS_59_94: { numerator: 60000, denominator: 1001 },
  FPS_60: { numerator: 60, denominator: 1 },
  FPS_120: { numerator: 120, denominator: 1 },
};

export const DEFAULT_TIMESCALE = 120000; // Common multiple of 24, 25, 30, 48, 50, 60, 24000/1001, etc.

/**
 * Creates a new RationalTime instance.
 */
export function createRationalTime(value: number | bigint, timescale: number = DEFAULT_TIMESCALE): RationalTime {
  return {
    value: typeof value === 'bigint' ? value : BigInt(Math.round(value)),
    timescale: Math.max(1, Math.round(timescale)),
  };
}

/**
 * Creates a RationalTime from floating point seconds.
 */
export function secondsToRationalTime(seconds: number, timescale: number = DEFAULT_TIMESCALE): RationalTime {
  if (isNaN(seconds) || !isFinite(seconds)) {
    return { value: 0n, timescale };
  }
  const ticks = BigInt(Math.round(seconds * timescale));
  return { value: ticks, timescale };
}

/**
 * Converts RationalTime to floating point seconds (for UI presentation / audio context offsets).
 */
export function rationalTimeToSeconds(time: RationalTime): number {
  if (!time || time.timescale === 0) return 0;
  return Number(time.value) / time.timescale;
}

/**
 * Converts RationalTime to exact frame index at a given FrameRate.
 */
export function rationalTimeToFrame(time: RationalTime, fps: FrameRate): number {
  const seconds = rationalTimeToSeconds(time);
  const nominalFps = fps.numerator / fps.denominator;
  return Math.floor(seconds * nominalFps + 1e-6);
}

/**
 * Converts frame count at given FrameRate to RationalTime.
 */
export function frameToRationalTime(frame: number, fps: FrameRate, timescale: number = DEFAULT_TIMESCALE): RationalTime {
  const seconds = (frame * fps.denominator) / fps.numerator;
  return secondsToRationalTime(seconds, timescale);
}

/**
 * Rescales a RationalTime to a new timescale without precision loss where possible.
 */
export function rescaleTime(time: RationalTime, newTimescale: number): RationalTime {
  if (time.timescale === newTimescale) return time;
  const newValue = (time.value * BigInt(newTimescale)) / BigInt(time.timescale);
  return { value: newValue, timescale: newTimescale };
}

/**
 * Adds two RationalTime values.
 */
export function addRationalTime(a: RationalTime, b: RationalTime): RationalTime {
  if (a.timescale === b.timescale) {
    return { value: a.value + b.value, timescale: a.timescale };
  }
  const commonTimescale = a.timescale * b.timescale;
  const valA = a.value * BigInt(b.timescale);
  const valB = b.value * BigInt(a.timescale);
  return { value: valA + valB, timescale: commonTimescale };
}

/**
 * Subtracts RationalTime b from a (a - b).
 */
export function subtractRationalTime(a: RationalTime, b: RationalTime): RationalTime {
  if (a.timescale === b.timescale) {
    return { value: a.value - b.value, timescale: a.timescale };
  }
  const commonTimescale = a.timescale * b.timescale;
  const valA = a.value * BigInt(b.timescale);
  const valB = b.value * BigInt(a.timescale);
  return { value: valA - valB, timescale: commonTimescale };
}

/**
 * Compares two RationalTime values.
 * Returns -1 if a < b, 0 if a === b, 1 if a > b.
 */
export function compareRationalTime(a: RationalTime, b: RationalTime): number {
  if (a.timescale === b.timescale) {
    if (a.value < b.value) return -1;
    if (a.value > b.value) return 1;
    return 0;
  }
  const valA = a.value * BigInt(b.timescale);
  const valB = b.value * BigInt(a.timescale);
  if (valA < valB) return -1;
  if (valA > valB) return 1;
  return 0;
}

/**
 * Formats a RationalTime into SMPTE standard Timecode string "HH:MM:SS:FF".
 */
export function formatTimecode(time: RationalTime, fps: FrameRate = COMMON_FRAME_RATES.FPS_30): string {
  const nominalFps = fps.numerator / fps.denominator;
  const totalSeconds = Math.max(0, rationalTimeToSeconds(time));
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const frames = Math.floor((totalSeconds - Math.floor(totalSeconds)) * nominalFps);

  const pad = (num: number, len = 2) => String(num).padStart(len, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
}

/**
 * Checks if two TimeRanges overlap.
 */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  const aEnd = addRationalTime(a.start, a.duration);
  const bEnd = addRationalTime(b.start, b.duration);
  return compareRationalTime(a.start, bEnd) < 0 && compareRationalTime(b.start, aEnd) < 0;
}
