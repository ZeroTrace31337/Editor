/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ColorGrade } from '../color/ColorGrade';
import { ClipTransition } from '../../rendering/transitions/TransitionTypes';
import { EffectInstance } from '../../rendering/effects/EffectTypes';
import { KeyframeTrack } from '../keyframe/Keyframe';
import { AspectRatioPreset } from '../project/Project';

export type TemplateCategoryId =
  | 'for_you'
  | 'trending'
  | 'new'
  | 'reels'
  | 'tiktok'
  | 'youtube_shorts'
  | 'youtube'
  | 'cinematic'
  | 'travel'
  | 'vlog'
  | 'sports'
  | 'gaming'
  | 'birthday'
  | 'wedding'
  | 'business'
  | 'product_promo'
  | 'photography'
  | 'lyrics_music'
  | 'memes'
  | 'minimal'
  | 'beat_sync'
  | 'ai_templates';

export interface TemplateCategoryInfo {
  id: TemplateCategoryId;
  label: string;
  iconName: string;
  description: string;
  tagline: string;
  colorAccent: string;
}

export type MediaSlotType = 'video' | 'image' | 'any';

export interface TemplateMediaSlot {
  id: string;
  slotIndex: number;
  name: string;
  type: MediaSlotType;
  durationSeconds: number;
  startTimeSeconds: number;
  defaultUrl: string;
  thumbnailUrl: string;
  label: string;
  description?: string;
  recommendedResolution?: string;
  cropBehavior?: 'cover' | 'contain' | 'center';
  scale?: number;
  rotation?: number;
  positionX?: number;
  positionY?: number;
  colorGrade?: Partial<ColorGrade>;
  transitionIn?: ClipTransition;
  transitionOut?: ClipTransition;
  effects?: EffectInstance[];
  keyframeTracks?: Record<string, KeyframeTrack<any>>;
}

export interface TemplateTextSlot {
  id: string;
  slotIndex: number;
  name: string;
  defaultText: string;
  startTimeSeconds: number;
  durationSeconds: number;
  fontFamily: string;
  fontSize: number;
  fontWeight?: string;
  color: string;
  alignment: 'left' | 'center' | 'right';
  letterSpacing?: number;
  lineHeight?: number;
  animation?: string;
  positionX?: number;
  positionY?: number;
  backgroundColor?: string;
  backgroundOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  glowColor?: string;
  glowIntensity?: number;
}

export interface TemplateAudioTrack {
  id: string;
  title: string;
  artist: string;
  durationSeconds: number;
  bpm: number;
  url: string;
  beatMarkers?: number[]; // Timestamps in seconds
  genre?: string;
  volume?: number;
}

export interface TemplateCreator {
  name: string;
  handle?: string;
  avatar?: string;
  verified?: boolean;
}

export type TemplateStyle =
  | 'Cinematic'
  | 'Minimal'
  | 'Fast'
  | 'Emotional'
  | 'Professional'
  | 'Energetic'
  | 'Aesthetic'
  | 'Humorous';

export interface Template {
  id: string;
  name: string;
  category: TemplateCategoryId;
  description: string;
  thumbnail: string;
  previewVideoUrl?: string;
  animatedPreviewUrl?: string;
  duration: string; // e.g. "00:15"
  durationSeconds: number;
  aspectRatio: AspectRatioPreset;
  width: number;
  height: number;
  fps: number;
  mediaSlots: TemplateMediaSlot[];
  textSlots: TemplateTextSlot[];
  audioTrack?: TemplateAudioTrack;
  transitions: string[];
  effects: string[];
  filters: string[];
  tags: string[];
  creator: TemplateCreator;
  usageCount: number;
  likesCount?: number;
  rating: number;
  isTrending?: boolean;
  isNew?: boolean;
  isStaffPick?: boolean;
  isAIPowered?: boolean;
  aiFeatures?: string[];
  createdAt: string;
  style: TemplateStyle;
  colorPalette?: string[];
}

export interface UserMediaSlotAssignment {
  slotId: string;
  file?: File;
  mediaAssetId?: string;
  previewUrl: string;
  type: 'video' | 'image';
  name: string;
  durationSeconds?: number;
}

export interface UserTextSlotAssignment {
  slotId: string;
  text: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  alignment?: 'left' | 'center' | 'right';
  letterSpacing?: number;
}

export type TemplateSortOption = 'recommended' | 'popular' | 'newest' | 'most_used';

export interface TemplateFilterOptions {
  searchQuery: string;
  category: TemplateCategoryId | 'all';
  aspectRatio: 'all' | '9:16' | '16:9' | '1:1' | '4:5';
  durationBucket: 'all' | 'under_10' | '10_30' | '30_60' | '60_plus';
  style: 'all' | TemplateStyle;
  favoritesOnly: boolean;
  aiOnly: boolean;
  sortBy: TemplateSortOption;
}

export interface CreateTemplatePayload {
  name: string;
  category: TemplateCategoryId;
  description: string;
  aspectRatio: AspectRatioPreset;
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  thumbnail: string;
  style: TemplateStyle;
  tags: string[];
  mediaSlots: TemplateMediaSlot[];
  textSlots: TemplateTextSlot[];
  audioTrack?: TemplateAudioTrack;
  transitions: string[];
  effects: string[];
  filters: string[];
  creatorName?: string;
}
