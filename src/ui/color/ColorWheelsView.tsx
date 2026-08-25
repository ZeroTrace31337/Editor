/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { ColorGrade, ColorWheelValue, createDefaultColorGrade } from '../../domain/color/ColorGrade';
import { TimelineClip } from '../../domain/timeline/Clip';
import { useEditor } from '../context/EditorContext';
import { UpdateColorGradeCommand } from '../../engine/command/implementations/UpdateColorGradeCommand';
import { RotateCcw, Sliders } from 'lucide-react';
import { ThreeScopesRow } from './VideoScopesPanel';

interface ColorWheelsViewProps {
  clip: TimelineClip;
}

type WheelName = 'lift' | 'gamma' | 'gain' | 'offset';

const wheelMeta: Record<WheelName, { label: string; subtitle: string; ringColor: string; textColor: string }> = {
  lift: { label: 'Lift', subtitle: 'Shadows', ringColor: '#ef4444', textColor: 'text-red-400' },
  gamma: { label: 'Gamma', subtitle: 'Midtones', ringColor: '#22c55e', textColor: 'text-emerald-400' },
  gain: { label: 'Gain', subtitle: 'Highlights', ringColor: '#38bdf8', textColor: 'text-sky-400' },
  offset: { label: 'Offset', subtitle: 'Master', ringColor: '#c084fc', textColor: 'text-purple-400' },
};

