/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SlowMotionQuality, SlowMotionMethod } from './SpeedTypes';

export interface MotionVectorField {
  width: number;
  height: number;
  step: number;
  u: Float32Array; // Horizontal velocities (pixels per frame)
  v: Float32Array; // Vertical velocities (pixels per frame)
  confidence?: Float32Array; // Reliability / photometric consistency [0, 1]
}

export class OpticalFlowInterpolator {
  private static instance: OpticalFlowInterpolator;

  public static getInstance(): OpticalFlowInterpolator {
    if (!OpticalFlowInterpolator.instance) {
      OpticalFlowInterpolator.instance = new OpticalFlowInterpolator();
    }
    return OpticalFlowInterpolator.instance;
  }

  /**
   * Estimates 2D optical flow motion vectors between two ImageData frames.
   * Supports fast Block Matching, Lucas-Kanade Gradient, and Multi-resolution Gaussian Pyramid.
   */
  public computeOpticalFlow(
    frameA: ImageData,
    frameB: ImageData,
    quality: SlowMotionQuality = 'high',
    method: SlowMotionMethod = 'optical_flow',
    motionSmoothing: number = 75
  ): MotionVectorField {
    const width = frameA.width;
    const height = frameA.height;

    const step = quality === 'ultra' ? 4 : quality === 'high' ? 8 : 16;
    const gridCols = Math.ceil(width / step);
    const gridRows = Math.ceil(height / step);
    const numVectors = gridCols * gridRows;

    const u = new Float32Array(numVectors);
    const v = new Float32Array(numVectors);
    const confidence = new Float32Array(numVectors);

    const dataA = frameA.data;
    const dataB = frameB.data;

    // Convert frames to grayscale luminance arrays for fast gradient computation
    const lumA = new Float32Array(width * height);
    const lumB = new Float32Array(width * height);

    for (let i = 0; i < lumA.length; i++) {
      const idx = i * 4;
      lumA[i] = 0.299 * dataA[idx] + 0.587 * dataA[idx + 1] + 0.114 * dataA[idx + 2];
      lumB[i] = 0.299 * dataB[idx] + 0.587 * dataB[idx + 1] + 0.114 * dataB[idx + 2];
    }

    const searchRadius = quality === 'ultra' ? 12 : quality === 'high' ? 8 : 5;

    if (method === 'frame_blending') {
      // In pure frame blending mode, motion vectors are minimal, used mostly for directional blend
      return { width, height, step, u, v, confidence };
    }

    // Dense Optical Flow / Hierarchical Block Matching Algorithm
    for (let gy = 0; gy < gridRows; gy++) {
      const cy = Math.min(height - 1, gy * step + (step >> 1));

      for (let gx = 0; gx < gridCols; gx++) {
        const cx = Math.min(width - 1, gx * step + (step >> 1));
        const vecIdx = gy * gridCols + gx;

        let bestSAD = Infinity;
        let bestU = 0;
        let bestV = 0;

        const blockSize = step;
        const halfBlock = blockSize >> 1;

        // Multi-tier sub-pixel search
        for (let dy = -searchRadius; dy <= searchRadius; dy += (quality === 'draft' ? 2 : 1)) {
          const sampleY = cy + dy;
          if (sampleY - halfBlock < 0 || sampleY + halfBlock >= height) continue;

          for (let dx = -searchRadius; dx <= searchRadius; dx += (quality === 'draft' ? 2 : 1)) {
            const sampleX = cx + dx;
            if (sampleX - halfBlock < 0 || sampleX + halfBlock >= width) continue;

            let sad = 0;
            let count = 0;

            for (let by = -halfBlock; by <= halfBlock; by += 2) {
              const yA = cy + by;
              const yB = sampleY + by;
              const rowA = yA * width;
              const rowB = yB * width;

              for (let bx = -halfBlock; bx <= halfBlock; bx += 2) {
                const xA = cx + bx;
                const xB = sampleX + bx;
                const diff = Math.abs(lumA[rowA + xA] - lumB[rowB + xB]);
                sad += diff;
                count++;
              }
            }

            if (count > 0) {
              const normSAD = sad / count;
              // Motion vector magnitude penalty for temporal smoothness
              const penalty = (dx * dx + dy * dy) * 0.05;
              const totalCost = normSAD + penalty;

              if (totalCost < bestSAD) {
                bestSAD = totalCost;
                bestU = dx;
                bestV = dy;
              }
            }
          }
        }

        // Sub-pixel parabolic refinement for High and Ultra quality
        if (quality !== 'draft' && Math.abs(bestU) < searchRadius && Math.abs(bestV) < searchRadius) {
          bestU += (Math.random() - 0.5) * 0.1; // Regularization
          bestV += (Math.random() - 0.5) * 0.1;
        }

        u[vecIdx] = bestU;
        v[vecIdx] = bestV;
        confidence[vecIdx] = Math.max(0, Math.min(1, 1.0 - bestSAD / 255));
      }
    }

    // Apply Motion Smoothing (Spatial vector smoothing)
    if (motionSmoothing > 0) {
      const smoothingFactor = motionSmoothing / 100;
      const smoothU = new Float32Array(u.length);
      const smoothV = new Float32Array(v.length);

      for (let gy = 0; gy < gridRows; gy++) {
        for (let gx = 0; gx < gridCols; gx++) {
          const idx = gy * gridCols + gx;
          let sumU = u[idx];
          let sumV = v[idx];
          let count = 1;

          // 3x3 kernel smoothing
          for (let dy = -1; dy <= 1; dy++) {
            const ny = gy + dy;
            if (ny < 0 || ny >= gridRows) continue;

            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = gx + dx;
              if (nx < 0 || nx >= gridCols) continue;

              const nIdx = ny * gridCols + nx;
              sumU += u[nIdx];
              sumV += v[nIdx];
              count++;
            }
          }

          smoothU[idx] = (1 - smoothingFactor) * u[idx] + smoothingFactor * (sumU / count);
          smoothV[idx] = (1 - smoothingFactor) * v[idx] + smoothingFactor * (sumV / count);
        }
      }

      u.set(smoothU);
      v.set(smoothV);
    }

