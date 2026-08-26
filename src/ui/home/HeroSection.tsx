/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { Plus, FolderOpen, Upload, Sparkles, Film, Play, Zap } from 'lucide-react';

interface HeroSectionProps {
  onNewProject: () => void;
  onOpenProject: () => void;
  onImportMedia: (files: FileList) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onNewProject,
  onOpenProject,
  onImportMedia,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportMedia(e.target.files);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#141722] via-[#0f111a] to-[#0d0f17] border border-zinc-800/80 p-6 md:p-8 lg:p-10 shadow-2xl" id="hero-welcome-area">
      {/* Background Cinematic Glows and Accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none translate-y-1/3" />
      
      {/* Subtle fine grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 lg:gap-10">
        {/* Left Side: Headline & Subtitle */}
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-semibold mb-4 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen GPU-Accelerated NLE Studio</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white font-sans leading-[1.15]">
            Create. Edit. Inspire.
          </h1>

          <p className="mt-3 text-sm sm:text-base text-zinc-400 font-normal leading-relaxed max-w-xl">
            Everything you need to turn your ideas into professional videos. Multi-track timeline, precision color grading, neural AI tools, and instant 4K export.
          </p>

          {/* Action CTAs Row */}
          <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-3.5">
            {/* Primary CTA: + New Project */}
            <button
              onClick={onNewProject}
              id="hero-btn-new-project"
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-black font-extrabold text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200 active:scale-95 group cursor-pointer"
            >
              <div className="w-5 h-5 rounded-md bg-black/15 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
                <Plus className="w-4 h-4 text-black stroke-[3]" />
              </div>
              <span>New Project</span>
            </button>

            {/* Secondary CTA: Open Project */}
            <button
              onClick={onOpenProject}
              id="hero-btn-open-project"
              className="inline-flex items-center gap-2 px-4.5 py-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700/80 hover:border-zinc-600 text-sm font-semibold transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 text-zinc-400 group-hover:text-white" />
              <span>Open Project</span>
            </button>

            {/* Tertiary CTA: Import Media */}
            <button
              onClick={() => fileInputRef.current?.click()}
              id="hero-btn-import-media"
              className="inline-flex items-center gap-2 px-4.5 py-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700/80 hover:border-zinc-600 text-sm font-semibold transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
            >
              <Upload className="w-4 h-4 text-zinc-400 group-hover:text-white" />
              <span>Import Media</span>
            </button>
          </div>
        </div>

        {/* Right Side: Quick Stats / Hardware Acceleration Badge */}
        <div className="hidden xl:flex flex-col gap-3 min-w-[240px] bg-zinc-900/60 backdrop-blur-md p-4 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
            <span className="text-zinc-400 font-medium">Timeline Engine</span>
            <span className="text-cyan-400 font-mono font-semibold">WebGL2 / 60 FPS</span>
          </div>
          <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
            <span className="text-zinc-400 font-medium">Color Precision</span>
            <span className="text-zinc-200 font-mono">32-Bit Float HDR</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Export Engine</span>
            <span className="text-emerald-400 font-mono font-semibold">Hardware H.264 / 4K</span>
          </div>
        </div>
      </div>

      {/* Hidden file input for Import Media */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="video/*,audio/*,image/*"
        className="hidden"
      />
    </section>
  );
};
