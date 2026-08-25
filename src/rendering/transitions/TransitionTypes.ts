/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RationalTime } from '../../core/time/RationalTime';

export type TransitionType =
  | 'cross-dissolve'
  | 'fade-black'
  | 'fade-white'
  | 'wipe-left'
  | 'wipe-right'
  | 'wipe-up'
  | 'wipe-down'
  | 'slide-left'
  | 'slide-right'
  | 'zoom-in'
  | 'zoom-out';

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
