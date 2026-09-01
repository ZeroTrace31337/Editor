/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RationalTime } from '../../core/time/RationalTime';
import { TimelineClip } from '../../domain/timeline/Clip';
import { Track } from '../../domain/timeline/Track';
import { Project } from '../../domain/project/Project';
import { TimelineEngine } from '../timeline/TimelineEngine';
import { CommandManager } from './CommandManager';
import { ProjectService } from '../project/ProjectService';
import { MediaRegistry } from '../media/MediaRegistry';
import { PlaybackEngine } from '../../rendering/playback/PlaybackEngine';

export type CommandCategory =
  | 'playback'
  | 'editing'
  | 'timeline'
  | 'audio'
  | 'color'
  | 'view'
  | 'project'
  | 'multicam';

export interface EditorExecutionContext {
  project: Project;
  projectService: ProjectService;
  timelineEngine: TimelineEngine;
  commandManager: CommandManager;
  mediaRegistry: MediaRegistry;
  playbackEngine: PlaybackEngine;
  currentTime: RationalTime;
  selectedClipId: string | null;
  selectedClip: TimelineClip | null;
  snappingEnabled: boolean;
  timelineZoom: number;
  seek: (time: RationalTime) => void;
  seekSeconds: (sec: number) => void;
  togglePlay: () => void;
  setSnappingEnabled: (enabled: boolean) => void;
  setTimelineZoom: (zoom: number) => void;
  setSelectedClipId: (id: string | null) => void;
  openModal?: (modalId: string) => void;
  setWorkspaceMode?: (mode: any) => void;
}

export interface EditorCommandDefinition {
  id: string;
  title: string;
  description: string;
  category: CommandCategory;
  defaultShortcut?: string; // e.g. "Mod+B", "Space", "J", "K", "L", "Shift+Del"
  iconName?: string;
  isAvailable: (ctx: EditorExecutionContext) => boolean;
  execute: (ctx: EditorExecutionContext) => Promise<void> | void;
}
