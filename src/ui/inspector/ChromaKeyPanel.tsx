/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Pipette,
  Layers,
  Sparkles,
  Eye,
  Plus,
  Trash2,
  Image as ImageIcon,
  Film,
  Palette,
  Sliders,
  CheckCircle2,
  Grid,
} from 'lucide-react';
import { TimelineClip } from '../../domain/timeline/Clip';
import { useEditor } from '../context/EditorContext';
import {
  ChromaKeySettings,
  SingleChromaKey,
  ChromaMatteMode,
  ChromaBackgroundType,
  AI_BACKGROUND_PRESETS,
  createDefaultChromaKeySettings,
  createDefaultSingleChromaKey,
} from '../../rendering/chroma/ChromaKeyTypes';

interface ChromaKeyPanelProps {
  clip?: TimelineClip;
}

export const ChromaKeyPanel: React.FC<ChromaKeyPanelProps> = ({ clip: propClip }) => {
  const { selectedClip, project, projectService } = useEditor();
  const clip = propClip || selectedClip;

  if (!clip || (clip.type !== 'video' && clip.type !== 'image')) {
    return (
      <div className="p-6 text-center text-zinc-500 text-xs">
        <Pipette className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400" />
        <p>Select a video or image clip to configure chroma key and background removal.</p>
      </div>
    );
  }

  const chroma: ChromaKeySettings = clip.chromaKey || createDefaultChromaKeySettings();

  const updateChroma = (updates: Partial<ChromaKeySettings>) => {
    const updated = { ...chroma, ...updates };
    clip.chromaKey = updated;
    projectService.setProject({ ...project });
  };

  const updateKey = (keyId: string, keyUpdates: Partial<SingleChromaKey>) => {
    const updatedKeys = chroma.keys.map((k) => (k.id === keyId ? { ...k, ...keyUpdates } : k));
    updateChroma({ keys: updatedKeys });
  };

  const handleAddKey = () => {
    const newKey = createDefaultSingleChromaKey('#0044ff'); // default blue screen
    updateChroma({ keys: [...chroma.keys, newKey] });
  };

  const handleRemoveKey = (keyId: string) => {
    if (chroma.keys.length <= 1) return;
    updateChroma({ keys: chroma.keys.filter((k) => k.id !== keyId) });
  };

  return (
    <div className="space-y-4 p-3 bg-[#111320] rounded-xl border border-zinc-800 select-none">
      {/* Header & Master Switch */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Pipette className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Chroma Key & BG Replacement
          </span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={chroma.enabled}
            onChange={(e) => updateChroma({ enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
        </label>
      </div>

      {chroma.enabled && (
        <div className="space-y-4">
          {/* Matte View Mode Selector */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-zinc-300">Preview Matte Mode</span>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'keyed', label: 'Composite' },
                { id: 'matte', label: 'Alpha Matte' },
                { id: 'alpha_grid', label: 'Grid / PNG' },
                { id: 'original', label: 'Original' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => updateChroma({ matteMode: m.id as ChromaMatteMode })}
                  className={`py-1 rounded border text-[10px] font-medium transition ${
                    chroma.matteMode === m.id
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Keyed Colors List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-300">Key Colors</span>
              <button
                onClick={handleAddKey}
                className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded border border-emerald-500/30 text-[10px] font-bold transition"
              >
                <Plus className="w-3 h-3" />
                <span>Add Key</span>
              </button>
            </div>

            {chroma.keys.map((k, idx) => (
              <div key={k.id} className="p-3 bg-zinc-900/90 rounded-lg border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={k.keyColor}
                      onChange={(e) => updateKey(k.id, { keyColor: e.target.value })}
                      className="w-6 h-6 rounded border border-zinc-700 bg-transparent cursor-pointer p-0"
                    />
                    <span className="text-[11px] font-mono font-semibold text-zinc-200 uppercase">
                      {k.keyColor}
                    </span>
                  </div>

                  {/* Preset Swatches */}
                  <div className="flex items-center gap-1">
                    {['#00ff00', '#00e53a', '#0044ff', '#0000ff', '#ff00ff'].map((c) => (
                      <button
                        key={c}
                        onClick={() => updateKey(k.id, { keyColor: c })}
                        style={{ backgroundColor: c }}
                        className="w-4 h-4 rounded-full border border-zinc-700 hover:scale-110 transition shadow-xs"
                      />
                    ))}
                    {chroma.keys.length > 1 && (
                      <button
                        onClick={() => handleRemoveKey(k.id)}
                        className="p-1 text-zinc-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sliders for this key */}
                <div className="space-y-2.5 text-[10px]">
                  {/* Similarity / Tolerance */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Color Similarity (Tolerance)</span>
                      <span className="text-emerald-400 font-mono font-bold">{k.similarity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={k.similarity}
                      onChange={(e) => updateKey(k.id, { similarity: parseInt(e.target.value, 10) })}
                      className="w-full accent-emerald-400 h-1 bg-zinc-800 rounded cursor-pointer"
                    />
                  </div>

                  {/* Smoothness / Feather */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Edge Smoothness / Feather</span>
                      <span className="text-emerald-400 font-mono font-bold">{k.smoothness}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={k.smoothness}
                      onChange={(e) => updateKey(k.id, { smoothness: parseInt(e.target.value, 10) })}
                      className="w-full accent-emerald-400 h-1 bg-zinc-800 rounded cursor-pointer"
                    />
                  </div>

                  {/* Spill Reduction */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Green/Blue Spill Reduction</span>
                      <span className="text-emerald-400 font-mono font-bold">{k.spillReduction}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={k.spillReduction}
                      onChange={(e) => updateKey(k.id, { spillReduction: parseInt(e.target.value, 10) })}
                      className="w-full accent-emerald-400 h-1 bg-zinc-800 rounded cursor-pointer"
                    />
                  </div>

                  {/* Shadow Protection */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Shadow Protection Cutoff</span>
                      <span className="text-emerald-400 font-mono font-bold">{k.shadows}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={k.shadows}
                      onChange={(e) => updateKey(k.id, { shadows: parseInt(e.target.value, 10) })}
                      className="w-full accent-emerald-400 h-1 bg-zinc-800 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Background Replacement Deck */}
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Background Replacement
            </span>

            {/* Background Type Pills */}
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'transparent', label: 'Transparent' },
                { id: 'ai_background', label: 'AI Scenes' },
                { id: 'color', label: 'Solid Color' },
                { id: 'image', label: 'Custom Img' },
              ].map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => updateChroma({ backgroundType: bg.id as ChromaBackgroundType })}
                  className={`py-1 rounded border text-[10px] font-medium transition ${
                    chroma.backgroundType === bg.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {bg.label}
                </button>
              ))}
            </div>

            {/* AI Background Presets Grid */}
            {chroma.backgroundType === 'ai_background' && (
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-400 font-semibold">Curated Generative Scenes</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {AI_BACKGROUND_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => updateChroma({ aiBackgroundPreset: preset.id })}
                      className={`relative rounded-lg overflow-hidden border text-left h-14 group transition ${
                        chroma.aiBackgroundPreset === preset.id
                          ? 'border-cyan-400 ring-2 ring-cyan-500/40'
                          : 'border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <img
                        src={preset.thumbnailUri}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-1 flex flex-col justify-end">
                        <span className="text-[9px] font-bold text-white leading-tight truncate">
                          {preset.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Solid Color Selector */}
            {chroma.backgroundType === 'color' && (
              <div className="flex items-center gap-2 p-2 bg-zinc-900 rounded-lg border border-zinc-800">
                <input
                  type="color"
                  value={chroma.backgroundColor || '#111320'}
                  onChange={(e) => updateChroma({ backgroundColor: e.target.value })}
                  className="w-8 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer p-0"
                />
                <span className="text-xs font-mono text-zinc-200">
                  {chroma.backgroundColor || '#111320'}
                </span>
              </div>
            )}

            {/* Custom Image URL */}
            {chroma.backgroundType === 'image' && (
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400">Background Image URL:</span>
                <input
                  type="text"
                  value={chroma.backgroundImageUri || ''}
                  onChange={(e) => updateChroma({ backgroundImageUri: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-zinc-200 text-[11px] focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
