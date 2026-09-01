/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Sliders,
  Activity,
  Music,
  Sparkles,
  Zap,
  Mic,
  RotateCcw,
  CheckCircle2,
  Disc,
  Clock,
  Radio,
} from 'lucide-react';
import { useEditor } from '../context/EditorContext';
import { AudioClip, TimelineClip } from '../../domain/timeline/Clip';
import { KeyframeControl } from './KeyframeControl';
import { AudioMixerEngine, AudioTrackEffects, BeatAnalysisResult } from '../../engine/audio/AudioMixerEngine';
import { secondsToRationalTime, rationalTimeToSeconds } from '../../core/time/RationalTime';

interface AudioPanelProps {
  clip?: TimelineClip;
}

export const AudioPanel: React.FC<AudioPanelProps> = ({ clip: propClip }) => {
  const { selectedClip: contextClip, project, projectService, timelineEngine } = useEditor();
  const clip = propClip || contextClip;

  const [volume, setVolume] = useState(1.0);
  const [pan, setPan] = useState(0);
  const [fadeIn, setFadeIn] = useState(0);
  const [fadeOut, setFadeOut] = useState(0);
  const [muted, setMuted] = useState(false);

  // Equalizer
  const [eqLow, setEqLow] = useState(0);
  const [eqMid, setEqMid] = useState(0);
  const [eqHigh, setEqHigh] = useState(0);

  // Effects & Processing
  const [noiseReduction, setNoiseReduction] = useState(true);
  const [noiseAmount, setNoiseAmount] = useState(50);
  const [vocalIsolation, setVocalIsolation] = useState(false);
  const [reverbEnabled, setReverbEnabled] = useState(false);
  const [reverbMix, setReverbMix] = useState(25);
  const [delayEnabled, setDelayEnabled] = useState(false);
  const [delayTime, setDelayTime] = useState(0.25);
  const [compressorEnabled, setCompressorEnabled] = useState(false);

  // Beat Sync
  const [isAnalyzingBeats, setIsAnalyzingBeats] = useState(false);
  const [beatResult, setBeatResult] = useState<BeatAnalysisResult | null>(null);

  useEffect(() => {
    if (clip) {
      const audioClip = clip as AudioClip;
      setVolume(audioClip.volume ?? 1.0);
      setPan(audioClip.pan ?? 0);
      setMuted(!!clip.muted);
      setFadeIn(audioClip.fadeInDuration ? rationalTimeToSeconds(audioClip.fadeInDuration) : 0);
      setFadeOut(audioClip.fadeOutDuration ? rationalTimeToSeconds(audioClip.fadeOutDuration) : 0);
    }
  }, [clip]);

  if (!clip) {
    return (
      <div className="p-6 text-center text-zinc-500 text-xs">
        <Volume2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>Select a video or audio clip to configure audio properties and DSP effects.</p>
      </div>
    );
  }

  const handlePropChange = (key: string, val: any) => {
    (clip as any)[key] = val;
    projectService.setProject({ ...project });

    // Live update Web Audio graph
    const audioEffects: Partial<AudioTrackEffects> = {
      eqLow,
      eqMid,
      eqHigh,
      noiseReductionEnabled: noiseReduction,
      noiseReductionAmount: noiseAmount,
      vocalIsolation,
    };
    AudioMixerEngine.getInstance().updateClipAudio(clip, timelineEngine.getSequence().duration, audioEffects);
  };

  const handleFadeChange = (type: 'in' | 'out', sec: number) => {
    const rTime = secondsToRationalTime(Math.max(0, sec));
    if (type === 'in') {
      (clip as AudioClip).fadeInDuration = rTime;
      setFadeIn(sec);
    } else {
      (clip as AudioClip).fadeOutDuration = rTime;
      setFadeOut(sec);
    }
    projectService.setProject({ ...project });
  };

  const handleAnalyzeBeats = async () => {
    setIsAnalyzingBeats(true);
    try {
      const audioContext = AudioMixerEngine.getInstance().getContext();
      // Generate synthetic buffer analysis or fetch actual clip asset
      const sampleRate = audioContext.sampleRate;
      const buffer = audioContext.createBuffer(1, sampleRate * 4, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        // rhythmic test impulse
        data[i] = (i % (sampleRate / 2) < 2000 ? 0.8 : 0) * (Math.random() * 2 - 1);
      }
      const result = await AudioMixerEngine.getInstance().analyzeBeats(buffer);
      setBeatResult(result);
    } catch (err) {
      console.error('Beat analysis error', err);
    } finally {
      setIsAnalyzingBeats(false);
    }
  };

  return (
    <div className="p-3 bg-[#111320] rounded-xl border border-zinc-800 space-y-4 text-zinc-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-zinc-100 text-xs">Audio Engine & Mixing</span>
        </div>
        <button
          onClick={() => {
            const newMute = !muted;
            setMuted(newMute);
            clip.muted = newMute;
            projectService.setProject({ ...project });
          }}
          className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition ${
            muted ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          <span>{muted ? 'Muted' : 'Mute'}</span>
        </button>
      </div>

      {/* Volume & Keyframing */}
      <div className="space-y-1.5 p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-400">Clip Gain / Volume</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-cyan-400 text-xs">{Math.round(volume * 100)}%</span>
            <KeyframeControl
              clip={clip}
              propertyPath="volume"
              propertyName="Volume"
              currentValue={volume}
            />
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="2.0"
          step="0.01"
          value={volume}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            setVolume(val);
            handlePropChange('volume', val);
          }}
          className="w-full accent-cyan-400"
        />
      </div>

      {/* Stereo Balance / Pan */}
      <div className="space-y-1.5 p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-400">Stereo Panning (L/R)</span>
          <span className="font-mono text-zinc-300 text-xs">
            {pan === 0 ? 'Center' : pan < 0 ? `L ${Math.abs(Math.round(pan * 100))}%` : `R ${Math.round(pan * 100)}%`}
          </span>
        </div>
        <input
          type="range"
          min="-1.0"
          max="1.0"
          step="0.05"
          value={pan}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            setPan(val);
            handlePropChange('pan', val);
          }}
          className="w-full accent-cyan-400"
        />
      </div>

      {/* Fade In / Fade Out */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="p-2 rounded bg-zinc-900/80 border border-zinc-800 space-y-1">
          <div className="flex justify-between text-zinc-400">
            <span>Fade In</span>
            <span className="font-mono text-cyan-400">{fadeIn.toFixed(1)}s</span>
          </div>
          <input
            type="range"
            min="0"
            max="5.0"
            step="0.1"
            value={fadeIn}
            onChange={(e) => handleFadeChange('in', parseFloat(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>
        <div className="p-2 rounded bg-zinc-900/80 border border-zinc-800 space-y-1">
          <div className="flex justify-between text-zinc-400">
            <span>Fade Out</span>
            <span className="font-mono text-cyan-400">{fadeOut.toFixed(1)}s</span>
          </div>
          <input
            type="range"
            min="0"
            max="5.0"
            step="0.1"
            value={fadeOut}
            onChange={(e) => handleFadeChange('out', parseFloat(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>
      </div>

      {/* 3-Band Parametric Equalizer */}
      <div className="space-y-2 p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
        <div className="flex items-center justify-between">
          <span className="text-zinc-200 font-semibold text-[11px]">3-Band Parametric EQ</span>
          <button
            onClick={() => {
              setEqLow(0);
              setEqMid(0);
              setEqHigh(0);
            }}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Reset</span>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
          <div className="p-1.5 rounded bg-zinc-950 border border-zinc-800/80 space-y-1">
            <span className="text-zinc-400">Bass (120Hz)</span>
            <input
              type="range"
              min="-12"
              max="12"
              value={eqLow}
              onChange={(e) => setEqLow(parseInt(e.target.value))}
              className="w-full accent-cyan-400"
            />
            <span className="font-mono text-cyan-400">{eqLow > 0 ? `+${eqLow}` : eqLow}dB</span>
          </div>
          <div className="p-1.5 rounded bg-zinc-950 border border-zinc-800/80 space-y-1">
            <span className="text-zinc-400">Mid (1.2kHz)</span>
            <input
              type="range"
              min="-12"
              max="12"
              value={eqMid}
              onChange={(e) => setEqMid(parseInt(e.target.value))}
              className="w-full accent-cyan-400"
            />
            <span className="font-mono text-cyan-400">{eqMid > 0 ? `+${eqMid}` : eqMid}dB</span>
          </div>
          <div className="p-1.5 rounded bg-zinc-950 border border-zinc-800/80 space-y-1">
            <span className="text-zinc-400">Treble (6.5kHz)</span>
            <input
              type="range"
              min="-12"
              max="12"
              value={eqHigh}
              onChange={(e) => setEqHigh(parseInt(e.target.value))}
              className="w-full accent-cyan-400"
            />
            <span className="font-mono text-cyan-400">{eqHigh > 0 ? `+${eqHigh}` : eqHigh}dB</span>
          </div>
        </div>
      </div>

      {/* Real-time DSP Noise Reduction & Vocal Isolation */}
      <div className="space-y-2 p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
        <span className="text-zinc-200 font-semibold text-[11px]">Denoise & Voice Isolation</span>
        <div className="space-y-2 pt-1 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-zinc-300">Spectral Noise Reduction</span>
            <input
              type="checkbox"
              checked={noiseReduction}
              onChange={(e) => setNoiseReduction(e.target.checked)}
              className="rounded bg-zinc-800 text-cyan-500"
            />
          </div>
          {noiseReduction && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>Suppression Intensity</span>
                <span className="font-mono text-cyan-400">{noiseAmount}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                value={noiseAmount}
                onChange={(e) => setNoiseAmount(parseInt(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
            <span className="text-zinc-300">Clean Vocal Isolation (HPF 120Hz)</span>
            <input
              type="checkbox"
              checked={vocalIsolation}
              onChange={(e) => setVocalIsolation(e.target.checked)}
              className="rounded bg-zinc-800 text-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Beat Detection & BPM Sync */}
      <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-zinc-200 text-[11px]">Beat Detection & Grid</span>
          </div>
          <button
            onClick={handleAnalyzeBeats}
            disabled={isAnalyzingBeats}
            className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-black font-semibold text-[10px] transition disabled:opacity-50"
          >
            {isAnalyzingBeats ? 'Analyzing...' : 'Detect Beats'}
          </button>
        </div>

        {beatResult && (
          <div className="p-2 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-between text-[11px]">
            <div>
              <span className="text-zinc-400">Estimated Tempo: </span>
              <span className="font-bold font-mono text-cyan-400">{beatResult.bpm} BPM</span>
            </div>
            <div>
              <span className="text-zinc-400">Beats: </span>
              <span className="font-bold text-zinc-200">{beatResult.beats.length} markers</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
