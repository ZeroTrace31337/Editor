/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { useEditor } from '../context/EditorContext';
import {
  Scissors,
  Type,
  Sparkles,
  Sliders,
  Music,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  X,
  Share2,
  Download,
  Ban,
  Layers,
  Zap,
} from 'lucide-react';
import { rationalTimeToSeconds } from '../../core/time/RationalTime';

export const MobilePreview: React.FC = () => {
  const {
    project,
    timelineEngine,
    compositor,
    currentTime,
    isPlaying,
    togglePlay,
    isBeforeAfterActive,
  } = useEditor();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTransition, setActiveTransition] = useState<string>('Fade');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const curSec = rationalTimeToSeconds(currentTime);
  const curFormatted = `00:${String(Math.floor(curSec % 60)).padStart(2, '0')}`;
  const totalFormatted = '00:26';

  // Render 9:16 vertical crop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      compositor.renderSequence(ctx, timelineEngine.getSequence(), currentTime, 1080, 1920, isBeforeAfterActive);
      if (isPlaying) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [currentTime, isPlaying, timelineEngine, compositor, isBeforeAfterActive, project]);

  const transitions = [
    { name: 'None', icon: Ban },
    { name: 'Fade', icon: Layers },
    { name: 'Blur', icon: Sparkles },
    { name: 'Zoom', icon: Maximize2 },
    { name: 'Flash', icon: Zap },
  ];

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-40 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-2xl flex items-center gap-2 border border-purple-400/40"
      >
        <span>📱 Show Mobile 9:16</span>
      </button>
    );
  }

  return (
    <div className="w-[270px] bg-[#0c0d17] border border-zinc-700/80 rounded-3xl p-2.5 shadow-2xl flex flex-col select-none relative shrink-0">
      {/* Smartphone Chassis Frame */}
      <div className="w-full bg-black rounded-2xl border border-zinc-800 overflow-hidden flex flex-col">
        {/* Top iOS Status Bar: 9:41, Dynamic Island */}
        <div className="h-6 px-3 bg-black flex items-center justify-between text-[10px] text-white font-semibold">
          <span>9:41</span>
          <div className="w-16 h-3 bg-zinc-900 rounded-full border border-zinc-800 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-black ml-auto mr-1.5" />
          </div>
          <div className="flex items-center gap-1 text-[9px]">
            <span>5G</span>
            <span>100%</span>
          </div>
        </div>

        {/* In-App Mobile Top Bar */}
        <div className="h-8 px-2.5 bg-zinc-950 flex items-center justify-between border-b border-zinc-850 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 flex items-center justify-center">
              <Play className="w-2.5 h-2.5 text-white fill-white translate-x-0.2" />
            </div>
            <span className="font-bold text-white text-[11px]">CineFlow</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {}}
              className="px-2 py-0.5 rounded-md bg-purple-600 hover:bg-purple-500 text-[10px] font-bold text-white shadow-xs"
            >
              Export
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 text-zinc-500 hover:text-zinc-300"
              title="Minimize Phone Preview"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Live Portrait Video Canvas */}
        <div className="relative aspect-[9/13] bg-zinc-950 flex items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            width={1080}
            height={1920}
            className="w-full h-full object-cover"
          />

          {/* In-video Mobile HUD */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-[10px] bg-black/60 backdrop-blur-xs px-2 py-1 rounded-lg">
            <div className="font-mono text-[9px]">
              <span>{curFormatted}</span> / <span className="text-zinc-400">{totalFormatted}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button onClick={togglePlay} className="p-0.5 hover:text-purple-400">
                {isPlaying ? <Pause className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-white" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Editing Action Buttons: Cut, Text, Effects, Filters, Music */}
        <div className="py-2 px-1 bg-zinc-950 border-t border-zinc-850 flex items-center justify-around text-zinc-400">
          <button className="flex flex-col items-center gap-0.5 hover:text-white transition">
            <Scissors className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[9px]">Cut</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 hover:text-white transition">
            <Type className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[9px]">Text</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 hover:text-white transition">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-[9px]">Effects</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 hover:text-white transition">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[9px]">Filters</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 hover:text-white transition">
            <Music className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[9px]">Music</span>
          </button>
        </div>

        {/* Transitions Selector Shelf */}
        <div className="p-2 bg-[#0d0f1a] border-t border-zinc-850">
          <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-300 mb-1.5 px-0.5">
            <span>Transitions</span>
            <span className="text-[9px] text-purple-400">Pro Library</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {transitions.map((t) => {
              const Icon = t.icon;
              const isSel = activeTransition === t.name;
              return (
                <button
                  key={t.name}
                  onClick={() => setActiveTransition(t.name)}
                  className={`px-2 py-1 rounded-lg border text-center flex flex-col items-center gap-0.5 shrink-0 transition ${
                    isSel
                      ? 'bg-purple-950 border-purple-500 text-purple-200 shadow-xs'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="text-[8px] font-medium">{t.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
