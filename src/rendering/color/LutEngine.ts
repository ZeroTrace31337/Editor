/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Lut3DData {
  id: string;
  name: string;
  title: string;
  size: number; // e.g. 17 or 33
  data: Float32Array; // RGB triplets flattened (size * size * size * 3)
}

export class LutEngine {
  private static instance: LutEngine;
  private luts: Map<string, Lut3DData> = new Map();

  private constructor() {
    this.registerBuiltInLuts();
  }

  public static getInstance(): LutEngine {
    if (!LutEngine.instance) {
      LutEngine.instance = new LutEngine();
    }
    return LutEngine.instance;
  }

  private registerBuiltInLuts(): void {
    this.registerLut(this.generateProceduralLut('teal-orange', 'Teal & Orange (Blockbuster)', (r, g, b) => {
      // Warm skin tones & deep teal shadows
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const nr = r + (1 - luma) * 0.15 + (luma > 0.5 ? (luma - 0.5) * 0.25 : 0);
      const ng = g + (1 - luma) * 0.02 - (luma < 0.4 ? (0.4 - luma) * 0.1 : 0);
      const nb = b + (1 - luma) * 0.25 - (luma > 0.4 ? (luma - 0.4) * 0.3 : 0);
      return [nr * 1.05, ng * 0.98, nb * 1.15];
    }));

    this.registerLut(this.generateProceduralLut('kodak-2383', 'Kodak 2383 Print Film', (r, g, b) => {
      // Rich contrast, warm highlights, deep rich film blacks
      const nr = Math.pow(r, 0.92) * 1.05;
      const ng = Math.pow(g, 1.02) * 0.98;
      const nb = Math.pow(b, 1.12) * 0.92;
      return [nr, ng, nb];
    }));

    this.registerLut(this.generateProceduralLut('fuji-eterna', 'Fuji Eterna 500T', (r, g, b) => {
      // Soft pastel roll-off, desaturated cool highlights, rich foliage
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const nr = luma * 0.2 + r * 0.8;
      const ng = luma * 0.15 + g * 0.85 + 0.02;
      const nb = luma * 0.18 + b * 0.82 + 0.04;
      return [nr * 0.96, ng * 1.02, nb * 1.03];
    }));

    this.registerLut(this.generateProceduralLut('vintage-gold', 'Vintage 70s Gold', (r, g, b) => {
      const nr = r * 1.15 + 0.04;
      const ng = g * 1.05 + 0.02;
      const nb = b * 0.82 - 0.02;
      return [nr, ng, nb];
    }));

    this.registerLut(this.generateProceduralLut('cyberpunk', 'Cyberpunk Neon Matrix', (r, g, b) => {
      const nr = Math.pow(r, 1.2) * 1.2;
      const ng = g * 0.85;
      const nb = Math.pow(b, 0.8) * 1.35;
      return [nr, ng, nb];
    }));

    this.registerLut(this.generateProceduralLut('bleach-bypass', 'Silver Bleach Bypass', (r, g, b) => {
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const highContrastLuma = luma < 0.5 ? 2 * luma * luma : 1 - 2 * (1 - luma) * (1 - luma);
      const nr = 0.6 * r + 0.4 * highContrastLuma;
      const ng = 0.6 * g + 0.4 * highContrastLuma;
      const nb = 0.6 * b + 0.4 * highContrastLuma;
      return [nr, ng, nb];
    }));

    this.registerLut(this.generateProceduralLut('noir-bnw', 'Moody Film Noir (B&W)', (r, g, b) => {
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      // High contrast S-curve
      const sLuma = luma < 0.5 ? 2 * luma * luma : 1 - 2 * (1 - luma) * (1 - luma);
      return [sLuma, sLuma, sLuma];
    }));
  }

  public registerLut(lut: Lut3DData): void {
    this.luts.set(lut.id, lut);
  }

  public deleteLut(id: string): boolean {
    return this.luts.delete(id);
  }

  public getLut(id: string): Lut3DData | undefined {
    return this.luts.get(id);
  }

  public getAllLuts(): Lut3DData[] {
    return Array.from(this.luts.values());
  }

