/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useEditor } from '../context/EditorContext';
import {
  MousePointer2,
  Undo2,
  Redo2,
  Scissors,
  Trash2,
  RotateCw,
  Crop,
  Snowflake,
  Zap,
  Bookmark,
  Mic,
  Crosshair,
  Shield,
  Layers,
  Wand2,
  Activity,
  MoreHorizontal,
  ChevronDown,
} from 'lucide-react';
import { ProxyManagerModal } from '../proxy/ProxyManagerModal';
import { SplitClipCommand } from '../../engine/command/implementations/SplitClipCommand';
import { DeleteClipCommand } from '../../engine/command/implementations/DeleteClipCommand';
import { AddMaskCommand } from '../../engine/command/implementations/MaskCommands';
import { createDefaultMask } from '../../domain/mask/ClipMask';
import { secondsToRationalTime } from '../../core/time/RationalTime';

export const QuickActionBar: React.FC = () => {
  const {
    selectedClip,
    selectedClipId,
    timelineEngine,
    commandManager,
    currentTime,
    undo,
    redo,
    canUndo,
    canRedo,
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

  const handleDelete = () => {
    if (selectedClipId && selectedClip) {
      const cmd = new DeleteClipCommand(timelineEngine, selectedClipId);
      commandManager.execute(cmd);
    }
  };

  const handleRotate = () => {
    if (selectedClip) {
      const curRot = selectedClip.transform?.rotation || 0;
      selectedClip.transform = {
        ...(selectedClip.transform || {
          position: { x: 0, y: 0 },
          scale: { x: 1, y: 1 },
          rotation: 0,
          anchor: { x: 0.5, y: 0.5 },
        }),
        rotation: (curRot + 90) % 360,
      };
      projectService.setProject({ ...project });
    }
  };

  const handleChromaKey = () => {
    if (!selectedClip) return;
    const chromaFx = {
      id: `chroma_${Date.now()}`,
      effectId: 'chroma_key',
      name: 'Chroma Key',
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
      {/* 1. Left Editing Toolbar */}
      <div className="flex items-center gap-1 text-zinc-400">
        {/* Selection Tool Dropdown */}
        <button
          className="flex items-center gap-0.5 p-1 rounded hover:text-white hover:bg-zinc-800 transition"
          title="Selection Tool (V)"
        >
          <MousePointer2 className="w-3.5 h-3.5" />
          <ChevronDown className="w-2 h-2" />
        </button>

        <div className="w-[1px] h-3.5 bg-zinc-800 mx-0.5" />

        {/* Undo & Redo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-1 rounded hover:text-white hover:bg-zinc-800 transition disabled:opacity-30"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-1 rounded hover:text-white hover:bg-zinc-800 transition disabled:opacity-30"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-3.5 bg-zinc-800 mx-0.5" />

        {/* Split Clip */}
        <button
          onClick={handleSplit}
          className="p-1 rounded hover:text-white hover:bg-zinc-800 transition"
          title="Split Clip at Playhead (Ctrl+B / C)"
        >
          <Scissors className="w-3.5 h-3.5" />
        </button>

        {/* Delete */}
        <button
          onClick={handleDelete}
          className="p-1 rounded hover:text-red-400 hover:bg-zinc-800 transition"
          title="Delete Clip (Delete / Backspace)"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* Freeze Frame */}
        <button
          onClick={() => {}}
          className="p-1 rounded hover:text-white hover:bg-zinc-800 transition"
          title="Freeze Frame"
        >
          <Snowflake className="w-3.5 h-3.5" />
        </button>

        {/* Crop */}
        <button
          onClick={() => setWorkspaceMode('adjust')}
          className="p-1 rounded hover:text-white hover:bg-zinc-800 transition"
          title="Crop & Resize"
        >
          <Crop className="w-3.5 h-3.5" />
        </button>

        {/* Rotate */}
        <button
          onClick={handleRotate}
          className="p-1 rounded hover:text-white hover:bg-zinc-800 transition"
          title="Rotate 90°"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {/* Speed */}
        <button
          onClick={handleCycleSpeed}
          className="p-1 rounded hover:text-white hover:bg-zinc-800 transition"
          title="Speed & Duration"
        >
          <Zap className="w-3.5 h-3.5" />
        </button>

        {/* Marker */}
        <button
          onClick={() => {}}
          className="p-1 rounded hover:text-white hover:bg-zinc-800 transition"
          title="Add Marker (M)"
        >
          <Bookmark className="w-3.5 h-3.5" />
        </button>

        {/* Voice Mic Record */}
        <button
          onClick={() => {}}
          className="p-1 rounded hover:text-cyan-400 hover:bg-zinc-800 transition ml-0.5"
          title="Record Voiceover"
        >
          <Mic className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Right Quick Actions Container (Enclosed in a sleek purple-bordered container) */}
      <div className="flex items-center gap-1.5 p-1 rounded-lg border border-purple-900/60 bg-[#121024] shadow-xs">
        {/* Proxy ON Pill */}
        <button
          onClick={() => {
            setProxyEnabled(!proxyEnabled);
            setIsProxyModalOpen(true);
          }}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-600/50 text-emerald-300 text-[10px] font-bold transition hover:bg-emerald-900/80"
          title="Hardware Accelerated Proxy Engine"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Proxy ON</span>
        </button>

        {/* Stabilize */}
        <button
          onClick={() => {}}
          className="px-2 py-0.5 rounded text-[10px] font-medium text-zinc-300 hover:text-white hover:bg-purple-900/40 transition flex items-center gap-1"
        >
          <Activity className="w-2.5 h-2.5 text-cyan-400" />
          <span>Stabilize</span>
        </button>

        {/* Motion Track */}
        <button
          onClick={() => setWorkspaceMode('adjust')}
          className="px-2 py-0.5 rounded text-[10px] font-medium text-zinc-300 hover:text-white hover:bg-purple-900/40 transition flex items-center gap-1"
        >
          <Crosshair className="w-2.5 h-2.5 text-pink-400" />
          <span>Motion Track</span>
        </button>

        {/* Chroma Key */}
        <button
          onClick={handleChromaKey}
          className="px-2 py-0.5 rounded text-[10px] font-medium text-zinc-300 hover:text-white hover:bg-purple-900/40 transition flex items-center gap-1"
        >
          <Wand2 className="w-2.5 h-2.5 text-emerald-400" />
          <span>Chroma Key</span>
        </button>

        {/* Mask */}
        <button
          onClick={handleAddMask}
          className="px-2 py-0.5 rounded text-[10px] font-medium text-zinc-300 hover:text-white hover:bg-purple-900/40 transition flex items-center gap-1"
        >
          <Shield className="w-2.5 h-2.5 text-amber-400" />
          <span>Mask</span>
        </button>

        {/* Speed */}
        <button
          onClick={handleCycleSpeed}
          className="px-2 py-0.5 rounded text-[10px] font-medium text-zinc-300 hover:text-white hover:bg-purple-900/40 transition flex items-center gap-1"
        >
          <Zap className="w-2.5 h-2.5 text-yellow-400" />
          <span>Speed</span>
        </button>

        {/* Transition */}
        <button
          onClick={handleAddTransition}
          className="px-2 py-0.5 rounded text-[10px] font-medium text-zinc-300 hover:text-white hover:bg-purple-900/40 transition flex items-center gap-1"
        >
          <Layers className="w-2.5 h-2.5 text-purple-400" />
          <span>Transition</span>
        </button>

        {/* More ... */}
        <button
          onClick={() => {}}
          className="p-0.5 rounded text-zinc-400 hover:text-white hover:bg-purple-900/40 transition"
        >
          <MoreHorizontal className="w-3 h-3" />
        </button>
      </div>

      <ProxyManagerModal isOpen={isProxyModalOpen} onClose={() => setIsProxyModalOpen(false)} />
    </div>
  );
};
