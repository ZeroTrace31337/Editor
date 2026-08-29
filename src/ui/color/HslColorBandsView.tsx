/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ColorGrade, HslBand, HslColorGrade, createDefaultColorGrade, createDefaultHslColorGrade } from '../../domain/color/ColorGrade';
import { TimelineClip } from '../../domain/timeline/Clip';
import { useEditor } from '../context/EditorContext';
import { UpdateColorGradeCommand } from '../../engine/command/implementations/UpdateColorGradeCommand';
import { RotateCcw } from 'lucide-react';

interface HslColorBandsViewProps {
  clip: TimelineClip;
}

type HslBandName = keyof HslColorGrade;

const bandMeta: Record<HslBandName, { label: string; swatch: string }> = {
  red: { label: 'Red', swatch: '#ef4444' },
  orange: { label: 'Orange', swatch: '#f97316' },
  yellow: { label: 'Yellow', swatch: '#eab308' },
  green: { label: 'Green', swatch: '#22c55e' },
  cyan: { label: 'Cyan', swatch: '#06b6d4' },
  blue: { label: 'Blue', swatch: '#3b82f6' },
  purple: { label: 'Purple', swatch: '#a855f7' },
  magenta: { label: 'Magenta', swatch: '#ec4899' },
};

export const HslColorBandsView: React.FC<HslColorBandsViewProps> = ({ clip }) => {
  const { timelineEngine, commandManager } = useEditor();
  const [activeBand, setActiveBand] = useState<HslBandName>('red');

  const grade: ColorGrade = clip.colorGrade || createDefaultColorGrade();
  const hsl: HslColorGrade = grade.hsl || createDefaultHslColorGrade();
  const currentBand: HslBand = hsl[activeBand] || { hue: 0, saturation: 0, luminance: 0, rangeCenter: 0, rangeWidth: 45, softness: 20 };

  const updateBand = (changes: Partial<HslBand>) => {
    const updatedHsl: HslColorGrade = {
      ...hsl,
      [activeBand]: {
        ...currentBand,
        ...changes,
      },
    };

    const newGrade: ColorGrade = {
      ...grade,
      hsl: updatedHsl,
    };

    const cmd = new UpdateColorGradeCommand(timelineEngine, clip.id, newGrade);
    commandManager.execute(cmd);
  };

  const handleResetBand = () => {
    updateBand({ hue: 0, saturation: 0, luminance: 0 });
  };

  const handleResetAll = () => {
    const newGrade: ColorGrade = {
      ...grade,
      hsl: createDefaultHslColorGrade(),
    };
    const cmd = new UpdateColorGradeCommand(timelineEngine, clip.id, newGrade);
    commandManager.execute(cmd);
  };

  return (
    <div className="space-y-3 bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 select-none">
      {/* Top Swatches Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
          {(Object.keys(bandMeta) as HslBandName[]).map((bandKey) => {
            const meta = bandMeta[bandKey];
            const isSelected = activeBand === bandKey;
            const bVal = hsl[bandKey];
            const hasMod = bVal && (bVal.hue !== 0 || bVal.saturation !== 0 || bVal.luminance !== 0);

            return (
              <button
                key={bandKey}
                type="button"
                onClick={() => setActiveBand(bandKey)}
                className={`relative w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  isSelected ? 'ring-2 ring-white scale-110 shadow-md' : 'opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: meta.swatch }}
                title={meta.label}
              >
                {hasMod && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white absolute -top-0.5 -right-0.5" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={handleResetBand}
            className="flex items-center space-x-1 px-2 py-1 text-[11px] text-zinc-400 hover:text-white bg-zinc-800 rounded hover:bg-zinc-700 transition"
            title={`Reset ${bandMeta[activeBand].label} adjustments`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Band</span>
          </button>
          <button
            type="button"
            onClick={handleResetAll}
            className="flex items-center space-x-1 px-2 py-1 text-[11px] text-zinc-400 hover:text-white bg-zinc-800 rounded hover:bg-zinc-700 transition"
            title="Reset All 8 HSL Color Bands"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>
        </div>
      </div>

      {/* Selected Band Title */}
      <div className="flex items-center space-x-2 pt-1">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: bandMeta[activeBand].swatch }}
        />
        <span className="text-xs font-semibold text-zinc-200">
          {bandMeta[activeBand].label} Adjustments
        </span>
      </div>

      {/* Hue Shift Slider */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-zinc-400">
          <span>Hue Shift</span>
          <span className="font-mono text-zinc-300 font-semibold">{currentBand.hue}°</span>
        </div>
        <input
          type="range"
          min="-180"
          max="180"
          step="1"
          value={currentBand.hue}
          onChange={(e) => updateBand({ hue: parseFloat(e.target.value) })}
          className="w-full h-1 bg-gradient-to-r from-red-500 via-green-500 via-blue-500 to-red-500 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Saturation Slider */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-zinc-400">
          <span>Saturation</span>
          <span className="font-mono text-zinc-300 font-semibold">
            {currentBand.saturation > 0 ? `+${currentBand.saturation}` : currentBand.saturation}%
          </span>
        </div>
        <input
          type="range"
          min="-100"
          max="100"
          step="1"
          value={currentBand.saturation}
          onChange={(e) => updateBand({ saturation: parseFloat(e.target.value) })}
          className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
      </div>

      {/* Luminance Slider */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-zinc-400">
          <span>Luminance</span>
          <span className="font-mono text-zinc-300 font-semibold">
            {currentBand.luminance > 0 ? `+${currentBand.luminance}` : currentBand.luminance}%
          </span>
        </div>
        <input
          type="range"
          min="-100"
          max="100"
          step="1"
          value={currentBand.luminance}
          onChange={(e) => updateBand({ luminance: parseFloat(e.target.value) })}
          className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>
    </div>
  );
};
