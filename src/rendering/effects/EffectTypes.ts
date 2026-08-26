/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EffectCategory =
  | 'blur'
  | 'color'
  | 'stylize'
  | 'lighting'
  | 'distortion'
  | 'utility'
  | 'keying'
  | 'image'
  | 'glitch'
  | 'retro'
  | 'cinematic'
  | 'noise'
  | 'tracking'
  | 'ai';

export type ParameterType = 'number' | 'range' | 'color' | 'boolean' | 'select' | 'point';

export interface BaseParamDef {
  id: string;
  name: string;
  type: ParameterType;
  description?: string;
  keyframeable?: boolean;
}

export interface NumberParamDef extends BaseParamDef {
  type: 'number' | 'range';
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string; // '%', 'px', 'deg', etc.
}

export interface ColorParamDef extends BaseParamDef {
  type: 'color';
  defaultValue: string; // Hex '#ffffff'
}

export interface BooleanParamDef extends BaseParamDef {
  type: 'boolean';
  defaultValue: boolean;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectParamDef extends BaseParamDef {
  type: 'select';
  options: SelectOption[];
  defaultValue: string;
}

export interface PointParamDef extends BaseParamDef {
  type: 'point';
  defaultValue: { x: number; y: number };
}

export type EffectParamDef =
  | NumberParamDef
  | ColorParamDef
  | BooleanParamDef
  | SelectParamDef
  | PointParamDef;

export interface EffectInstance {
  id: string; // Unique instance ID on clip
  effectId: string; // ID of effect in registry
  name: string;
  enabled: boolean;
  opacity: number; // 0.0 to 1.0
  params: Record<string, any>;
}

export interface IEffect {
  readonly id: string;
  readonly name: string;
  readonly category: EffectCategory;
  readonly description: string;
  readonly iconName?: string;
  readonly parameters: EffectParamDef[];

  /**
   * Applies the effect to a source canvas / context.
   * Can use 2D canvas manipulation, convolution, composite operations, or offscreen pixel buffers.
   */
  apply(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    params: Record<string, any>,
    timeSec: number,
    opacity?: number
  ): void;

  getDefaultParams(): Record<string, any>;
}
