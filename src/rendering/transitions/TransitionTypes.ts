/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RationalTime } from '../../core/time/RationalTime';

export type TransitionType =
  // Basic
  | 'cross-dissolve'
  | 'fade-black'
  | 'fade-white'
  | 'cut'
  | 'wipe-left'
  | 'wipe-right'
  | 'wipe-up'
  | 'wipe-down'
  | 'slide-left'
  | 'slide-right'
  | 'push'
  | 'zoom-in'
  | 'zoom-out'
  // Motion
  | 'camera-pan'
  | 'spin'
  | 'shake'
  | 'whip-pan'
  | 'swipe'
  | 'roll'
  | 'bounce-trans'
  // Stylized
  | 'glitch-trans'
  | 'flash-color'
  | 'light-leak'
  | 'rgb-split'
  | 'blur-dissolve'
  | 'distortion-warp'
  | 'cube-3d'
  // Advanced
  | 'mask-transition'
  | 'ai-seamless'
  | 'beat-snap';

export type TransitionCategory = 'basic' | 'motion' | 'stylized' | 'advanced';

export type TransitionPosition = 'in' | 'out' | 'cross';

export interface ClipTransition {
  id: string;
  type: TransitionType;
  duration: RationalTime; // e.g. 0.5s or 1.0s
  position: TransitionPosition;
  alignment: 'center' | 'start' | 'end';
}

export interface ITransition {
  readonly type: TransitionType;
  readonly name: string;
  readonly description: string;
  readonly iconName?: string;

  /**
   * Applies transition between source image/canvas (layer A) and destination layer B or background
   * @param ctx target context
   * @param sourceCanvas from-clip canvas rendering
   * @param progress 0.0 (start of transition) to 1.0 (end of transition)
   * @param canvasWidth width of canvas
   * @param canvasHeight height of canvas
   * @param isFadeIn true if this is entering (0 -> 1 reveals clip), false if exiting (0 -> 1 hides clip)
   */
  apply(
    ctx: CanvasRenderingContext2D,
    sourceCanvas: HTMLCanvasElement,
    progress: number,
    canvasWidth: number,
    canvasHeight: number,
    isFadeIn: boolean
  ): void;
}
