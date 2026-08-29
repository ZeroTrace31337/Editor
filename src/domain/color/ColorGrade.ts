/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ColorWheelValue {
  r: number; // -1.0 to +1.0
  g: number;
  b: number;
  y: number; // Luma offset (-1.0 to +1.0)
}

export interface SplinePoint {
  x: number; // 0.0 to 1.0
  y: number; // 0.0 to 1.0
}

export interface ToneCurves {
  master: SplinePoint[];
  red: SplinePoint[];
  green: SplinePoint[];
  blue: SplinePoint[];
}

export interface HslBand {
  hue: number;        // -180 to +180 deg shift
  saturation: number; // -100 to +100 %
  luminance: number;  // -100 to +100 %
  rangeCenter: number;// 0 to 360 deg
  rangeWidth: number; // width in deg
  softness: number;   // softness in deg
}

export interface HslColorGrade {
  red: HslBand;
  orange: HslBand;
  yellow: HslBand;
  green: HslBand;
  cyan: HslBand;
  blue: HslBand;
  purple: HslBand;
  magenta: HslBand;
}

export interface ColorGrade {
  colorGradeEnabled?: boolean; // Master bypass toggle
  exposure: number;     // -5.0 to +5.0 EV
  contrast: number;     // 0.0 to 2.0 (1.0 = default)
  brightness: number;   // -1.0 to +1.0 (0.0 = default)
  brilliance?: number;  // -100 to +100 (0 = neutral, dynamic midtone/shadows lift)
  saturation: number;   // 0.0 to 2.0 (1.0 = default)
  vibrance: number;     // -100 to +100 (0 = neutral)
  temperature: number;  // -100 to +100 (0 = neutral)
  temp?: number;        // alias for temperature
  tint: number;         // -100 to +100 (0 = neutral)
  hue: number;          // -180 to +180 deg
  highlights: number;   // -100 to +100
  shadows: number;      // -100 to +100
  whites: number;       // -100 to +100
  blacks: number;       // -100 to +100
  sharpen: number;      // 0 to 100
  clarity: number;      // -100 to +100
  noiseReduction: number;// 0 to 100
  fade: number;         // 0 to 100
  vignette: number;     // 0.0 to 1.0
  grain: number;        // 0 to 100
  lutId?: string;       // Reference to .cube LUT in project
  lutIntensity: number; // 0.0 to 1.0
  lutEnabled?: boolean; // Enable or disable LUT
  wheels: {
    lift: ColorWheelValue;   // Shadows
    gamma: ColorWheelValue;  // Midtones
    gain: ColorWheelValue;   // Highlights
    offset: ColorWheelValue; // Global offset
  };
  curves: ToneCurves;
  hsl: HslColorGrade;
}

export function createDefaultHslBand(rangeCenter: number, rangeWidth = 45, softness = 20): HslBand {
  return {
    hue: 0,
    saturation: 0,
    luminance: 0,
    rangeCenter,
    rangeWidth,
    softness,
  };
}

export function createDefaultHslColorGrade(): HslColorGrade {
  return {
    red: createDefaultHslBand(0),
    orange: createDefaultHslBand(30),
    yellow: createDefaultHslBand(60),
    green: createDefaultHslBand(120),
    cyan: createDefaultHslBand(180),
    blue: createDefaultHslBand(240),
    purple: createDefaultHslBand(280),
    magenta: createDefaultHslBand(320),
  };
}

export function createDefaultColorGrade(): ColorGrade {
  return {
    colorGradeEnabled: true,
    exposure: 0,
    contrast: 1.0,
    brightness: 0,
    brilliance: 0,
    saturation: 1.0,
    vibrance: 0,
    temperature: 0,
    tint: 0,
    hue: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    sharpen: 0,
    clarity: 0,
    noiseReduction: 0,
    fade: 0,
    vignette: 0,
    grain: 0,
    lutIntensity: 1.0,
    wheels: {
      lift: { r: 0, g: 0, b: 0, y: 0 },
      gamma: { r: 0, g: 0, b: 0, y: 0 },
      gain: { r: 0, g: 0, b: 0, y: 0 },
      offset: { r: 0, g: 0, b: 0, y: 0 },
    },
    curves: {
      master: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      red: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      green: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      blue: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    },
    hsl: createDefaultHslColorGrade(),
  };
}
