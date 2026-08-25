/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useEditor } from '../context/EditorContext';
import {
  Scissors,
  Crop,
  Move,
  Type,
  Magnet,
  Bookmark,
  Search,
  Crosshair,
  Shield,
  Gauge,
  Layers,
  Wand2,
  MoreHorizontal,
  Compass,
} from 'lucide-react';
import { ProxyManagerModal } from '../media-pool/ProxyManagerModal';
import { SplitClipCommand } from '../../engine/command/implementations/SplitClipCommand';
import { AddClipCommand } from '../../engine/command/implementations/AddClipCommand';
import { AddMaskCommand } from '../../engine/command/implementations/MaskCommands';
import { createDefaultMask } from '../../domain/mask/ClipMask';
import { createBaseClip } from '../../domain/timeline/Clip';
import { createRationalTime, secondsToRationalTime } from '../../core/time/RationalTime';

export const QuickActionBar: React.FC = () => {
  const {
    selectedClip,
    selectedClipId,
    timelineEngine,
    commandManager,
    currentTime,
    snappingEnabled,
    setSnappingEnabled,
    setTimelineZoom,
    timelineZoom,
    project,
    projectService,
    setWorkspaceMode,
  } = useEditor();

  const [isProxyModalOpen, setIsProxyModalOpen] = useState(false);
  const [proxyEnabled, setProxyEnabled] = useState(true);

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
    const track = sequence.tracks.find((t) => t.kind === 'video') || sequence.tracks[0];
    const dur = secondsToRationalTime(3.5);
    const clip = createBaseClip(
      `text_${Date.now()}`,
      'text',
      'TITLE HEADING',
      track.id,
      { start: currentTime, duration: dur },
      { start: createRationalTime(0), duration: dur }
    );
    (clip as any).text = 'TITLE HEADING';
    (clip as any).fontSize = 54;
    (clip as any).textColor = '#ffffff';
    (clip as any).align = 'center';
    (clip as any).animation = 'fade';
    const cmd = new AddClipCommand(timelineEngine, track.id, clip as any);
    commandManager.execute(cmd);
  };

  const handleAddMarker = () => {
    const newMarker = {
      id: `m_${Date.now()}`,
      name: `Marker ${((project as any).markers || []).length + 1}`,
      time: currentTime,
      color: '#f59e0b',
    };
    (project as any).markers = [...((project as any).markers || []), newMarker];
    projectService.setProject({ ...project });
  };

  const handleChromaKey = () => {
    if (!selectedClip) return;
    const chromaFx = {
      id: `chroma_${Date.now()}`,
      effectId: 'chroma_key',
      name: 'Chroma Key (Green Screen)',
      enabled: true,
      params: { keyColor: '#00ff00', similarity: 0.4, smoothness: 0.1 },
      opacity: 1.0,
    };
    selectedClip.effects = [...(selectedClip.effects || []), chromaFx];
    projectService.setProject({ ...project });
    setWorkspaceMode('effects');
  };

  const handleAddMask = () => {
    if (!selectedClip) return;
    const mask = createDefaultMask('rectangle');
    const cmd = new AddMaskCommand(timelineEngine, selectedClip.id, mask);
    commandManager.execute(cmd);
  };

  const handleCycleSpeed = () => {
    if (!selectedClip) return;
    const speeds = [1.0, 1.5, 2.0, 0.5];
    const current = selectedClip.speed || 1.0;
    const next = speeds[(speeds.indexOf(current) + 1) % speeds.length];
    selectedClip.speed = next;
    projectService.setProject({ ...project });
  };

  const handleAddTransition = () => {
    if (!selectedClip) return;
    selectedClip.transitionIn = {
      id: `trans_${Date.now()}`,
      type: 'cross-dissolve',
      duration: secondsToRationalTime(1.0),
      position: 'in',
      alignment: 'start',
    };
    projectService.setProject({ ...project });
  };

  return (
    <div className="h-9 bg-[#0b0c16] border-t border-b border-zinc-800/80 px-3 flex items-center justify-between select-none shrink-0 text-xs">
      {/* Left Quick Editing Tools */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleSplit}
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          title="Split at Playhead (C / Ctrl+B)"
        >
          <Scissors className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setWorkspaceMode('adjust')}
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          title="Crop & Transform"
        >
          <Crop className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setWorkspaceMode('adjust')}
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          title="Transform Position"
        >
          <Move className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleAddQuickText}
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          title="Add Text Layer (T)"
        >
          <Type className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setSnappingEnabled(!snappingEnabled)}
          className={`p-1 rounded transition ${
            snappingEnabled ? 'text-purple-400 bg-purple-950/50' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
          title="Toggle Magnet Snapping (N)"
        >
          <Magnet className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleAddMarker}
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          title="Add Marker (M)"
        >
          <Bookmark className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setTimelineZoom(timelineZoom === 80 ? 120 : 80)}
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          title="Zoom Timeline (+/-)"
        >
          <Search className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right Quick Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {/* Proxy ON Pill */}
        <button
          onClick={() => setIsProxyModalOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition ${
            proxyEnabled
              ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-300'
              : 'bg-zinc-900 border-zinc-800 text-zinc-500'
          }`}
          title="Manage Proxy & Cache Generation"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${proxyEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
          <span>Proxy {proxyEnabled ? 'ON' : 'OFF'}</span>
        </button>

        {/* Chroma Key */}
        <button
          onClick={handleChromaKey}
          className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-purple-500/60 text-zinc-300 hover:text-white transition text-[11px]"
          title="Apply Green Screen / Chroma Key"
        >
          <Wand2 className="w-3 h-3 text-emerald-400" />
          <span>Chroma Key</span>
        </button>

        {/* Mask */}
        <button
          onClick={handleAddMask}
          className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-purple-500/60 text-zinc-300 hover:text-white transition text-[11px]"
          title="Add Mask & Feather"
        >
          <Shield className="w-3 h-3 text-amber-400" />
          <span>Mask</span>
        </button>

        {/* Speed */}
        <button
          onClick={handleCycleSpeed}
          className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-purple-500/60 text-zinc-300 hover:text-white transition text-[11px]"
          title="Cycle Clip Speed (0.5x, 1x, 1.5x, 2x)"
        >
          <Gauge className="w-3 h-3 text-pink-400" />
          <span>Speed {selectedClip?.speed ? `${selectedClip.speed}x` : ''}</span>
        </button>

        {/* Transition */}
        <button
          onClick={handleAddTransition}
          className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-purple-500/60 text-zinc-300 hover:text-white transition text-[11px]"
          title="Apply Cross Dissolve Transition"
        >
          <Layers className="w-3 h-3 text-purple-400" />
          <span>Transition</span>
        </button>
      </div>

      <ProxyManagerModal isOpen={isProxyModalOpen} onClose={() => setIsProxyModalOpen(false)} />
    </div>
  );
};
