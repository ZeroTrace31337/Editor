/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useEditor } from '../../context/EditorContext';
import {
  Volume2,
  VolumeX,
  X,
  Sliders,
  RotateCcw,
} from 'lucide-react';
import { AudioClip } from '../../../domain/timeline/Clip';

interface MobileVolumeDrawerProps {
  onClose: () => void;
}

export const MobileVolumeDrawer: React.FC<MobileVolumeDrawerProps> = ({ onClose }) => {
  const {
    project,
    projectService,
    selectedClipId,
    selectedClip,
  } = useEditor();

  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  useEffect(() => {
    if (selectedClip) {
      setIsMuted(selectedClip.muted || false);
      if (selectedClip.type === 'audio') {
        setVolume((selectedClip as AudioClip).volume ?? 1.0);
      }
    }
  }, [selectedClip]);

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (!selectedClip) return;
    if (selectedClip.type === 'audio') {
      (selectedClip as AudioClip).volume = newVol;
    }
    projectService.setProject({ ...project });
  };

  const handleToggleMute = () => {
    if (!selectedClip) return;
    const newMute = !isMuted;
    setIsMuted(newMute);
    selectedClip.muted = newMute;
    projectService.setProject({ ...project });
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0d17] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-lime-400" />
          <h3 className="font-bold text-sm">Audio Volume & Gain</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Target Status */}
      <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-850 text-xs text-zinc-400 shrink-0">
        {selectedClip ? `Adjusting audio for: ${selectedClip.name}` : 'Select an audio or video clip to adjust volume'}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center gap-6 max-w-sm mx-auto w-full">
        {/* Main Level Display */}
        <div className="text-center">
          <span className="text-4xl font-black font-mono text-lime-400">
            {isMuted ? 'MUTED' : `${(volume * 100).toFixed(0)}%`}
          </span>
          <span className="block text-xs text-zinc-400 mt-1">
            {isMuted ? 'Track Audio Disabled' : volume > 1 ? 'Amplified Gain (+dB)' : 'Normal Output'}
          </span>
        </div>

        {/* Volume Slider */}
        <div className="w-full px-2">
          <input
            type="range"
            min={0}
            max={2.0}
            step={0.05}
            disabled={isMuted}
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full accent-lime-400"
          />
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
            <span>0%</span>
            <span>100% (0 dB)</span>
            <span>200% (+6 dB)</span>
          </div>
        </div>

        {/* Mute Button */}
        <button
          onClick={handleToggleMute}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs transition active:scale-95 ${
            isMuted
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
              : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-300'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-lime-400" />}
          <span>{isMuted ? 'Unmute Audio' : 'Mute Clip Audio'}</span>
        </button>
      </div>
    </div>
  );
};
