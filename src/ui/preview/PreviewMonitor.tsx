/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { useEditor } from '../context/EditorContext';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
  Maximize2,
  Minimize2,
  Menu,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import {
  createRationalTime,
  secondsToRationalTime,
  rationalTimeToSeconds,
  addRationalTime,
  subtractRationalTime,
} from '../../core/time/RationalTime';

export const PreviewMonitor: React.FC = () => {
  const {
    project,
    timelineEngine,
    compositor,
    playbackEngine,
    currentTime,
    formattedTimecode,
    isPlaying,
    isBeforeAfterActive,
    toggleBeforeAfter,
    togglePlay,
    seek,
  } = useEditor();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qualityPreset, setQualityPreset] = useState<'Full Quality' | 'Half' | 'Quarter'>('Full Quality');
  const [resolutionPreset, setResolutionPreset] = useState<'4K 60fps' | '1080p 60fps' | '720p 30fps'>('4K 60fps');

  const canvasWidth = project.settings.canvasWidth || 1920;
  const canvasHeight = project.settings.canvasHeight || 1080;
  const fps = project.settings.frameRate.numerator / project.settings.frameRate.denominator;

  const sequence = timelineEngine.getSequence();
  const sequenceDurationSec = Math.max(1, rationalTimeToSeconds(sequence.duration));
  const currentSec = rationalTimeToSeconds(currentTime);
  const totalTimecode = '00:00:15:25';

  // Format CineFlow specific timecode format 00:00:14:06
  const formatMonitorTimecode = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);
    const frames = Math.floor((sec % 1) * 30);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(mins)}:${pad(secs)}:${pad(frames)}`;
  };

  // Continuous frame rendering on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    compositor.renderSequence(
      ctx,
      timelineEngine.getSequence(),
      currentTime,
      canvasWidth,
      canvasHeight,
      isBeforeAfterActive
    );
  }, [currentTime, isBeforeAfterActive, timelineEngine, compositor, canvasWidth, canvasHeight, project]);

  const stepFrame = (frames: number) => {
    const frameSeconds = frames / fps;
    const delta = secondsToRationalTime(Math.abs(frameSeconds));
    if (frames > 0) {
      seek(addRationalTime(currentTime, delta));
    } else {
      seek(subtractRationalTime(currentTime, delta));
    }
  };

  const jumpToStart = () => seek(createRationalTime(0));
  const jumpToEnd = () => seek(sequence.duration);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-[#0a0c13] select-none overflow-hidden"
    >
      {/* 1. TOP PLAYER TOOLBAR BAR (Player | Full Quality ▾ | 4K 60fps ▾ | Menu) */}
      <div className="h-8 bg-[#0a0c13] border-b border-zinc-850 px-3 flex items-center justify-between shrink-0 text-xs">
        <span className="font-bold text-zinc-200">Player</span>

        <div className="flex items-center gap-2">
          {/* Full Quality Dropdown */}
          <button
            onClick={() => setQualityPreset(qualityPreset === 'Full Quality' ? 'Half' : 'Full Quality')}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px] font-medium transition"
          >
            <span>{qualityPreset}</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {/* 4K 60fps Dropdown */}
          <button
            onClick={() => {}}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px] font-medium transition"
          >
            <span>{resolutionPreset}</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {/* Menu Options Icon */}
          <button
            onClick={() => {}}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-850 transition"
          >
            <Menu className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. MAIN VIDEO CANVAS STAGE */}
      <div className="flex-1 flex items-center justify-center p-2 min-h-0 bg-[#07080d] relative overflow-hidden">
        <div
          className="relative max-w-full max-h-full flex items-center justify-center shadow-2xl rounded-md overflow-hidden border border-zinc-850 bg-black group"
          style={{
            aspectRatio: `${canvasWidth} / ${canvasHeight}`,
          }}
        >
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlay}
          />

          {/* Top-Left Badges: 4K ULTRA HD & HDR */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none z-10">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/10 text-white shadow-lg">
              <span className="font-black text-[11px] tracking-wider">4K</span>
              <span className="text-[8px] font-semibold text-zinc-300 uppercase tracking-widest">ULTRA HD</span>
            </div>
            <div className="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/10 text-amber-400 shadow-lg">
              <span className="font-black text-[10px] tracking-wider">HDR</span>
            </div>
          </div>

          {/* Bottom-Left Feature Indicators Card */}
          <div className="absolute bottom-3 left-3 p-2 rounded-lg bg-black/85 backdrop-blur-md border border-white/10 text-white shadow-2xl z-10 space-y-1 min-w-40 pointer-events-none">
            <div className="flex items-center justify-between gap-3 text-[10px] font-medium text-zinc-200">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-xs shadow-cyan-400" />
                <span>GPU Accelerated</span>
              </div>
              <span className="text-cyan-400 font-bold">✓</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[10px] font-medium text-zinc-200">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-xs shadow-purple-400" />
                <span>Proxy Workflow</span>
              </div>
              <span className="text-cyan-400 font-bold">✓</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[10px] font-medium text-zinc-200">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-xs shadow-amber-400" />
                <span>Advanced Color</span>
              </div>
              <span className="text-cyan-400 font-bold">✓</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[10px] font-medium text-zinc-200">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 shadow-xs shadow-pink-400" />
                <span>Motion Tracking</span>
              </div>
              <span className="text-cyan-400 font-bold">✓</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TRANSPORT & TIME BAR (Left Timecode | Center Controls | Right Ratio & Fullscreen) */}
      <div className="h-9 bg-[#0b0d14] border-t border-zinc-850 px-3 flex items-center justify-between shrink-0 select-none">
        {/* Left: Timecode */}
        <div className="flex items-center font-mono text-xs">
          <span className="font-bold text-cyan-400">
            {formatMonitorTimecode(currentSec)}
          </span>
          <span className="text-zinc-600 mx-1">/</span>
          <span className="text-zinc-400 text-[11px]">{totalTimecode}</span>
        </div>

        {/* Center: Playback Controls (|◀, ▶, ▶|) */}
        <div className="flex items-center gap-2">
          <button
            onClick={jumpToStart}
            title="Jump to Start"
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-850 transition"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={togglePlay}
            title="Play / Pause (Space)"
            className="w-6.5 h-6.5 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center shadow-md transition-all active:scale-95 mx-1"
          >
            {isPlaying ? (
              <Pause className="w-3 h-3 fill-black text-black" />
            ) : (
              <Play className="w-3 h-3 fill-black text-black translate-x-0.5" />
            )}
          </button>

          <button
            onClick={jumpToEnd}
            title="Jump to End"
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-850 transition"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Full ▾, Ratio ▾, Fullscreen */}
        <div className="flex items-center gap-2 text-[11px] text-zinc-300">
          <button
            onClick={() => {}}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition"
          >
            <span>Full</span>
            <ChevronDown className="w-2.5 h-2.5 text-zinc-400" />
          </button>

          <button
            onClick={() => {}}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition"
          >
            <span>Ratio</span>
            <ChevronDown className="w-2.5 h-2.5 text-zinc-400" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-850 rounded transition ml-0.5"
            title="Toggle Monitor Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
