/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import {
  Layers,
  X,
  Sparkles,
  Zap,
  Maximize2,
  Minimize2,
  Ban,
  Check,
} from 'lucide-react';
import { TransitionType, ClipTransition } from '../../../rendering/transitions/TransitionTypes';
import { secondsToRationalTime } from '../../../core/time/RationalTime';
import { SetTransitionCommand } from '../../../engine/command/implementations/SetTransitionCommand';

interface MobileTransitionsDrawerProps {
  onClose: () => void;
}

const TRANSITIONS_LIST: { id: TransitionType; name: string; icon: string; category: string }[] = [
  { id: 'cross-dissolve', name: 'Cross Dissolve', icon: '✨', category: 'Basic' },
  { id: 'fade-black', name: 'Fade to Black', icon: '🌑', category: 'Basic' },
  { id: 'fade-white', name: 'Flash White', icon: '⚪', category: 'Basic' },
  { id: 'zoom-in', name: 'Zoom In', icon: '🔍', category: 'Motion' },
  { id: 'zoom-out', name: 'Zoom Out', icon: '🔎', category: 'Motion' },
  { id: 'wipe-left', name: 'Wipe Left', icon: '◀️', category: 'Motion' },
  { id: 'wipe-right', name: 'Wipe Right', icon: '▶️', category: 'Motion' },
  { id: 'glitch-trans', name: 'Digital Glitch', icon: '⚡', category: 'Stylized' },
  { id: 'light-leak', name: 'Warm Light Leak', icon: '🌅', category: 'Stylized' },
  { id: 'blur-dissolve', name: 'Dreamy Blur', icon: '💫', category: 'Stylized' },
  { id: 'cube-3d', name: '3D Cube Spin', icon: '🎲', category: '3D' },
];

export const MobileTransitionsDrawer: React.FC<MobileTransitionsDrawerProps> = ({ onClose }) => {
  const {
    timelineEngine,
    commandManager,
    selectedClipId,
    selectedClip,
  } = useEditor();

  const [durationSec, setDurationSec] = useState(0.8);
  const [activeType, setActiveType] = useState<TransitionType | null>(
    selectedClip?.transitionIn?.type || 'cross-dissolve'
  );

  const handleApplyTransition = (type: TransitionType) => {
    setActiveType(type);
    if (!selectedClipId) return;

    const transition: ClipTransition = {
      id: `trans_${Date.now()}`,
      type: type,
      duration: secondsToRationalTime(durationSec),
      position: 'in',
      alignment: 'center',
    };

    try {
      const cmd = new SetTransitionCommand(timelineEngine, selectedClipId, 'in', transition);
      commandManager.execute(cmd);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleRemoveTransition = () => {
    setActiveType(null);
    if (!selectedClipId) return;
    try {
      const cmd = new SetTransitionCommand(timelineEngine, selectedClipId, 'in', undefined);
      commandManager.execute(cmd);
    } catch (err) {
      console.warn(err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0d17] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-pink-400" />
          <h3 className="font-bold text-sm">Cinematic Transitions</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Target Notification */}
      <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-850 flex items-center justify-between text-xs shrink-0">
        <span className="text-zinc-400">
          {selectedClip ? `Applied to: ${selectedClip.name}` : 'Select a clip to apply transition'}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 font-mono">{durationSec}s</span>
          <input
            type="range"
            min={0.2}
            max={2.0}
            step={0.1}
            value={durationSec}
            onChange={(e) => setDurationSec(parseFloat(e.target.value))}
            className="w-20 accent-pink-500"
          />
        </div>
      </div>

      {/* Transition Grid */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <button
          onClick={handleRemoveTransition}
          className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 flex flex-col items-center justify-center gap-2 active:scale-95 transition"
        >
          <Ban className="w-6 h-6 text-zinc-500" />
          <span className="text-xs font-bold text-zinc-400">No Transition</span>
        </button>

        {TRANSITIONS_LIST.map((t) => {
          const isSelected = activeType === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleApplyTransition(t.id)}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 active:scale-95 transition relative ${
                isSelected
                  ? 'bg-pink-950/60 border-pink-500 text-white shadow-lg shadow-pink-500/20'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center text-black">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
              <span className="text-2xl">{t.icon}</span>
              <div className="text-center">
                <span className="text-xs font-bold block">{t.name}</span>
                <span className="text-[9px] text-zinc-400">{t.category}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
