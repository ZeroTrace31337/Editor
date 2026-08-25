/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RationalTime } from '../../core/time/RationalTime';
import { TimelineClip } from '../../domain/timeline/Clip';
import { Track } from '../../domain/timeline/Track';
import { Transform2D } from '../../core/math/Transform2D';
import { ColorGrade } from '../../domain/color/ColorGrade';
import { EffectInstance } from '../effects/EffectTypes';
import { ClipTransition } from '../transitions/TransitionTypes';
import { ClipMask } from '../../domain/mask/ClipMask';

export type InstructionKind = 'clear' | 'clip' | 'transition' | 'group';

export interface ClearInstruction {
  kind: 'clear';
  color: string;
}

export interface ClipRenderInstruction {
  kind: 'clip';
  clip: TimelineClip;
  track: Track;
  sourceTime: RationalTime;
  sourceSeconds: number;
  evaluatedTransform: Transform2D;
  evaluatedOpacity: number;
  evaluatedColorGrade: ColorGrade;
  evaluatedEffects: EffectInstance[];
  evaluatedMasks: ClipMask[];
  blendMode: GlobalCompositeOperation;
  transitionIn?: {
    transition: ClipTransition;
    progress: number; // 0..1
  };
  transitionOut?: {
    transition: ClipTransition;
    progress: number; // 0..1
  };
}

export type RenderInstruction = ClearInstruction | ClipRenderInstruction;

export interface RenderInstructionTree {
  timestamp: RationalTime;
  width: number;
  height: number;
  instructions: RenderInstruction[];
}
