/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Palette, Layers } from 'lucide-react';
import { useEditor } from '../context/EditorContext';
import { VideoScopesPanel } from './VideoScopesPanel';
import { ColorPanel } from '../inspector/ColorPanel';

export const ColorWorkspaceView: React.FC = () => {
  const { project, selectedClip, setSelectedClipId } = useEditor();

  const allClips = project.sequences[0].tracks.flatMap((t) => t.clips);

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-200 overflow-hidden">
      {/* Top Shot Strip (Shot-to-Shot matching) */}
      <div className="h-20 bg-zinc-900/90 border-b border-zinc-800 flex items-center px-4 gap-3 overflow-x-auto shrink-0">
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
          <Palette className="w-4 h-4 text-indigo-400" />
          Shots ({allClips.length})
        </div>
        <div className="flex gap-2">
          {allClips.map((clip) => {
            const isSel = clip.id === selectedClip?.id;
            return (
              <button
                key={clip.id}
                onClick={() => setSelectedClipId(clip.id)}
                className={`relative w-24 h-14 rounded-lg overflow-hidden border-2 transition-all flex flex-col justify-end p-1.5 shrink-0 text-left ${
                  isSel
                    ? 'border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg bg-zinc-900'
                    : 'border-zinc-700/60 hover:border-zinc-500 bg-zinc-950'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
                <span className="relative z-20 text-[10px] font-semibold truncate text-zinc-200 block">
                  {clip.name}
                </span>
                {clip.colorGrade && (
                  <div className="absolute top-1.5 right-1.5 z-20 w-2 h-2 rounded-full bg-emerald-400 shadow" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Color Studio Split */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 min-h-0 overflow-hidden">
        {/* Left Column: Color grading controls (wheels, curves, hsl, lut) */}
        <div className="col-span-7 flex flex-col bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 overflow-y-auto">
          {selectedClip ? (
            <ColorPanel clip={selectedClip} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
              <Layers className="w-8 h-8 opacity-40 mb-2" />
              <p className="text-sm font-medium text-zinc-400">No Shot Selected</p>
              <p className="text-xs text-zinc-600 mt-1">Select a clip in the shot strip above or from the timeline to grade.</p>
            </div>
          )}
        </div>

        {/* Right Column: 4-Way Realtime Scopes */}
        <div className="col-span-5 flex flex-col bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 overflow-hidden">
          <VideoScopesPanel />
        </div>
      </div>
    </div>
  );
};
