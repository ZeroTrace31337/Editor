/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import {
  Music,
  Mic,
  Volume2,
  Plus,
  Play,
  Pause,
  X,
  Sparkles,
  Radio,
  Sliders,
} from 'lucide-react';
import { createRationalTime, secondsToRationalTime } from '../../../core/time/RationalTime';
import { AddClipCommand } from '../../../engine/command/implementations/AddClipCommand';
import { createBaseClip, AudioClip } from '../../../domain/timeline/Clip';

interface MobileAudioDrawerProps {
  onClose: () => void;
}

const STOCK_MUSIC = [
  { id: 'mus_upbeat', name: 'Cyberpunk Electro Drive', durationSec: 30, genre: 'Electronic' },
  { id: 'mus_chill', name: 'Lofi Sunset Breeze', durationSec: 45, genre: 'Chillhop' },
  { id: 'mus_epic', name: 'Cinematic Orchestral Rise', durationSec: 25, genre: 'Trailer' },
  { id: 'mus_vlog', name: 'Acoustic Bright Morning', durationSec: 20, genre: 'Vlog' },
];

const SOUND_EFFECTS = [
  { id: 'sfx_whoosh', name: 'Fast Camera Whoosh', durationSec: 1.5 },
  { id: 'sfx_impact', name: 'Cinematic Deep Sub Boom', durationSec: 2.0 },
  { id: 'sfx_glitch', name: 'Digital Glitch Zap', durationSec: 1.0 },
  { id: 'sfx_shutter', name: 'Camera Shutter Click', durationSec: 0.8 },
  { id: 'sfx_riser', name: 'Tension Tension Riser', durationSec: 3.0 },
];

export const MobileAudioDrawer: React.FC<MobileAudioDrawerProps> = ({ onClose }) => {
  const {
    timelineEngine,
    commandManager,
    currentTime,
  } = useEditor();

  const [activeTab, setActiveTab] = useState<'music' | 'sfx' | 'voiceover'>('music');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);

  const handleAddAudio = (name: string, durationSec: number) => {
    const sequence = timelineEngine.getSequence();
    let audioTrack = sequence.tracks.find((t) => t.kind === 'audio');
    if (!audioTrack && sequence.tracks.length > 0) {
      audioTrack = sequence.tracks[0];
    }
    if (!audioTrack) return;

    const base = createBaseClip(
      `audio_${Date.now()}`,
      'audio',
      name,
      audioTrack.id,
      {
        start: currentTime,
        duration: secondsToRationalTime(durationSec),
      },
      {
        start: createRationalTime(0),
        duration: secondsToRationalTime(durationSec),
      }
    );

    const audioClip: AudioClip = {
      ...base,
      type: 'audio',
      mediaAssetId: `asset_${Date.now()}`,
      volume: 1.0,
      pan: 0,
      fadeInDuration: createRationalTime(0),
      fadeOutDuration: createRationalTime(0),
    };

    try {
      const cmd = new AddClipCommand(timelineEngine, audioTrack.id, audioClip);
      commandManager.execute(cmd);
      onClose();
    } catch (err) {
      console.warn(err);
    }
  };

  const handleToggleVoiceover = () => {
    if (isRecording) {
      setIsRecording(false);
      handleAddAudio(`Voiceover Recording (${recordTime}s)`, Math.max(recordTime, 3));
    } else {
      setIsRecording(true);
      setRecordTime(0);
      const interval = setInterval(() => {
        setRecordTime((prev) => {
          if (prev >= 60) {
            clearInterval(interval);
            setIsRecording(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0d17] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-sm">Audio & Sound Library</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center p-2 border-b border-zinc-850 gap-2 shrink-0">
        <button
          onClick={() => setActiveTab('music')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'music'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
              : 'text-zinc-400 hover:bg-zinc-900'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span>BGM Music</span>
        </button>

        <button
          onClick={() => setActiveTab('sfx')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'sfx'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
              : 'text-zinc-400 hover:bg-zinc-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Sound Effects</span>
        </button>

        <button
          onClick={() => setActiveTab('voiceover')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'voiceover'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs'
              : 'text-zinc-400 hover:bg-zinc-900'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Voiceover Mic</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'music' && (
          <div className="space-y-2">
            {STOCK_MUSIC.map((track) => (
              <div
                key={track.id}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                    <Music className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-100">{track.name}</h4>
                    <span className="text-[10px] text-zinc-400">
                      {track.genre} • {track.durationSec}s
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleAddAudio(track.name, track.durationSec)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-1 active:scale-95 transition"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'sfx' && (
          <div className="space-y-2">
            {SOUND_EFFECTS.map((sfx) => (
              <div
                key={sfx.id}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-100">{sfx.name}</h4>
                    <span className="text-[10px] text-zinc-400">{sfx.durationSec}s FX</span>
                  </div>
                </div>

                <button
                  onClick={() => handleAddAudio(sfx.name, sfx.durationSec)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs flex items-center gap-1 active:scale-95 transition"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'voiceover' && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-4">
              <span className="text-2xl font-mono font-black text-rose-400">
                00:{recordTime.toString().padStart(2, '0')}
              </span>
              <p className="text-xs text-zinc-400 mt-1">
                {isRecording ? 'Recording audio into project timeline...' : 'Tap record to capture voiceover track'}
              </p>
            </div>

            <button
              onClick={handleToggleVoiceover}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition active:scale-95 ${
                isRecording
                  ? 'bg-rose-600 ring-8 ring-rose-500/30 text-white animate-pulse'
                  : 'bg-zinc-850 hover:bg-zinc-800 border-2 border-rose-500 text-rose-400'
              }`}
            >
              {isRecording ? <Pause className="w-8 h-8 fill-white" /> : <Mic className="w-8 h-8" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
