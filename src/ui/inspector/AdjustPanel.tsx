/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Sun,
  Palette,
  Sparkles,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Diamond,
  Eye,
  EyeOff,
  Upload,
  Film,
  Sliders,
  CheckCircle2,
  Trash2,
  Copy,
  ClipboardPaste,
  Download,
  Power,
} from 'lucide-react';
import { TimelineClip } from '../../domain/timeline/Clip';
import { useEditor } from '../context/EditorContext';
import {
  ColorGrade,
  createDefaultColorGrade,
  createDefaultHslColorGrade,
  HslBand,
  HslColorGrade,
} from '../../domain/color/ColorGrade';
import { UpdateColorGradeCommand } from '../../engine/command/implementations/UpdateColorGradeCommand';
import { LutEngine } from '../../rendering/color/LutEngine';
import { ColorEngine } from '../../rendering/color/ColorEngine';
import { KeyframeControl } from './KeyframeControl';
import { ToneCurvesEditor } from '../color/ToneCurvesEditor';
import { ColorWheelsView } from '../color/ColorWheelsView';
import { HslColorBandsView } from '../color/HslColorBandsView';

interface AdjustPanelProps {
  clip?: TimelineClip;
}

interface AdjustmentRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
  formatDecimals?: number;
  isRainbowTrack?: boolean;
  isTempTrack?: boolean;
  isTintTrack?: boolean;
  propertyPath?: string;
  clip?: TimelineClip;
  onChange: (val: number) => void;
}

