/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ColorEngine } from '../../rendering/color/ColorEngine';
import { createDefaultColorGrade, ColorGrade } from '../../domain/color/ColorGrade';
import { ColorSpaceTransforms } from '../../rendering/color/ColorSpaceTransforms';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function runColorUnitTests(): { name: string; passed: boolean; details?: string }[] {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  // 1. Grade Neutrality Detection
  try {
    const defaultGrade = createDefaultColorGrade();
    assert(ColorEngine.isGradeNeutral(defaultGrade) === true, 'Default grade must evaluate as neutral');

    const modGrade: ColorGrade = { ...defaultGrade, exposure: 0.5 };
    assert(ColorEngine.isGradeNeutral(modGrade) === false, 'Grade with exposure=0.5 must not be neutral');

    const modTemp: ColorGrade = { ...defaultGrade, temperature: 15 };
    assert(ColorEngine.isGradeNeutral(modTemp) === false, 'Grade with temperature=15 must not be neutral');

    results.push({ name: 'Color: Grade Neutrality & Bypass Detection', passed: true });
  } catch (err: any) {
    results.push({ name: 'Color: Grade Neutrality & Bypass Detection', passed: false, details: err.message });
  }

  // 2. Pixel Evaluation with Exposure, Temperature & Color Wheels
  try {
    const grade = createDefaultColorGrade();
    const neutralSample = ColorEngine.evaluateRgbSample(0.5, 0.5, 0.5, grade);
    assert(
      Math.abs(neutralSample[0] - 0.5) < 0.02 &&
      Math.abs(neutralSample[1] - 0.5) < 0.02 &&
      Math.abs(neutralSample[2] - 0.5) < 0.02,
      'Neutral sample should pass through with high fidelity'
    );

    // Test +1 EV Exposure (doubles linear energy)
    grade.exposure = 1.0;
    const expSample = ColorEngine.evaluateRgbSample(0.25, 0.25, 0.25, grade);
    assert(expSample[0] > 0.45 && expSample[0] < 0.55, `+1 EV on 0.25 should approximate 0.5, got ${expSample[0]}`);

    // Test Temperature (+50 Warmth)
    const warmGrade = createDefaultColorGrade();
    warmGrade.temperature = 50;
    const warmSample = ColorEngine.evaluateRgbSample(0.5, 0.5, 0.5, warmGrade);
    assert(warmSample[0] > warmSample[2], 'Warm temperature must boost red above blue');

    // Test Color Wheels (Lift Red boost on dark shadows)
    const wheelGrade = createDefaultColorGrade();
    wheelGrade.wheels.lift.r = 0.5;
    const shadowSample = ColorEngine.evaluateRgbSample(0.1, 0.1, 0.1, wheelGrade);
    assert(shadowSample[0] > shadowSample[1], 'Shadow lift on red must increase red in dark tones');

    results.push({ name: 'Color: ColorEngine.evaluateRgbSample (Exposure, Temp, Wheels)', passed: true });
  } catch (err: any) {
    results.push({ name: 'Color: ColorEngine.evaluateRgbSample (Exposure, Temp, Wheels)', passed: false, details: err.message });
  }

  // 3. 8-Band Selective HSL Grading
  try {
    const hslGrade = createDefaultColorGrade();
    // Shift Green hue towards cyan and boost saturation
    hslGrade.hsl.green.hue = 40;
    hslGrade.hsl.green.saturation = 30;

    // Pure green input [0, 1, 0]
    const greenResult = ColorEngine.evaluateRgbSample(0.0, 0.8, 0.0, hslGrade);
    // Green shifted towards cyan means blue component increases
    assert(greenResult[2] > 0.0, 'Green hue shift towards cyan must introduce blue component');

    results.push({ name: 'Color: 8-Band Selective HSL Targeting', passed: true });
  } catch (err: any) {
    results.push({ name: 'Color: 8-Band Selective HSL Targeting', passed: false, details: err.message });
  }

  // 4. Color Space Transforms & Inverses (sRGB & Rec.709)
  try {
    const testValues = [0.0, 0.03, 0.18, 0.5, 0.75, 1.0];
    for (const val of testValues) {
      const linSrgb = ColorSpaceTransforms.srgbToLinear(val);
      const backSrgb = ColorSpaceTransforms.linearToSrgb(linSrgb);
      assert(Math.abs(val - backSrgb) < 1e-4, `sRGB round-trip error on ${val}: got ${backSrgb}`);

      const linRec = ColorSpaceTransforms.rec709ToLinear(val);
      const backRec = ColorSpaceTransforms.linearToRec709(linRec);
      assert(Math.abs(val - backRec) < 1e-4, `Rec.709 round-trip error on ${val}: got ${backRec}`);
    }

    // Test Log to Linear conversions
    const slogLin = ColorSpaceTransforms.slog3ToLinear(0.5);
    assert(slogLin > 0 && Number.isFinite(slogLin), 'S-Log3 to Linear should produce positive valid number');

    const clogLin = ColorSpaceTransforms.clogToLinear(0.4);
    assert(clogLin > 0 && Number.isFinite(clogLin), 'C-Log to Linear should produce positive valid number');

    const appleLogLin = ColorSpaceTransforms.appleLogToLinear(0.6);
    assert(appleLogLin > 0 && Number.isFinite(appleLogLin), 'Apple Log to Linear should produce positive valid number');

    results.push({ name: 'Color: ColorSpaceTransforms (sRGB, Rec709, S-Log3, C-Log, Apple Log)', passed: true });
  } catch (err: any) {
    results.push({ name: 'Color: ColorSpaceTransforms (sRGB, Rec709, S-Log3, C-Log, Apple Log)', passed: false, details: err.message });
  }

  // 5. ACES & Reinhard Tone Mapping (HDR -> SDR Roll-off)
  try {
    const hdrSuperWhite: [number, number, number] = [4.5, 2.8, 1.2]; // Over-exposed HDR values

    const acesResult = ColorSpaceTransforms.acesFilmicToneMap(...hdrSuperWhite);
    assert(
      acesResult[0] >= 0 && acesResult[0] <= 1.0 &&
      acesResult[1] >= 0 && acesResult[1] <= 1.0 &&
      acesResult[2] >= 0 && acesResult[2] <= 1.0,
      'ACES Filmic tone map must clamp smoothly within legal SDR [0..1]'
    );
    assert(acesResult[0] > acesResult[1] && acesResult[1] > acesResult[2], 'ACES tone mapping must maintain chromatic balance');

    const reinhardResult = ColorSpaceTransforms.reinhardToneMap(...hdrSuperWhite);
    assert(
      reinhardResult[0] >= 0 && reinhardResult[0] <= 1.0,
      'Reinhard tone map must compress highlights into [0..1]'
    );

    // Out-of-gamut detection
    const warnings = ColorSpaceTransforms.detectColorWarnings('slog3', 'rec709', [0.5, 0.5, 0.5]);
    assert(warnings.length > 0, 'Should alert user when conformed log footage lacks 3D LUT');

    results.push({ name: 'Color: HDR->SDR Tone Mapping (ACES Filmic & Reinhard)', passed: true });
  } catch (err: any) {
    results.push({ name: 'Color: HDR->SDR Tone Mapping (ACES Filmic & Reinhard)', passed: false, details: err.message });
  }

  // 6. 3D Look-Up Table (.cube) Export
  try {
    const grade = createDefaultColorGrade();
    grade.exposure = 0.2;
    grade.contrast = 1.1;

    const cubeContent = ColorEngine.exportGradeToCube(grade, 9, 'Unit Test LUT');
    assert(cubeContent.includes('LUT_3D_SIZE 9'), 'CUBE LUT must declare LUT_3D_SIZE 9');
    assert(cubeContent.includes('DOMAIN_MIN 0.0 0.0 0.0'), 'CUBE LUT must declare DOMAIN_MIN');
    assert(cubeContent.includes('DOMAIN_MAX 1.0 1.0 1.0'), 'CUBE LUT must declare DOMAIN_MAX');

    const lines = cubeContent.split('\n').filter((l) => l.trim() && !l.startsWith('#') && !l.startsWith('TITLE') && !l.startsWith('LUT') && !l.startsWith('DOMAIN'));
    assert(lines.length === 9 * 9 * 9, `Expected 729 RGB lines for size 9 LUT, got ${lines.length}`);

    results.push({ name: 'Color: 3D LUT (.cube) Generation & File Format Validation', passed: true });
  } catch (err: any) {
    results.push({ name: 'Color: 3D LUT (.cube) Generation & File Format Validation', passed: false, details: err.message });
  }

  return results;
}
