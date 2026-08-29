/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Palette,
  RotateCcw,
  Sliders,
  Film,
  Sparkles,
  Activity,
  Shield,
  Eye,
  EyeOff,
  Power,
  Copy,
  ClipboardPaste,
  Download,
  Upload,
} from 'lucide-react';
import { TimelineClip } from '../../domain/timeline/Clip';
import { useEditor } from '../context/EditorContext';
import { ColorGrade, createDefaultColorGrade, ColorWheelValue } from '../../domain/color/ColorGrade';
import { UpdateColorGradeCommand } from '../../engine/command/implementations/UpdateColorGradeCommand';
import { LutEngine } from '../../rendering/color/LutEngine';
import { ColorEngine } from '../../rendering/color/ColorEngine';
import { KeyframeControl } from './KeyframeControl';
import { ToneCurvesEditor } from '../color/ToneCurvesEditor';
import { ColorWheelsView } from '../color/ColorWheelsView';
import { HslColorBandsView } from '../color/HslColorBandsView';
import { MasksPanel } from './MasksPanel';

interface ColorPanelProps {
  clip?: TimelineClip;
}

export const ColorPanel: React.FC<ColorPanelProps> = ({ clip: propClip }) => {
  const {
    timelineEngine,
    commandManager,
    selectedClip,
    isBeforeAfterActive,
    toggleBeforeAfter,
    copiedColorGrade,
    copyColorGrade,
    pasteColorGrade,
  } = useEditor();
  const clip = propClip || selectedClip;

  const [activeSubTab, setActiveSubTab] = useState<'basic' | 'curves' | 'wheels' | 'lut' | 'hsl' | 'masks'>('wheels');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!clip) {
    return (
      <div className="p-6 text-center text-zinc-500 text-xs">
        <Palette className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
        <p>Select a video or image clip on the timeline to perform color grading.</p>
      </div>
    );
  }

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

  const handleExportLut = () => {
    try {
      const cubeContent = ColorEngine.exportGradeToCube(grade, 33, `VeeCut_${clip.name || 'Grade'}`);
      const blob = new Blob([cubeContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(clip.name || 'custom_grade').replace(/\.[^/.]+$/, '')}.cube`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export .cube LUT:', err);
    }
  };

  const handleLutUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        try {
          const lutId = `custom_lut_${Date.now()}`;
          const cleanName = file.name.replace(/\.cube$/i, '');
          const parsedLut = lutEngine.parseCubeString(text, lutId, cleanName);
          lutEngine.registerLut(parsedLut);
          updateGrade({ lutId, lutEnabled: true });
        } catch (err) {
          console.error('Failed to parse .cube LUT file:', err);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const isMasterGradeEnabled = grade.colorGradeEnabled !== false;

  return (
    <div className="space-y-3 select-none">
      {/* Top Header: Power toggle, Copy/Paste, B/A, and Reset */}
      <div className="flex items-center justify-between bg-zinc-900/90 border border-zinc-800 p-2 rounded-lg">
        <div className="flex items-center space-x-2">
          {/* Master Grade Power Toggle */}
          <button
            type="button"
            onClick={() => updateGrade({ colorGradeEnabled: !isMasterGradeEnabled })}
            className={`p-1 rounded-md transition ${
              isMasterGradeEnabled
                ? 'text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300'
                : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
            }`}
            title={isMasterGradeEnabled ? 'Disable Color Grade (Bypass)' : 'Enable Color Grade'}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-semibold text-zinc-200">Color Grade</span>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Copy Grade */}
          <button
            type="button"
            onClick={() => copyColorGrade(clip.id)}
            className="flex items-center space-x-1 px-2 py-1 text-[10px] font-medium text-zinc-400 hover:text-white bg-zinc-800 rounded hover:bg-zinc-700 transition"
            title="Copy current clip's color grade"
          >
            <Copy className="w-3 h-3" />
            <span>Copy</span>
          </button>

          {/* Paste Grade */}
          <button
            type="button"
            onClick={() => pasteColorGrade(clip.id)}
            disabled={!copiedColorGrade}
            className={`flex items-center space-x-1 px-2 py-1 text-[10px] font-medium transition rounded ${
              copiedColorGrade
                ? 'text-purple-300 hover:text-white bg-purple-950/50 hover:bg-purple-900/60 border border-purple-800/50'
                : 'text-zinc-600 bg-zinc-800/40 cursor-not-allowed opacity-50'
            }`}
            title={copiedColorGrade ? 'Paste copied color grade to this clip' : 'No color grade copied'}
          >
            <ClipboardPaste className="w-3 h-3" />
            <span>Paste</span>
          </button>

          {/* Before/After Toggle */}
          <button
            type="button"
            onClick={toggleBeforeAfter}
            className={`flex items-center space-x-1 px-2 py-1 text-[10px] font-medium transition rounded ${
              isBeforeAfterActive
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
            }`}
            title="Toggle Before / After Preview Bypass (Press \)"
          >
            {isBeforeAfterActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span>{isBeforeAfterActive ? 'Bypass' : 'B/A'}</span>
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center space-x-1 px-2 py-1 text-[10px] font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded transition"
            title="Reset All Color Grading to Default"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Top Navigation Subtabs */}
      <div className="flex items-center space-x-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-[11px] overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('basic')}
          className={`flex-1 py-1 font-medium rounded transition text-center ${
            activeSubTab === 'basic'
              ? 'bg-zinc-800 text-white shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Basic
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('wheels')}
          className={`flex-1 py-1 font-medium rounded transition text-center ${
            activeSubTab === 'wheels'
              ? 'bg-zinc-800 text-purple-400 font-bold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Wheels
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('curves')}
          className={`flex-1 py-1 font-medium rounded transition text-center ${
            activeSubTab === 'curves'
              ? 'bg-zinc-800 text-cyan-400 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Curves
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('hsl')}
          className={`flex-1 py-1 font-medium rounded transition text-center ${
            activeSubTab === 'hsl'
              ? 'bg-zinc-800 text-pink-400 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          HSL
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('lut')}
          className={`flex-1 py-1 font-medium rounded transition text-center ${
            activeSubTab === 'lut'
              ? 'bg-zinc-800 text-emerald-400 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          LUT
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

          {/* Brilliance */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Brilliance</span>
              <div className="flex items-center space-x-2">
                <span className="text-zinc-300 font-mono">
                  {(grade.brilliance || 0) > 0 ? `+${(grade.brilliance || 0).toFixed(0)}` : (grade.brilliance || 0).toFixed(0)}
                </span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="colorGrade.brilliance"
                  propertyName="Brilliance"
                  currentValue={grade.brilliance || 0}
                />
              </div>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={grade.brilliance || 0}
              onChange={(e) => updateGrade({ brilliance: parseFloat(e.target.value) })}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Brightness */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Brightness</span>
              <div className="flex items-center space-x-2">
                <span className="text-zinc-300 font-mono">{(grade.brightness || 0).toFixed(2)}</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="colorGrade.brightness"
                  propertyName="Brightness"
                  currentValue={grade.brightness || 0}
                />
              </div>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.02"
              value={grade.brightness || 0}
              onChange={(e) => updateGrade({ brightness: parseFloat(e.target.value) })}
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

          {/* Highlights & Shadows */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Highlights</span>
                <span className="text-zinc-300 font-mono">{(grade.highlights || 0).toFixed(0)}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={grade.highlights || 0}
                onChange={(e) => updateGrade({ highlights: parseFloat(e.target.value) })}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Shadows</span>
                <span className="text-zinc-300 font-mono">{(grade.shadows || 0).toFixed(0)}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={grade.shadows || 0}
                onChange={(e) => updateGrade({ shadows: parseFloat(e.target.value) })}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* Whites & Blacks */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Whites</span>
                <span className="text-zinc-300 font-mono">{(grade.whites || 0).toFixed(0)}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={grade.whites || 0}
                onChange={(e) => updateGrade({ whites: parseFloat(e.target.value) })}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Blacks</span>
                <span className="text-zinc-300 font-mono">{(grade.blacks || 0).toFixed(0)}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={grade.blacks || 0}
                onChange={(e) => updateGrade({ blacks: parseFloat(e.target.value) })}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Film className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                3D Look Up Tables (.cube)
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              {/* Export Grade as .cube */}
              <button
                type="button"
                onClick={handleExportLut}
                className="flex items-center space-x-1 px-2 py-1 text-[10px] font-semibold text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 rounded transition shadow-xs"
                title="Export active color grade as standard 3D .cube LUT"
              >
                <Download className="w-3 h-3 text-emerald-400" />
                <span>Export LUT</span>
              </button>

              {/* Import .cube file */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".cube"
                onChange={handleLutUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-1 px-2 py-1 text-[10px] font-semibold text-white bg-emerald-600/90 hover:bg-emerald-600 rounded transition shadow-xs"
                title="Import .cube 3D LUT from computer"
              >
                <Upload className="w-3 h-3" />
                <span>Import</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
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
                  onClick={() => updateGrade({ lutId: lut.id, lutEnabled: true })}
                  className={`p-2.5 rounded-lg border text-left text-xs transition ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-semibold flex items-center justify-between">
                    <span>{lut.title || lut.name}</span>
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
