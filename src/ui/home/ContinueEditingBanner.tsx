/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Clock, Sparkles, Film, ArrowRight, Layers, Volume2, Palette } from 'lucide-react';
import { RecentProjectItem } from './homeData';

interface ContinueEditingBannerProps {
  recentProject: RecentProjectItem;
  onContinueEditing: (project: RecentProjectItem) => void;
}

export const ContinueEditingBanner: React.FC<ContinueEditingBannerProps> = ({
  recentProject,
  onContinueEditing,
}) => {
  return (
    <div 
      className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#11141f] via-[#10131d] to-[#0c0e15] border border-cyan-500/30 p-4 sm:p-5 shadow-lg group hover:border-cyan-400/50 transition-all duration-300"
      id="continue-editing-card"
    >
      {/* Subtle background glow */}
      <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/15 transition-colors" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 relative z-10">
        {/* Left: Thumbnail & Project Details */}
        <div className="flex items-center gap-4 min-w-0">
          {/* Project Thumbnail with play overlay */}
          <div 
            onClick={() => onContinueEditing(recentProject)}
            className="relative w-28 sm:w-36 h-18 sm:h-22 rounded-lg overflow-hidden shrink-0 border border-zinc-700/80 cursor-pointer shadow-md group-hover:scale-[1.02] transition-transform"
          >
            <img
              src={recentProject.thumbnail}
              alt={recentProject.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-colors">
              <div className="w-8 h-8 rounded-full bg-cyan-400/90 text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="w-4 h-4 fill-black translate-x-0.5" />
              </div>
            </div>
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono font-medium text-white">
              {recentProject.duration}
            </div>
          </div>

          {/* Project Info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                Continue Editing
              </span>
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-500" />
                {recentProject.lastEdited}
              </span>
            </div>

            <h3 
              onClick={() => onContinueEditing(recentProject)}
              className="text-base sm:text-lg font-bold text-white truncate hover:text-cyan-400 cursor-pointer transition-colors"
            >
              {recentProject.name}
            </h3>

            {/* Badges & Meta info */}
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-zinc-400">
              <span className="px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 font-mono text-[11px]">
                {recentProject.aspectRatio}
              </span>
              <span className="px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 font-mono text-[11px]">
                {recentProject.resolution}
              </span>
              <span className="hidden sm:inline-block text-zinc-500">•</span>
              <span className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-400">
                <Palette className="w-3 h-3 text-cyan-400" /> Color Graded
              </span>
              <span className="hidden md:flex items-center gap-1 text-[11px] text-zinc-400">
                <Volume2 className="w-3 h-3 text-cyan-400" /> Audio Mixed
              </span>
            </div>
          </div>
        </div>

        {/* Right: Continue Editing Action Button */}
        <div className="flex items-center gap-3 shrink-0 self-end md:self-center w-full md:w-auto">
          <button
            onClick={() => onContinueEditing(recentProject)}
            id="btn-continue-editing-action"
            className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-xs sm:text-sm shadow-md shadow-cyan-400/20 transition-all active:scale-95 cursor-pointer"
          >
            <span>Continue Editing</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
