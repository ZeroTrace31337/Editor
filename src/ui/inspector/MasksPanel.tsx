/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ClipMask, MaskType, createDefaultMask } from '../../domain/mask/ClipMask';
import { TimelineClip } from '../../domain/timeline/Clip';
import { useEditor } from '../context/EditorContext';
import { AddMaskCommand, UpdateMaskCommand, DeleteMaskCommand } from '../../engine/command/implementations/MaskCommands';
import { Square, Circle, Shield, Plus, Trash2, Eye, EyeOff, Sparkles } from 'lucide-react';

interface MasksPanelProps {
  clip: TimelineClip;
}

export const MasksPanel: React.FC<MasksPanelProps> = ({ clip }) => {
  const { timelineEngine, commandManager } = useEditor();
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

  return (
    <div className="space-y-4 select-none">
      {/* Add Mask Quick Bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-200">Clip Masks</span>
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => handleAddMask('rectangle')}
            className="flex items-center space-x-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs transition"
            title="Add Rectangle Mask"
          >
            <Square className="w-3.5 h-3.5 text-indigo-400" />
            <span>Rect</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddMask('ellipse')}
            className="flex items-center space-x-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs transition"
            title="Add Ellipse Mask"
          >
            <Circle className="w-3.5 h-3.5 text-amber-400" />
            <span>Ellipse</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddMask('polygon')}
            className="flex items-center space-x-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs transition"
            title="Add Polygon/Bezier Mask"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Polygon</span>
          </button>
        </div>
      </div>

      {/* Mask List */}
      {masks.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center space-x-1 overflow-x-auto pb-1">
            {masks.map((mask) => {
              const isSelected = activeMask?.id === mask.id;
              return (
                <button
                  key={mask.id}
                  type="button"
                  onClick={() => setActiveMaskId(mask.id)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  <span>{mask.name}</span>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteMask(mask.id, e)}
                    className="p-0.5 hover:text-red-300 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </button>
              );
            })}
          </div>

          {activeMask && (
            <div className="space-y-3 bg-zinc-900/90 border border-zinc-800 rounded-lg p-3">
              {/* Enabled & Invert Checkboxes */}
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeMask.enabled}
                    onChange={(e) => handleUpdateMask({ enabled: e.target.checked })}
                    className="rounded bg-zinc-800 border-zinc-700 text-indigo-500 focus:ring-0"
                  />
                  <span>Enable Mask</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeMask.inverted}
                    onChange={(e) => handleUpdateMask({ inverted: e.target.checked })}
                    className="rounded bg-zinc-800 border-zinc-700 text-indigo-500 focus:ring-0"
                  />
                  <span>Invert Mask</span>
                </label>
              </div>

              {/* Feather Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Feather Edge</span>
                  <span className="font-mono text-zinc-300 font-semibold">{activeMask.feather}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={activeMask.feather}
                  onChange={(e) => handleUpdateMask({ feather: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Opacity Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Mask Opacity</span>
                  <span className="font-mono text-zinc-300 font-semibold">{((activeMask.opacity ?? 1.0) * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={activeMask.opacity ?? 1.0}
                  onChange={(e) => handleUpdateMask({ opacity: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Expansion Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Expansion</span>
                  <span className="font-mono text-zinc-300 font-semibold">{activeMask.expansion > 0 ? `+${activeMask.expansion}` : activeMask.expansion}px</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={activeMask.expansion || 0}
                  onChange={(e) => handleUpdateMask({ expansion: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Rotation Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Rotation</span>
                  <span className="font-mono text-zinc-300 font-semibold">{activeMask.rotation.toFixed(0)}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={activeMask.rotation}
                  onChange={(e) => handleUpdateMask({ rotation: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-center space-y-2">
          <Shield className="w-8 h-8 mx-auto text-zinc-600" />
          <p className="text-xs text-zinc-400">No Masks Added</p>
          <p className="text-[11px] text-zinc-600">
            Click Rect, Ellipse, or Polygon above to create a selective clipping mask with smooth feathering and inversion.
          </p>
        </div>
      )}
    </div>
  );
};
