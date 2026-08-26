/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Film,
  Monitor,
  Smartphone,
  Square,
  Instagram,
  ArrowRight,
  Sliders,
  Check,
} from 'lucide-react';
import { CANVAS_PRESETS, CanvasPreset } from './homeData';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (config: {
    name: string;
    width: number;
    height: number;
    fps: number;
    aspectRatio: string;
    colorSpace: string;
  }) => void;
  initialPreset?: CanvasPreset | null;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
  initialPreset,
}) => {
  const [projectName, setProjectName] = useState('Untitled Project');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    initialPreset ? initialPreset.id : 'preset_youtube'
  );
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [selectedFps, setSelectedFps] = useState<number>(60);
  const [selectedResolutionTier, setSelectedResolutionTier] = useState<'1080p' | '4k' | 'custom'>('1080p');
  const [colorSpace, setColorSpace] = useState('Rec.709');

  if (!isOpen) return null;

  const currentPreset = CANVAS_PRESETS.find((p) => p.id === selectedPresetId) || CANVAS_PRESETS[0];

  const handleCreate = () => {
    let finalWidth = currentPreset.width;
    let finalHeight = currentPreset.height;

    if (selectedPresetId === 'preset_custom') {
      finalWidth = customWidth;
      finalHeight = customHeight;
    } else if (selectedResolutionTier === '4k') {
      if (currentPreset.aspectRatio === '16:9') {
        finalWidth = 3840;
        finalHeight = 2160;
      } else if (currentPreset.aspectRatio === '9:16') {
        finalWidth = 2160;
        finalHeight = 3840;
      }
    }

    onCreateProject({
      name: projectName.trim() || 'Untitled Project',
      width: finalWidth,
      height: finalHeight,
      fps: selectedFps,
      aspectRatio: currentPreset.aspectRatio,
      colorSpace,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#12141d] border border-zinc-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create New Project</h2>
              <p className="text-xs text-zinc-400">Configure canvas sequence settings and color space</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Project Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Cinematic Travel Vlog 2026"
              className="w-full bg-zinc-900 border border-zinc-750 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-white font-medium focus:outline-none transition"
              autoFocus
            />
          </div>

          {/* Aspect Ratio Presets */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Aspect Ratio & Format
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {CANVAS_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-xs'
                        : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-cyan-400 text-black flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                    <span className="text-xs font-bold text-zinc-200">{preset.ratioText}</span>
                    <span className="text-[11px] text-zinc-400 truncate w-full mt-0.5">
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom dimensions if custom selected */}
          {selectedPresetId === 'preset_custom' && (
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 font-mono">Width (px)</label>
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 font-mono">Height (px)</label>
                <input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          )}

          {/* Resolution Tier & Frame Rate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Resolution Quality
              </label>
              <div className="flex rounded-lg bg-zinc-900 p-1 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSelectedResolutionTier('1080p')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
                    selectedResolutionTier === '1080p'
                      ? 'bg-zinc-800 text-cyan-400 shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  1080p FHD
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedResolutionTier('4k')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
                    selectedResolutionTier === '4k'
                      ? 'bg-zinc-800 text-cyan-400 shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  4K UHD
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Frame Rate (FPS)
              </label>
              <select
                value={selectedFps}
                onChange={(e) => setSelectedFps(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white font-medium focus:outline-none"
              >
                <option value={24}>24 FPS (Cinematic standard)</option>
                <option value={25}>25 FPS (PAL standard)</option>
                <option value={30}>30 FPS (Web & Social)</option>
                <option value={60}>60 FPS (Ultra Smooth)</option>
                <option value={120}>120 FPS (High Frame Rate)</option>
              </select>
            </div>
          </div>

          {/* Color Space */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Color Space Management
            </label>
            <select
              value={colorSpace}
              onChange={(e) => setColorSpace(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white font-medium focus:outline-none"
            >
              <option value="Rec.709">Rec.709 (SDR Standard Web & YouTube)</option>
              <option value="DCI-P3">DCI-P3 (Wide Color Gamut Cinema)</option>
              <option value="Rec.2020 HDR">Rec.2020 / HDR10 (High Dynamic Range)</option>
              <option value="Apple Log">Apple Log / ACEScc</option>
            </select>
          </div>
        </div>

        {/* Footer CTAs */}
        <div className="px-6 py-4 bg-zinc-950/80 border-t border-zinc-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-850 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-xs shadow-md shadow-cyan-400/20 active:scale-95 transition cursor-pointer"
          >
            <span>Create & Launch Studio</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
