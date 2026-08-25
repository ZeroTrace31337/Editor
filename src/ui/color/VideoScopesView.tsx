/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { Activity, BarChart2, Compass, Waves } from 'lucide-react';
import { useEditor } from '../context/EditorContext';

export type ScopeType = 'parade' | 'waveform' | 'vectorscope' | 'histogram';

export const VideoScopesView: React.FC = () => {
  const { currentTime } = useEditor();
  const [activeScope, setActiveScope] = useState<ScopeType>('parade');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background with DaVinci Resolve dark scope styling
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, width, height);

    if (activeScope === 'parade') {
      renderRGBParade(ctx, width, height);
    } else if (activeScope === 'waveform') {
      renderLumaWaveform(ctx, width, height);
    } else if (activeScope === 'vectorscope') {
      renderVectorscope(ctx, width, height);
    } else if (activeScope === 'histogram') {
      renderHistogram(ctx, width, height);
    }
  }, [activeScope, currentTime]);

  const renderRGBParade = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const colW = width / 3;
    const padding = 8;

    // Draw Grids (IRE 0, 50, 100)
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    [0.2, 0.5, 0.8].forEach((ratio) => {
      ctx.beginPath();
      ctx.moveTo(0, height * ratio);
      ctx.lineTo(width, height * ratio);
      ctx.stroke();
    });

    const channels: { name: string; color: string; offset: number }[] = [
      { name: 'RED', color: 'rgba(239, 68, 68, 0.85)', offset: 0 },
      { name: 'GREEN', color: 'rgba(34, 197, 94, 0.85)', offset: colW },
      { name: 'BLUE', color: 'rgba(59, 130, 246, 0.85)', offset: colW * 2 },
    ];

    channels.forEach(({ name, color, offset }, idx) => {
      // Channel label
      ctx.fillStyle = '#71717a';
      ctx.font = '9px monospace';
      ctx.fillText(name, offset + 10, 16);

      // Procedural trace curve
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = padding; x < colW - padding; x += 2) {
        const normX = x / (colW - padding * 2);
        const luma =
          0.3 +
          Math.sin(normX * 6 + idx * 1.5) * 0.25 +
          Math.cos(normX * 12 + idx) * 0.15 +
          (Math.sin(normX * 20) * 0.05);
        const y = height - Math.max(0.1, Math.min(0.9, luma)) * (height - 24);
        if (x === padding) ctx.moveTo(offset + x, y);
        else ctx.lineTo(offset + x, y);
      }
      ctx.stroke();

      // Channel divider line
      if (idx < 2) {
        ctx.strokeStyle = '#18181b';
        ctx.beginPath();
        ctx.moveTo(offset + colW, 0);
        ctx.lineTo(offset + colW, height);
        ctx.stroke();
      }
    });
  };

  const renderLumaWaveform = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // IRE Scale markers
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#52525b';
    ctx.font = '8px monospace';

    const ireMarks = [100, 75, 50, 25, 0];
    ireMarks.forEach((ire) => {
      const y = height - (ire / 100) * (height - 30) - 15;
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.fillText(`${ire}`, 6, y + 3);
    });

    // Waveform Luma trace (Phosphor green/cyan)
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 32; x < width - 10; x += 2) {
      const normX = (x - 32) / (width - 42);
      const val = 0.45 + Math.sin(normX * 5) * 0.28 + Math.cos(normX * 14) * 0.12;
      const y = height - Math.max(0.05, Math.min(0.95, val)) * (height - 30) - 15;
      if (x === 32) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  const renderVectorscope = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 20;

    // Reticle circles
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.arc(cx, cy, radius * 0.75, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    // Skin Tone Indicator Line (I-Bar at ~123 degrees)
    const skinAngle = (-123 * Math.PI) / 180;
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.6)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(skinAngle) * radius, cy + Math.sin(skinAngle) * radius);
    ctx.stroke();

    ctx.fillStyle = '#fb923c';
    ctx.font = '8px sans-serif';
    ctx.fillText('SKIN', cx + Math.cos(skinAngle) * (radius - 12), cy + Math.sin(skinAngle) * (radius - 12));

    // Target color boxes (R, Mg, B, Cy, G, Yl)
    const colorTargets = [
      { name: 'R', angle: -103, color: '#ef4444' },
      { name: 'Mg', angle: -45, color: '#ec4899' },
      { name: 'B', angle: 15, color: '#3b82f6' },
      { name: 'Cy', angle: 77, color: '#06b6d4' },
      { name: 'G', angle: 135, color: '#22c55e' },
      { name: 'Yl', angle: -165, color: '#eab308' },
    ];

    colorTargets.forEach(({ name, angle, color }) => {
      const rad = (angle * Math.PI) / 180;
      const tx = cx + Math.cos(rad) * (radius * 0.75);
      const ty = cy + Math.sin(rad) * (radius * 0.75);
      ctx.strokeStyle = color;
      ctx.strokeRect(tx - 3, ty - 3, 6, 6);
      ctx.fillStyle = color;
      ctx.font = '9px monospace';
      ctx.fillText(name, tx + 6, ty + 3);
    });

    // Cloud of chrominance trace data points
    ctx.fillStyle = 'rgba(167, 139, 250, 0.4)';
    for (let i = 0; i < 240; i++) {
      const angle = (i * 1.5 + Math.sin(i * 0.3) * 0.5) % (Math.PI * 2);
      const r = (Math.sin(i * 0.2) * 0.4 + 0.3) * radius * 0.6;
      ctx.fillRect(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 1.5, 1.5);
    }
  };

  const renderHistogram = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // Overlay Red, Green, Blue histograms
    const channels = [
      { color: 'rgba(239, 68, 68, 0.5)', peak: 0.35, spread: 0.12 },
      { color: 'rgba(34, 197, 94, 0.5)', peak: 0.5, spread: 0.18 },
      { color: 'rgba(59, 130, 246, 0.5)', peak: 0.65, spread: 0.15 },
    ];

    channels.forEach(({ color, peak, spread }) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(10, height - 10);
      for (let x = 10; x < width - 10; x += 3) {
        const norm = (x - 10) / (width - 20);
        const val = Math.exp(-Math.pow(norm - peak, 2) / (2 * Math.pow(spread, 2)));
        const y = height - 10 - val * (height - 30);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width - 10, height - 10);
      ctx.closePath();
      ctx.fill();
    });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden shadow-xl">
      {/* Scope Switcher Tabs */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-1">
          <Activity className="w-4 h-4 text-indigo-400 mr-1.5" />
          <span className="text-xs font-semibold text-zinc-200">Video Scopes</span>
        </div>

        <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-xs">
          <button
            onClick={() => setActiveScope('parade')}
            className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-all ${
              activeScope === 'parade'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BarChart2 className="w-3 h-3" /> Parade
          </button>
          <button
            onClick={() => setActiveScope('waveform')}
            className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-all ${
              activeScope === 'waveform'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Waves className="w-3 h-3" /> Waveform
          </button>
          <button
            onClick={() => setActiveScope('vectorscope')}
            className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-all ${
              activeScope === 'vectorscope'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Compass className="w-3 h-3" /> Vectorscope
          </button>
          <button
            onClick={() => setActiveScope('histogram')}
            className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-all ${
              activeScope === 'histogram'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Activity className="w-3 h-3" /> Histogram
          </button>
        </div>
      </div>

      {/* Scope Canvas */}
      <div className="flex-1 relative flex items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          width={480}
          height={260}
          className="w-full h-full object-contain rounded"
        />
      </div>
    </div>
  );
};
