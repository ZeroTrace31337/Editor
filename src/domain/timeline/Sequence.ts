/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RationalTime, createRationalTime } from '../../core/time/RationalTime';
import { Track } from './Track';

export interface Marker {
  id: string;
  time: RationalTime;
  name: string;
  color: string;
  comment?: string;
}

export type TimelineMarker = Marker;

export interface Sequence {
  readonly id: string;
  name: string;
  duration: RationalTime;
  tracks: Track[];
  markers: Marker[];
}

export function createDefaultSequence(id = 'seq_main', name = 'Main Sequence'): Sequence {
  return {
    id,
    name,
    duration: createRationalTime(0),
    tracks: [],
    markers: [],
  };
}