  /**
   * Generates mathematical 3D cube matrix table
   */
  private generateProceduralLut(
    id: string,
    title: string,
    transformFn: (r: number, g: number, b: number) => [number, number, number],
    size = 17
  ): Lut3DData {
    const totalEntries = size * size * size;
    const data = new Float32Array(totalEntries * 3);

    let idx = 0;
    for (let b = 0; b < size; b++) {
      for (let g = 0; g < size; g++) {
        for (let r = 0; r < size; r++) {
          const normR = r / (size - 1);
          const normG = g / (size - 1);
          const normB = b / (size - 1);

          const [outR, outG, outB] = transformFn(normR, normG, normB);
          data[idx++] = Math.max(0, Math.min(1, outR));
          data[idx++] = Math.max(0, Math.min(1, outG));
          data[idx++] = Math.max(0, Math.min(1, outB));
        }
      }
    }

    return {
      id,
      name: id,
      title,
      size,
      data,
    };
  }

  /**
   * Parses standard .cube file format from string
   */
  public parseCubeString(cubeText: string, id: string, name: string): Lut3DData {
    const lines = cubeText.split(/\r?\n/);
    let size = 0;
    const values: number[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (trimmed.startsWith('LUT_3D_SIZE')) {
        const parts = trimmed.split(/\s+/);
        size = parseInt(parts[1], 10);
        continue;
      }

      if (trimmed.startsWith('TITLE')) {
        continue;
      }

      const rgb = trimmed.split(/\s+/).map(Number);
      if (rgb.length === 3 && !isNaN(rgb[0])) {
        values.push(rgb[0], rgb[1], rgb[2]);
      }
    }

    if (size === 0) {
      size = Math.round(Math.cbrt(values.length / 3));
    }

    return {
      id,
      name,
      title: name,
      size,
      data: new Float32Array(values),
    };
  }

  /**
   * Performs trilinear 3D lookup on RGB color
   */
  public sampleLut3D(
    lut: Lut3DData,
    r: number,
    g: number,
    b: number,
    intensity = 1.0
  ): [number, number, number] {
    const size = lut.size;
    const maxIdx = size - 1;

    const rIdx = Math.max(0, Math.min(maxIdx, r * maxIdx));
    const gIdx = Math.max(0, Math.min(maxIdx, g * maxIdx));
    const bIdx = Math.max(0, Math.min(maxIdx, b * maxIdx));

    const r0 = Math.floor(rIdx);
    const r1 = Math.min(maxIdx, r0 + 1);
    const rf = rIdx - r0;

    const g0 = Math.floor(gIdx);
    const g1 = Math.min(maxIdx, g0 + 1);
    const gf = gIdx - g0;

    const b0 = Math.floor(bIdx);
    const b1 = Math.min(maxIdx, b0 + 1);
    const bf = bIdx - b0;

    const getEntry = (ri: number, gi: number, bi: number) => {
      const index = (bi * size * size + gi * size + ri) * 3;
      return [lut.data[index], lut.data[index + 1], lut.data[index + 2]];
    };

    // 8 corner samples of the cube voxel
    const c000 = getEntry(r0, g0, b0);
    const c100 = getEntry(r1, g0, b0);
    const c010 = getEntry(r0, g1, b0);
    const c110 = getEntry(r1, g1, b0);
    const c001 = getEntry(r0, g0, b1);
    const c101 = getEntry(r1, g0, b1);
    const c011 = getEntry(r0, g1, b1);
    const c111 = getEntry(r1, g1, b1);

    // Trilinear interpolation
    const out: [number, number, number] = [0, 0, 0];
    for (let c = 0; c < 3; c++) {
      const i00 = c000[c] * (1 - rf) + c100[c] * rf;
      const i10 = c010[c] * (1 - rf) + c110[c] * rf;
      const i01 = c001[c] * (1 - rf) + c101[c] * rf;
      const i11 = c011[c] * (1 - rf) + c111[c] * rf;

      const i0 = i00 * (1 - gf) + i10 * gf;
      const i1 = i01 * (1 - gf) + i11 * gf;

      const targetVal = i0 * (1 - bf) + i1 * bf;
      const origVal = c === 0 ? r : c === 1 ? g : b;
      out[c] = origVal + (targetVal - origVal) * intensity;
    }

    return out;
  }
}
