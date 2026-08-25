/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { ColorGrade, ColorWheelValue, createDefaultColorGrade } from '../../domain/color/ColorGrade';
import { TimelineClip } from '../../domain/timeline/Clip';
import { useEditor } from '../context/EditorContext';
import { UpdateColorGradeCommand } from '../../engine/command/implementations/UpdateColorGradeCommand';
import { RotateCcw } from 'lucide-react';

interface ColorWheelsViewProps {
  clip: TimelineClip;
}

type WheelName = 'lift' | 'gamma' | 'gain' | 'offset';

const wheelMeta: Record<WheelName, { label: string; subtitle: string; color: string }> = {
  lift: { label: 'Lift', subtitle: 'Shadows', color: 'text-indigo-400' },
  gamma: { label: 'Gamma', subtitle: 'Midtones', color: 'text-emerald-400' },
  gain: { label: 'Gain', subtitle: 'Highlights', color: 'text-amber-400' },
  offset: { label: 'Offset', subtitle: 'Master', color: 'text-purple-400' },
};

export const ColorWheelsView: React.FC<ColorWheelsViewProps> = ({ clip }) => {
  const { timelineEngine, commandManager } = useEditor();
  const grade: ColorGrade = clip.colorGrade || createDefaultColorGrade();
  const wheels = grade.wheels || createDefaultColorGrade().wheels;

  const updateWheel = (wheel: WheelName, changes: Partial<ColorWheelValue>) => {
    const current = wheels[wheel] || { r: 0, g: 0, b: 0, y: 0 };
    const updatedWheels = {
      ...wheels,
      [wheel]: {
        ...current,
        ...changes,
      },
    };

    const newGrade: ColorGrade = {
      ...grade,
      wheels: updatedWheels,
    };

    const cmd = new UpdateColorGradeCommand(timelineEngine, clip.id, newGrade);
    commandManager.execute(cmd);
  };

  const handleResetWheel = (wheel: WheelName) => {
    updateWheel(wheel, { r: 0, g: 0, b: 0, y: 0 });
  };

  return (
    <div className="grid grid-cols-2 gap-3 bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 select-none">
      {(['lift', 'gamma', 'gain', 'offset'] as WheelName[]).map((wName) => {
        const val = wheels[wName] || { r: 0, g: 0, b: 0, y: 0 };
        const meta = wheelMeta[wName];

        return (
          <SingleColorWheel
            key={wName}
            name={wName}
            label={meta.label}
            subtitle={meta.subtitle}
            color={meta.color}
            value={val}
            onChange={(changes) => updateWheel(wName, changes)}
            onReset={() => handleResetWheel(wName)}
          />
        );
      })}
    </div>
  );
};

interface SingleColorWheelProps {
  name: WheelName;
  label: string;
  subtitle: string;
  color: string;
  value: ColorWheelValue;
  onChange: (changes: Partial<ColorWheelValue>) => void;
  onReset: () => void;
}

const SingleColorWheel: React.FC<SingleColorWheelProps> = ({
  label,
  subtitle,
  color,
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
    <div className="flex flex-col items-center bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 space-y-2">
      {/* Wheel Title & Reset */}
      <div className="w-full flex items-center justify-between">
        <div className="flex items-baseline space-x-1.5">
          <span className={`text-xs font-semibold ${color}`}>{label}</span>
          <span className="text-[10px] text-zinc-500">{subtitle}</span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-800 transition"
          title={`Reset ${label} Wheel`}
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {/* 2D Color Trackball Canvas */}
      <div
        ref={wheelRef}
        onMouseDown={handleMouseDown}
        className="relative w-28 h-28 rounded-full border border-zinc-700/80 cursor-crosshair shadow-inner flex items-center justify-center overflow-hidden"
        style={{
          background: `radial-gradient(circle at center, #27272a 0%, #18181b 70%, #09090b 100%), conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)`,
          backgroundBlendMode: 'screen',
        }}
      >
        {/* Center Crosshairs */}
        <div className="absolute w-full h-[1px] bg-zinc-700/50 pointer-events-none" />
        <div className="absolute h-full w-[1px] bg-zinc-700/50 pointer-events-none" />
        <div className="absolute w-2 h-2 rounded-full border border-zinc-600 pointer-events-none" />

        {/* Draggable Indicator Puck */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white bg-amber-400 shadow-md transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: `${50 + puckX * 42}%`,
            top: `${50 + puckY * 42}%`,
          }}
        />
      </div>

      {/* Master Luma / Y Slider */}
      <div className="w-full space-y-1 pt-1">
        <div className="flex items-center justify-between text-[10px] text-zinc-400">
          <span>Luma (Y)</span>
          <span className="font-mono text-zinc-300 font-semibold">
            {((value.y || 0) * 100).toFixed(0)}%
          </span>
        </div>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          value={value.y || 0}
          onChange={(e) => onChange({ y: parseFloat(e.target.value) })}
          className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>
    </div>
  );
};
