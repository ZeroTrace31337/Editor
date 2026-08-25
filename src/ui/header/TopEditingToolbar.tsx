/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useEditor } from '../context/EditorContext';
import {
  Maximize2,
  RotateCw,
  Wand2,
  Scissors,
  Crop,
  Type,
  Gauge,
  Sparkles,
  Monitor,
  Camera,
  Volume2,
  Sliders,
  ChevronDown,
  Download,
} from 'lucide-react';
import { SplitClipCommand } from '../../engine/command/implementations/SplitClipCommand';
import { createBaseClip } from '../../domain/timeline/Clip';
import { createRationalTime, secondsToRationalTime } from '../../core/time/RationalTime';
import { AddClipCommand } from '../../engine/command/implementations/AddClipCommand';

interface TopEditingToolbarProps {
  onOpenExport?: () => void;
  activeInspectorTab?: 'adjust' | 'effects' | 'tracking' | 'inspector';
  onSelectInspectorTab?: (tab: 'adjust' | 'effects' | 'tracking' | 'inspector') => void;
}

export const TopEditingToolbar: React.FC<TopEditingToolbarProps> = ({
  onOpenExport,
  activeInspectorTab = 'adjust',
  onSelectInspectorTab,
}) => {
  const {
    selectedClipId,
    setSelectedClipId,
    timelineEngine,
    commandManager,
    currentTime,
    project,
    projectService,
  } = useEditor();

  const [qualityPreset, setQualityPreset] = useState<'Full Quality' | 'Half (1080p)' | 'Proxy (720p)'>('Full Quality');
  const [resolutionPreset, setResolutionPreset] = useState<'4K 60fps' | '1080p 60fps' | '1080p 30fps'>('4K 60fps');
  const [isQualityOpen, setIsQualityOpen] = useState(false);
  const [isResOpen, setIsResOpen] = useState(false);

  const handleSplit = () => {
    if (!selectedClipId) {
      const activeClips = timelineEngine.getClipsAtTime(currentTime);
      if (activeClips.length > 0) {
        try {
          const cmd = new SplitClipCommand(timelineEngine, activeClips[0].clip.id, currentTime);
          commandManager.execute(cmd);
        } catch {}
      }
      return;
    }

    try {
      const cmd = new SplitClipCommand(timelineEngine, selectedClipId, currentTime);
      commandManager.execute(cmd);
    } catch {}
  };

  const handleAddQuickText = () => {
    const sequence = timelineEngine.getSequence();
    let targetTrack = sequence.tracks.find((t) => t.kind === 'video') || sequence.tracks[0];
    const dur = secondsToRationalTime(4.0);
    const clipId = `txt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const clip = createBaseClip(
      clipId,
      'text',
      'CineFlow Title',
      targetTrack.id,
      { start: currentTime, duration: dur },
      { start: createRationalTime(0), duration: dur }
    );
    (clip as any).text = 'CineFlow Studio';
    (clip as any).fontSize = 54;
    (clip as any).textColor = '#ffffff';

    const cmd = new AddClipCommand(timelineEngine, targetTrack.id, clip as any);
    commandManager.execute(cmd).then(() => {
      setSelectedClipId(clipId);
      projectService.setProject({ ...project });
    });
  };

  const handleSnapshot = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `CineFlow_Snapshot_${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="h-10 bg-zinc-950/95 border-b border-zinc-800/80 px-3 flex items-center justify-between select-none shrink-0 z-10">
      {/* Left Toolbar Icons & Dropdowns */}
      <div className="flex items-center gap-1.5">
        {/* Fullscreen icon */}
        <button
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen();
            } else {
              document.exitFullscreen();
            }
          }}
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition"
          title="Fullscreen (F)"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Rotate icon */}
        <button
          onClick={() => {}}
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition"
          title="Rotate Frame 90°"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {/* Magic Enhance icon */}
        <button
          onClick={() => {}}
          className="p-1.5 rounded text-zinc-400 hover:text-amber-300 hover:bg-zinc-900 transition"
          title="AI Auto-Enhance"
        >
          <Wand2 className="w-3.5 h-3.5" />
        </button>

        {/* Highlighted Razor Scissors button */}
        <button
          onClick={handleSplit}
          className="p-1.5 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-600/30 transition-all active:scale-95 mx-0.5"
          title="Razor Blade Tool (C / Ctrl+B)"
        >
          <Scissors className="w-3.5 h-3.5" />
        </button>

        {/* Crop tool */}
        <button
          onClick={() => {}}
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition"
          title="Crop & Resize"
        >
          <Crop className="w-3.5 h-3.5" />
        </button>

        {/* Text tool */}
        <button
          onClick={handleAddQuickText}
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition"
          title="Add Text Layer (T)"
        >
          <Type className="w-3.5 h-3.5" />
        </button>

        {/* Speed / Duration tool */}
        <button
          onClick={() => {}}
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition"
          title="Speed Ramp & Duration"
        >
          <Gauge className="w-3.5 h-3.5" />
        </button>

        {/* Sparkles / FX tool */}
        <button
          onClick={() => {}}
          className="p-1.5 rounded text-zinc-400 hover:text-purple-300 hover:bg-zinc-900 transition"
          title="Video FX & Stylize"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-[1px] bg-zinc-800 mx-1" />

        {/* Quality Preset Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsQualityOpen(!isQualityOpen);
              setIsResOpen(false);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-zinc-200 hover:bg-zinc-850 transition"
          >
            <span>{qualityPreset}</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {isQualityOpen && (
            <div className="absolute left-0 mt-1 w-36 bg-zinc-900 border border-zinc-700/80 rounded-lg shadow-xl py-1 z-50 text-xs">
              {(['Full Quality', 'Half (1080p)', 'Proxy (720p)'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setQualityPreset(q);
                    setIsQualityOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-zinc-800 ${
                    qualityPreset === q ? 'text-purple-400 font-semibold' : 'text-zinc-300'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Resolution / FPS Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsResOpen(!isResOpen);
              setIsQualityOpen(false);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-zinc-200 hover:bg-zinc-850 transition"
          >
            <span>{resolutionPreset}</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {isResOpen && (
            <div className="absolute left-0 mt-1 w-36 bg-zinc-900 border border-zinc-700/80 rounded-lg shadow-xl py-1 z-50 text-xs">
              {(['4K 60fps', '1080p 60fps', '1080p 30fps'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setResolutionPreset(r);
                    setIsResOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-zinc-800 ${
                    resolutionPreset === r ? 'text-purple-400 font-semibold' : 'text-zinc-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-4 w-[1px] bg-zinc-800 mx-1" />

        {/* Monitor View Toggle */}
        <button
          onClick={() => {}}
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition"
          title="Dual Monitor Mode"
        >
          <Monitor className="w-3.5 h-3.5" />
        </button>

        {/* Camera Snapshot */}
        <button
          onClick={handleSnapshot}
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition"
          title="Capture Current Still Frame (PNG)"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>

        {/* Volume */}
        <button
          onClick={() => {}}
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition"
          title="Global Audio Monitor"
        >
          <Volume2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: Inspector Tabs & Export Button */}
      <div className="flex items-center gap-3">
        {/* Navigation Tabs: Adjust, Effects, Tracking, Inspector */}
        <div className="flex items-center gap-1 text-xs">
          {(
            [
              { id: 'adjust', label: 'Adjust' },
              { id: 'effects', label: 'Effects' },
              { id: 'tracking', label: 'Tracking' },
              { id: 'inspector', label: 'Inspector' },
            ] as const
          ).map((tab) => {
            const isActive = activeInspectorTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectInspectorTab && onSelectInspectorTab(tab.id)}
                className={`px-3 py-1 font-medium transition-colors relative ${
                  isActive
                    ? 'text-purple-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-[-6px] left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Solid Purple Export Button */}
        {onOpenExport && (
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1 px-3.5 py-1 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-md shadow-md shadow-purple-600/30 transition-all active:scale-95 ml-2"
          >
            <Download className="w-3 h-3" />
            <span>Export</span>
          </button>
        )}
      </div>
    </div>
  );
};
