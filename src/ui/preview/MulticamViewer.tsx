/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Camera, Volume2, Check, Radio, Grid } from 'lucide-react';
import { MulticamEngine } from '../../engine/multicam/MulticamEngine';
import { useEditor } from '../context/EditorContext';

export const MulticamViewer: React.FC = () => {
  const { timelineEngine, projectService, currentTime, isPlaying, togglePlay } = useEditor();
  const multicamEngine = MulticamEngine.getInstance();
  const multicam = multicamEngine.getActiveMulticam();
  const [, setRefresh] = useState(0);

  if (!multicam) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-zinc-950 text-zinc-500 text-xs p-4 text-center">
        <Camera className="w-8 h-8 text-zinc-600 mb-2" />
        <p>No Multicam Sequence Active</p>
        <p className="text-[11px] text-zinc-600 mt-1">Select or create a multicam clip to open the angle switcher</p>
      </div>
    );
  }

  const handleSelectAngle = (idx: number) => {
    multicamEngine.setActiveAngle(idx, timelineEngine, projectService, currentTime);
    setRefresh((r) => r + 1);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden select-none">
      {/* Header */}
      <div className="h-8 px-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Grid className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-zinc-200">{multicam.name}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-mono">
            {multicam.angles.length} CAMERAS
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-400">Click angle to cut live</span>
          {isPlaying && (
            <span className="flex items-center gap-1 text-[10px] text-rose-400 font-bold animate-pulse">
              <Radio className="w-3 h-3" /> LIVE CUTTING
            </span>
          )}
        </div>
      </div>

      {/* 2x2 Multicam Angle Grid */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-1.5 p-2 bg-black min-h-0">
        {multicam.angles.map((angle, idx) => {
          const isActive = idx === multicam.activeAngleIndex;
          const isAudioSource = idx === multicam.audioSourceAngleIndex;

          return (
            <div
              key={angle.id}
              onClick={() => handleSelectAngle(idx)}
              className={`relative rounded-md overflow-hidden bg-zinc-900 border-2 cursor-pointer transition flex flex-col justify-between group ${
                isActive
                  ? 'border-rose-500 shadow-lg shadow-rose-950/40'
                  : 'border-zinc-800 hover:border-zinc-600'
              }`}
            >
              {/* Simulated camera stream preview background */}
              <div
                className="absolute inset-0 opacity-40 bg-gradient-to-br"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 50%, ${angle.colorTag}33, transparent 70%)`,
                }}
              />

              {/* Angle Header Bar */}
              <div className="relative z-10 flex items-center justify-between p-2 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-5 h-5 rounded flex items-center justify-center font-black text-[11px] ${
                      isActive ? 'bg-rose-500 text-white' : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-xs font-semibold text-zinc-100 truncate drop-shadow">
                    {angle.name}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {isAudioSource && (
                    <span className="p-1 rounded bg-emerald-500/20 text-emerald-400" title="Audio Sync Source">
                      <Volume2 className="w-3 h-3" />
                    </span>
                  )}
                  {isActive && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider">
                      PROGRAM
                    </span>
                  )}
                </div>
              </div>

              {/* Center Tally Marker */}
              <div className="relative z-10 flex items-center justify-center my-auto">
                <div
                  className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition ${
                    isActive
                      ? 'border-rose-500 bg-rose-500/20 text-rose-400'
                      : 'border-zinc-700 bg-zinc-800/40 text-zinc-500 group-hover:border-zinc-500'
                  }`}
                >
                  <Camera className="w-5 h-5" />
                </div>
              </div>

              {/* Bottom Info Bar */}
              <div className="relative z-10 flex items-center justify-between p-2 bg-gradient-to-t from-black/80 to-transparent text-[10px] text-zinc-400 font-mono">
                <span>REC.709 4K 24FPS</span>
                <span className="text-zinc-500">HOTKEY [{idx + 1}]</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
