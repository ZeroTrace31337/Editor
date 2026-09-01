/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Bookmark, Plus, Download, Upload, Trash2, Check, Sparkles } from 'lucide-react';
import { TimelineClip } from '../../domain/timeline/Clip';
import { useEditor } from '../context/EditorContext';
import { PresetManager } from '../../engine/preset/PresetManager';
import { FilterPreset } from '../../domain/preset/Preset';
import { ApplyPresetCommand } from '../../engine/command/implementations/ApplyPresetCommand';

interface PresetsPanelProps {
  clip: TimelineClip;
}

export const PresetsPanel: React.FC<PresetsPanelProps> = ({ clip }) => {
  const { timelineEngine, commandManager } = useEditor();
  const presetManager = PresetManager.getInstance();
  const [presets, setPresets] = useState<FilterPreset[]>(presetManager.getAllPresets());
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetCat, setNewPresetCat] = useState<'cinematic' | 'vintage' | 'vibrant' | 'moody' | 'custom'>('custom');
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const handleApplyPreset = (preset: FilterPreset) => {
    const cmd = new ApplyPresetCommand(timelineEngine, clip.id, preset);
    commandManager.execute(cmd);
    setAppliedId(preset.id);
    setTimeout(() => setAppliedId(null), 1500);
  };

  const handleSaveCurrentLook = () => {
    if (!newPresetName.trim()) return;

    presetManager.saveCustomPreset({
      name: newPresetName.trim(),
      category: newPresetCat as any,
      description: 'Custom user crafted color & effects preset',
      colorGrade: clip.colorGrade,
      effects: clip.effects,
      scope: 'transform_color_effects',
    });
    setPresets(presetManager.getAllPresets());
    setShowSaveModal(false);
    setNewPresetName('');
  };

  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    presetManager.deleteCustomPreset(id);
    setPresets(presetManager.getAllPresets());
  };

  const handleExport = () => {
    const json = presetManager.exportPresetsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lumina_presets.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        presetManager.importPresetsJson(text);
        setPresets(presetManager.getAllPresets());
      } catch (err) {
        alert('Invalid preset JSON file');
      }
    };
    reader.readAsText(file);
  };

  const filteredPresets = presets.filter((p) =>
    selectedCat === 'all' ? true : p.category === selectedCat
  );

  return (
    <div className="space-y-4">
      {/* Header with Save & Import/Export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bookmark className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            Preset Looks
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => setShowSaveModal(true)}
            className="flex items-center space-x-1 px-2 py-1 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 rounded text-xs font-medium transition"
            title="Save current grade & effects as reusable preset"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save Look</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="p-1 text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 hover:bg-zinc-700 rounded transition"
            title="Export Presets to JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <label className="p-1 text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 hover:bg-zinc-700 rounded transition cursor-pointer" title="Import Presets from JSON">
            <Upload className="w-3.5 h-3.5" />
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      {/* Categories */}
      <div className="flex space-x-1 overflow-x-auto pb-1 text-xs">
        {['all', 'cinematic', 'vintage', 'moody', 'vibrant', 'custom'].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCat(cat)}
            className={`px-2.5 py-1 rounded capitalize whitespace-nowrap text-[11px] font-medium transition ${
              selectedCat === cat
                ? 'bg-amber-500 text-black font-semibold'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Presets Grid */}
      <div className="grid grid-cols-1 gap-2.5">
        {filteredPresets.map((preset) => {
          const isApplied = appliedId === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="flex items-start justify-between p-3 rounded-lg bg-zinc-900/90 hover:bg-zinc-800/80 border border-zinc-800 hover:border-amber-500/50 text-left transition group relative overflow-hidden"
            >
              <div className="space-y-1 pr-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-zinc-200 group-hover:text-amber-300">
                    {preset.name}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    {preset.category}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                  {preset.description}
                </p>
              </div>

              <div className="flex items-center space-x-1.5 self-center">
                {isApplied ? (
                  <div className="flex items-center space-x-1 text-emerald-400 text-xs font-medium bg-emerald-950/60 border border-emerald-800 px-2 py-1 rounded">
                    <Check className="w-3.5 h-3.5" />
                    <span>Applied</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-zinc-500 group-hover:text-amber-400 font-medium">
                    Apply
                  </span>
                )}

                {preset.isCustom && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteCustom(preset.id, e)}
                    className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-zinc-700"
                    title="Delete Custom Preset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Save Look Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl p-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Save Look as Preset</h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-zinc-300 font-medium">Preset Name</label>
                <input
                  type="text"
                  placeholder="e.g. Warm Sunset Golden Hour"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="w-full bg-zinc-800 text-zinc-200 border border-zinc-700 rounded px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-300 font-medium">Category</label>
                <select
                  value={newPresetCat}
                  onChange={(e) => setNewPresetCat(e.target.value as any)}
                  className="w-full bg-zinc-800 text-zinc-200 border border-zinc-700 rounded px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="cinematic">Cinematic</option>
                  <option value="vintage">Vintage</option>
                  <option value="vibrant">Vibrant</option>
                  <option value="moody">Moody</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newPresetName.trim()}
                onClick={handleSaveCurrentLook}
                className="px-3 py-1.5 text-xs text-black font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
