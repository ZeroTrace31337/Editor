/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ChevronLeft,
  Undo2,
  Redo2,
  Download,
  Ratio,
  Monitor,
  Smartphone,
  Sparkles,
  Settings,
  Layers,
  Check,
} from 'lucide-react';
import { useEditor } from '../context/EditorContext';

interface MobileEditorHeaderProps {
  onReturnHome: () => void;
  onOpenExport: () => void;
  onToggleDesktopMode: () => void;
  isTablet?: boolean;
}

const ASPECT_OPTIONS = [
  { label: '9:16', name: 'Shorts / TikTok', width: 1080, height: 1920 },
  { label: '16:9', name: 'YouTube / Widescreen', width: 1920, height: 1080 },
  { label: '1:1', name: 'Instagram Square', width: 1080, height: 1080 },
  { label: '4:5', name: 'Portrait Social', width: 1080, height: 1350 },
  { label: '21:9', name: 'Cinematic Scope', width: 2560, height: 1080 },
];

export const MobileEditorHeader: React.FC<MobileEditorHeaderProps> = ({
  onReturnHome,
  onOpenExport,
  onToggleDesktopMode,
  isTablet = false,
}) => {
  const {
    project,
    projectService,
    canUndo,
    canRedo,
    undo,
    redo,
  } = useEditor();

  const [isAspectMenuOpen, setIsAspectMenuOpen] = useState(false);

  const currentAspect = project.settings.aspectRatio || '16:9';

  const handleSelectAspect = (option: typeof ASPECT_OPTIONS[0]) => {
    project.settings.aspectRatio = option.label as any;
    project.settings.canvasWidth = option.width;
    project.settings.canvasHeight = option.height;
    projectService.setProject({ ...project });
    setIsAspectMenuOpen(false);
  };

  return (
    <header className="h-14 bg-[#0a0c14] border-b border-zinc-800/90 px-3 flex items-center justify-between text-white shrink-0 relative z-30 select-none">
      {/* Left: Back to Home + Project Title */}
      <div className="flex items-center gap-1.5 min-w-0">
        <button
          onClick={onReturnHome}
          className="p-2 -ml-1 text-zinc-400 hover:text-white active:scale-95 transition rounded-xl hover:bg-zinc-800/60 touch-manipulation cursor-pointer"
          title="Return to Home"
          aria-label="Return to Home"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
        </button>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-zinc-100 truncate max-w-[120px] sm:max-w-[180px]">
              {project.metadata.name || 'Untitled Project'}
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shrink-0 font-semibold">
              {currentAspect}
            </span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono hidden sm:block">
            {project.settings.canvasWidth}x{project.settings.canvasHeight} • {project.settings.frameRate.numerator}fps
          </span>
        </div>
      </div>

      {/* Center: Aspect Ratio Pill + Undo / Redo */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Aspect Ratio Selector Button */}
        <div className="relative">
          <button
            onClick={() => setIsAspectMenuOpen(!isAspectMenuOpen)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-750 text-[11px] font-semibold text-zinc-200 transition active:scale-95 touch-manipulation"
          >
            <Ratio className="w-3.5 h-3.5 text-cyan-400" />
            <span>{currentAspect}</span>
          </button>

          {isAspectMenuOpen && (
            <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 w-48 bg-[#12141d] border border-zinc-700/90 rounded-2xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Canvas Aspect Ratio
              </div>
              {ASPECT_OPTIONS.map((opt) => {
                const isSelected = currentAspect === opt.label;
                return (
                  <button
                    key={opt.label}
                    onClick={() => handleSelectAspect(opt)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition ${
                      isSelected
                        ? 'bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30'
                        : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <div>
                      <span className="block font-semibold">{opt.label}</span>
                      <span className="text-[10px] text-zinc-400 font-normal">{opt.name}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Undo Button */}
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`p-2 rounded-xl border transition active:scale-95 touch-manipulation cursor-pointer ${
            canUndo
              ? 'bg-zinc-900 border-zinc-750 text-zinc-200 hover:bg-zinc-800'
              : 'bg-zinc-950/40 border-zinc-900 text-zinc-600 opacity-40 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        {/* Redo Button */}
        <button
          onClick={redo}
          disabled={!canRedo}
          className={`p-2 rounded-xl border transition active:scale-95 touch-manipulation cursor-pointer ${
            canRedo
              ? 'bg-zinc-900 border-zinc-750 text-zinc-200 hover:bg-zinc-800'
              : 'bg-zinc-950/40 border-zinc-900 text-zinc-600 opacity-40 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Switch Mode + Export Button */}
      <div className="flex items-center gap-2">
        {/* Toggle to Desktop layout button */}
        <button
          onClick={onToggleDesktopMode}
          className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition active:scale-95 touch-manipulation"
          title="Switch to Desktop PC Interface"
        >
          <Monitor className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Export Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-extrabold text-xs shadow-md shadow-cyan-500/20 active:scale-95 transition touch-manipulation cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
