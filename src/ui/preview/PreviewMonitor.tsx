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
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Layers,
  Sparkles,
  Zap,
  Crop,
  Grid,
  Radio,
  Sliders,
  Eye,
  EyeOff,
  SplitSquareVertical,
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
    seekSeconds,
  } = useEditor();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);

  const canvasWidth = project.settings.canvasWidth || 1920;
  const canvasHeight = project.settings.canvasHeight || 1080;
  const fps = project.settings.frameRate.numerator / project.settings.frameRate.denominator;

  const sequence = timelineEngine.getSequence();
  const sequenceDurationSec = Math.max(1, rationalTimeToSeconds(sequence.duration));
  const currentSec = rationalTimeToSeconds(currentTime);
  const totalTimecode = '00:01:26:08';

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

  // Step 1 frame forward/backward
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

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    playbackEngine.setVolume(v);
    if (v === 0) setIsMuted(true);
    else setIsMuted(false);
  };

  const toggleMute = () => {
    playbackEngine.toggleMute();
    setIsMuted(playbackEngine.isMute());
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-zinc-950 select-none overflow-hidden"
    >
      {/* 1. Main Canvas Stage */}
      <div className="flex-1 flex items-center justify-center p-3 min-h-0 bg-[#0c0e17] relative">
        <div
          className="relative max-w-full max-h-full flex items-center justify-center shadow-2xl rounded-xl overflow-hidden border border-zinc-800/80 bg-black group"
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

          {/* Top-Left Badges: 4K ULTRA HD & HDR & BEFORE/AFTER */}
          <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none z-10">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 text-white shadow-lg">
              <span className="font-black text-xs tracking-wider">4K</span>
              <span className="text-[9px] font-semibold text-zinc-300 uppercase tracking-widest">ULTRA HD</span>
            </div>
            <div className="px-2 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 text-white shadow-lg">
              <span className="font-black text-xs tracking-wider text-amber-400">HDR</span>
            </div>
            {isBeforeAfterActive && (
              <div className="px-3 py-1 rounded-lg bg-rose-600/90 text-white font-bold text-xs shadow-lg tracking-wider border border-rose-400/50 flex items-center gap-1.5 animate-pulse">
                <EyeOff className="w-3.5 h-3.5" />
                <span>BEFORE (ORIGINAL BYPASS)</span>
              </div>
            )}
          </div>

          {/* Center Brand Overlay */}
          <div className="absolute top-1/2 right-8 -translate-y-1/2 flex flex-col items-end pointer-events-none opacity-85 z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/40">
                <Play className="w-4 h-4 text-white fill-white translate-x-0.5" />
              </div>
              <span className="text-2xl font-black tracking-wider text-white drop-shadow-md">
                CineFlow<span className="text-xs text-purple-400 align-super">®</span>
              </span>
            </div>
            <span className="text-xs font-semibold text-zinc-300 tracking-widest uppercase mt-0.5 drop-shadow">
              Edit Like a Pro
            </span>
          </div>

          {/* Bottom-Left Feature Indicators Card */}
          <div className="absolute bottom-4 left-4 p-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-white shadow-2xl z-10 space-y-1.5 min-w-44">
            <div className="flex items-center justify-between gap-3 text-[11px] font-medium text-zinc-200">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/80" />
                <span>GPU Accelerated</span>
              </div>
              <span className="text-emerald-400 font-bold">✓</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px] font-medium text-zinc-200">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400 shadow-sm shadow-purple-400/80" />
                <span>Proxy Workflow</span>
              </div>
              <span className="text-emerald-400 font-bold">✓</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px] font-medium text-zinc-200">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/80" />
                <span>Advanced Color</span>
              </div>
              <span className="text-emerald-400 font-bold">✓</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px] font-medium text-zinc-200">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-pink-400 shadow-sm shadow-pink-400/80" />
                <span>Motion Tracking</span>
              </div>
              <span className="text-emerald-400 font-bold">✓</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Transport & Scrubber Bar */}
      <div className="h-12 bg-zinc-950 border-t border-zinc-800/80 px-4 flex items-center justify-between shrink-0 select-none">
        {/* Left: Aspect, Volume & Monitor Tools */}
        <div className="flex items-center gap-2 text-zinc-400">
          <button
            onClick={toggleBeforeAfter}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition ${
              isBeforeAfterActive
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white'
            }`}
            title="Toggle Before / After Bypass (Press \)"
          >
            {isBeforeAfterActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isBeforeAfterActive ? 'Before' : 'B/A'}</span>
          </button>

          <button
            onClick={() => {}}
            className="p-1.5 rounded-md hover:text-zinc-100 hover:bg-zinc-900 transition"
            title="Aspect Ratio & Framing"
          >
            <Crop className="w-4 h-4" />
          </button>

          <button
            onClick={toggleMute}
            className="p-1.5 rounded-md hover:text-zinc-100 hover:bg-zinc-900 transition"
            title="Audio Monitor"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {}}
            className="p-1.5 rounded-md hover:text-zinc-100 hover:bg-zinc-900 transition"
            title="Safe Zone Guides"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Playback Controls & Scrubber Slider */}
        <div className="flex items-center gap-3">
          <button
            onClick={jumpToStart}
            title="Jump to Start"
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => stepFrame(-1)}
            title="Previous Frame"
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            title="Play / Pause (Space)"
            className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-600/40 transition-all active:scale-95 mx-0.5"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-white" />
            ) : (
              <Play className="w-4 h-4 fill-white translate-x-0.5" />
            )}
          </button>

          <button
            onClick={() => stepFrame(1)}
            title="Next Frame"
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={jumpToEnd}
            title="Jump to End"
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Timecode & Fullscreen */}
        <div className="flex items-center gap-3">
          <div className="font-mono text-xs text-zinc-300">
            <span className="font-bold text-white">{formattedTimecode}</span>
            <span className="text-zinc-600 mx-1">/</span>
            <span className="text-zinc-400">{totalTimecode}</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-md transition"
            title="Toggle Monitor Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
