/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useEditor } from '../context/EditorContext';
import { Volume2, VolumeX, Mic, Sliders, Activity, Disc } from 'lucide-react';
import { Track } from '../../domain/timeline/Track';

export const AudioMixerPanel: React.FC = () => {
  const { project, projectService, timelineEngine, isPlaying } = useEditor();
  const sequence = timelineEngine.getSequence();
  const audioTracks = sequence.tracks.filter((t) => t.kind === 'audio');

  const [meterLevels, setMeterLevels] = useState<Record<string, { left: number; right: number }>>({});
  const [masterLevel, setMasterLevel] = useState<{ left: number; right: number }>({ left: 0, right: 0 });

  // Simulate real-time animated audio meters during playback
  useEffect(() => {
    if (!isPlaying) {
      setMeterLevels({});
      setMasterLevel({ left: 0, right: 0 });
      return;
    }

    const interval = setInterval(() => {
      const newMeters: Record<string, { left: number; right: number }> = {};
      let totalL = 0;
      let totalR = 0;

      for (const t of audioTracks) {
        if (t.muted) {
          newMeters[t.id] = { left: 0, right: 0 };
          continue;
        }
        const base = (t.volume ?? 1.0) * (0.4 + Math.random() * 0.5);
        const pan = t.pan ?? 0;
        const left = Math.min(1.0, base * (1 - Math.max(0, pan)));
        const right = Math.min(1.0, base * (1 - Math.max(0, -pan)));
        newMeters[t.id] = { left, right };
        totalL += left;
        totalR += right;
      }

      setMeterLevels(newMeters);
      setMasterLevel({
        left: Math.min(1.0, totalL / Math.max(1, audioTracks.length) * 1.1),
        right: Math.min(1.0, totalR / Math.max(1, audioTracks.length) * 1.1),
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, audioTracks]);

  const handleTrackVolumeChange = (track: Track, vol: number) => {
    track.volume = vol;
    projectService.setProject({ ...project });
  };

  const handleTrackPanChange = (track: Track, pan: number) => {
    track.pan = pan;
    projectService.setProject({ ...project });
  };

  const handleToggleMute = (track: Track) => {
    track.muted = !track.muted;
    projectService.setProject({ ...project });
  };

  const handleToggleSolo = (track: Track) => {
    track.solo = !track.solo;
    projectService.setProject({ ...project });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden select-none">
      {/* Mixer Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            Fairlight Audio Mixer
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">48kHz • 24-bit Float</span>
      </div>

      {/* Multi-Track Channel Strips */}
      <div className="flex-1 flex p-3 gap-3 overflow-x-auto min-h-0 bg-zinc-950/60">
        {audioTracks.map((track, idx) => {
          const meters = meterLevels[track.id] || { left: 0, right: 0 };

          return (
            <div
              key={track.id}
              className="w-28 flex flex-col bg-zinc-900 border border-zinc-800 rounded-lg p-2 shrink-0 items-center justify-between"
            >
              {/* Track Name */}
              <div className="text-center w-full">
                <span className="text-xs font-semibold text-emerald-400 block truncate">
                  {track.name}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">A{idx + 1}</span>
              </div>

              {/* Mute & Solo Buttons */}
              <div className="flex items-center space-x-1 my-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleMute(track)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                    track.muted
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  M
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleSolo(track)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                    track.solo
                      ? 'bg-amber-500 text-black shadow-xs'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  S
                </button>
              </div>

              {/* Stereo Pan Pot */}
              <div className="w-full space-y-0.5 text-center">
                <span className="text-[9px] text-zinc-400 font-mono">
                  {track.pan === 0 ? 'C' : track.pan && track.pan < 0 ? `L${Math.abs(Math.round(track.pan * 100))}` : `R${Math.round((track.pan || 0) * 100)}`}
                </span>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.05"
                  value={track.pan || 0}
                  onChange={(e) => handleTrackPanChange(track, parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Peak Meter & Volume Fader */}
              <div className="flex-1 flex items-center justify-center space-x-2 my-2 w-full min-h-[120px]">
                {/* Meter Bars */}
                <div className="flex space-x-0.5 h-full w-4 bg-zinc-950 rounded p-0.5 border border-zinc-800">
                  <div className="flex-1 bg-zinc-900 rounded-xs relative flex flex-col-reverse overflow-hidden">
                    <div
                      className="w-full bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500 transition-all duration-75"
                      style={{ height: `${meters.left * 100}%` }}
                    />
                  </div>
                  <div className="flex-1 bg-zinc-900 rounded-xs relative flex flex-col-reverse overflow-hidden">
                    <div
                      className="w-full bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500 transition-all duration-75"
                      style={{ height: `${meters.right * 100}%` }}
                    />
                  </div>
                </div>

                {/* Long-throw Vertical Fader */}
                <div className="flex flex-col items-center h-full justify-center">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.01"
                    value={track.volume ?? 1.0}
                    onChange={(e) => handleTrackVolumeChange(track, parseFloat(e.target.value))}
                    className="h-28 w-1 appearance-none bg-zinc-800 rounded-lg cursor-pointer accent-emerald-500"
                    style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                  />
                </div>
              </div>

              {/* Volume dB Readout */}
              <span className="text-[10px] font-mono text-zinc-300">
                {(((track.volume ?? 1.0) - 1.0) * 12).toFixed(1)} dB
              </span>
            </div>
          );
        })}

        {/* Master Bus Channel Strip */}
        <div className="w-32 flex flex-col bg-zinc-900/90 border-2 border-indigo-500/40 rounded-lg p-2 shrink-0 items-center justify-between shadow-lg">
          <div className="text-center w-full">
            <span className="text-xs font-bold text-indigo-300 block">MASTER OUT</span>
            <span className="text-[10px] text-zinc-400 font-mono">Stereo Bus</span>
          </div>

          {/* Master Meters & Faders */}
          <div className="flex-1 flex items-center justify-center space-x-3 my-2 w-full min-h-[140px]">
            <div className="flex space-x-1 h-full w-6 bg-zinc-950 rounded p-0.5 border border-zinc-800">
              <div className="flex-1 bg-zinc-900 rounded-xs relative flex flex-col-reverse overflow-hidden">
                <div
                  className="w-full bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500 transition-all duration-75"
                  style={{ height: `${masterLevel.left * 100}%` }}
                />
              </div>
              <div className="flex-1 bg-zinc-900 rounded-xs relative flex flex-col-reverse overflow-hidden">
                <div
                  className="w-full bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500 transition-all duration-75"
                  style={{ height: `${masterLevel.right * 100}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col items-center h-full justify-center">
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                defaultValue="1.0"
                className="h-32 w-1.5 appearance-none bg-zinc-800 rounded-lg cursor-pointer accent-indigo-500"
                style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
              />
            </div>
          </div>

          <span className="text-[10px] font-mono text-indigo-300 font-semibold">
            0.0 dB (LUFS -14)
          </span>
        </div>
      </div>
    </div>
  );
};
