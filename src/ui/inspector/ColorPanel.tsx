/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Palette, RotateCcw, Sliders, Film, Sparkles, Activity, Shield } from 'lucide-react';
import { TimelineClip } from '../../domain/timeline/Clip';
import { useEditor } from '../context/EditorContext';
import { ColorGrade, createDefaultColorGrade, ColorWheelValue } from '../../domain/color/ColorGrade';
import { UpdateColorGradeCommand } from '../../engine/command/implementations/UpdateColorGradeCommand';
import { LutEngine } from '../../rendering/color/LutEngine';
import { KeyframeControl } from './KeyframeControl';
import { ToneCurvesEditor } from '../color/ToneCurvesEditor';
import { ColorWheelsView } from '../color/ColorWheelsView';
import { HslColorBandsView } from '../color/HslColorBandsView';
import { MasksPanel } from './MasksPanel';

interface ColorPanelProps {
  clip: TimelineClip;
}

export const ColorPanel: React.FC<ColorPanelProps> = ({ clip }) => {
  const { timelineEngine, commandManager } = useEditor();
  const [activeSubTab, setActiveSubTab] = useState<'basic' | 'curves' | 'wheels' | 'lut' | 'hsl' | 'masks'>('wheels');

  const grade = clip.colorGrade || createDefaultColorGrade();
  const lutEngine = LutEngine.getInstance();
  const allLuts = lutEngine.getAllLuts();

  const updateGrade = (newGrade: Partial<ColorGrade>) => {
    const merged: ColorGrade = {
      ...grade,
      ...newGrade,
    };
    const cmd = new UpdateColorGradeCommand(timelineEngine, clip.id, merged);
    commandManager.execute(cmd);
  };

  const handleReset = () => {
    const cmd = new UpdateColorGradeCommand(timelineEngine, clip.id, createDefaultColorGrade());
    commandManager.execute(cmd);
  };

  return (
    <div className="space-y-3.5 select-none">
      {/* Top Navigation Subtabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-[11px] overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('basic')}
            className={`px-2 py-1 font-medium rounded transition whitespace-nowrap ${
              activeSubTab === 'basic'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Basic
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('curves')}
            className={`px-2 py-1 font-medium rounded transition whitespace-nowrap ${
              activeSubTab === 'curves'
                ? 'bg-zinc-800 text-cyan-400 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Curves
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('wheels')}
            className={`px-2 py-1 font-medium rounded transition whitespace-nowrap ${
              activeSubTab === 'wheels'
                ? 'bg-zinc-800 text-purple-400 font-bold shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Color Wheels
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('lut')}
            className={`px-2 py-1 font-medium rounded transition whitespace-nowrap ${
              activeSubTab === 'lut'
                ? 'bg-zinc-800 text-emerald-400 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            LUT
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('hsl')}
            className={`px-2 py-1 font-medium rounded transition whitespace-nowrap ${
              activeSubTab === 'hsl'
                ? 'bg-zinc-800 text-pink-400 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            HSL
          </button>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="flex items-center space-x-1 px-2 py-1 text-[11px] font-medium text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded transition"
          title="Reset All Color Grading to Default"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* 1. Basic Controls */}
      {activeSubTab === 'basic' && (
        <div className="space-y-3.5 bg-zinc-900/90 border border-zinc-800 rounded-lg p-3.5">
          {/* Exposure */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Exposure</span>
              <div className="flex items-center space-x-2">
                <span className="text-zinc-300 font-mono">
                  {grade.exposure > 0 ? `+${(grade.exposure || 0).toFixed(2)}` : (grade.exposure || 0).toFixed(2)} EV
                </span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="colorGrade.exposure"
                  propertyName="Exposure"
                  currentValue={grade.exposure || 0}
                />
              </div>
            </div>
            <input
              type="range"
              min="-4"
              max="4"
              step="0.05"
              value={grade.exposure || 0}
              onChange={(e) => updateGrade({ exposure: parseFloat(e.target.value) })}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Contrast */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Contrast</span>
              <div className="flex items-center space-x-2">
                <span className="text-zinc-300 font-mono">{(grade.contrast ?? 1.0).toFixed(2)}</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="colorGrade.contrast"
                  propertyName="Contrast"
                  currentValue={grade.contrast ?? 1.0}
                />
              </div>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.02"
              value={grade.contrast ?? 1.0}
              onChange={(e) => updateGrade({ contrast: parseFloat(e.target.value) })}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Saturation */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Saturation</span>
              <div className="flex items-center space-x-2">
                <span className="text-zinc-300 font-mono">{(grade.saturation ?? 1.0).toFixed(2)}</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="colorGrade.saturation"
                  propertyName="Saturation"
                  currentValue={grade.saturation ?? 1.0}
                />
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="2.5"
              step="0.05"
              value={grade.saturation ?? 1.0}
              onChange={(e) => updateGrade({ saturation: parseFloat(e.target.value) })}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Vibrance */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Vibrance</span>
              <span className="text-zinc-300 font-mono">{(grade.vibrance || 0).toFixed(0)}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={grade.vibrance || 0}
              onChange={(e) => updateGrade({ vibrance: parseFloat(e.target.value) })}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Temperature */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Temperature</span>
              <div className="flex items-center space-x-2">
                <span className="text-zinc-300 font-mono">{(grade.temperature || 0).toFixed(0)}</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="colorGrade.temperature"
                  propertyName="Color Temp"
                  currentValue={grade.temperature || 0}
                />
              </div>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={grade.temperature || 0}
              onChange={(e) => updateGrade({ temperature: parseFloat(e.target.value) })}
              className="w-full h-1 bg-gradient-to-r from-blue-500 via-zinc-700 to-amber-500 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Tint */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Tint</span>
              <div className="flex items-center space-x-2">
                <span className="text-zinc-300 font-mono">{(grade.tint || 0).toFixed(0)}</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="colorGrade.tint"
                  propertyName="Tint"
                  currentValue={grade.tint || 0}
                />
              </div>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={grade.tint || 0}
              onChange={(e) => updateGrade({ tint: parseFloat(e.target.value) })}
              className="w-full h-1 bg-gradient-to-r from-green-500 via-zinc-700 to-pink-500 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Vignette */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Vignette</span>
              <span className="text-zinc-300 font-mono">{((grade.vignette || 0) * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={grade.vignette || 0}
              onChange={(e) => updateGrade({ vignette: parseFloat(e.target.value) })}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>
      )}

      {/* 2. Color Wheels */}
      {activeSubTab === 'wheels' && <ColorWheelsView clip={clip} />}

      {/* 3. Tone Curves */}
      {activeSubTab === 'curves' && <ToneCurvesEditor clip={clip} />}

      {/* 4. 8-Band HSL */}
      {activeSubTab === 'hsl' && <HslColorBandsView clip={clip} />}

      {/* 5. 3D LUT Browser */}
      {activeSubTab === 'lut' && (
        <div className="space-y-3.5 bg-zinc-900/90 border border-zinc-800 rounded-lg p-3.5">
          <div className="flex items-center space-x-2">
            <Film className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              3D Look Up Tables (.cube)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => updateGrade({ lutId: undefined })}
              className={`p-2.5 rounded-lg border text-left text-xs transition ${
                !grade.lutId
                  ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="font-semibold">None (Native Grade)</div>
              <div className="text-[10px] text-zinc-500">Passthrough with no 3D LUT applied</div>
            </button>

            {allLuts.map((lut) => {
              const isSelected = grade.lutId === lut.id;
              return (
                <button
                  key={lut.id}
                  type="button"
                  onClick={() => updateGrade({ lutId: lut.id })}
                  className={`p-2.5 rounded-lg border text-left text-xs transition ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-semibold flex items-center justify-between">
                    <span>{lut.name}</span>
                    <span className="text-[10px] font-mono opacity-60">{lut.size}×{lut.size}×{lut.size}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500">{(lut as any).description || `${lut.size}×${lut.size}×${lut.size} 3D Color Cube`}</div>
                </button>
              );
            })}
          </div>

          {/* LUT Intensity Slider */}
          {grade.lutId && (
            <div className="space-y-1 pt-2 border-t border-zinc-800">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">LUT Mix Intensity</span>
                <span className="text-zinc-300 font-mono">
                  {((grade.lutIntensity ?? 1.0) * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={grade.lutIntensity ?? 1.0}
                onChange={(e) => updateGrade({ lutIntensity: parseFloat(e.target.value) })}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          )}
        </div>
      )}

      {/* 6. Masks Panel */}
      {activeSubTab === 'masks' && <MasksPanel clip={clip} />}
    </div>
  );
};
