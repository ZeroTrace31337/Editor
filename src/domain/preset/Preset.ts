/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ColorGrade } from '../color/ColorGrade';
import { EffectInstance } from '../../rendering/effects/EffectTypes';
import { Transform2D } from '../../core/math/Transform2D';
import { ClipMask } from '../mask/ClipMask';

export type PresetCategory =
  | 'for_you'
  | 'trending'
  | 'new'
  | 'veecut_originals'
  | 'cinematic'
  | 'portrait'
  | 'travel'
  | 'vlog'
  | 'sports'
  | 'gaming'
  | 'vintage'
  | 'black_white'
  | 'social'
  | 'landscape'
  | 'film'
  | 'urban'
  | 'mood'
  | 'lifestyle'
  | 'night'
  | 'minimal'
  | 'stylized'
  | 'duotone'
  | 'creative'
  | 'warm'
  | 'cool'
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

export interface ActiveFilterConfig {
  presetId: string;
  presetName: string;
  intensity: number; // 0.0 to 1.0
  category?: string;
  appliedAt?: string;
  presetData?: FilterPreset;
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
  previewGradient?: string;
  tags?: string[];
  popularityScore?: number;
  isTrending?: boolean;
  isNew?: boolean;
  isOriginal?: boolean;
  rating?: number;
  usageCount?: number;
  lutId?: string;
  isCustom?: boolean;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt?: string;
}

