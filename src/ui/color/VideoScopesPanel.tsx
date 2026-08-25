/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { Activity, BarChart2, Compass, Eye } from 'lucide-react';
import { useEditor } from '../context/EditorContext';

export type ScopeType = 'parade' | 'waveform' | 'vectorscope' | 'histogram';

export const VideoScopesPanel: React.FC = () => {
  const { currentTime, timelineEngine, compositor, isPlaying } = useEditor();
  const [scopeType, setScopeType] = useState<ScopeType>('parade');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const drawScope = () => {
      // Get composite frame image data from compositor layer canvas
      const compCanvas = (compositor as any).layerCanvas || document.querySelector('canvas');
      if (!compCanvas) return;

      const compCtx = compCanvas.getContext('2d');
      if (!compCtx) return;

      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, w, h);

      // Sample downscaled frame for 60fps scope calculation
      const sampleW = 160;
      const sampleH = 90;
      const offscreen = document.createElement('canvas');
      offscreen.width = sampleW;
      offscreen.height = sampleH;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return;

      try {
        offCtx.drawImage(compCanvas, 0, 0, sampleW, sampleH);
        const imgData = offCtx.getImageData(0, 0, sampleW, sampleH);
        const data = imgData.data;

        if (scopeType === 'parade') {
          drawRgbParade(ctx, data, sampleW, sampleH, w, h);
        } else if (scopeType === 'waveform') {
          drawWaveform(ctx, data, sampleW, sampleH, w, h);
        } else if (scopeType === 'vectorscope') {
          drawVectorscope(ctx, data, sampleW, sampleH, w, h);
        } else if (scopeType === 'histogram') {
          drawHistogram(ctx, data, sampleW, sampleH, w, h);
        }
      } catch (e) {
        // Fallback grid
      }

      if (isPlaying) {
        animId = requestAnimationFrame(drawScope);
      }
    };

    drawScope();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [currentTime, isPlaying, scopeType, compositor]);

  const drawRgbParade = (
    ctx: CanvasRenderingContext2D,
    data: Uint8ClampedArray,
    sw: number,
    sh: number,
    cw: number,
    ch: number
  ) => {
    const channelW = cw / 3;

    // Draw Graticule lines (0%, 50%, 100%)
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    for (const pct of [0.1, 0.5, 0.9]) {
      const y = ch * (1.0 - pct);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cw, y);
      ctx.stroke();
    }

    // Sub-labels R G B
    ctx.font = '10px monospace';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('RED', 8, 14);
    ctx.fillStyle = '#22c55e';
    ctx.fillText('GREEN', channelW + 8, 14);
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('BLUE', channelW * 2 + 8, 14);

    // Render Red Channel
    for (let x = 0; x < sw; x++) {
      const screenX = (x / sw) * (channelW - 4);
      for (let y = 0; y < sh; y++) {
        const idx = (y * sw + x) * 4;
        const r = data[idx];
        const screenY = ch * (1 - (r / 255) * 0.85 - 0.07);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.fillRect(screenX, screenY, 1.5, 1.5);
      }
    }

    // Render Green Channel
    for (let x = 0; x < sw; x++) {
      const screenX = channelW + (x / sw) * (channelW - 4);
      for (let y = 0; y < sh; y++) {
        const idx = (y * sw + x) * 4;
        const g = data[idx + 1];
        const screenY = ch * (1 - (g / 255) * 0.85 - 0.07);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
        ctx.fillRect(screenX, screenY, 1.5, 1.5);
      }
    }

    // Render Blue Channel
    for (let x = 0; x < sw; x++) {
      const screenX = channelW * 2 + (x / sw) * (channelW - 4);
      for (let y = 0; y < sh; y++) {
        const idx = (y * sw + x) * 4;
        const b = data[idx + 2];
        const screenY = ch * (1 - (b / 255) * 0.85 - 0.07);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
        ctx.fillRect(screenX, screenY, 1.5, 1.5);
      }
    }
  };

  const drawWaveform = (
    ctx: CanvasRenderingContext2D,
    data: Uint8ClampedArray,
    sw: number,
    sh: number,
    cw: number,
    ch: number
  ) => {
    // IRE Scale lines
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    ctx.font = '9px monospace';
    ctx.fillStyle = '#71717a';

    const ireMarks = [
      { ire: 100, pct: 0.9 },
      { ire: 75, pct: 0.7 },
      { ire: 50, pct: 0.5 },
      { ire: 25, pct: 0.3 },
      { ire: 0, pct: 0.1 },
    ];

    for (const m of ireMarks) {
      const y = ch * (1.0 - m.pct);
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(cw, y);
      ctx.stroke();
      ctx.fillText(`${m.ire}`, 6, y + 3);
    }

    for (let x = 0; x < sw; x++) {
      const screenX = 35 + (x / sw) * (cw - 45);
      for (let y = 0; y < sh; y++) {
        const idx = (y * sw + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        // Rec. 709 Luminance
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const screenY = ch * (1 - (luma / 255) * 0.8 - 0.1);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
        ctx.fillRect(screenX, screenY, 1.5, 1.5);
      }
    }
  };

  const drawVectorscope = (
    ctx: CanvasRenderingContext2D,
    data: Uint8ClampedArray,
    sw: number,
    sh: number,
    cw: number,
    ch: number
  ) => {
    const cx = cw / 2;
    const cy = ch / 2;
    const radius = Math.min(cx, cy) * 0.85;

    // Outer graticule circle
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    // Skin tone indicator line (approx 123 deg)
    const skinAngle = -2.14; // radians
    ctx.strokeStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(skinAngle) * radius, cy + Math.sin(skinAngle) * radius);
    ctx.stroke();

    // Plot color samples in U/V chrominance plane
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const u = -0.14713 * r - 0.28886 * g + 0.436 * b;
      const v = 0.615 * r - 0.51499 * g - 0.10001 * b;

      const px = cx + (u / 128) * radius * 1.5;
      const py = cy - (v / 128) * radius * 1.5;

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.25)`;
      ctx.fillRect(px, py, 1.5, 1.5);
    }
  };

  const drawHistogram = (
    ctx: CanvasRenderingContext2D,
    data: Uint8ClampedArray,
    sw: number,
    sh: number,
    cw: number,
    ch: number
  ) => {
    const binsR = new Uint32Array(256);
    const binsG = new Uint32Array(256);
    const binsB = new Uint32Array(256);

    for (let i = 0; i < data.length; i += 4) {
      binsR[data[i]]++;
      binsG[data[i + 1]]++;
      binsB[data[i + 2]]++;
    }

    let maxCount = 1;
    for (let i = 0; i < 256; i++) {
      if (binsR[i] > maxCount) maxCount = binsR[i];
      if (binsG[i] > maxCount) maxCount = binsG[i];
      if (binsB[i] > maxCount) maxCount = binsB[i];
    }

    const barW = cw / 256;

    // Draw Red Histogram
    ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
    for (let i = 0; i < 256; i++) {
      const barH = (binsR[i] / maxCount) * (ch * 0.85);
      ctx.fillRect(i * barW, ch - barH, barW, barH);
    }

    // Draw Green Histogram
    ctx.fillStyle = 'rgba(34, 197, 94, 0.45)';
    for (let i = 0; i < 256; i++) {
      const barH = (binsG[i] / maxCount) * (ch * 0.85);
      ctx.fillRect(i * barW, ch - barH, barW, barH);
    }

    // Draw Blue Histogram
    ctx.fillStyle = 'rgba(59, 130, 246, 0.45)';
    for (let i = 0; i < 256; i++) {
      const barH = (binsB[i] / maxCount) * (ch * 0.85);
      ctx.fillRect(i * barW, ch - barH, barW, barH);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden select-none">
      {/* Top Scope Selector Tabs */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center space-x-1">
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-semibold text-zinc-200 uppercase tracking-wider">Video Scopes</span>
        </div>

        <div className="flex items-center space-x-1 bg-zinc-950 p-0.5 rounded border border-zinc-850 text-[10px]">
          {(['parade', 'waveform', 'vectorscope', 'histogram'] as ScopeType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setScopeType(type)}
              className={`px-2 py-0.5 rounded capitalize transition ${
                scopeType === type
                  ? 'bg-zinc-800 text-amber-400 font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Scope Canvas Display */}
      <div className="flex-1 relative flex items-center justify-center p-2 bg-black min-h-0">
        <canvas
          ref={canvasRef}
          width={340}
          height={200}
          className="w-full h-full object-contain rounded border border-zinc-900"
        />
      </div>
    </div>
  );
};

