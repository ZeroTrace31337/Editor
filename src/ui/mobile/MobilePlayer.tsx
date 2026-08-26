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
  Maximize,
  Minimize,
  Eye,
  Grid,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  rationalTimeToSeconds,
  secondsToRationalTime,
  addRationalTime,
  subtractRationalTime,
} from '../../core/time/RationalTime';

interface MobilePlayerProps {
  isTablet?: boolean;
}

export const MobilePlayer: React.FC<MobilePlayerProps> = ({ isTablet = false }) => {
  const {
    project,
    timelineEngine,
    compositor,
    currentTime,
    isPlaying,
    togglePlay,
    seek,
    isBeforeAfterActive,
    setBeforeAfterActive,
  } = useEditor();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showSafeGuides, setShowSafeGuides] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHoldingBefore, setIsHoldingBefore] = useState(false);

  const canvasWidth = project.settings.canvasWidth || 1920;
  const canvasHeight = project.settings.canvasHeight || 1080;
  const aspectRatio = project.settings.aspectRatio || '16:9';

  const sequence = timelineEngine.getSequence();
  const currentSec = rationalTimeToSeconds(currentTime);
  const totalDurationSec = rationalTimeToSeconds(sequence.duration);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
  };

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      compositor.renderSequence(
        ctx,
        timelineEngine.getSequence(),
        currentTime,
        canvasWidth,
        canvasHeight,
        isHoldingBefore || isBeforeAfterActive
      );

      if (isPlaying) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [
    currentTime,
    isPlaying,
    timelineEngine,
    compositor,
    canvasWidth,
    canvasHeight,
    isHoldingBefore,
    isBeforeAfterActive,
    project,
  ]);

  const handleStepBack = () => {
    const fps = project.settings.frameRate.numerator / project.settings.frameRate.denominator || 30;
    const delta = secondsToRationalTime(1 / fps);
    seek(subtractRationalTime(currentTime, delta));
  };

  const handleStepForward = () => {
    const fps = project.settings.frameRate.numerator / project.settings.frameRate.denominator || 30;
    const delta = secondsToRationalTime(1 / fps);
    seek(addRationalTime(currentTime, delta));
  };

  // Dynamic aspect ratio calculation for style
  const getAspectRatioStyle = () => {
    switch (aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] max-h-[38vh] sm:max-h-[44vh]';
      case '1:1':
        return 'aspect-square max-h-[34vh] sm:max-h-[40vh]';
      case '4:5':
        return 'aspect-[4/5] max-h-[36vh] sm:max-h-[42vh]';
      case '21:9':
        return 'aspect-[21/9] max-h-[30vh] sm:max-h-[36vh]';
      case '16:9':
      default:
        return 'aspect-video max-h-[32vh] sm:max-h-[38vh]';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-[#05060a] flex flex-col items-center justify-center p-2 select-none shrink-0 ${
        isFullscreen ? 'fixed inset-0 z-50 p-4 bg-black justify-center' : ''
      }`}
    >
      {/* Viewport Frame with Touch Interaction */}
      <div
        className={`relative ${getAspectRatioStyle()} w-full max-w-full rounded-2xl overflow-hidden bg-black border border-zinc-800/80 shadow-2xl flex items-center justify-center group`}
        onClick={togglePlay}
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="w-full h-full object-contain"
        />

        {/* Center Play/Pause Touch Watermark Pulse (only when paused or on tap) */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-cyan-400/90 text-black flex items-center justify-center shadow-lg shadow-cyan-400/30 scale-95 group-active:scale-90 transition-transform">
              <Play className="w-6 h-6 fill-black translate-x-0.5" />
            </div>
          </div>
        )}

        {/* Before / After Hold Indicator */}
        {isHoldingBefore && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-rose-500/90 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md pointer-events-none">
            Original (Ungraded)
          </div>
        )}

        {/* Safe Area Guides (Social Media UI framing) */}
        {showSafeGuides && (
          <div className="absolute inset-0 pointer-events-none border border-cyan-400/30 m-3 rounded-lg flex flex-col justify-between p-2">
            <div className="flex justify-between text-[9px] text-cyan-400 font-mono">
              <span>TOP BAR AREA</span>
              <span>SAFE MARGIN</span>
            </div>
            <div className="w-full border-t border-dashed border-cyan-400/20 my-auto" />
            <div className="flex justify-between text-[9px] text-cyan-400 font-mono">
              <span>CAPTION ZONE</span>
              <span>BOTTOM DOCK</span>
            </div>
          </div>
        )}

        {/* Top HUD (Inside Preview) */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10" onClick={(e) => e.stopPropagation()}>
          {/* Safe Guides Toggle */}
          <button
            onClick={() => setShowSafeGuides(!showSafeGuides)}
            className={`p-1.5 rounded-lg backdrop-blur-md transition active:scale-95 touch-manipulation ${
              showSafeGuides
                ? 'bg-cyan-500 text-black font-bold'
                : 'bg-black/60 text-zinc-300 hover:text-white'
            }`}
            title="Toggle Safe Area Overlay"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          {/* Hold Before / After Button */}
          <button
            onMouseDown={() => setIsHoldingBefore(true)}
            onMouseUp={() => setIsHoldingBefore(false)}
            onTouchStart={() => setIsHoldingBefore(true)}
            onTouchEnd={() => setIsHoldingBefore(false)}
            className={`px-2 py-1 rounded-lg backdrop-blur-md text-[10px] font-bold flex items-center gap-1 transition active:scale-95 touch-manipulation ${
              isHoldingBefore
                ? 'bg-rose-500 text-white'
                : 'bg-black/60 text-zinc-300 hover:text-white'
            }`}
            title="Hold to view original ungraded image"
          >
            <Eye className="w-3 h-3" />
            <span className="hidden sm:inline">B/A</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-zinc-300 hover:text-white active:scale-95 transition touch-manipulation"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Bottom Time HUD Inside Canvas */}
        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[11px] font-mono text-zinc-200 pointer-events-none flex items-center gap-1">
          <span className="text-cyan-300 font-bold">{formatTime(currentSec)}</span>
          <span className="text-zinc-500">/</span>
          <span className="text-zinc-400">{formatTime(totalDurationSec)}</span>
        </div>
      </div>

      {/* Touch Playback Control Bar (Below Preview) */}
      <div className="w-full max-w-md flex items-center justify-between px-2 pt-1.5 pb-0.5 text-zinc-300">
        {/* Step Backward 1 Frame */}
        <button
          onClick={handleStepBack}
          className="p-2 rounded-xl hover:bg-zinc-850 active:scale-90 transition text-zinc-400 hover:text-white touch-manipulation cursor-pointer"
          title="Previous Frame"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {/* Main Play / Pause Button */}
        <button
          onClick={togglePlay}
          className="flex items-center gap-2 px-6 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-white font-bold text-xs shadow-md active:scale-95 transition touch-manipulation cursor-pointer"
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 text-cyan-400 fill-cyan-400" />
              <span>PAUSE</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 text-cyan-400 fill-cyan-400 translate-x-0.2" />
              <span>PLAY</span>
            </>
          )}
        </button>

        {/* Step Forward 1 Frame */}
        <button
          onClick={handleStepForward}
          className="p-2 rounded-xl hover:bg-zinc-850 active:scale-90 transition text-zinc-400 hover:text-white touch-manipulation cursor-pointer"
          title="Next Frame"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
