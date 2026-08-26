/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useEditor } from '../../context/EditorContext';
import {
  Sliders,
  X,
  Sparkles,
  Sun,
  Eye,
  RotateCcw,
  Check,
} from 'lucide-react';
import { ColorGrade, createDefaultColorGrade } from '../../../domain/color/ColorGrade';
import { UpdateColorGradeCommand } from '../../../engine/command/implementations/UpdateColorGradeCommand';

interface MobileColorFiltersDrawerProps {
  onClose: () => void;
}

const CINEMA_LUTS = [
  {
    id: 'teal_orange',
    name: 'Teal & Orange',
    preview: 'bg-gradient-to-tr from-cyan-900 to-amber-700',
    grade: {
      temperature: 20,
      tint: -15,
      contrast: 1.25,
      saturation: 1.2,
      exposure: 0.1,
      vignette: 0.2,
    },
  },
  {
    id: 'moody_black',
    name: 'Moody Monochrome',
    preview: 'bg-gradient-to-tr from-zinc-900 to-zinc-600',
    grade: {
      saturation: 0,
      contrast: 1.35,
      exposure: -0.1,
      whites: 20,
      blacks: -20,
      grain: 15,
    },
  },
  {
    id: 'vintage_warm',
    name: 'Vintage Film 70s',
    preview: 'bg-gradient-to-tr from-amber-900 to-rose-700',
    grade: {
      temperature: 35,
      tint: 10,
      contrast: 0.95,
      fade: 25,
      grain: 20,
      vignette: 0.3,
    },
  },
  {
    id: 'cyberpunk_neon',
    name: 'Cyberpunk Neon',
    preview: 'bg-gradient-to-tr from-purple-900 to-cyan-700',
    grade: {
      temperature: -25,
      tint: 30,
      contrast: 1.3,
      saturation: 1.4,
      vibrance: 25,
    },
  },
  {
    id: 'clean_vivid',
    name: 'Clean Vivid Pop',
    preview: 'bg-gradient-to-tr from-blue-700 to-emerald-600',
    grade: {
      temperature: 0,
      tint: 0,
      contrast: 1.15,
      saturation: 1.3,
      clarity: 15,
      exposure: 0.15,
    },
  },
];

export const MobileColorFiltersDrawer: React.FC<MobileColorFiltersDrawerProps> = ({ onClose }) => {
  const {
    timelineEngine,
    commandManager,
    selectedClipId,
    selectedClip,
  } = useEditor();

  const [activeTab, setActiveTab] = useState<'luts' | 'adjust'>('luts');
  const [grade, setGrade] = useState<ColorGrade>(() => {
    return selectedClip?.colorGrade ? { ...selectedClip.colorGrade } : createDefaultColorGrade();
  });

  useEffect(() => {
    if (selectedClip?.colorGrade) {
      setGrade({ ...selectedClip.colorGrade });
    }
  }, [selectedClip]);

  const applyGrade = (newGrade: ColorGrade) => {
    setGrade(newGrade);
    if (!selectedClipId) return;
    try {
      const cmd = new UpdateColorGradeCommand(timelineEngine, selectedClipId, newGrade);
      commandManager.execute(cmd);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleLutClick = (lut: typeof CINEMA_LUTS[0]) => {
    const updated = {
      ...createDefaultColorGrade(),
      ...lut.grade,
    };
    applyGrade(updated);
  };

  const handleReset = () => {
    applyGrade(createDefaultColorGrade());
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0d17] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-sm">Color Grade & Cinema LUTs</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs flex items-center gap-1"
            title="Reset to default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center p-2 border-b border-zinc-850 gap-2 shrink-0">
        <button
          onClick={() => setActiveTab('luts')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'luts'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
              : 'text-zinc-400 hover:bg-zinc-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Cinema LUT Presets</span>
        </button>

        <button
          onClick={() => setActiveTab('adjust')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'adjust'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
              : 'text-zinc-400 hover:bg-zinc-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Manual Sliders</span>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'luts' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {CINEMA_LUTS.map((lut) => (
              <button
                key={lut.id}
                onClick={() => handleLutClick(lut)}
                className="group relative rounded-xl overflow-hidden border border-zinc-800 hover:border-amber-500/60 transition active:scale-95 flex flex-col"
              >
                <div className={`aspect-[16/10] ${lut.preview} flex items-center justify-center p-2`}>
                  <span className="text-xs font-extrabold text-white drop-shadow-md text-center">
                    {lut.name}
                  </span>
                </div>
                <div className="p-2 bg-zinc-900 text-center">
                  <span className="text-[10px] text-zinc-400 font-medium">1-Tap Apply</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4 max-w-lg mx-auto">
            {/* Exposure */}
            <div>
              <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
                <span>Exposure (EV)</span>
                <span className="font-mono text-cyan-400">{grade.exposure?.toFixed(2) || 0}</span>
              </div>
              <input
                type="range"
                min={-3}
                max={3}
                step={0.1}
                value={grade.exposure || 0}
                onChange={(e) => applyGrade({ ...grade, exposure: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Contrast */}
            <div>
              <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
                <span>Contrast</span>
                <span className="font-mono text-cyan-400">{grade.contrast?.toFixed(2) || 1}</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.05}
                value={grade.contrast ?? 1}
                onChange={(e) => applyGrade({ ...grade, contrast: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
                <span>Saturation</span>
                <span className="font-mono text-cyan-400">{grade.saturation?.toFixed(2) || 1}</span>
              </div>
              <input
                type="range"
                min={0}
                max={2.0}
                step={0.05}
                value={grade.saturation ?? 1}
                onChange={(e) => applyGrade({ ...grade, saturation: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Temperature */}
            <div>
              <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
                <span>Temperature (Warm / Cool)</span>
                <span className="font-mono text-amber-400">{grade.temperature || 0}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                step={1}
                value={grade.temperature || 0}
                onChange={(e) => applyGrade({ ...grade, temperature: parseInt(e.target.value, 10) })}
                className="w-full accent-amber-400"
              />
            </div>

            {/* Tint */}
            <div>
              <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
                <span>Tint (Green / Magenta)</span>
                <span className="font-mono text-pink-400">{grade.tint || 0}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                step={1}
                value={grade.tint || 0}
                onChange={(e) => applyGrade({ ...grade, tint: parseInt(e.target.value, 10) })}
                className="w-full accent-pink-400"
              />
            </div>

            {/* Vignette */}
            <div>
              <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
                <span>Vignette Falloff</span>
                <span className="font-mono text-zinc-400">{((grade.vignette || 0) * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={grade.vignette || 0}
                onChange={(e) => applyGrade({ ...grade, vignette: parseFloat(e.target.value) })}
                className="w-full accent-zinc-400"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
