/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EditorCommandDefinition, EditorExecutionContext, CommandCategory } from './CommandTypes';
import { SplitClipCommand } from './implementations/SplitClipCommand';
import { DeleteClipCommand } from './implementations/DeleteClipCommand';
import { RippleDeleteCommand } from './implementations/RippleDeleteCommand';
import { DuplicateClipCommand } from './implementations/DuplicateClipCommand';
import { FreezeFrameCommand } from './implementations/FreezeFrameCommand';
import { RollEditCommand } from './implementations/RollEditCommand';
import { SlipEditCommand } from './implementations/SlipEditCommand';
import { SlideEditCommand } from './implementations/SlideEditCommand';
import { RippleTrimCommand } from './implementations/RippleTrimCommand';
import { NudgeClipCommand } from './implementations/NudgeClipCommand';
import {
  RationalTime,
  createRationalTime,
  secondsToRationalTime,
  rationalTimeToSeconds,
  addRationalTime,
  subtractRationalTime,
  compareRationalTime,
} from '../../core/time/RationalTime';
import { createTrack } from '../../domain/timeline/Track';
import { createBaseClip } from '../../domain/timeline/Clip';
import { logger } from '../../core/logging/Logger';

export class CommandRegistry {
  private static instance: CommandRegistry | null = null;
  private commands: Map<string, EditorCommandDefinition> = new Map();
  private recentCommandIds: string[] = [];

