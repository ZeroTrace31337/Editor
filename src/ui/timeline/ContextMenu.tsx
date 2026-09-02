/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import {
  Scissors,
  Trash2,
  Copy,
  Layers,
  Snowflake,
  Activity,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Bookmark,
  Eye,
  EyeOff,
  Maximize2,
  Plus,
} from 'lucide-react';
import { CommandRegistry } from '../../engine/command/CommandRegistry';
import { EditorExecutionContext } from '../../engine/command/CommandTypes';
import { TimelineClip } from '../../domain/timeline/Clip';
import { Track } from '../../domain/timeline/Track';

export interface ContextMenuState {
  type: 'clip' | 'track' | 'timeline';
  x: number;
  y: number;
  clip?: TimelineClip;
  track?: Track;
}

interface ContextMenuProps {
  menuState: ContextMenuState | null;
  onClose: () => void;
  context: EditorExecutionContext;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ menuState, onClose, context }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const commandRegistry = CommandRegistry.getInstance();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (menuState) {
      window.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuState, onClose]);

  if (!menuState) return null;

  const runCommand = (commandId: string) => {
    commandRegistry.executeCommand(commandId, context);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] bg-zinc-900 border border-zinc-750 rounded-lg shadow-2xl py-1 text-xs text-zinc-200 select-none animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: Math.min(window.innerWidth - 220, menuState.x),
        top: Math.min(window.innerHeight - 300, menuState.y),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {menuState.type === 'clip' && menuState.clip && (
        <>
          <div className="px-3 py-1.5 font-semibold text-zinc-400 border-b border-zinc-800 text-[11px] truncate">
            {menuState.clip.name}
          </div>

          <button
            onClick={() => runCommand('edit.split_at_playhead')}
            className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-zinc-800 hover:text-white transition"
          >
            <div className="flex items-center gap-2">
              <Scissors className="w-3.5 h-3.5 text-cyan-400" />
              <span>Split at Playhead</span>
            </div>
            <kbd className="text-[10px] text-zinc-500 font-mono">Mod+B</kbd>
          </button>

          <button
            onClick={() => runCommand('edit.ripple_trim_start')}
            className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-zinc-800 hover:text-white transition"
          >
            <div className="flex items-center gap-2">
              <Scissors className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ripple Trim In to Playhead</span>
            </div>
            <kbd className="text-[10px] text-zinc-500 font-mono">Q</kbd>
          </button>

          <button
            onClick={() => runCommand('edit.ripple_trim_end')}
            className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-zinc-800 hover:text-white transition"
          >
            <div className="flex items-center gap-2">
              <Scissors className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ripple Trim Out to Playhead</span>
            </div>
            <kbd className="text-[10px] text-zinc-500 font-mono">W</kbd>
          </button>

          <button
            onClick={() => runCommand('edit.ripple_delete')}
            className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-zinc-800 hover:text-white transition"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Ripple Delete</span>
            </div>
            <kbd className="text-[10px] text-zinc-500 font-mono">Shift+Del</kbd>
          </button>

          <button
            onClick={() => runCommand('edit.delete')}
            className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-zinc-800 hover:text-white transition"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Delete (Leave Gap)</span>
            </div>
            <kbd className="text-[10px] text-zinc-500 font-mono">Del</kbd>
          </button>

          <button
            onClick={() => runCommand('edit.duplicate')}
            className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-zinc-800 hover:text-white transition"
          >
            <div className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-amber-400" />
              <span>Duplicate Clip</span>
            </div>
            <kbd className="text-[10px] text-zinc-500 font-mono">Mod+D</kbd>
          </button>

          <div className="border-t border-zinc-800 my-1" />

          <button
            onClick={() => runCommand('edit.freeze_frame')}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-zinc-800 hover:text-white transition"
          >
            <Snowflake className="w-3.5 h-3.5 text-sky-400" />
            <span>Add Freeze Frame</span>
          </button>

          <button
            onClick={() => runCommand('edit.create_compound_clip')}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-zinc-800 hover:text-white transition"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Create Compound Clip</span>
          </button>

          <button
            onClick={() => runCommand('edit.toggle_enable_clip')}
            className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-zinc-800 hover:text-white transition"
          >
            <div className="flex items-center gap-2">
              {menuState.clip.muted ? (
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
              )}
              <span>{menuState.clip.muted ? 'Enable Clip' : 'Disable Clip'}</span>
            </div>
            <kbd className="text-[10px] text-zinc-500 font-mono">V</kbd>
          </button>
        </>
      )}

      {menuState.type === 'track' && menuState.track && (
        <>
          <div className="px-3 py-1.5 font-semibold text-zinc-400 border-b border-zinc-800 text-[11px] truncate">
            Track: {menuState.track.name}
          </div>

          <button
            onClick={() => {
              if (menuState.track) {
                menuState.track.locked = !menuState.track.locked;
                context.projectService.setProject({ ...context.project });
                onClose();
              }
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-zinc-800 hover:text-white transition"
          >
            {menuState.track.locked ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-amber-400" />
                <span>Unlock Track</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Lock Track</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              if (menuState.track) {
                menuState.track.muted = !menuState.track.muted;
                context.projectService.setProject({ ...context.project });
                onClose();
              }
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-zinc-800 hover:text-white transition"
          >
            {menuState.track.muted ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Unmute Track</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-zinc-400" />
                <span>Mute Track</span>
              </>
            )}
          </button>

          <div className="border-t border-zinc-800 my-1" />

          <button
            onClick={() => runCommand('timeline.add_video_track')}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-zinc-800 hover:text-white transition"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Add Video Track</span>
          </button>

          <button
            onClick={() => runCommand('timeline.add_audio_track')}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-zinc-800 hover:text-white transition"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Add Audio Track</span>
          </button>
        </>
      )}

      {menuState.type === 'timeline' && (
        <>
          <button
            onClick={() => runCommand('timeline.add_marker')}
            className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-zinc-800 hover:text-white transition"
          >
            <div className="flex items-center gap-2">
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Marker at Playhead</span>
            </div>
            <kbd className="text-[10px] text-zinc-500 font-mono">M</kbd>
          </button>

          <button
            onClick={() => runCommand('timeline.delete_marker_at_playhead')}
            className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-zinc-800 hover:text-white transition"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Delete Marker at Playhead</span>
            </div>
            <kbd className="text-[10px] text-zinc-500 font-mono">Alt+M</kbd>
          </button>

          <button
            onClick={() => runCommand('timeline.clear_all_markers')}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-zinc-800 hover:text-white transition text-zinc-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Markers</span>
          </button>

          <button
            onClick={() => runCommand('edit.split_at_playhead')}
            className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-zinc-800 hover:text-white transition"
          >
            <div className="flex items-center gap-2">
              <Scissors className="w-3.5 h-3.5 text-cyan-400" />
              <span>Split at Playhead</span>
            </div>
            <kbd className="text-[10px] text-zinc-500 font-mono">Mod+B</kbd>
          </button>

          <div className="border-t border-zinc-800 my-1" />

          <button
            onClick={() => runCommand('timeline.toggle_snapping')}
            className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-zinc-800 hover:text-white transition"
          >
            <span>Toggle Snapping</span>
            <kbd className="text-[10px] text-zinc-500 font-mono">N</kbd>
          </button>

          <button
            onClick={() => runCommand('timeline.zoom_fit')}
            className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-zinc-800 hover:text-white transition"
          >
            <div className="flex items-center gap-2">
              <Maximize2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Fit Sequence to View</span>
            </div>
            <kbd className="text-[10px] text-zinc-500 font-mono">Shift+Z</kbd>
          </button>
        </>
      )}
    </div>
  );
};