export const ColorWheelsView: React.FC<ColorWheelsViewProps> = ({ clip }) => {
  const { timelineEngine, commandManager } = useEditor();
  const grade: ColorGrade = clip.colorGrade || createDefaultColorGrade();
  const wheels = grade.wheels || createDefaultColorGrade().wheels;

  const updateGrade = (changes: Partial<ColorGrade>) => {
    const newGrade: ColorGrade = {
      ...grade,
      ...changes,
    };
    const cmd = new UpdateColorGradeCommand(timelineEngine, clip.id, newGrade);
    commandManager.execute(cmd);
  };

  const updateWheel = (wheel: WheelName, changes: Partial<ColorWheelValue>) => {
    const current = wheels[wheel] || { r: 0, g: 0, b: 0, y: 0 };
    const updatedWheels = {
      ...wheels,
      [wheel]: {
        ...current,
        ...changes,
      },
    };

    updateGrade({ wheels: updatedWheels });
  };

  const handleResetWheel = (wheel: WheelName) => {
    updateWheel(wheel, { r: 0, g: 0, b: 0, y: 0 });
  };

  return (
    <div className="space-y-3 select-none">
      {/* 4 Color Wheels Row */}
      <div className="grid grid-cols-4 gap-1.5 bg-zinc-950/80 border border-zinc-800 rounded-xl p-2">
        {(['lift', 'gamma', 'gain', 'offset'] as WheelName[]).map((wName) => {
          const val = wheels[wName] || { r: 0, g: 0, b: 0, y: 0 };
          const meta = wheelMeta[wName];

          return (
            <SingleColorWheel
              key={wName}
              name={wName}
              label={meta.label}
              subtitle={meta.subtitle}
              ringColor={meta.ringColor}
              textColor={meta.textColor}
              value={val}
              onChange={(changes) => updateWheel(wName, changes)}
              onReset={() => handleResetWheel(wName)}
            />
          );
        })}
      </div>

      {/* Primary Color Grading Sliders */}
      <div className="space-y-2 bg-zinc-950/80 border border-zinc-800 rounded-xl p-3">
        {/* Contrast */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-300 font-medium">Contrast</span>
            <span className="text-zinc-200 font-mono">{(grade.contrast ?? 1.20).toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="2.0"
            step="0.02"
            value={grade.contrast ?? 1.20}
            onChange={(e) => updateGrade({ contrast: parseFloat(e.target.value) })}
            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        {/* Exposure */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-300 font-medium">Exposure</span>
            <span className="text-zinc-200 font-mono">
              {grade.exposure > 0 ? `+${(grade.exposure || 0.10).toFixed(2)}` : (grade.exposure || 0.10).toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="-3"
            max="3"
            step="0.05"
            value={grade.exposure ?? 0.10}
            onChange={(e) => updateGrade({ exposure: parseFloat(e.target.value) })}
            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        {/* Saturation */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-300 font-medium">Saturation</span>
            <span className="text-zinc-200 font-mono">{(grade.saturation ?? 1.30).toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2.5"
            step="0.05"
            value={grade.saturation ?? 1.30}
            onChange={(e) => updateGrade({ saturation: parseFloat(e.target.value) })}
            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        {/* Temperature */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-300 font-medium">Temperature</span>
            <span className="text-zinc-200 font-mono">{(grade.temperature ?? -4).toFixed(0)}</span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            step="1"
            value={grade.temperature ?? -4}
            onChange={(e) => updateGrade({ temperature: parseFloat(e.target.value) })}
            className="w-full h-1 bg-gradient-to-r from-sky-500 via-zinc-700 to-amber-500 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Tint */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-300 font-medium">Tint</span>
            <span className="text-zinc-200 font-mono">{(grade.tint ?? 6).toFixed(0)}</span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            step="1"
            value={grade.tint ?? 6}
            onChange={(e) => updateGrade({ tint: parseFloat(e.target.value) })}
            className="w-full h-1 bg-gradient-to-r from-emerald-500 via-zinc-700 to-pink-500 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Live 3-Scope Diagnostics Row */}
      <ThreeScopesRow />
    </div>
  );
};

interface SingleColorWheelProps {
  name: WheelName;
  label: string;
  subtitle: string;
  ringColor: string;
  textColor: string;
  value: ColorWheelValue;
  onChange: (changes: Partial<ColorWheelValue>) => void;
  onReset: () => void;
}

const SingleColorWheel: React.FC<SingleColorWheelProps> = ({
  label,
  subtitle,
  ringColor,
  textColor,
  value,
  onChange,
  onReset,
}) => {
  const wheelRef = useRef<HTMLDivElement>(null);

  // Calculate 2D Puck Position (-1.0 to 1.0)
  const puckX = Math.max(-1, Math.min(1, (value.r - value.b) * 1.2));
  const puckY = Math.max(-1, Math.min(1, -value.g * 1.2));

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    updatePuck(e.clientX, e.clientY);

    const onMouseMove = (moveEvent: MouseEvent) => {
      updatePuck(moveEvent.clientX, moveEvent.clientY);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const updatePuck = (clientX: number, clientY: number) => {
    if (!wheelRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const radius = rect.width / 2;

    let dx = (clientX - cx) / radius;
    let dy = (clientY - cy) / radius;
    const dist = Math.hypot(dx, dy);

    if (dist > 1.0) {
      dx /= dist;
      dy /= dist;
    }

    // Convert (dx, dy) to RGB color balance
    const r = Math.max(-1, Math.min(1, dx * 0.7));
    const g = Math.max(-1, Math.min(1, -dy * 0.7));
    const b = Math.max(-1, Math.min(1, -dx * 0.7));

    onChange({ r, g, b });
  };

  return (
    <div className="flex flex-col items-center bg-zinc-900/60 border border-zinc-800 rounded-lg p-1.5 space-y-1">
      {/* Wheel Title */}
      <div className="w-full flex items-center justify-between">
        <span className={`text-[10px] font-bold ${textColor}`}>{label}</span>
        <button
          type="button"
          onClick={onReset}
          className="p-0.5 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-800 transition"
          title={`Reset ${label}`}
        >
          <RotateCcw className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* 2D Color Trackball Canvas */}
      <div
        ref={wheelRef}
        onMouseDown={handleMouseDown}
        className="relative w-16 h-16 xl:w-20 xl:h-20 rounded-full border cursor-crosshair shadow-inner flex items-center justify-center overflow-hidden"
        style={{
          borderColor: ringColor,
          background: `radial-gradient(circle at center, #18181b 0%, #09090b 75%), conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)`,
          backgroundBlendMode: 'screen',
        }}
      >
        {/* Center Crosshairs */}
        <div className="absolute w-full h-[0.5px] bg-zinc-600/40 pointer-events-none" />
        <div className="absolute h-full w-[0.5px] bg-zinc-600/40 pointer-events-none" />
        <div className="absolute w-1.5 h-1.5 rounded-full border border-zinc-500 pointer-events-none" />

        {/* Draggable Indicator Puck */}
        <div
          className="absolute w-2.5 h-2.5 rounded-full border border-white bg-white shadow-md transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: `${50 + puckX * 42}%`,
            top: `${50 + puckY * 42}%`,
            boxShadow: `0 0 6px ${ringColor}`,
          }}
        />
      </div>

      {/* Numeric Readouts underneath */}
      <div className="w-full text-[9px] font-mono text-zinc-400 flex flex-col items-center leading-tight">
        <div className="flex justify-between w-full px-0.5">
          <span>R {(value.r || 0).toFixed(2)}</span>
          <span>G {(value.g || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between w-full px-0.5">
          <span>B {(value.b || 0).toFixed(2)}</span>
          <span>Y {(value.y || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};
