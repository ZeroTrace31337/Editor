/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { SplinePoint, ToneCurves, ColorGrade, createDefaultColorGrade } from '../../domain/color/ColorGrade';
import { TimelineClip } from '../../domain/timeline/Clip';
import { useEditor } from '../context/EditorContext';
import { UpdateColorGradeCommand } from '../../engine/command/implementations/UpdateColorGradeCommand';
import { RotateCcw } from 'lucide-react';

interface ToneCurvesEditorProps {
  clip: TimelineClip;
}

type CurveChannel = 'master' | 'red' | 'green' | 'blue';

export const ToneCurvesEditor: React.FC<ToneCurvesEditorProps> = ({ clip }) => {
  const { timelineEngine, commandManager } = useEditor();
  const [activeChannel, setActiveChannel] = useState<CurveChannel>('master');
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const grade: ColorGrade = clip.colorGrade || createDefaultColorGrade();
  const curves: ToneCurves = grade.curves || createDefaultColorGrade().curves;

  const currentPoints = curves[activeChannel] || [{ x: 0, y: 0 }, { x: 1, y: 1 }];

  const channelColors: Record<CurveChannel, { stroke: string; fill: string; text: string }> = {
    master: { stroke: '#ffffff', fill: 'rgba(255, 255, 255, 0.1)', text: 'text-white' },
    red: { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.15)', text: 'text-red-400' },
    green: { stroke: '#22c55e', fill: 'rgba(34, 197, 94, 0.15)', text: 'text-green-400' },
    blue: { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.15)', text: 'text-blue-400' },
  };

  const updateCurves = (newPoints: SplinePoint[]) => {
    // Sort points by X coordinate
    const sorted = [...newPoints].sort((a, b) => a.x - b.x);
    // Ensure endpoints exist
    if (sorted.length < 2) return;
    if (sorted[0].x !== 0) sorted[0].x = 0;
    if (sorted[sorted.length - 1].x !== 1) sorted[sorted.length - 1].x = 1;

    const newCurves: ToneCurves = {
      ...curves,
      [activeChannel]: sorted,
    };

    const newGrade: ColorGrade = {
      ...grade,
      curves: newCurves,
    };

    const cmd = new UpdateColorGradeCommand(timelineEngine, clip.id, newGrade);
    commandManager.execute(cmd);
  };

  const handleResetChannel = () => {
    updateCurves([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
    setSelectedPointIndex(null);
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));

    // Check if clicked close to existing point
    const existingIdx = currentPoints.findIndex(
      (p) => Math.hypot(p.x - x, p.y - y) < 0.08
    );

    if (existingIdx !== -1) {
      setSelectedPointIndex(existingIdx);
      return;
    }

    // Add new point
    const updated = [...currentPoints, { x, y }];
    updateCurves(updated);
    setSelectedPointIndex(updated.length - 1);
  };

  const handlePointDrag = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPointIndex(index);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      let x = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, 1 - (moveEvent.clientY - rect.top) / rect.height));

      // Endpoints stay locked on X=0 and X=1
      if (index === 0) x = 0;
      if (index === currentPoints.length - 1) x = 1;

      const updated = [...currentPoints];
      updated[index] = { x, y };
      updateCurves(updated);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleDeleteSelectedPoint = () => {
    if (selectedPointIndex === null || selectedPointIndex === 0 || selectedPointIndex === currentPoints.length - 1) return;
    const updated = currentPoints.filter((_, idx) => idx !== selectedPointIndex);
    updateCurves(updated);
    setSelectedPointIndex(null);
  };

  // Build SVG path d string from points
  const buildPath = (): string => {
    if (currentPoints.length === 0) return '';
    const w = 240;
    const h = 200;

    let path = `M ${currentPoints[0].x * w} ${(1 - currentPoints[0].y) * h}`;
    for (let i = 1; i < currentPoints.length; i++) {
      const prev = currentPoints[i - 1];
      const curr = currentPoints[i];
      const cpX1 = (prev.x + (curr.x - prev.x) / 2) * w;
      const cpY1 = (1 - prev.y) * h;
      const cpX2 = (prev.x + (curr.x - prev.x) / 2) * w;
      const cpY2 = (1 - curr.y) * h;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x * w} ${(1 - curr.y) * h}`;
    }
    return path;
  };

  return (
    <div className="space-y-3 bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 select-none">
      {/* Channel Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1 bg-zinc-950 p-0.5 rounded border border-zinc-800 text-[11px]">
          {(['master', 'red', 'green', 'blue'] as CurveChannel[]).map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => {
                setActiveChannel(ch);
                setSelectedPointIndex(null);
              }}
              className={`px-2.5 py-1 rounded capitalize font-medium transition ${
                activeChannel === ch
                  ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span
                className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                  ch === 'master'
                    ? 'bg-white'
                    : ch === 'red'
                    ? 'bg-red-500'
                    : ch === 'green'
                    ? 'bg-green-500'
                    : 'bg-blue-500'
                }`}
              />
              {ch}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-1.5">
          {selectedPointIndex !== null && selectedPointIndex > 0 && selectedPointIndex < currentPoints.length - 1 && (
            <button
              type="button"
              onClick={handleDeleteSelectedPoint}
              className="px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-950/50 border border-red-900/50 rounded transition"
            >
              Del Point
            </button>
          )}

          <button
            type="button"
            onClick={handleResetChannel}
            className="flex items-center space-x-1 px-2 py-1 text-[11px] text-zinc-400 hover:text-white bg-zinc-800 rounded hover:bg-zinc-700 transition"
            title="Reset active channel curve"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* SVG Curve Graph Canvas */}
      <div className="relative w-full aspect-[1.2/1] bg-zinc-950 border border-zinc-800 rounded overflow-hidden flex items-center justify-center">
        {/* Diagonal Reference Line */}
        <svg
          ref={svgRef}
          viewBox="0 0 240 200"
          className="w-full h-full cursor-crosshair"
          onClick={handleSvgClick}
        >
          {/* Grid lines */}
          <line x1="0" y1="50" x2="240" y2="50" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="0" y1="100" x2="240" y2="100" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="0" y1="150" x2="240" y2="150" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="60" y1="0" x2="60" y2="200" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="120" y1="0" x2="120" y2="200" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="180" y1="0" x2="180" y2="200" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" />

          {/* Diagonal baseline */}
          <line x1="0" y1="200" x2="240" y2="0" stroke="#3f3f46" strokeWidth="1" strokeDasharray="4 4" />

          {/* Spline Path */}
          <path
            d={buildPath()}
            fill="none"
            stroke={channelColors[activeChannel].stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Control Points */}
          {currentPoints.map((pt, idx) => {
            const cx = pt.x * 240;
            const cy = (1 - pt.y) * 200;
            const isSelected = selectedPointIndex === idx;

            return (
              <circle
                key={idx}
                cx={cx}
                cy={cy}
                r={isSelected ? 6 : 4.5}
                fill={isSelected ? '#f59e0b' : channelColors[activeChannel].stroke}
                stroke="#18181b"
                strokeWidth="1.5"
                className="cursor-pointer hover:scale-125 transition-transform"
                onMouseDown={(e) => handlePointDrag(idx, e)}
              />
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
        <span>Click to add curve point</span>
        <span>Drag point to sculpt curve</span>
      </div>
    </div>
  );
};