export const ThreeScopesRow: React.FC = () => {
  const { currentTime, compositor, isPlaying } = useEditor();
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const vectorCanvasRef = useRef<HTMLCanvasElement>(null);
  const histoCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animId: number;

    const renderAll = () => {
      const compCanvas = (compositor as any).layerCanvas || document.querySelector('canvas');
      if (!compCanvas) return;

      const sampleW = 120;
      const sampleH = 70;
      const offscreen = document.createElement('canvas');
      offscreen.width = sampleW;
      offscreen.height = sampleH;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return;

      try {
        offCtx.drawImage(compCanvas, 0, 0, sampleW, sampleH);
        const imgData = offCtx.getImageData(0, 0, sampleW, sampleH);
        const data = imgData.data;

        // 1. Waveform
        if (waveCanvasRef.current) {
          const ctx = waveCanvasRef.current.getContext('2d');
          if (ctx) {
            const w = waveCanvasRef.current.width;
            const h = waveCanvasRef.current.height;
            ctx.fillStyle = '#08080c';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#27272a';
            ctx.lineWidth = 0.5;
            for (const pct of [0.2, 0.5, 0.8]) {
              ctx.beginPath();
              ctx.moveTo(0, h * pct);
              ctx.lineTo(w, h * pct);
              ctx.stroke();
            }
            for (let x = 0; x < sampleW; x++) {
              const screenX = (x / sampleW) * w;
              for (let y = 0; y < sampleH; y++) {
                const idx = (y * sampleW + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                const screenY = h * (1 - (luma / 255) * 0.85 - 0.07);
                ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
                ctx.fillRect(screenX, screenY, 1.5, 1.5);
              }
            }
          }
        }

        // 2. Vectorscope
        if (vectorCanvasRef.current) {
          const ctx = vectorCanvasRef.current.getContext('2d');
          if (ctx) {
            const w = vectorCanvasRef.current.width;
            const h = vectorCanvasRef.current.height;
            ctx.fillStyle = '#08080c';
            ctx.fillRect(0, 0, w, h);
            const cx = w / 2;
            const cy = h / 2;
            const radius = Math.min(cx, cy) * 0.85;

            ctx.strokeStyle = '#27272a';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
            ctx.stroke();

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const u = -0.14713 * r - 0.28886 * g + 0.436 * b;
              const v = 0.615 * r - 0.51499 * g - 0.10001 * b;
              const px = cx + (u / 128) * radius * 1.3;
              const py = cy - (v / 128) * radius * 1.3;
              ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.25)`;
              ctx.fillRect(px, py, 1.2, 1.2);
            }
          }
        }

        // 3. Histogram
        if (histoCanvasRef.current) {
          const ctx = histoCanvasRef.current.getContext('2d');
          if (ctx) {
            const w = histoCanvasRef.current.width;
            const h = histoCanvasRef.current.height;
            ctx.fillStyle = '#08080c';
            ctx.fillRect(0, 0, w, h);

            const binsR = new Uint32Array(64);
            const binsG = new Uint32Array(64);
            const binsB = new Uint32Array(64);

            for (let i = 0; i < data.length; i += 4) {
              binsR[Math.floor(data[i] / 4)]++;
              binsG[Math.floor(data[i + 1] / 4)]++;
              binsB[Math.floor(data[i + 2] / 4)]++;
            }

            let maxCount = 1;
            for (let i = 0; i < 64; i++) {
              if (binsR[i] > maxCount) maxCount = binsR[i];
              if (binsG[i] > maxCount) maxCount = binsG[i];
              if (binsB[i] > maxCount) maxCount = binsB[i];
            }

            const barW = w / 64;
            ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
            for (let i = 0; i < 64; i++) {
              const barH = (binsR[i] / maxCount) * (h * 0.85);
              ctx.fillRect(i * barW, h - barH, barW, barH);
            }
            ctx.fillStyle = 'rgba(34, 197, 94, 0.45)';
            for (let i = 0; i < 64; i++) {
              const barH = (binsG[i] / maxCount) * (h * 0.85);
              ctx.fillRect(i * barW, h - barH, barW, barH);
            }
            ctx.fillStyle = 'rgba(59, 130, 246, 0.45)';
            for (let i = 0; i < 64; i++) {
              const barH = (binsB[i] / maxCount) * (h * 0.85);
              ctx.fillRect(i * barW, h - barH, barW, barH);
            }
          }
        }
      } catch (e) {}

      if (isPlaying) {
        animId = requestAnimationFrame(renderAll);
      }
    };

    renderAll();
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [currentTime, isPlaying, compositor]);

  return (
    <div className="space-y-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2">
      <div className="flex items-center justify-between pb-1 border-b border-zinc-850">
        <div className="flex items-center gap-1.5 text-zinc-300 text-[11px] font-semibold">
          <Activity className="w-3.5 h-3.5 text-purple-400" />
          <span>Scopes</span>
        </div>
        <span className="text-[9px] text-zinc-500 font-mono uppercase">Live GPU Parade</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 pt-1">
        <div className="flex flex-col items-center">
          <canvas
            ref={waveCanvasRef}
            width={110}
            height={64}
            className="w-full h-16 rounded bg-black border border-zinc-850 object-contain"
          />
          <span className="text-[9px] font-mono text-zinc-400 mt-0.5">Waveform</span>
        </div>
        <div className="flex flex-col items-center">
          <canvas
            ref={vectorCanvasRef}
            width={110}
            height={64}
            className="w-full h-16 rounded bg-black border border-zinc-850 object-contain"
          />
          <span className="text-[9px] font-mono text-zinc-400 mt-0.5">Vectorscope</span>
        </div>
        <div className="flex flex-col items-center">
          <canvas
            ref={histoCanvasRef}
            width={110}
            height={64}
            className="w-full h-16 rounded bg-black border border-zinc-850 object-contain"
          />
          <span className="text-[9px] font-mono text-zinc-400 mt-0.5">Histogram</span>
        </div>
      </div>
    </div>
  );
};
