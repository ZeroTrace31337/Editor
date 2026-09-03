/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KeyframeEvaluator } from '../../domain/keyframe/KeyframeEvaluator';
import { Keyframe, KeyframeTrack } from '../../domain/keyframe/Keyframe';
import { secondsToRationalTime } from '../../core/time/RationalTime';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function runAudioUnitTests(): { name: string; passed: boolean; details?: string }[] {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  // 1. Decibel <-> Linear Gain Conversion Calculations
  try {
    const dbToLinear = (db: number) => Math.pow(10, db / 20);
    const linearToDb = (lin: number) => (lin > 0.00001 ? 20 * Math.log10(lin) : -100);

    // 0 dB = 1.0
    assert(Math.abs(dbToLinear(0) - 1.0) < 1e-4, '0 dB must equal linear gain 1.0');
    assert(Math.abs(linearToDb(1.0) - 0.0) < 1e-4, 'Linear gain 1.0 must equal 0 dB');

    // -6 dB approx 0.501 (-6.02 dB = half amplitude)
    assert(Math.abs(dbToLinear(-6.0206) - 0.5) < 1e-3, '-6.02 dB must equal 0.5 linear gain');

    // +6 dB approx 2.0
    assert(Math.abs(dbToLinear(6.0206) - 2.0) < 1e-3, '+6.02 dB must equal 2.0 linear gain');

    results.push({ name: 'Audio: Decibel to Linear Gain Reversibility', passed: true });
  } catch (err: any) {
    results.push({ name: 'Audio: Decibel to Linear Gain Reversibility', passed: false, details: err.message });
  }

  // 2. Constant Power Stereo Panning Law
  try {
    // Standard 3dB center dip constant power panning
    const calculateStereoGains = (pan: number): [number, number] => {
      // Pan from -1.0 (Full Left) to +1.0 (Full Right)
      const clamped = Math.max(-1, Math.min(1, pan));
      const angle = ((clamped + 1) * Math.PI) / 4; // 0 to PI/2
      const left = Math.cos(angle);
      const right = Math.sin(angle);
      return [left, right];
    };

    // Center pan (pan = 0): angle = PI/4, cos = sin = 1/sqrt(2) approx 0.7071 (-3dB)
    const [leftCenter, rightCenter] = calculateStereoGains(0);
    assert(Math.abs(leftCenter - rightCenter) < 1e-4, 'Left and right must be equal at center pan');
    assert(Math.abs(leftCenter * leftCenter + rightCenter * rightCenter - 1.0) < 1e-4, 'Total acoustic power must sum to 1.0 at center');

    // Hard left (pan = -1)
    const [leftHard, rightHard] = calculateStereoGains(-1);
    assert(Math.abs(leftHard - 1.0) < 1e-4 && Math.abs(rightHard - 0.0) < 1e-4, 'Hard left must route 100% to left channel');

    // Hard right (pan = +1)
    const [leftRight, rightRight] = calculateStereoGains(1);
    assert(Math.abs(leftRight - 0.0) < 1e-4 && Math.abs(rightRight - 1.0) < 1e-4, 'Hard right must route 100% to right channel');

    results.push({ name: 'Audio: Constant Power Stereo Pan Law Calculations', passed: true });
  } catch (err: any) {
    results.push({ name: 'Audio: Constant Power Stereo Pan Law Calculations', passed: false, details: err.message });
  }

  // 3. Audio Volume Automation Keyframe Evaluation
  try {
    const keyframes: Keyframe[] = [
      { id: 'k1', time: secondsToRationalTime(0), value: 0.0, interpolation: 'linear' },
      { id: 'k2', time: secondsToRationalTime(2), value: 1.0, interpolation: 'linear' },
      { id: 'k3', time: secondsToRationalTime(6), value: 1.0, interpolation: 'linear' },
      { id: 'k4', time: secondsToRationalTime(8), value: 0.0, interpolation: 'linear' },
    ];

    const track: KeyframeTrack<number> = {
      propertyPath: 'volume',
      propertyName: 'Volume',
      defaultValue: 1.0,
      keyframes,
    };

    // Fade in at 1.0s should evaluate to 0.5
    const valAt1 = KeyframeEvaluator.evaluateNumber(track, secondsToRationalTime(1));
    assert(Math.abs(valAt1 - 0.5) < 1e-3, `Fade in at 1.0s should be 0.5, got ${valAt1}`);

    // Plateau at 4.0s should evaluate to 1.0
    const valAt4 = KeyframeEvaluator.evaluateNumber(track, secondsToRationalTime(4));
    assert(Math.abs(valAt4 - 1.0) < 1e-3, `Plateau at 4.0s should be 1.0, got ${valAt4}`);

    // Fade out at 7.0s should evaluate to 0.5
    const valAt7 = KeyframeEvaluator.evaluateNumber(track, secondsToRationalTime(7));
    assert(Math.abs(valAt7 - 0.5) < 1e-3, `Fade out at 7.0s should be 0.5, got ${valAt7}`);

    results.push({ name: 'Audio: Volume Automation Ramp & Fade Evaluation', passed: true });
  } catch (err: any) {
    results.push({ name: 'Audio: Volume Automation Ramp & Fade Evaluation', passed: false, details: err.message });
  }

  // 4. Sidechain Auto-Ducking Volume Attenuation
  try {
    const computeDuckingMultiplier = (
      detectorLevelRms: number,
      threshold: number,
      duckingAmountPercent: number
    ): number => {
      if (detectorLevelRms < threshold) return 1.0;
      const excess = detectorLevelRms - threshold;
      const reductionFraction = (duckingAmountPercent / 100) * Math.min(1.0, excess * 2.5);
      return Math.max(0.1, 1.0 - reductionFraction);
    };

    // Quiet voice below threshold -> no ducking (1.0)
    const quietDuck = computeDuckingMultiplier(0.05, 0.1, 70);
    assert(quietDuck === 1.0, 'Background music should not duck when voice is below threshold');

    // Loud voice above threshold -> duck down by target percentage
    const loudDuck = computeDuckingMultiplier(0.5, 0.1, 70);
    assert(loudDuck < 0.5, `Background music should be ducked significantly, got ${loudDuck}`);

    results.push({ name: 'Audio: Sidechain Dynamic Ducking Attenuation Math', passed: true });
  } catch (err: any) {
    results.push({ name: 'Audio: Sidechain Dynamic Ducking Attenuation Math', passed: false, details: err.message });
  }

  // 5. Broadcast & Streaming Loudness Normalization Calculations
  try {
    const calculateNormalizationGain = (currentLufs: number, targetLufs: number, maxBoostDb = 12): number => {
      const deltaDb = targetLufs - currentLufs;
      const clampedDelta = Math.min(maxBoostDb, deltaDb);
      return Math.pow(10, clampedDelta / 20);
    };

    // Streaming target: -14 LUFS (YouTube, Spotify)
    // Audio at -20 LUFS should boost by +6 dB (gain approx 1.995)
    const gainToStreaming = calculateNormalizationGain(-20, -14);
    assert(Math.abs(gainToStreaming - 1.995) < 0.05, `Expected ~2.0x gain boost, got ${gainToStreaming}`);

    // Broadcast target: -23 LUFS (EBU R128)
    // Audio at -18 LUFS should attenuate by -5 dB (gain approx 0.562)
    const gainToBroadcast = calculateNormalizationGain(-18, -23);
    assert(Math.abs(gainToBroadcast - 0.562) < 0.05, `Expected ~0.562x attenuation, got ${gainToBroadcast}`);

    results.push({ name: 'Audio: LUFS Loudness Target Normalization Calculations', passed: true });
  } catch (err: any) {
    results.push({ name: 'Audio: LUFS Loudness Target Normalization Calculations', passed: false, details: err.message });
  }

  return results;
}
