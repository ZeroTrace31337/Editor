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
  formatTimecode,
} from '../../core/time/RationalTime';

export const PreviewMonitor: React.FC = () => {
  const {
    project,
    projectService,
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
  const [resolutionPreset, setResolutionPreset] = useState<'4K 60fps' | '1080p 60fps' | '720p 30fps'>('1080p 60fps');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showResMenu, setShowResMenu] = useState(false);
  const [showRatioMenu, setShowRatioMenu] = useState(false);
  const [showGuidesMenu, setShowGuidesMenu] = useState(false);

  // Overlay Guide Toggles
  const [showSafeAreas, setShowSafeAreas] = useState(false);
  const [showRuleOfThirds, setShowRuleOfThirds] = useState(false);
  const [showCenterCrosshair, setShowCenterCrosshair] = useState(false);

  const baseCanvasWidth = project.settings.canvasWidth || 1920;
  const baseCanvasHeight = project.settings.canvasHeight || 1080;
  const qualityScale = qualityPreset === 'Full Quality' ? 1 : qualityPreset === 'Half' ? 0.5 : 0.25;
  const renderWidth = Math.round(baseCanvasWidth * qualityScale);
  const renderHeight = Math.round(baseCanvasHeight * qualityScale);

  const fps = project.settings.frameRate.numerator / project.settings.frameRate.denominator;
  const sequence = timelineEngine.getSequence();
  const sequenceDurationSec = Math.max(1, rationalTimeToSeconds(sequence.duration));
  const currentSec = rationalTimeToSeconds(currentTime);
  const totalTimecode = formatTimecode(sequence.duration, project.settings.frameRate);

  // Format VeeCut specific timecode format 00:00:14:06
  const formatMonitorTimecode = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);
    const frames = Math.floor((sec % 1) * Math.round(fps));
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
      renderWidth,
      renderHeight,
      isBeforeAfterActive
    );
  }, [currentTime, isBeforeAfterActive, timelineEngine, compositor, renderWidth, renderHeight, project]);

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

  const handleAspectRatioChange = (w: number, h: number) => {
    project.settings.canvasWidth = w;
    project.settings.canvasHeight = h;
    projectService.setProject({ ...project });
    setShowRatioMenu(false);
  };

  const handleResolutionPresetChange = (preset: '4K 60fps' | '1080p 60fps' | '720p 30fps') => {
    setResolutionPreset(preset);
    if (preset === '4K 60fps') {
      project.settings.canvasWidth = 3840;
      project.settings.canvasHeight = 2160;
      project.settings.frameRate = { numerator: 60, denominator: 1 };
    } else if (preset === '1080p 60fps') {
      project.settings.canvasWidth = 1920;
      project.settings.canvasHeight = 1080;
      project.settings.frameRate = { numerator: 60, denominator: 1 };
    } else if (preset === '720p 30fps') {
      project.settings.canvasWidth = 1280;
      project.settings.canvasHeight = 720;
      project.settings.frameRate = { numerator: 30, denominator: 1 };
    }
    projectService.setProject({ ...project });
    setShowResMenu(false);
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-[#0a0c13] select-none overflow-hidden"
    >
      {/* 1. TOP PLAYER TOOLBAR BAR (Player | Full Quality ▾ | 4K 60fps ▾ | Menu) */}
      <div className="h-8 bg-[#0a0c13] border-b border-zinc-850 px-3 flex items-center justify-between shrink-0 text-xs relative z-30">
        <span className="font-bold text-zinc-200">Player</span>

        <div className="flex items-center gap-2">
          {/* Full Quality Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowQualityMenu(!showQualityMenu);
                setShowResMenu(false);
                setShowGuidesMenu(false);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px] font-medium transition"
            >
              <span>{qualityPreset}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>
            {showQualityMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 text-[11px] z-50">
                {(['Full Quality', 'Half', 'Quarter'] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setQualityPreset(q);
                      setShowQualityMenu(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-zinc-800 ${
                      qualityPreset === q ? 'text-cyan-400 font-bold' : 'text-zinc-300'
                    }`}
                  >
                    <span>{q}</span>
                    {qualityPreset === q && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Resolution Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowResMenu(!showResMenu);
                setShowQualityMenu(false);
                setShowGuidesMenu(false);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px] font-medium transition"
            >
              <span>{resolutionPreset}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>
            {showResMenu && (
              <div className="absolute right-0 mt-1 w-36 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 text-[11px] z-50">
                {(['4K 60fps', '1080p 60fps', '720p 30fps'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleResolutionPresetChange(r)}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-zinc-800 ${
                      resolutionPreset === r ? 'text-cyan-400 font-bold' : 'text-zinc-300'
                    }`}
                  >
                    <span>{r}</span>
                    {resolutionPreset === r && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Guides / Overlays Menu Icon */}
          <div className="relative">
            <button
              onClick={() => {
                setShowGuidesMenu(!showGuidesMenu);
                setShowQualityMenu(false);
                setShowResMenu(false);
              }}
              className={`p-1 rounded transition ${showGuidesMenu ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-850'}`}
              title="Monitor Overlays & Safe Guides"
            >
              <Menu className="w-3.5 h-3.5" />
            </button>
            {showGuidesMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 text-[11px] z-50 space-y-0.5">
                <button
                  onClick={() => setShowSafeAreas(!showSafeAreas)}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-zinc-800 text-zinc-300"
                >
                  <span>Safe Areas (Action/Title)</span>
                  {showSafeAreas && <Check className="w-3 h-3 text-cyan-400" />}
                </button>
                <button
                  onClick={() => setShowRuleOfThirds(!showRuleOfThirds)}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-zinc-800 text-zinc-300"
                >
                  <span>Rule of Thirds Grid</span>
                  {showRuleOfThirds && <Check className="w-3 h-3 text-cyan-400" />}
                </button>
                <button
                  onClick={() => setShowCenterCrosshair(!showCenterCrosshair)}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-zinc-800 text-zinc-300"
                >
                  <span>Center Crosshair</span>
                  {showCenterCrosshair && <Check className="w-3 h-3 text-cyan-400" />}
                </button>
                <div className="border-t border-zinc-800 my-1" />
                <button
                  onClick={toggleBeforeAfter}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-zinc-800 text-zinc-300"
                >
                  <span>Bypass Color/Effects</span>
                  {isBeforeAfterActive && <Check className="w-3 h-3 text-cyan-400" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN VIDEO CANVAS STAGE */}
      <div className="flex-1 flex items-center justify-center p-2 min-h-0 bg-[#07080d] relative overflow-hidden">
        <div
          className="relative max-w-full max-h-full flex items-center justify-center shadow-2xl rounded-md overflow-hidden border border-zinc-850 bg-black group"
          style={{
            aspectRatio: `${baseCanvasWidth} / ${baseCanvasHeight}`,
          }}
        >
          <canvas
            ref={canvasRef}
            width={renderWidth}
            height={renderHeight}
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlay}
          />

          {/* Rule of Thirds Overlay */}
          {showRuleOfThirds && (
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-15 border border-cyan-500/20">
              <div className="border-r border-b border-cyan-400/25" />
              <div className="border-r border-b border-cyan-400/25" />
              <div className="border-b border-cyan-400/25" />
              <div className="border-r border-b border-cyan-400/25" />
              <div className="border-r border-b border-cyan-400/25" />
              <div className="border-b border-cyan-400/25" />
              <div className="border-r border-cyan-400/25" />
              <div className="border-r border-cyan-400/25" />
              <div />
            </div>
          )}

          {/* Safe Areas Overlay */}
          {showSafeAreas && (
            <div className="absolute inset-0 pointer-events-none z-15 flex items-center justify-center">
              {/* Action Safe (90%) */}
              <div className="w-[90%] h-[90%] border border-amber-400/40 relative">
                <span className="absolute top-1 left-1 text-[8px] text-amber-400/70 font-mono">ACTION SAFE 90%</span>
                {/* Title Safe (80%) */}
                <div className="w-[88.8%] h-[88.8%] mx-auto mt-[3.1%] border border-cyan-400/50 relative">
                  <span className="absolute top-1 left-1 text-[8px] text-cyan-400/80 font-mono">TITLE SAFE 80%</span>
                </div>
              </div>
            </div>
          )}

          {/* Center Crosshair Overlay */}
          {showCenterCrosshair && (
            <div className="absolute inset-0 pointer-events-none z-15 flex items-center justify-center">
              <div className="w-6 h-0.5 bg-cyan-400/80 absolute" />
              <div className="h-6 w-0.5 bg-cyan-400/80 absolute" />
            </div>
          )}

          {/* Top-Left Badges: Resolution & HDR */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none z-10">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/10 text-white shadow-lg">
              <span className="font-black text-[11px] tracking-wider">{baseCanvasWidth >= 3840 ? '4K' : 'HD'}</span>
              <span className="text-[8px] font-semibold text-zinc-300 uppercase tracking-widest">{baseCanvasWidth}x{baseCanvasHeight}</span>
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
                <span>Fairlight Audio</span>
              </div>
              <span className="text-cyan-400 font-bold">✓</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[10px] font-medium text-zinc-200">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 shadow-xs shadow-pink-400" />
                <span>Optical Flow</span>
              </div>
              <span className="text-cyan-400 font-bold">✓</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TRANSPORT & TIME BAR (Left Timecode | Center Controls | Right Ratio & Fullscreen) */}
      <div className="h-9 bg-[#0b0d14] border-t border-zinc-850 px-3 flex items-center justify-between shrink-0 select-none relative z-30">
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

        {/* Right: Ratio Dropdown & Fullscreen */}
        <div className="flex items-center gap-2 text-[11px] text-zinc-300">
          <div className="relative">
            <button
              onClick={() => {
                setShowRatioMenu(!showRatioMenu);
                setShowQualityMenu(false);
                setShowResMenu(false);
                setShowGuidesMenu(false);
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition"
            >
              <span>
                {baseCanvasWidth === 1920 && baseCanvasHeight === 1080 ? '16:9' :
                 baseCanvasWidth === 1080 && baseCanvasHeight === 1920 ? '9:16' :
                 baseCanvasWidth === 1080 && baseCanvasHeight === 1080 ? '1:1' :
                 baseCanvasWidth === 1080 && baseCanvasHeight === 1350 ? '4:5' :
                 baseCanvasWidth === 1920 && baseCanvasHeight === 803 ? '2.39:1' : 'Custom'}
              </span>
              <ChevronDown className="w-2.5 h-2.5 text-zinc-400" />
            </button>
            {showRatioMenu && (
              <div className="absolute right-0 bottom-full mb-1 w-36 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 text-[11px] z-50">
                {[
                  { label: '16:9 Landscape', w: 1920, h: 1080 },
                  { label: '9:16 Portrait / Reel', w: 1080, h: 1920 },
                  { label: '1:1 Square', w: 1080, h: 1080 },
                  { label: '4:5 Social', w: 1080, h: 1350 },
                  { label: '2.39:1 Anamorphic', w: 1920, h: 803 },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleAspectRatioChange(item.w, item.h)}
                    className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-zinc-800 text-zinc-300"
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

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