const AdjustmentRow: React.FC<AdjustmentRowProps> = ({
  label,
  value,
  min,
  max,
  step,
  defaultValue,
  unit = '',
  formatDecimals = 2,
  isRainbowTrack = false,
  isTempTrack = false,
  isTintTrack = false,
  propertyPath,
  clip,
  onChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempText, setTempText] = useState('');

  const displayVal = formatDecimals > 0 ? value.toFixed(formatDecimals) : Math.round(value).toString();

  const handleDoubleClick = () => {
    onChange(defaultValue);
  };

  const handleTextSubmit = () => {
    setIsEditing(false);
    const parsed = parseFloat(tempText);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
    }
  };

  let trackStyle: React.CSSProperties | undefined;
  if (isRainbowTrack) {
    trackStyle = {
      background: 'linear-gradient(to right, #ff0000, #ff7f00, #ffff00, #00ff00, #00ffff, #0000ff, #8b00ff, #ff00ff, #ff0000)',
    };
  } else if (isTempTrack) {
    trackStyle = {
      background: 'linear-gradient(to right, #38bdf8, #64748b, #fbbf24)',
    };
  } else if (isTintTrack) {
    trackStyle = {
      background: 'linear-gradient(to right, #22c55e, #64748b, #ec4899)',
    };
  }

  return (
    <div className="flex items-center justify-between py-1 text-xs select-none group">
      {/* Label (double-click resets) */}
      <span
        onDoubleClick={handleDoubleClick}
        title="Double-click to reset"
        className="w-24 text-zinc-300 font-medium text-[11px] truncate cursor-pointer hover:text-white transition"
      >
        {label}
      </span>

      {/* Slider */}
      <div className="flex-1 mx-2 flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onDoubleClick={handleDoubleClick}
          style={trackStyle}
          className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${
            trackStyle ? 'h-1.5' : 'bg-zinc-800 accent-purple-500'
          }`}
        />
      </div>

      {/* Numerical Value Readout (clickable to edit) */}
      <div className="w-14 text-right font-mono text-[11px] text-zinc-200">
        {isEditing ? (
          <input
            type="number"
            step={step}
            min={min}
            max={max}
            value={tempText}
            autoFocus
            onChange={(e) => setTempText(e.target.value)}
            onBlur={handleTextSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTextSubmit();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            className="w-full bg-zinc-900 border border-purple-500 rounded px-1 text-right text-xs text-white outline-hidden font-mono"
          />
        ) : (
          <span
            onClick={() => {
              setTempText(displayVal);
              setIsEditing(true);
            }}
            onDoubleClick={handleDoubleClick}
            title="Click to edit, double-click to reset"
            className="cursor-pointer hover:text-purple-300 transition"
          >
            {value > 0 && (unit === 'EV' || unit === 'dB' || isTempTrack || isTintTrack) ? `+${displayVal}` : displayVal}
            {unit}
          </span>
        )}
      </div>

      {/* Keyframe Diamond Indicator */}
      {propertyPath && (
        <div className="ml-1">
          <KeyframeControl
            clip={clip}
            propertyPath={propertyPath}
            propertyName={label}
            currentValue={value}
          />
        </div>
      )}
    </div>
  );
};

export const AdjustPanel: React.FC<AdjustPanelProps> = ({ clip: propClip }) => {
  const {
    timelineEngine,
    commandManager,
    isBeforeAfterActive,
    toggleBeforeAfter,
    selectedClip,
    copiedColorGrade,
    copyColorGrade,
    pasteColorGrade,
  } = useEditor();
  const clip = propClip || selectedClip;

  const [subTab, setSubTab] = useState<'basic' | 'light' | 'color' | 'detail' | 'hsl' | 'curves' | 'wheels' | 'lut'>('basic');
  const [openSections, setOpenSections] = useState({
    light: true,
    color: true,
    detail: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lutEngine = LutEngine.getInstance();
  const allLuts = lutEngine.getAllLuts();

  if (!clip) {
    return (
      <div className="p-6 text-center text-zinc-500 text-xs">
        <Sun className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
        <p>Select a video or image clip on the timeline to adjust lighting, color, and LUTs.</p>
      </div>
    );
  }

  const grade: ColorGrade = clip.colorGrade || createDefaultColorGrade();

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const updateGradeParam = (param: keyof ColorGrade, val: any) => {
    const updated: ColorGrade = {
      ...grade,
      [param]: val,
    };
    const cmd = new UpdateColorGradeCommand(timelineEngine, clip.id, updated);
    commandManager.execute(cmd);
  };

  const handleResetAll = () => {
    const def = createDefaultColorGrade();
    const cmd = new UpdateColorGradeCommand(timelineEngine, clip.id, def);
    commandManager.execute(cmd);
  };

  const handleResetSection = (section: 'light' | 'color' | 'detail') => {
    const def = createDefaultColorGrade();
    let updated = { ...grade };
    if (section === 'light') {
      updated.exposure = def.exposure;
      updated.contrast = def.contrast;
      updated.brightness = def.brightness;
      updated.brilliance = def.brilliance;
      updated.highlights = def.highlights;
      updated.shadows = def.shadows;
      updated.whites = def.whites;
      updated.blacks = def.blacks;
      updated.fade = def.fade;
    } else if (section === 'color') {
      updated.saturation = def.saturation;
      updated.vibrance = def.vibrance;
      updated.temperature = def.temperature;
      updated.tint = def.tint;
      updated.hue = def.hue;
    } else if (section === 'detail') {
      updated.sharpen = def.sharpen;
      updated.clarity = def.clarity;
      updated.noiseReduction = def.noiseReduction;
      updated.grain = def.grain;
      updated.vignette = def.vignette;
    }
    const cmd = new UpdateColorGradeCommand(timelineEngine, clip.id, updated);
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
          updateGradeParam('lutId', lutId);
          updateGradeParam('lutEnabled', true);
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
    <div className="flex flex-col h-full bg-[#0d0f19] text-zinc-300 select-none overflow-hidden">
      {/* 1. Header Toolbar with Master Grade Switch, Before/After, Copy/Paste, and Reset All */}
      <div className="px-3 py-2 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/40">
        <div className="flex items-center gap-2">
          {/* Master Grade Power Toggle */}
          <button
            type="button"
            onClick={() => updateGradeParam('colorGradeEnabled', !isMasterGradeEnabled)}
            className={`p-1 rounded-md transition ${
              isMasterGradeEnabled
                ? 'text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300'
                : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
            }`}
            title={isMasterGradeEnabled ? 'Disable Color Grade (Bypass)' : 'Enable Color Grade'}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-bold text-white tracking-wide">Color & Adjustments</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Copy Grade */}
          <button
            type="button"
            onClick={() => copyColorGrade(clip.id)}
            className="flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-medium text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 transition"
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
            className={`flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-medium transition ${
              copiedColorGrade
                ? 'text-purple-300 hover:text-white bg-purple-950/50 hover:bg-purple-900/60 border border-purple-800/50'
                : 'text-zinc-600 bg-zinc-900 cursor-not-allowed opacity-50'
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
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition ${
              isBeforeAfterActive
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
            }`}
            title="Toggle Before / After Preview Bypass (Press \)"
          >
            {isBeforeAfterActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span>{isBeforeAfterActive ? 'Bypass' : 'B/A'}</span>
          </button>

          {/* Reset All */}
          <button
            type="button"
            onClick={handleResetAll}
            className="flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-medium text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 transition"
            title="Reset All Adjustments & Color to Neutral"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 2. Sub-Category Tabs: Basic, Light, Color, Detail, HSL, Curves, Wheels, LUT */}
      <div className="p-2 border-b border-zinc-800/80 bg-zinc-950/20">
        <div className="flex items-center gap-1 bg-zinc-950/80 p-0.5 rounded-lg border border-zinc-850 text-[11px] font-medium overflow-x-auto">
          {(
            [
              { id: 'basic', label: 'Basic' },
              { id: 'light', label: 'Light' },
              { id: 'color', label: 'Color' },
              { id: 'detail', label: 'Detail' },
              { id: 'hsl', label: 'HSL' },
              { id: 'curves', label: 'Curves' },
              { id: 'wheels', label: 'Wheels' },
              { id: 'lut', label: 'LUT' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`flex-1 py-1 px-1.5 rounded-md text-center transition-all whitespace-nowrap ${
                subTab === t.id
                  ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Scrollable Adjustment Controls */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* SECTION 1: LIGHT */}
        {(subTab === 'basic' || subTab === 'light') && (
          <div className="rounded-xl border border-zinc-800/80 bg-[#121422] overflow-hidden shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/60 border-b border-zinc-800/60">
              <button
                type="button"
                onClick={() => toggleSection('light')}
                className="flex items-center gap-2 text-xs font-bold text-white hover:text-amber-300 transition"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/60" />
                <span>Light & Exposure</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleResetSection('light')}
                  className="text-zinc-500 hover:text-amber-300 p-0.5 transition"
                  title="Reset Light Adjustments"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleSection('light')}
                  className="text-zinc-500 hover:text-zinc-300 p-0.5 transition"
                >
                  {openSections.light ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Sliders */}
            {openSections.light && (
              <div className="p-3 space-y-1">
                <AdjustmentRow
                  label="Exposure"
                  value={grade.exposure ?? 0}
                  min={-5}
                  max={5}
                  step={0.05}
                  defaultValue={0}
                  unit=" EV"
                  formatDecimals={2}
                  propertyPath="colorGrade.exposure"
                  clip={clip}
                  onChange={(val) => updateGradeParam('exposure', val)}
                />
                <AdjustmentRow
                  label="Brightness"
                  value={grade.brightness ?? 0}
                  min={-1}
                  max={1}
                  step={0.02}
                  defaultValue={0}
                  formatDecimals={2}
                  propertyPath="colorGrade.brightness"
                  clip={clip}
                  onChange={(val) => updateGradeParam('brightness', val)}
                />
                <AdjustmentRow
                  label="Brilliance"
                  value={grade.brilliance ?? 0}
                  min={-100}
                  max={100}
                  step={1}
                  defaultValue={0}
                  formatDecimals={0}
                  propertyPath="colorGrade.brilliance"
                  clip={clip}
                  onChange={(val) => updateGradeParam('brilliance', val)}
                />
                <AdjustmentRow
                  label="Contrast"
                  value={grade.contrast ?? 1.0}
                  min={0}
                  max={2.0}
                  step={0.02}
                  defaultValue={1.0}
                  formatDecimals={2}
                  propertyPath="colorGrade.contrast"
                  clip={clip}
                  onChange={(val) => updateGradeParam('contrast', val)}
                />
                <AdjustmentRow
                  label="Highlights"
                  value={grade.highlights ?? 0}
                  min={-100}
                  max={100}
                  step={1}
                  defaultValue={0}
                  formatDecimals={0}
                  propertyPath="colorGrade.highlights"
                  clip={clip}
                  onChange={(val) => updateGradeParam('highlights', val)}
                />
                <AdjustmentRow
                  label="Shadows"
                  value={grade.shadows ?? 0}
                  min={-100}
                  max={100}
                  step={1}
                  defaultValue={0}
                  formatDecimals={0}
                  propertyPath="colorGrade.shadows"
                  clip={clip}
                  onChange={(val) => updateGradeParam('shadows', val)}
                />
                <AdjustmentRow
                  label="Whites"
                  value={grade.whites ?? 0}
                  min={-100}
                  max={100}
                  step={1}
                  defaultValue={0}
                  formatDecimals={0}
                  propertyPath="colorGrade.whites"
                  clip={clip}
                  onChange={(val) => updateGradeParam('whites', val)}
                />
                <AdjustmentRow
                  label="Blacks"
                  value={grade.blacks ?? 0}
                  min={-100}
                  max={100}
                  step={1}
                  defaultValue={0}
                  formatDecimals={0}
                  propertyPath="colorGrade.blacks"
                  clip={clip}
                  onChange={(val) => updateGradeParam('blacks', val)}
                />
                <AdjustmentRow
                  label="Film Fade"
                  value={grade.fade ?? 0}
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={0}
                  unit="%"
                  formatDecimals={0}
                  propertyPath="colorGrade.fade"
                  clip={clip}
                  onChange={(val) => updateGradeParam('fade', val)}
                />
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: COLOR */}
        {(subTab === 'basic' || subTab === 'color') && (
          <div className="rounded-xl border border-zinc-800/80 bg-[#121422] overflow-hidden shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/60 border-b border-zinc-800/60">
              <button
                type="button"
                onClick={() => toggleSection('color')}
                className="flex items-center gap-2 text-xs font-bold text-white hover:text-purple-300 transition"
              >
                <span className="w-2 h-2 rounded-full bg-purple-400 shadow-sm shadow-purple-400/60" />
                <span>Color & White Balance</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleResetSection('color')}
                  className="text-zinc-500 hover:text-amber-300 p-0.5 transition"
                  title="Reset Color Adjustments"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleSection('color')}
                  className="text-zinc-500 hover:text-zinc-300 p-0.5 transition"
                >
                  {openSections.color ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Sliders */}
            {openSections.color && (
              <div className="p-3 space-y-1">
                <AdjustmentRow
                  label="Saturation"
                  value={grade.saturation ?? 1.0}
                  min={0}
                  max={2.5}
                  step={0.02}
                  defaultValue={1.0}
                  formatDecimals={2}
                  propertyPath="colorGrade.saturation"
                  clip={clip}
                  onChange={(val) => updateGradeParam('saturation', val)}
                />
                <AdjustmentRow
                  label="Vibrance"
                  value={grade.vibrance ?? 0}
                  min={-100}
                  max={100}
                  step={1}
                  defaultValue={0}
                  formatDecimals={0}
                  propertyPath="colorGrade.vibrance"
                  clip={clip}
                  onChange={(val) => updateGradeParam('vibrance', val)}
                />
                <AdjustmentRow
                  label="Temperature"
                  value={grade.temperature ?? 0}
                  min={-100}
                  max={100}
                  step={1}
                  defaultValue={0}
                  formatDecimals={0}
                  isTempTrack
                  propertyPath="colorGrade.temperature"
                  clip={clip}
                  onChange={(val) => updateGradeParam('temperature', val)}
                />
                <AdjustmentRow
                  label="Tint"
                  value={grade.tint ?? 0}
                  min={-100}
                  max={100}
                  step={1}
                  defaultValue={0}
                  formatDecimals={0}
                  isTintTrack
                  propertyPath="colorGrade.tint"
                  clip={clip}
                  onChange={(val) => updateGradeParam('tint', val)}
                />
                <AdjustmentRow
                  label="Hue Angle"
                  value={grade.hue ?? 0}
                  min={-180}
                  max={180}
                  step={1}
                  defaultValue={0}
                  unit="°"
                  formatDecimals={0}
                  isRainbowTrack
                  propertyPath="colorGrade.hue"
                  clip={clip}
                  onChange={(val) => updateGradeParam('hue', val)}
                />
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: DETAIL */}
        {(subTab === 'basic' || subTab === 'detail') && (
          <div className="rounded-xl border border-zinc-800/80 bg-[#121422] overflow-hidden shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/60 border-b border-zinc-800/60">
              <button
                type="button"
                onClick={() => toggleSection('detail')}
                className="flex items-center gap-2 text-xs font-bold text-white hover:text-cyan-300 transition"
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/60" />
                <span>Detail & Effects</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleResetSection('detail')}
                  className="text-zinc-500 hover:text-amber-300 p-0.5 transition"
                  title="Reset Detail Adjustments"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleSection('detail')}
                  className="text-zinc-500 hover:text-zinc-300 p-0.5 transition"
                >
                  {openSections.detail ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Sliders */}
            {openSections.detail && (
              <div className="p-3 space-y-1">
                <AdjustmentRow
                  label="Sharpen"
                  value={grade.sharpen ?? 0}
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={0}
                  unit="%"
                  formatDecimals={0}
                  propertyPath="colorGrade.sharpen"
                  clip={clip}
                  onChange={(val) => updateGradeParam('sharpen', val)}
                />
                <AdjustmentRow
                  label="Clarity"
                  value={grade.clarity ?? 0}
                  min={-100}
                  max={100}
                  step={1}
                  defaultValue={0}
                  formatDecimals={0}
                  propertyPath="colorGrade.clarity"
                  clip={clip}
                  onChange={(val) => updateGradeParam('clarity', val)}
                />
                <AdjustmentRow
                  label="Noise Red."
                  value={grade.noiseReduction ?? 0}
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={0}
                  unit="%"
                  formatDecimals={0}
                  propertyPath="colorGrade.noiseReduction"
                  clip={clip}
                  onChange={(val) => updateGradeParam('noiseReduction', val)}
                />
                <AdjustmentRow
                  label="Film Grain"
                  value={grade.grain ?? 0}
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={0}
                  unit="%"
                  formatDecimals={0}
                  propertyPath="colorGrade.grain"
                  clip={clip}
                  onChange={(val) => updateGradeParam('grain', val)}
                />
                <AdjustmentRow
                  label="Vignette"
                  value={grade.vignette ?? 0}
                  min={0}
                  max={1}
                  step={0.02}
                  defaultValue={0}
                  formatDecimals={2}
                  propertyPath="colorGrade.vignette"
                  clip={clip}
                  onChange={(val) => updateGradeParam('vignette', val)}
                />
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: 8-BAND SELECTIVE HSL */}
        {subTab === 'hsl' && <HslColorBandsView clip={clip} />}

        {/* SECTION 5: TONE CURVES */}
        {subTab === 'curves' && <ToneCurvesEditor clip={clip} />}

        {/* SECTION 6: COLOR WHEELS */}
        {subTab === 'wheels' && <ColorWheelsView clip={clip} />}

        {/* SECTION 7: 3D LUT BROWSER & IMPORTER */}
        {subTab === 'lut' && (
          <div className="space-y-3 bg-[#121422] border border-zinc-800/80 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Film className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  3D Look Up Tables (.cube)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Export Current Grade as .cube LUT */}
                <button
                  type="button"
                  onClick={handleExportLut}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-[11px] font-semibold transition border border-zinc-700/60 shadow-xs"
                  title="Export active color grade as standard 3D .cube LUT"
                >
                  <Download className="w-3 h-3 text-emerald-400" />
                  <span>Export LUT</span>
                </button>

                {/* Import .cube file button */}
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
                  className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white text-[11px] font-semibold transition shadow-xs"
                  title="Import .cube 3D LUT from computer"
                >
                  <Upload className="w-3 h-3" />
                  <span>Import .cube</span>
                </button>
              </div>
            </div>

            {/* List of 3D LUTs */}
            <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => updateGradeParam('lutId', undefined)}
                className={`p-2.5 rounded-lg border text-left text-xs transition flex items-center justify-between ${
                  !grade.lutId
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div>
                  <div className="font-semibold">None (Native Grade)</div>
                  <div className="text-[10px] text-zinc-500">Passthrough with no 3D LUT applied</div>
                </div>
                {!grade.lutId && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </button>

              {allLuts.map((lut) => {
                const isSelected = grade.lutId === lut.id;
                return (
                  <button
                    key={lut.id}
                    type="button"
                    onClick={() => {
                      updateGradeParam('lutId', lut.id);
                      updateGradeParam('lutEnabled', true);
                    }}
                    className={`p-2.5 rounded-lg border text-left text-xs transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        <span>{lut.title || lut.name}</span>
                        <span className="text-[10px] font-mono opacity-60">
                          {lut.size}×{lut.size}×{lut.size}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {(lut as any).description || 'Studio 3D Color Cube'}
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </button>
                );
              })}
            </div>

            {/* LUT Controls: Enable/Disable & Intensity */}
            {grade.lutId && (
              <div className="pt-3 border-t border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-medium text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={grade.lutEnabled !== false}
                      onChange={(e) => updateGradeParam('lutEnabled', e.target.checked)}
                      className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>Enable 3D LUT</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => updateGradeParam('lutId', undefined)}
                    className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">LUT Mix Intensity</span>
                    <span className="text-zinc-200 font-mono">
                      {((grade.lutIntensity ?? 1.0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={grade.lutIntensity ?? 1.0}
                    onChange={(e) => updateGradeParam('lutIntensity', parseFloat(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