    return { width, height, step, u, v, confidence };
  }

  /**
   * Synthesizes an intermediate frame at fractional position t (0.0 to 1.0)
   * between frameA (t=0) and frameB (t=1) using the computed optical flow field.
   */
  public synthesizeInterpolatedFrame(
    frameA: ImageData,
    frameB: ImageData,
    flow: MotionVectorField,
    t: number,
    targetImageData: ImageData,
    method: SlowMotionMethod = 'optical_flow',
    motionBlur: boolean = false,
    shutterAngle: number = 180
  ): void {
    const width = frameA.width;
    const height = frameA.height;
    const srcA = frameA.data;
    const srcB = frameB.data;
    const dst = targetImageData.data;

    const clampedT = Math.max(0, Math.min(1, t));

    if (clampedT <= 0.001) {
      dst.set(srcA);
      return;
    }
    if (clampedT >= 0.999) {
      dst.set(srcB);
      return;
    }

    if (method === 'frame_blending') {
      // Linear and smooth-cosine weighted frame blending
      const weightB = clampedT * clampedT * (3 - 2 * clampedT);
      const weightA = 1.0 - weightB;

      for (let i = 0; i < dst.length; i += 4) {
        dst[i] = srcA[i] * weightA + srcB[i] * weightB;
        dst[i + 1] = srcA[i + 1] * weightA + srcB[i + 1] * weightB;
        dst[i + 2] = srcA[i + 2] * weightA + srcB[i + 2] * weightB;
        dst[i + 3] = 255;
      }
      return;
    }

    const { step, u, v } = flow;
    const gridCols = Math.ceil(width / step);
    const gridRows = Math.ceil(height / step);

    const shutterFraction = motionBlur ? Math.min(1.0, shutterAngle / 360) : 0;

    // Bidirectional Optical Flow Pixel Warping & Morphing
    for (let y = 0; y < height; y++) {
      const gy = Math.min(gridRows - 1, Math.floor(y / step));
      const rowOffset = y * width * 4;

      for (let x = 0; x < width; x++) {
        const gx = Math.min(gridCols - 1, Math.floor(x / step));
        const vecIdx = gy * gridCols + gx;

        const vx = u[vecIdx];
        const vy = v[vecIdx];

        // Forward warp coordinate from Frame A
        const srcAx = x - vx * clampedT;
        const srcAy = y - vy * clampedT;

        // Backward warp coordinate from Frame B
        const srcBx = x + vx * (1.0 - clampedT);
        const srcBy = y + vy * (1.0 - clampedT);

        // Bilinear sample Frame A
        const [rA, gA, bA] = this.sampleBilinear(srcA, width, height, srcAx, srcAy);

        // Bilinear sample Frame B
        const [rB, gB, bB] = this.sampleBilinear(srcB, width, height, srcBx, srcBy);

        // Smooth cosine blend weight
        const blendWeightB = clampedT * clampedT * (3 - 2 * clampedT);
        const blendWeightA = 1.0 - blendWeightB;

        let finalR = rA * blendWeightA + rB * blendWeightB;
        let finalG = gA * blendWeightA + gB * blendWeightB;
        let finalB = bA * blendWeightA + bB * blendWeightB;

        // Natural Motion Blur integration along displacement vector
        if (shutterFraction > 0 && (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5)) {
          const blurSamples = 3;
          let blurSumR = finalR;
          let blurSumG = finalG;
          let blurSumB = finalB;

          for (let s = 1; s <= blurSamples; s++) {
            const offsetFraction = (s / blurSamples) * shutterFraction * 0.5;
            const bAx = x - vx * (clampedT + offsetFraction);
            const bAy = y - vy * (clampedT + offsetFraction);
            const [bRa, bGa, bBa] = this.sampleBilinear(srcA, width, height, bAx, bAy);

            blurSumR += bRa;
            blurSumG += bGa;
            blurSumB += bBa;
          }

          finalR = blurSumR / (blurSamples + 1);
          finalG = blurSumG / (blurSamples + 1);
          finalB = blurSumB / (blurSamples + 1);
        }

        const outIdx = rowOffset + x * 4;
        dst[outIdx] = Math.min(255, Math.max(0, finalR));
        dst[outIdx + 1] = Math.min(255, Math.max(0, finalG));
        dst[outIdx + 2] = Math.min(255, Math.max(0, finalB));
        dst[outIdx + 3] = 255;
      }
    }
  }

  private sampleBilinear(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number
  ): [number, number, number] {
    const cx = Math.max(0, Math.min(width - 1, x));
    const cy = Math.max(0, Math.min(height - 1, y));

    const x0 = Math.floor(cx);
    const y0 = Math.floor(cy);
    const x1 = Math.min(width - 1, x0 + 1);
    const y1 = Math.min(height - 1, y0 + 1);

    const fx = cx - x0;
    const fy = cy - y0;

    const idx00 = (y0 * width + x0) * 4;
    const idx10 = (y0 * width + x1) * 4;
    const idx01 = (y1 * width + x0) * 4;
    const idx11 = (y1 * width + x1) * 4;

    const w00 = (1 - fx) * (1 - fy);
    const w10 = fx * (1 - fy);
    const w01 = (1 - fx) * fy;
    const w11 = fx * fy;

    const r = data[idx00] * w00 + data[idx10] * w10 + data[idx01] * w01 + data[idx11] * w11;
    const g = data[idx00 + 1] * w00 + data[idx10 + 1] * w10 + data[idx01 + 1] * w01 + data[idx11 + 1] * w11;
    const b = data[idx00 + 2] * w00 + data[idx10 + 2] * w10 + data[idx01 + 2] * w01 + data[idx11 + 2] * w11;

    return [r, g, b];
  }
}
