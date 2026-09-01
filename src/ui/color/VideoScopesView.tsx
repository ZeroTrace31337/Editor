/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { Activity, BarChart2, Compass, Waves } from 'lucide-react';
import { useEditor } from '../context/EditorContext';

export type ScopeType = 'parade' | 'waveform' | 'vectorscope' | 'histogram';

export const VideoScopesView: React.FC = () => {
  const { project, timelineEngine, compositor, currentTime, isBeforeAfterActive } = useEditor();
  const [activeScope, setActiveScope] = useState<ScopeType>('parade');
  const [showFalseColorGuide, setShowFalseColorGuide] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

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

    // Initialize offscreen sampling canvas
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const sampleW = 240;
    const sampleH = 135;
    const offCanvas = offscreenCanvasRef.current;
    offCanvas.width = sampleW;
    offCanvas.height = sampleH;
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
    if (!offCtx) return;

    // Render the sequence to offscreen canvas to obtain true pixel data
    const sequence = timelineEngine.getSequence();
    compositor.renderSequence(
      offCtx,
      sequence,
      currentTime,
      sampleW,
      sampleH,
      isBeforeAfterActive
    );

    let imageData: ImageData;
    try {
      imageData = offCtx.getImageData(0, 0, sampleW, sampleH);
    } catch {
      // Fallback empty frame buffer
      imageData = offCtx.createImageData(sampleW, sampleH);
    }

    if (activeScope === 'parade') {
      renderRGBParade(ctx, width, height, imageData, sampleW, sampleH);
    } else if (activeScope === 'waveform') {
      renderLumaWaveform(ctx, width, height, imageData, sampleW, sampleH);
    } else if (activeScope === 'vectorscope') {
      renderVectorscope(ctx, width, height, imageData, sampleW, sampleH);
    } else if (activeScope === 'histogram') {
      renderHistogram(ctx, width, height, imageData, sampleW, sampleH);
    }
  }, [activeScope, currentTime, isBeforeAfterActive, timelineEngine, compositor, project]);

  const renderRGBParade = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    imageData: ImageData,
    sampleW: number,
    sampleH: number
  ) => {
    const colW = width / 3;
    const padding = 6;
    const pixels = imageData.data;

    // Draw Grids (IRE 0, 25, 50, 75, 100)
    ctx.strokeStyle = '#1e1e24';
    ctx.lineWidth = 1;
    [0.1, 0.325, 0.55, 0.775, 0.95].forEach((ratio) => {
      ctx.beginPath();
      ctx.moveTo(0, height * ratio);
      ctx.lineTo(width, height * ratio);
      ctx.stroke();
    });

    const channels: { name: string; color: string; offset: number; channelIdx: number }[] = [
      { name: 'RED PARADE', color: 'rgba(239, 68, 68, 0.45)', offset: 0, channelIdx: 0 },
      { name: 'GREEN PARADE', color: 'rgba(34, 197, 94, 0.45)', offset: colW, channelIdx: 1 },
      { name: 'BLUE PARADE', color: 'rgba(59, 130, 246, 0.45)', offset: colW * 2, channelIdx: 2 },
    ];

    channels.forEach(({ name, color, offset, channelIdx }, idx) => {
      // Channel label & IRE markings
      ctx.fillStyle = '#71717a';
      ctx.font = '8px monospace';
      ctx.fillText(name, offset + 8, 14);

      // Plot real pixel data points across horizontal sample slice
      ctx.fillStyle = color;
      const usableW = colW - padding * 2;
      const usableH = height - 28;

      for (let y = 0; y < sampleH; y += 2) {
        for (let x = 0; x < sampleW; x += 2) {
          const pixelIdx = (y * sampleW + x) * 4;
          const val = pixels[pixelIdx + channelIdx] / 255;
          const plotX = offset + padding + (x / sampleW) * usableW;
          const plotY = height - 10 - val * usableH;
          ctx.fillRect(plotX, plotY, 1.2, 1.2);
        }
      }

      // Vertical Channel divider
      if (idx < 2) {
        ctx.strokeStyle = '#27272a';
        ctx.beginPath();
        ctx.moveTo(offset + colW, 0);
        ctx.lineTo(offset + colW, height);
        ctx.stroke();
      }
    });
  };

  const renderLumaWaveform = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    imageData: ImageData,
    sampleW: number,
    sampleH: number
  ) => {
    // IRE Scale markers (100, 75, 50, 25, 0)
    ctx.strokeStyle = '#1e1e24';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#52525b';
    ctx.font = '8px monospace';

    const ireMarks = [100, 75, 50, 25, 0];
    const usableH = height - 30;
    const paddingX = 32;
    const usableW = width - paddingX - 10;

    ireMarks.forEach((ire) => {
      const y = height - (ire / 100) * usableH - 15;
      ctx.beginPath();
      ctx.moveTo(paddingX, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.fillText(`${ire}`, 6, y + 3);
    });

    // Real Rec.709 Luma Waveform calculation: Y = 0.2126R + 0.7152G + 0.0722B
    const pixels = imageData.data;
    ctx.fillStyle = 'rgba(74, 222, 128, 0.4)';

    for (let y = 0; y < sampleH; y += 2) {
      for (let x = 0; x < sampleW; x += 2) {
        const idx = (y * sampleW + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

        const plotX = paddingX + (x / sampleW) * usableW;
        const plotY = height - 15 - luma * usableH;
        ctx.fillRect(plotX, plotY, 1.2, 1.2);
      }
    }
  };

  const renderVectorscope = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    imageData: ImageData,
    sampleW: number,
    sampleH: number
  ) => {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 20;

    // Reticle circles (75% and 100% saturation)
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

    // Real Chrominance (Cb, Cr) computation from actual frame pixels
    const pixels = imageData.data;
    ctx.fillStyle = 'rgba(167, 139, 250, 0.35)';

    for (let y = 0; y < sampleH; y += 2) {
      for (let x = 0; x < sampleW; x += 2) {
        const idx = (y * sampleW + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];

        // Standard ITU-R BT.601 Cb / Cr conversion
        const cb = -0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 0.5 * r - 0.418688 * g - 0.081312 * b;

        const plotX = cx + (cb / 128) * (radius * 0.75);
        const plotY = cy - (cr / 128) * (radius * 0.75);

        ctx.fillRect(plotX, plotY, 1.2, 1.2);
      }
    }
  };

  const renderHistogram = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    imageData: ImageData,
    sampleW: number,
    sampleH: number
  ) => {
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // Compute real 256-bin histogram counts
    const histR = new Uint32Array(256);
    const histG = new Uint32Array(256);
    const histB = new Uint32Array(256);
    const pixels = imageData.data;
    let maxCount = 1;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      histR[r]++;
      histG[g]++;
      histB[b]++;
      if (histR[r] > maxCount) maxCount = histR[r];
      if (histG[g] > maxCount) maxCount = histG[g];
      if (histB[b] > maxCount) maxCount = histB[b];
    }

    const channels = [
      { hist: histR, color: 'rgba(239, 68, 68, 0.45)' },
      { hist: histG, color: 'rgba(34, 197, 94, 0.45)' },
      { hist: histB, color: 'rgba(59, 130, 246, 0.45)' },
    ];

    const plotW = width - 20;
    const plotH = height - 20;

    channels.forEach(({ hist, color }) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(10, height - 10);
      for (let b = 0; b < 256; b++) {
        const x = 10 + (b / 255) * plotW;
        const normalized = Math.min(1.0, hist[b] / (maxCount * 0.7));
        const y = height - 10 - normalized * (plotH - 10);
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
