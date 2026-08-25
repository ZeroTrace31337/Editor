/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimelineClip } from './Clip';

export type TrackKind = 'video' | 'audio';

export interface Track {
  readonly id: string;
  name: string;
  kind: TrackKind;
  muted: boolean;
  locked: boolean;
  visible: boolean;
  solo: boolean;
  isTargeted: boolean;
  volume: number; // For audio tracks: 0.0 to 2.0 (1.0 = normal)
  pan?: number;   // -1.0 to +1.0
  clips: TimelineClip[];
}

export function createTrack(id: string, name: string, kind: TrackKind, isTargeted = false): Track {
  return {
    id,
    name,
    kind,
    muted: false,
    locked: false,
    visible: true,
    solo: false,
    isTargeted,
    volume: 1.0,
    pan: 0,
    clips: [],
  };
}
