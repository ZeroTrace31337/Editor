/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RationalTime } from '../../core/time/RationalTime';

export type RenderQuality = 'preview' | 'export';

export interface RenderContext {
  width: number;
  height: number;
  quality: RenderQuality;
  fps: number;
  backgroundColor: string;
}

export interface FrameContext {
  currentTime: RationalTime;
  frameIndex: number;
  renderContext: RenderContext;
}
