/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import {
  Sparkles,
  X,
  Zap,
  Flame,
  Activity,
  Waves,
  Eye,
  Check,
} from 'lucide-react';
import { EffectInstance } from '../../../rendering/effects/EffectTypes';
import { UpdateEffectsCommand } from '../../../engine/command/implementations/UpdateEffectsCommand';

interface MobileEffectsDrawerProps {
  onClose: () => void;
}

const VFX_PRESETS = [
  { id: 'film_grain', name: '35mm Film Grain', icon: '🎞️', category: 'Texture' },
  { id: 'glow_bloom', name: 'Dreamy Soft Glow', icon: '✨', category: 'Stylize' },
  { id: 'rgb_split', name: 'Chromatic RGB Split', icon: '⚡', category: 'Glitch' },
  { id: 'lens_flare', name: 'Anamorphic Flare', icon: '🌟', category: 'Lighting' },
  { id: 'camera_shake', name: 'Action Cam Shake', icon: '📳', category: 'Motion' },
  { id: 'radial_blur', name: 'Speed Zoom Blur', icon: '🌀', category: 'Blur' },
];

export const MobileEffectsDrawer: React.FC<MobileEffectsDrawerProps> = ({ onClose }) => {
  const {
    timelineEngine,
    commandManager,
    selectedClipId,
    selectedClip,
  } = useEditor();

  const [activeEffects, setActiveEffects] = useState<string[]>([]);

  const handleToggleEffect = (presetId: string) => {
    if (!selectedClipId) return;

    let updated: string[];
    if (activeEffects.includes(presetId)) {
      updated = activeEffects.filter((id) => id !== presetId);
    } else {
      updated = [...activeEffects, presetId];
    }
    setActiveEffects(updated);

    const effectInstances: EffectInstance[] = updated.map((id) => ({
      id: `fx_${id}_${Date.now()}`,
      effectId: id,
      name: id,
      enabled: true,
      opacity: 1.0,
      params: { intensity: 0.75 },
    }));

    try {
      const cmd = new UpdateEffectsCommand(timelineEngine, selectedClipId, effectInstances);
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
          <Sparkles className="w-4 h-4 text-rose-400" />
          <h3 className="font-bold text-sm">Visual FX & Motion Styles</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Target Status */}
      <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-850 text-xs text-zinc-400 shrink-0">
        {selectedClip ? `Editing clip: ${selectedClip.name}` : 'Select a clip to apply visual effects'}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {VFX_PRESETS.map((fx) => {
          const isEnabled = activeEffects.includes(fx.id);

          return (
            <button
              key={fx.id}
              onClick={() => handleToggleEffect(fx.id)}
              className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-2 active:scale-95 transition relative ${
                isEnabled
                  ? 'bg-rose-950/60 border-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              {isEnabled && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center text-white">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
              <span className="text-3xl">{fx.icon}</span>
              <div className="text-center">
                <span className="text-xs font-bold block">{fx.name}</span>
                <span className="text-[9px] text-zinc-400">{fx.category}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