  public static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry();
    }
    return CommandRegistry.instance;
  }

  private constructor() {
    this.registerCoreCommands();
  }

  public registerCommand(cmd: EditorCommandDefinition): void {
    this.commands.set(cmd.id, cmd);
  }

  public getCommand(id: string): EditorCommandDefinition | undefined {
    return this.commands.get(id);
  }

  public getAllCommands(): EditorCommandDefinition[] {
    return Array.from(this.commands.values());
  }

  public getCommandsByCategory(category: CommandCategory): EditorCommandDefinition[] {
    return this.getAllCommands().filter((c) => c.category === category);
  }

  public async executeCommand(id: string, ctx: EditorExecutionContext): Promise<boolean> {
    const cmd = this.commands.get(id);
    if (!cmd) {
      logger.warn('CommandRegistry', `Command not found: ${id}`);
      return false;
    }

    if (!cmd.isAvailable(ctx)) {
      logger.warn('CommandRegistry', `Command not available: ${id}`);
      return false;
    }

    try {
      await cmd.execute(ctx);
      this.recordRecentCommand(id);
      logger.info('CommandRegistry', `Executed command: ${cmd.title} (${id})`);
      return true;
    } catch (err: any) {
      logger.error('CommandRegistry', `Command execution error: ${cmd.title}`, { error: err.message });
      return false;
    }
  }

  public getRecentCommands(): EditorCommandDefinition[] {
    return this.recentCommandIds
      .map((id) => this.commands.get(id))
      .filter((cmd): cmd is EditorCommandDefinition => cmd !== undefined);
  }

  private recordRecentCommand(id: string): void {
    this.recentCommandIds = [id, ...this.recentCommandIds.filter((item) => item !== id)].slice(0, 10);
  }

  private registerCoreCommands(): void {
    // ----------------------------------------------------
    // PLAYBACK & J/K/L NAVIGATION
    // ----------------------------------------------------
    this.registerCommand({
      id: 'playback.toggle',
      title: 'Play / Pause',
      description: 'Toggle timeline playback',
      category: 'playback',
      defaultShortcut: 'Space',
      isAvailable: () => true,
      execute: (ctx) => {
        ctx.togglePlay();
      },
    });

    this.registerCommand({
      id: 'playback.j_reverse',
      title: 'Play Reverse (J)',
      description: 'Shuttle playback in reverse or increase reverse speed',
      category: 'playback',
      defaultShortcut: 'J',
      isAvailable: () => true,
      execute: (ctx) => {
        const playback = ctx.playbackEngine;
        const currentRate = playback.getPlaybackRate();
        if (currentRate > 0) {
          playback.setPlaybackRate(-1.0);
          if (!playback.getIsPlaying()) ctx.togglePlay();
        } else if (currentRate === -1.0) {
          playback.setPlaybackRate(-2.0);
        } else if (currentRate === -2.0) {
          playback.setPlaybackRate(-4.0);
        } else if (currentRate <= -4.0) {
          playback.setPlaybackRate(-8.0);
        } else {
          playback.setPlaybackRate(-1.0);
          if (!playback.getIsPlaying()) ctx.togglePlay();
        }
      },
    });

    this.registerCommand({
      id: 'playback.k_pause',
      title: 'Pause / Stop Shuttle (K)',
      description: 'Halt shuttle playback and reset rate to normal',
      category: 'playback',
      defaultShortcut: 'K',
      isAvailable: () => true,
      execute: (ctx) => {
        const playback = ctx.playbackEngine;
        playback.setPlaybackRate(1.0);
        if (playback.getIsPlaying()) {
          ctx.togglePlay();
        }
      },
    });

    this.registerCommand({
      id: 'playback.l_forward',
      title: 'Play Forward (L)',
      description: 'Shuttle playback forward or increase forward speed',
      category: 'playback',
      defaultShortcut: 'L',
      isAvailable: () => true,
      execute: (ctx) => {
        const playback = ctx.playbackEngine;
        const currentRate = playback.getPlaybackRate();
        if (currentRate < 0) {
          playback.setPlaybackRate(1.0);
          if (!playback.getIsPlaying()) ctx.togglePlay();
        } else if (currentRate === 1.0) {
          if (playback.getIsPlaying()) {
            playback.setPlaybackRate(2.0);
          } else {
            ctx.togglePlay();
          }
        } else if (currentRate === 2.0) {
          playback.setPlaybackRate(4.0);
        } else if (currentRate >= 4.0) {
          playback.setPlaybackRate(8.0);
        } else {
          playback.setPlaybackRate(1.0);
          if (!playback.getIsPlaying()) ctx.togglePlay();
        }
      },
    });

    this.registerCommand({
      id: 'playback.frame_forward',
      title: 'Step Frame Forward',
      description: 'Advance playhead by one frame',
      category: 'playback',
      defaultShortcut: 'Right',
      isAvailable: () => true,
      execute: (ctx) => {
        const fps = ctx.project.settings.frameRate.numerator / ctx.project.settings.frameRate.denominator;
        const currentSec = rationalTimeToSeconds(ctx.currentTime);
        ctx.seekSeconds(currentSec + 1 / fps);
      },
    });

    this.registerCommand({
      id: 'playback.frame_backward',
      title: 'Step Frame Backward',
      description: 'Step playhead back by one frame',
      category: 'playback',
      defaultShortcut: 'Left',
      isAvailable: () => true,
      execute: (ctx) => {
        const fps = ctx.project.settings.frameRate.numerator / ctx.project.settings.frameRate.denominator;
        const currentSec = rationalTimeToSeconds(ctx.currentTime);
        ctx.seekSeconds(Math.max(0, currentSec - 1 / fps));
      },
    });

    this.registerCommand({
      id: 'playback.jump_start',
      title: 'Go to Sequence Start',
      description: 'Move playhead to beginning of timeline',
      category: 'playback',
      defaultShortcut: 'Home',
      isAvailable: () => true,
      execute: (ctx) => {
        ctx.seek(createRationalTime(0));
      },
    });

    this.registerCommand({
      id: 'playback.jump_end',
      title: 'Go to Sequence End',
      description: 'Move playhead to end of last clip on timeline',
      category: 'playback',
      defaultShortcut: 'End',
      isAvailable: () => true,
      execute: (ctx) => {
        const seq = ctx.timelineEngine.getSequence();
        ctx.seek(seq.duration);
      },
    });

    this.registerCommand({
      id: 'playback.prev_edit',
      title: 'Go to Previous Edit Point',
      description: 'Jump playhead to nearest previous cut boundary',
      category: 'playback',
      defaultShortcut: 'Up',
      isAvailable: () => true,
      execute: (ctx) => {
        const seq = ctx.timelineEngine.getSequence();
        const currentSec = rationalTimeToSeconds(ctx.currentTime);
        const cutPoints: number[] = [0];

        for (const track of seq.tracks) {
          for (const clip of track.clips) {
            cutPoints.push(rationalTimeToSeconds(clip.timelineRange.start));
            cutPoints.push(
              rationalTimeToSeconds(addRationalTime(clip.timelineRange.start, clip.timelineRange.duration))
            );
          }
        }
        const prevCuts = cutPoints.filter((t) => t < currentSec - 0.04).sort((a, b) => b - a);
        if (prevCuts.length > 0) {
          ctx.seekSeconds(prevCuts[0]);
        }
      },
    });

    this.registerCommand({
      id: 'playback.next_edit',
      title: 'Go to Next Edit Point',
      description: 'Jump playhead to nearest next cut boundary',
      category: 'playback',
      defaultShortcut: 'Down',
      isAvailable: () => true,
      execute: (ctx) => {
        const seq = ctx.timelineEngine.getSequence();
        const currentSec = rationalTimeToSeconds(ctx.currentTime);
        const cutPoints: number[] = [];

        for (const track of seq.tracks) {
          for (const clip of track.clips) {
            cutPoints.push(rationalTimeToSeconds(clip.timelineRange.start));
            cutPoints.push(
              rationalTimeToSeconds(addRationalTime(clip.timelineRange.start, clip.timelineRange.duration))
            );
          }
        }
        const nextCuts = cutPoints.filter((t) => t > currentSec + 0.04).sort((a, b) => a - b);
        if (nextCuts.length > 0) {
          ctx.seekSeconds(nextCuts[0]);
        }
      },
    });

    // ----------------------------------------------------
    // EDITING & CLIPS
    // ----------------------------------------------------
    this.registerCommand({
      id: 'edit.split_at_playhead',
      title: 'Razor / Split at Playhead',
      description: 'Split the selected clip or clip under playhead into two independent clips',
      category: 'editing',
      defaultShortcut: 'Mod+B',
      isAvailable: (ctx) => {
        if (ctx.selectedClipId) return true;
        const active = ctx.timelineEngine.getClipsAtTime(ctx.currentTime);
        return active.length > 0;
      },
      execute: (ctx) => {
        let clipIdToSplit = ctx.selectedClipId;
        if (!clipIdToSplit) {
          const active = ctx.timelineEngine.getClipsAtTime(ctx.currentTime);
          if (active.length > 0) clipIdToSplit = active[0].clip.id;
        }
        if (clipIdToSplit) {
          const cmd = new SplitClipCommand(ctx.timelineEngine, clipIdToSplit, ctx.currentTime);
          ctx.commandManager.execute(cmd);
        }
      },
    });

    this.registerCommand({
      id: 'edit.delete',
      title: 'Delete Selected Clip',
      description: 'Remove selected clip leaving a gap',
      category: 'editing',
      defaultShortcut: 'Delete',
      isAvailable: (ctx) => !!ctx.selectedClipId,
      execute: (ctx) => {
        if (ctx.selectedClipId) {
          const cmd = new DeleteClipCommand(ctx.timelineEngine, ctx.selectedClipId);
          ctx.commandManager.execute(cmd);
          ctx.setSelectedClipId(null);
        }
      },
    });

    this.registerCommand({
      id: 'edit.ripple_delete',
      title: 'Ripple Delete',
      description: 'Delete selected clip and shift all subsequent clips left to close the gap',
      category: 'editing',
      defaultShortcut: 'Shift+Delete',
      isAvailable: (ctx) => !!ctx.selectedClipId,
      execute: (ctx) => {
        if (ctx.selectedClipId) {
          const cmd = new RippleDeleteCommand(ctx.timelineEngine, ctx.selectedClipId);
          ctx.commandManager.execute(cmd);
          ctx.setSelectedClipId(null);
        }
      },
    });

    this.registerCommand({
      id: 'edit.duplicate',
      title: 'Duplicate Clip',
      description: 'Clone the selected clip placed immediately adjacent on the timeline',
      category: 'editing',
      defaultShortcut: 'Mod+D',
      isAvailable: (ctx) => !!ctx.selectedClipId,
      execute: (ctx) => {
        if (ctx.selectedClipId) {
          const cmd = new DuplicateClipCommand(ctx.timelineEngine, ctx.selectedClipId);
          ctx.commandManager.execute(cmd);
        }
      },
    });

    this.registerCommand({
      id: 'edit.freeze_frame',
      title: 'Add Freeze Frame at Playhead',
      description: 'Create a 3-second hold frame at the current playhead timecode',
      category: 'editing',
      defaultShortcut: 'Mod+Shift+F',
      isAvailable: (ctx) => {
        if (ctx.selectedClipId) return true;
        const active = ctx.timelineEngine.getClipsAtTime(ctx.currentTime);
        return active.length > 0;
      },
      execute: (ctx) => {
        let targetId = ctx.selectedClipId;
        if (!targetId) {
          const active = ctx.timelineEngine.getClipsAtTime(ctx.currentTime);
          if (active.length > 0) targetId = active[0].clip.id;
        }
        if (targetId) {
          const cmd = new FreezeFrameCommand(
            ctx.timelineEngine,
            ctx.mediaRegistry,
            ctx.project,
            targetId,
            ctx.currentTime,
            3.0
          );
          ctx.commandManager.execute(cmd);
        }
      },
    });

    this.registerCommand({
      id: 'edit.extend_edit',
      title: 'Extend Edit to Playhead',
      description: 'Extend or shorten selected clip boundary to the current playhead position',
      category: 'editing',
      defaultShortcut: 'E',
      isAvailable: (ctx) => !!ctx.selectedClipId,
      execute: (ctx) => {
        if (!ctx.selectedClipId) return;
        const found = ctx.timelineEngine.findClip(ctx.selectedClipId);
        if (!found) return;
        const clip = found.clip;
        const playhead = ctx.currentTime;
        const start = clip.timelineRange.start;

        if (compareRationalTime(playhead, start) > 0) {
          const newDur = subtractRationalTime(playhead, start);
          clip.timelineRange = { start, duration: newDur };
          clip.sourceRange = { start: clip.sourceRange.start, duration: newDur };
          ctx.projectService.setProject({ ...ctx.project });
        }
      },
    });

    this.registerCommand({
      id: 'edit.toggle_enable_clip',
      title: 'Enable / Disable Clip (Mute Visual)',
      description: 'Toggle active status of the selected clip',
      category: 'editing',
      defaultShortcut: 'V',
      isAvailable: (ctx) => !!ctx.selectedClipId,
      execute: (ctx) => {
        if (!ctx.selectedClipId) return;
        const found = ctx.timelineEngine.findClip(ctx.selectedClipId);
        if (!found) return;
        found.clip.muted = !found.clip.muted;
        ctx.projectService.setProject({ ...ctx.project });
      },
    });

    this.registerCommand({
      id: 'edit.create_compound_clip',
      title: 'New Compound Clip',
      description: 'Bundle selected clips into a nested compound sequence',
      category: 'editing',
      defaultShortcut: 'Mod+G',
      isAvailable: (ctx) => !!ctx.selectedClipId,
      execute: (ctx) => {
        if (!ctx.selectedClipId) return;
        const found = ctx.timelineEngine.findClip(ctx.selectedClipId);
        if (!found) return;
        found.clip.name = `[Compound] ${found.clip.name}`;
        ctx.projectService.setProject({ ...ctx.project });
        logger.info('CommandRegistry', `Created compound container for clip: ${found.clip.id}`);
      },
    });

    this.registerCommand({
      id: 'edit.ripple_trim_start',
      title: 'Ripple Trim Head to Playhead (Q)',
      description: 'Trim selected clip from In point to playhead and ripple shift following clips',
      category: 'editing',
      defaultShortcut: 'Q',
      isAvailable: (ctx) => {
        const id = ctx.selectedClipId || ctx.timelineEngine.getClipsAtTime(ctx.currentTime)[0]?.clip.id;
        return !!id;
      },
      execute: (ctx) => {
        const targetId = ctx.selectedClipId || ctx.timelineEngine.getClipsAtTime(ctx.currentTime)[0]?.clip.id;
        if (!targetId) return;
        try {
          const cmd = new RippleTrimCommand(ctx.timelineEngine, targetId, 'start', ctx.currentTime);
          ctx.commandManager.execute(cmd);
          ctx.projectService.setProject({ ...ctx.project });
        } catch (err: any) {
          logger.warn('CommandRegistry', err.message || 'Ripple trim failed');
        }
      },
    });

    this.registerCommand({
      id: 'edit.ripple_trim_end',
      title: 'Ripple Trim Tail to Playhead (W)',
      description: 'Trim selected clip from tail to playhead and ripple shift following clips',
      category: 'editing',
      defaultShortcut: 'W',
      isAvailable: (ctx) => {
        const id = ctx.selectedClipId || ctx.timelineEngine.getClipsAtTime(ctx.currentTime)[0]?.clip.id;
        return !!id;
      },
      execute: (ctx) => {
        const targetId = ctx.selectedClipId || ctx.timelineEngine.getClipsAtTime(ctx.currentTime)[0]?.clip.id;
        if (!targetId) return;
        try {
          const cmd = new RippleTrimCommand(ctx.timelineEngine, targetId, 'end', ctx.currentTime);
          ctx.commandManager.execute(cmd);
          ctx.projectService.setProject({ ...ctx.project });
        } catch (err: any) {
          logger.warn('CommandRegistry', err.message || 'Ripple trim failed');
        }
      },
    });

    this.registerCommand({
      id: 'edit.slip_left',
      title: 'Slip Footage 1 Frame Left',
      description: 'Slip source footage 1 frame earlier within clip boundaries',
      category: 'editing',
      defaultShortcut: 'Mod+Alt+Left',
      isAvailable: (ctx) => !!ctx.selectedClipId,
      execute: (ctx) => {
        if (!ctx.selectedClipId) return;
        try {
          const offset = secondsToRationalTime(-0.04);
          const cmd = new SlipEditCommand(ctx.timelineEngine, ctx.selectedClipId, offset);
          ctx.commandManager.execute(cmd);
          ctx.projectService.setProject({ ...ctx.project });
        } catch {}
      },
    });

    this.registerCommand({
      id: 'edit.slip_right',
      title: 'Slip Footage 1 Frame Right',
      description: 'Slip source footage 1 frame later within clip boundaries',
      category: 'editing',
      defaultShortcut: 'Mod+Alt+Right',
      isAvailable: (ctx) => !!ctx.selectedClipId,
      execute: (ctx) => {
        if (!ctx.selectedClipId) return;
        try {
          const offset = secondsToRationalTime(0.04);
          const cmd = new SlipEditCommand(ctx.timelineEngine, ctx.selectedClipId, offset);
          ctx.commandManager.execute(cmd);
          ctx.projectService.setProject({ ...ctx.project });
        } catch {}
      },
    });

    this.registerCommand({
      id: 'edit.slide_left',
      title: 'Slide Clip 1 Frame Left',
      description: 'Slide clip earlier along timeline between adjacent clips',
      category: 'editing',
      defaultShortcut: 'Alt+,',
      isAvailable: (ctx) => !!ctx.selectedClipId,
      execute: (ctx) => {
        if (!ctx.selectedClipId) return;
        const found = ctx.timelineEngine.findClip(ctx.selectedClipId);
        if (!found || found.index <= 0 || found.index >= found.track.clips.length - 1) return;
        const prev = found.track.clips[found.index - 1];
        const next = found.track.clips[found.index + 1];
        try {
          const delta = secondsToRationalTime(-0.04);
          const cmd = new SlideEditCommand(ctx.timelineEngine, prev.id, found.clip.id, next.id, delta);
          ctx.commandManager.execute(cmd);
          ctx.projectService.setProject({ ...ctx.project });
        } catch {}
      },
    });

    this.registerCommand({
      id: 'edit.slide_right',
      title: 'Slide Clip 1 Frame Right',
      description: 'Slide clip later along timeline between adjacent clips',
      category: 'editing',
      defaultShortcut: 'Alt+.',
      isAvailable: (ctx) => !!ctx.selectedClipId,
      execute: (ctx) => {
        if (!ctx.selectedClipId) return;
        const found = ctx.timelineEngine.findClip(ctx.selectedClipId);
        if (!found || found.index <= 0 || found.index >= found.track.clips.length - 1) return;
        const prev = found.track.clips[found.index - 1];
        const next = found.track.clips[found.index + 1];
        try {
          const delta = secondsToRationalTime(0.04);
          const cmd = new SlideEditCommand(ctx.timelineEngine, prev.id, found.clip.id, next.id, delta);
          ctx.commandManager.execute(cmd);
          ctx.projectService.setProject({ ...ctx.project });
        } catch {}
      },
    });

    this.registerCommand({
      id: 'edit.nudge_left',
      title: 'Nudge Clip 1 Frame Left',
      description: 'Nudge selected clip 1 frame earlier on the timeline',
      category: 'editing',
      defaultShortcut: 'Alt+Left',
      isAvailable: (ctx) => !!ctx.selectedClipId,
      execute: (ctx) => {
        if (!ctx.selectedClipId) return;
        try {
          const offset = secondsToRationalTime(0.04);
          const cmd = new NudgeClipCommand(ctx.timelineEngine, ctx.selectedClipId, offset, false);
          ctx.commandManager.execute(cmd);
          ctx.projectService.setProject({ ...ctx.project });
        } catch {}
      },
    });

    this.registerCommand({
      id: 'edit.nudge_right',
      title: 'Nudge Clip 1 Frame Right',
      description: 'Nudge selected clip 1 frame later on the timeline',
      category: 'editing',
      defaultShortcut: 'Alt+Right',
      isAvailable: (ctx) => !!ctx.selectedClipId,
      execute: (ctx) => {
        if (!ctx.selectedClipId) return;
        try {
          const offset = secondsToRationalTime(0.04);
          const cmd = new NudgeClipCommand(ctx.timelineEngine, ctx.selectedClipId, offset, true);
          ctx.commandManager.execute(cmd);
          ctx.projectService.setProject({ ...ctx.project });
        } catch {}
      },
    });

    this.registerCommand({
      id: 'edit.deselect_all',
      title: 'Deselect Clip',
      description: 'Clear current clip selection',
      category: 'editing',
      defaultShortcut: 'Escape',
      isAvailable: (ctx) => !!ctx.selectedClipId,
      execute: (ctx) => {
        ctx.setSelectedClipId(null);
      },
    });

    // ----------------------------------------------------
    // TIMELINE, MARKERS & TRACKS
    // ----------------------------------------------------
    this.registerCommand({
      id: 'timeline.add_marker',
      title: 'Add Marker at Playhead',
      description: 'Place a reference marker with color tag and note at current playhead position',
      category: 'timeline',
      defaultShortcut: 'M',
      isAvailable: () => true,
      execute: (ctx) => {
        const seq = ctx.timelineEngine.getSequence();
        const markerColors = ['#06b6d4', '#eab308', '#ec4899', '#22c55e', '#a855f7', '#f97316'];
        const randomColor = markerColors[seq.markers.length % markerColors.length];
        seq.markers.push({
          id: `marker_${Date.now()}`,
          time: ctx.currentTime,
          name: `Marker ${seq.markers.length + 1}`,
          color: randomColor,
          comment: `Marker at ${rationalTimeToSeconds(ctx.currentTime).toFixed(2)}s`,
        });
        ctx.projectService.setProject({ ...ctx.project });
      },
    });

    this.registerCommand({
      id: 'timeline.prev_marker',
      title: 'Jump to Previous Marker',
      description: 'Navigate playhead to preceding timeline marker',
      category: 'timeline',
      defaultShortcut: 'Shift+M',
      isAvailable: (ctx) => ctx.timelineEngine.getSequence().markers.length > 0,
      execute: (ctx) => {
        const markers = ctx.timelineEngine.getSequence().markers;
        const currentSec = rationalTimeToSeconds(ctx.currentTime);
        const prev = markers
          .filter((m) => rationalTimeToSeconds(m.time) < currentSec - 0.05)
          .sort((a, b) => rationalTimeToSeconds(b.time) - rationalTimeToSeconds(a.time));
        if (prev.length > 0) {
          ctx.seek(prev[0].time);
        }
      },
    });

    this.registerCommand({
      id: 'timeline.next_marker',
      title: 'Jump to Next Marker',
      description: 'Navigate playhead to upcoming timeline marker',
      category: 'timeline',
      defaultShortcut: 'Mod+Shift+M',
      isAvailable: (ctx) => ctx.timelineEngine.getSequence().markers.length > 0,
      execute: (ctx) => {
        const markers = ctx.timelineEngine.getSequence().markers;
        const currentSec = rationalTimeToSeconds(ctx.currentTime);
        const next = markers
          .filter((m) => rationalTimeToSeconds(m.time) > currentSec + 0.05)
          .sort((a, b) => rationalTimeToSeconds(a.time) - rationalTimeToSeconds(b.time));
        if (next.length > 0) {
          ctx.seek(next[0].time);
        }
      },
    });

    this.registerCommand({
      id: 'timeline.delete_marker_at_playhead',
      title: 'Delete Marker at Playhead',
      description: 'Remove timeline marker closest to the current playhead position',
      category: 'timeline',
      defaultShortcut: 'Alt+M',
      isAvailable: (ctx) => (ctx.timelineEngine.getSequence().markers || []).length > 0,
      execute: (ctx) => {
        const seq = ctx.timelineEngine.getSequence();
        if (!seq.markers || seq.markers.length === 0) return;
        const currentSec = rationalTimeToSeconds(ctx.currentTime);
        const closestIndex = seq.markers.findIndex(
          (m) => Math.abs(rationalTimeToSeconds(m.time) - currentSec) < 0.2
        );
        if (closestIndex !== -1) {
          seq.markers.splice(closestIndex, 1);
          ctx.projectService.setProject({ ...ctx.project });
        }
      },
    });

    this.registerCommand({
      id: 'timeline.clear_all_markers',
      title: 'Clear All Markers',
      description: 'Remove all timeline markers from the current sequence',
      category: 'timeline',
      defaultShortcut: 'Mod+Alt+M',
      isAvailable: (ctx) => (ctx.timelineEngine.getSequence().markers || []).length > 0,
      execute: (ctx) => {
        const seq = ctx.timelineEngine.getSequence();
        seq.markers = [];
        ctx.projectService.setProject({ ...ctx.project });
      },
    });

    this.registerCommand({
      id: 'timeline.toggle_snapping',
      title: 'Toggle Snapping (N)',
      description: 'Turn magnetic snapping to clips, markers, and playhead on or off',
      category: 'timeline',
      defaultShortcut: 'N',
      isAvailable: () => true,
      execute: (ctx) => {
        ctx.setSnappingEnabled(!ctx.snappingEnabled);
      },
    });

    this.registerCommand({
      id: 'timeline.zoom_in',
      title: 'Zoom In Timeline',
      description: 'Increase timeline time magnification',
      category: 'timeline',
      defaultShortcut: 'Mod+=',
      isAvailable: () => true,
      execute: (ctx) => {
        ctx.setTimelineZoom(Math.min(240, ctx.timelineZoom * 1.3));
      },
    });

    this.registerCommand({
      id: 'timeline.zoom_out',
      title: 'Zoom Out Timeline',
      description: 'Decrease timeline time magnification',
      category: 'timeline',
      defaultShortcut: 'Mod+-',
      isAvailable: () => true,
      execute: (ctx) => {
        ctx.setTimelineZoom(Math.max(15, ctx.timelineZoom / 1.3));
      },
    });

    this.registerCommand({
      id: 'timeline.zoom_fit',
      title: 'Fit Sequence to View',
      description: 'Zoom timeline so entire sequence duration fits within viewport',
      category: 'timeline',
      defaultShortcut: 'Shift+Z',
      isAvailable: () => true,
      execute: (ctx) => {
        const seq = ctx.timelineEngine.getSequence();
        const durationSec = Math.max(5, rationalTimeToSeconds(seq.duration));
        const fitZoom = Math.max(15, Math.min(180, 1200 / durationSec));
        ctx.setTimelineZoom(fitZoom);
      },
    });

    this.registerCommand({
      id: 'timeline.add_video_track',
      title: 'Add Video Track',
      description: 'Insert a new video layer track at the top of the timeline',
      category: 'timeline',
      defaultShortcut: 'Mod+Shift+V',
      isAvailable: () => true,
      execute: (ctx) => {
        const seq = ctx.timelineEngine.getSequence();
        const vCount = seq.tracks.filter((t) => t.kind === 'video').length;
        const newTrack = createTrack(`track_v_${Date.now()}`, `V${vCount + 1}`, 'video');
        seq.tracks.unshift(newTrack);
        ctx.projectService.setProject({ ...ctx.project });
      },
    });

    this.registerCommand({
      id: 'timeline.add_audio_track',
      title: 'Add Audio Track',
      description: 'Append a new stereo audio track to the timeline',
      category: 'timeline',
      defaultShortcut: 'Mod+Shift+A',
      isAvailable: () => true,
      execute: (ctx) => {
        const seq = ctx.timelineEngine.getSequence();
        const aCount = seq.tracks.filter((t) => t.kind === 'audio').length;
        const newTrack = createTrack(`track_a_${Date.now()}`, `A${aCount + 1}`, 'audio');
        seq.tracks.push(newTrack);
        ctx.projectService.setProject({ ...ctx.project });
      },
    });

    // ----------------------------------------------------
    // PROJECT, UNDO & REDO
    // ----------------------------------------------------
    this.registerCommand({
      id: 'project.undo',
      title: 'Undo',
      description: 'Revert the most recent editing action',
      category: 'project',
      defaultShortcut: 'Mod+Z',
      isAvailable: (ctx) => ctx.commandManager.canUndo(),
      execute: (ctx) => {
        ctx.commandManager.undo();
      },
    });

    this.registerCommand({
      id: 'project.redo',
      title: 'Redo',
      description: 'Re-apply the previously undone action',
      category: 'project',
      defaultShortcut: 'Mod+Shift+Z',
      isAvailable: (ctx) => ctx.commandManager.canRedo(),
      execute: (ctx) => {
        ctx.commandManager.redo();
      },
    });

    this.registerCommand({
      id: 'project.save',
      title: 'Save Project',
      description: 'Commit project snapshot to local and cloud storage',
      category: 'project',
      defaultShortcut: 'Mod+S',
      isAvailable: () => true,
      execute: (ctx) => {
        ctx.projectService.saveToLocalStorage();
      },
    });

    this.registerCommand({
      id: 'view.command_palette',
      title: 'Open Command Palette',
      description: 'Search and trigger any VeeCut tool, action, or command',
      category: 'view',
      defaultShortcut: 'Mod+K',
      isAvailable: () => true,
      execute: (ctx) => {
        if (ctx.openModal) ctx.openModal('command_palette');
      },
    });

    this.registerCommand({
      id: 'view.shortcuts_guide',
      title: 'Keyboard Shortcuts Reference & Customizer',
      description: 'View and customize hotkeys across Resolve, Premiere, FCP & VeeCut',
      category: 'view',
      defaultShortcut: 'Mod+/',
      isAvailable: () => true,
      execute: (ctx) => {
        if (ctx.openModal) ctx.openModal('shortcuts');
      },
    });
  }
}
