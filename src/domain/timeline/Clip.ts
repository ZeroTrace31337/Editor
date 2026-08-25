/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RationalTime, TimeRange } from '../../core/time/RationalTime';
import { Transform2D, createDefaultTransform } from '../../core/math/Transform2D';
import { ColorGrade, createDefaultColorGrade } from '../color/ColorGrade';
import { EffectInstance } from '../../rendering/effects/EffectTypes';
import { KeyframeTrack } from '../keyframe/Keyframe';
import { ClipTransition } from '../../rendering/transitions/TransitionTypes';
import { ClipMask } from '../mask/ClipMask';

export type ClipType = 'video' | 'audio' | 'image' | 'text' | 'adjustment' | 'compound';

export interface BaseClip {
  readonly id: string;
  readonly type: ClipType;
  name: string;
  trackId: string;
  timelineRange: TimeRange; // Placement on sequence timeline
  sourceRange: TimeRange;   // Trim in/out window relative to original media
  speed: number;            // Playback rate: 1.0 = normal
  opacity: number;          // 0.0 to 1.0
  muted: boolean;
  locked: boolean;
  blendMode?: GlobalCompositeOperation;
  transform: Transform2D;
  colorGrade: ColorGrade;
  effects: EffectInstance[];
  masks: ClipMask[];
  activeMaskId?: string;
  keyframeTracks: Record<string, KeyframeTrack<any>>;
  transitionIn?: ClipTransition;
  transitionOut?: ClipTransition;
}

export interface VideoClip extends BaseClip {
  readonly type: 'video';
  mediaAssetId: string;
  audioLinkedClipId?: string;
}

export interface AudioClip extends BaseClip {
  readonly type: 'audio';
  mediaAssetId: string;
  volume: number;          // 0.0 to 2.0 (1.0 = 100% / 0dB)
  pan: number;             // -1.0 (L) to +1.0 (R)
  fadeInDuration: RationalTime;
  fadeOutDuration: RationalTime;
}

export interface ImageClip extends BaseClip {
  readonly type: 'image';
  mediaAssetId: string;
}

export interface TextClip extends BaseClip {
  readonly type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  textColor: string;
  backgroundColor?: string;
  backgroundPadding?: number;
  backgroundRadius?: number;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  letterSpacing?: number;
  lineHeight?: number;
  fontWeight?: string;
  fontStyle?: string;
  alignment: 'left' | 'center' | 'right';
  animation?: 'none' | 'fade' | 'slide-up' | 'slide-down' | 'pop' | 'typewriter' | 'bounce';
  animationDuration?: number;
}

export interface AdjustmentClip extends BaseClip {
  readonly type: 'adjustment';
}

export interface CompoundClip extends BaseClip {
  readonly type: 'compound';
  nestedSequenceId: string;
}

export type TimelineClip = VideoClip | AudioClip | ImageClip | TextClip | AdjustmentClip | CompoundClip;

export function createBaseClip(
  id: string,
  type: ClipType,
  name: string,
  trackId: string,
  timelineRange: TimeRange,
  sourceRange: TimeRange
): BaseClip {
  return {
    id,
    type,
    name,
    trackId,
    timelineRange,
    sourceRange,
    speed: 1.0,
    opacity: 1.0,
    muted: false,
    locked: false,
    blendMode: 'source-over',
    transform: createDefaultTransform(),
    colorGrade: createDefaultColorGrade(),
    effects: [],
    masks: [],
    keyframeTracks: {},
  };
}
