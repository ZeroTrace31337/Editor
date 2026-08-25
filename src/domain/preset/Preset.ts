/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ColorGrade } from '../color/ColorGrade';
import { EffectInstance } from '../../rendering/effects/EffectTypes';
import { Transform2D } from '../../core/math/Transform2D';
import { ClipMask } from '../mask/ClipMask';

export type PresetCategory =
  | 'cinematic'
  | 'film'
  | 'vintage'
  | 'warm'
  | 'cool'
  | 'portrait'
  | 'landscape'
  | 'black_white'
  | 'creative'
  | 'my_filters'
  | 'favorites'
  | 'custom';

export type PresetScope = 'color' | 'effects' | 'transform_color_effects' | 'full_clip';

export interface FilterStage {
  id: string;
  name: string;
  enabled: boolean;
  type: 'exposure' | 'color_wheels' | 'curves' | 'hsl' | 'lut' | 'effect' | 'mask';
  params?: Record<string, any>;
}

export interface FilterPreset {
  readonly id: string;
  name: string;
  category: PresetCategory;
  description: string;
  author?: string;
  version: string;
  scope: PresetScope;
  intensity: number; // 0.0 to 1.0 (default 1.0)
  colorGrade?: ColorGrade;
  effects?: EffectInstance[];
  masks?: ClipMask[];
  transform?: Partial<Transform2D>;
  stages?: FilterStage[];
  thumbnailUrl?: string;
  isCustom?: boolean;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt?: string;
}

