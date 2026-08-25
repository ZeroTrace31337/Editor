/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SplinePoint, ToneCurves } from '../../domain/color/ColorGrade';

/**
 * Monotone Cubic Hermite Spline Evaluator for Color Curves
 */
export class ToneCurveEvaluator {
  /**
   * Evaluates a curve point at input x (0.0 to 1.0)
   */
  public static evaluateCurve(points: SplinePoint[], x: number): number {
    if (!points || points.length === 0) return x;
    if (points.length === 1) return points[0].y;

    const clampedX = Math.max(0, Math.min(1, x));

    // Sort points by X ascending
    const sorted = [...points].sort((a, b) => a.x - b.x);

    if (clampedX <= sorted[0].x) return sorted[0].y;
    if (clampedX >= sorted[sorted.length - 1].x) return sorted[sorted.length - 1].y;

    // Find interval [p0, p1]
    let i = 0;
    for (let j = 0; j < sorted.length - 1; j++) {
      if (clampedX >= sorted[j].x && clampedX <= sorted[j + 1].x) {
        i = j;
        break;
      }
    }

    const p0 = sorted[i];
    const p1 = sorted[i + 1];
    const dx = p1.x - p0.x;
    if (dx <= 0.00001) return p0.y;

    const t = (clampedX - p0.x) / dx;

    // Smoothstep cubic hermite interpolation
    const h00 = (1 + 2 * t) * (1 - t) * (1 - t);
    const h10 = t * (1 - t) * (1 - t);
    const h01 = t * t * (3 - 2 * t);
    const h11 = t * t * (t - 1);

    // Tangents estimated via finite difference
    const m0 = (p1.y - p0.y);
    const m1 = (p1.y - p0.y);

    const y = h00 * p0.y + h10 * m0 + h01 * p1.y + h11 * m1;
    return Math.max(0, Math.min(1, y));
  }

  /**
   * Precomputes a 256-value Lookup Table (LUT) for each channel
   */
  public static generateCurveLut(curves: ToneCurves): {
    masterLut: Uint8Array;
    rLut: Uint8Array;
    gLut: Uint8Array;
    bLut: Uint8Array;
  } {
    const masterLut = new Uint8Array(256);
    const rLut = new Uint8Array(256);
    const gLut = new Uint8Array(256);
    const bLut = new Uint8Array(256);

    for (let i = 0; i < 256; i++) {
      const norm = i / 255.0;
      masterLut[i] = Math.round(this.evaluateCurve(curves.master, norm) * 255);
      rLut[i] = Math.round(this.evaluateCurve(curves.red, norm) * 255);
      gLut[i] = Math.round(this.evaluateCurve(curves.green, norm) * 255);
      bLut[i] = Math.round(this.evaluateCurve(curves.blue, norm) * 255);
    }

    return { masterLut, rLut, gLut, bLut };
  }
}
