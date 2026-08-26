/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ClipMask,
  MaskType,
  MaskCombineMode,
  createDefaultMask,
} from '../../domain/mask/ClipMask';
import { TimelineClip } from '../../domain/timeline/Clip';
import { useEditor } from '../context/EditorContext';
import {
  AddMaskCommand,
  UpdateMaskCommand,
  DeleteMaskCommand,
} from '../../engine/command/implementations/MaskCommands';
import {
  Square,
  Circle,
  Shield,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  Star,
  Heart,
  Sliders,
  Maximize2,
  Crosshair,
  Layers,
  RotateCw,
  CornerDownRight,
  SplitSquareVertical,
} from 'lucide-react';
import { TrackingEngine } from '../../engine/tracking/TrackingEngine';

interface MasksPanelProps {
  clip?: TimelineClip;
}

export const MasksPanel: React.FC<MasksPanelProps> = ({ clip: propClip }) => {
  const { timelineEngine, commandManager, selectedClip, project, projectService } = useEditor();
  const clip = propClip || selectedClip;
  const trackingEngine = TrackingEngine.getInstance();

  if (!clip) {
    return (
      <div className="p-6 text-center text-zinc-500 text-xs">
        <Shield className="w-8 h-8 mx-auto mb-2 opacity-30 text-cyan-400" />
        <p>Select a clip on the timeline to configure shape & alpha masks.</p>
      </div>
    );
  }

  const masks = clip.masks || [];
  const [activeMaskId, setActiveMaskId] = useState<string>(clip.activeMaskId || masks[0]?.id || '');
  const activeMask = masks.find((m) => m.id === activeMaskId) || masks[0];

  const handleAddMask = (type: MaskType) => {
    const newMask = createDefaultMask(type);
    const cmd = new AddMaskCommand(timelineEngine, clip.id, newMask);
    commandManager.execute(cmd);
    setActiveMaskId(newMask.id);
  };

  const handleUpdateMask = (changes: Partial<ClipMask>) => {
    if (!activeMask) return;
    const cmd = new UpdateMaskCommand(timelineEngine, clip.id, activeMask.id, changes);
    commandManager.execute(cmd);
  };

  const handleDeleteMask = (maskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cmd = new DeleteMaskCommand(timelineEngine, clip.id, maskId);
    commandManager.execute(cmd);
    if (activeMaskId === maskId) {
      const remaining = masks.filter((m) => m.id !== maskId);
      setActiveMaskId(remaining[0]?.id || '');
    }
  };

  const availableTracks = trackingEngine.getTracksForClip(clip.id);

  return (
    <div className="space-y-4 p-3 bg-[#111320] rounded-xl border border-zinc-800 select-none">
      {/* Header & Quick Add Shapes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Alpha & Geometric Masks
            </span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            {masks.length} {masks.length === 1 ? 'mask' : 'masks'} active
          </span>
        </div>

        {/* Quick Shape Adder Grid */}
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => handleAddMask('rectangle')}
            className="p-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-cyan-500 text-zinc-300 text-[10px] flex items-center justify-center gap-1 transition"
          >
            <Square className="w-3 h-3 text-cyan-400" /> Rect
          </button>
          <button
            onClick={() => handleAddMask('ellipse')}
            className="p-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-cyan-500 text-zinc-300 text-[10px] flex items-center justify-center gap-1 transition"
          >
            <Circle className="w-3 h-3 text-amber-400" /> Ellipse
          </button>
          <button
            onClick={() => handleAddMask('linear')}
            className="p-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-cyan-500 text-zinc-300 text-[10px] flex items-center justify-center gap-1 transition"
          >
            <SplitSquareVertical className="w-3 h-3 text-blue-400" /> Linear
          </button>
          <button
            onClick={() => handleAddMask('star')}
            className="p-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-cyan-500 text-zinc-300 text-[10px] flex items-center justify-center gap-1 transition"
          >
            <Star className="w-3 h-3 text-yellow-400" /> Star
          </button>
          <button
            onClick={() => handleAddMask('heart')}
            className="p-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-cyan-500 text-zinc-300 text-[10px] flex items-center justify-center gap-1 transition"
          >
            <Heart className="w-3 h-3 text-rose-400" /> Heart
          </button>
          <button
            onClick={() => handleAddMask('bezier')}
            className="p-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-cyan-500 text-zinc-300 text-[10px] flex items-center justify-center gap-1 transition"
          >
            <CornerDownRight className="w-3 h-3 text-purple-400" /> Bezier
          </button>
          <button
            onClick={() => handleAddMask('ai_auto_subject')}
            className="col-span-2 p-1.5 rounded bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border border-purple-500/40 text-purple-200 text-[10px] font-bold flex items-center justify-center gap-1 transition shadow-xs"
          >
            <Sparkles className="w-3 h-3 text-purple-400" /> AI Auto Subject Mask
          </button>
        </div>
      </div>

      {/* Multi-Mask Pills & Reorder */}
      {masks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {masks.map((mask) => {
              const isSelected = activeMask?.id === mask.id;
              return (
                <button
                  key={mask.id}
                  onClick={() => setActiveMaskId(mask.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition shrink-0 ${
                    isSelected
                      ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{mask.name}</span>
                  <button
                    onClick={(e) => handleDeleteMask(mask.id, e)}
                    className="p-0.5 hover:text-rose-400 rounded transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </button>
              );
            })}
          </div>

          {/* Active Mask Inspector Controls */}
          {activeMask && (
            <div className="p-3 bg-zinc-900/90 rounded-lg border border-zinc-800 space-y-3">
              {/* Combine Mode & Invert */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-400">Combine:</span>
                  <select
                    value={activeMask.combineMode || 'add'}
                    onChange={(e) => handleUpdateMask({ combineMode: e.target.value as MaskCombineMode })}
                    className="bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-zinc-200 text-[10px] focus:outline-none focus:border-cyan-500"
                  >
                    <option value="add">Add (Union)</option>
                    <option value="subtract">Subtract</option>
                    <option value="intersect">Intersect</option>
                  </select>
                </div>

                <label className="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeMask.inverted}
                    onChange={(e) => handleUpdateMask({ inverted: e.target.checked })}
                    className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0"
                  />
                  <span>Invert Mask</span>
                </label>
              </div>

              {/* Sliders: Position, Scale, Feather, Expansion, Opacity, Roundness */}
              <div className="space-y-2.5 text-[10px]">
                {/* Center Position X/Y */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Pos X</span>
                      <span className="text-cyan-400 font-mono">{(activeMask.position.x * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={activeMask.position.x}
                      onChange={(e) =>
                        handleUpdateMask({ position: { ...activeMask.position, x: parseFloat(e.target.value) } })
                      }
                      className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Pos Y</span>
                      <span className="text-cyan-400 font-mono">{(activeMask.position.y * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={activeMask.position.y}
                      onChange={(e) =>
                        handleUpdateMask({ position: { ...activeMask.position, y: parseFloat(e.target.value) } })
                      }
                      className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* Size Width / Height */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Width</span>
                      <span className="text-cyan-400 font-mono">{(activeMask.size.width * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="1.5"
                      step="0.01"
                      value={activeMask.size.width}
                      onChange={(e) =>
                        handleUpdateMask({ size: { ...activeMask.size, width: parseFloat(e.target.value) } })
                      }
                      className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Height</span>
                      <span className="text-cyan-400 font-mono">{(activeMask.size.height * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="1.5"
                      step="0.01"
                      value={activeMask.size.height}
                      onChange={(e) =>
                        handleUpdateMask({ size: { ...activeMask.size, height: parseFloat(e.target.value) } })
                      }
                      className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* Rotation & Feather */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Rotation</span>
                      <span className="text-cyan-400 font-mono">{activeMask.rotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={activeMask.rotation}
                      onChange={(e) => handleUpdateMask({ rotation: parseInt(e.target.value, 10) })}
                      className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Feather Blur</span>
                      <span className="text-cyan-400 font-mono">{activeMask.feather}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={activeMask.feather}
                      onChange={(e) => handleUpdateMask({ feather: parseInt(e.target.value, 10) })}
                      className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* Expansion & Corner Roundness */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Expansion</span>
                      <span className="text-cyan-400 font-mono">{activeMask.expansion}px</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="100"
                      value={activeMask.expansion}
                      onChange={(e) => handleUpdateMask({ expansion: parseInt(e.target.value, 10) })}
                      className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Roundness</span>
                      <span className="text-cyan-400 font-mono">{activeMask.roundness || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={activeMask.roundness || 0}
                      onChange={(e) => handleUpdateMask({ roundness: parseInt(e.target.value, 10) })}
                      className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Mask Motion Tracking Attachment */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                <span className="text-[10px] font-semibold text-zinc-300 flex items-center gap-1">
                  <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                  Bind Mask to Motion Track
                </span>
                <select
                  value={activeMask.trackingTrackId || ''}
                  onChange={(e) => {
                    const trackId = e.target.value || undefined;
                    handleUpdateMask({
                      trackingClipId: trackId ? clip.id : undefined,
                      trackingTrackId: trackId,
                    });
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-1 text-zinc-200 text-[11px] focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Static Mask (No Motion Tracking)</option>
                  {availableTracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      Follow Track: {t.name} ({t.mode})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
