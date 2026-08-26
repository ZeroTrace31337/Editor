/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import {
  Gauge,
  X,
  FastForward,
  Rewind,
  Zap,
  RotateCcw,
} from 'lucide-react';

interface MobileSpeedDrawerProps {
  onClose: () => void;
}

const SPEED_PRESETS = [0.2, 0.5, 0.75, 1.0, 1.5, 2.0, 4.0, 8.0];

export const MobileSpeedDrawer: React.FC<MobileSpeedDrawerProps> = ({ onClose }) => {
  const {
    project,
    projectService,
    selectedClipId,
    selectedClip,
  } = useEditor();

  const [speed, setSpeed] = useState<number>(selectedClip?.speed || 1.0);
  const [smoothSlowMo, setSmoothSlowMo] = useState(true);

  const handleApplySpeed = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (!selectedClipId || !selectedClip) return;
    selectedClip.speed = newSpeed;
    projectService.setProject({ ...project });
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0d17] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-indigo-400" />
          <h3 className="font-bold text-sm">Playback Speed & Slow-Mo</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Target status */}
      <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-850 text-xs text-zinc-400 shrink-0">
        {selectedClip ? `Current Speed for: ${selectedClip.name}` : 'Select a clip to adjust speed'}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center gap-6">
        {/* Speed Indicator */}
        <div className="text-center">
          <span className="text-4xl font-black font-mono text-indigo-400">
            {speed}x
          </span>
          <span className="block text-xs text-zinc-400 mt-1">
            {speed < 1 ? 'Slow Motion' : speed > 1 ? 'Fast Motion / Timelapse' : 'Normal Speed'}
          </span>
        </div>

        {/* Speed Slider */}
        <div className="w-full max-w-sm px-4">
          <input
            type="range"
            min={0.1}
            max={8.0}
            step={0.1}
            value={speed}
            onChange={(e) => handleApplySpeed(parseFloat(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
            <span>0.1x (Ultra Slow)</span>
            <span>1.0x (100%)</span>
            <span>8.0x (Hyperlapse)</span>
          </div>
        </div>

        {/* Preset Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-sm">
          {SPEED_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => handleApplySpeed(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                speed === p
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {p}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
