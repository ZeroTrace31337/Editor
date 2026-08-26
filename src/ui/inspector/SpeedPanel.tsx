/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Gauge,
  Sliders,
  Sparkles,
  Zap,
  Activity,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  RotateCcw,
  Film,
  Play,
  Pause,
  Layers,
  Clock,
  Wind,
  Check,
  X,
  AlertCircle,
  Eye,
  Columns,
  RefreshCw,
  Cpu,
  Flame,
} from 'lucide-react';
import { TimelineClip, VideoClip } from '../../domain/timeline/Clip';
import { useEditor } from '../context/EditorContext';
import { SpeedEngine } from '../../engine/speed/SpeedEngine';
import { SmoothSlowMoEngine, ProcessingProgress } from '../../engine/speed/SmoothSlowMoEngine';
import {
  SpeedTabMode,
  SlowMotionMode,
  SlowMotionQuality,
  SlowMotionMethod,
  SpeedCurvePreset,
  SpeedRampPoint,
  SPEED_PRESETS,
  SMOOTH_SLOW_MO_PRESETS,
  SUPER_SMOOTH_SLOW_MO_PRESETS,
} from '../../engine/speed/SpeedTypes';
import {
  rationalTimeToSeconds,
  secondsToRationalTime,
  compareRationalTime,
} from '../../core/time/RationalTime';

interface SpeedPanelProps {
  clip?: TimelineClip;
}

export const SpeedPanel: React.FC<SpeedPanelProps> = ({ clip: propClip }) => {
  const { selectedClip, project, projectService, mediaRegistry, timelineEngine } = useEditor();
  const clip = propClip || selectedClip;
  const speedEngine = SpeedEngine.getInstance();
  const slowMoEngine = SmoothSlowMoEngine.getInstance();

  const [, setTick] = useState(0);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  // Processing state
  const [processingState, setProcessingState] = useState<ProcessingProgress | null>(null);
  const [previewCompareMode, setPreviewCompareMode] = useState<'original' | 'smooth' | 'super_smooth'>('smooth');
  const [showApplySuccess, setShowApplySuccess] = useState(false);

  // Preview mini-canvas
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewAnimRef = useRef<number | null>(null);
  const previewTimeRef = useRef<number>(0);

  useEffect(() => {
    const unsubSpeed = speedEngine.subscribe(() => setTick((t) => t + 1));
    const unsubSlowMo = slowMoEngine.subscribe(() => setTick((t) => t + 1));
    return () => {
      unsubSpeed();
      unsubSlowMo();
      if (previewAnimRef.current) {
        cancelAnimationFrame(previewAnimRef.current);
      }
    };
  }, [speedEngine, slowMoEngine]);

  useEffect(() => {
    if (!clip) return;
    const unsubProg = slowMoEngine.onProgress(clip.id, (prog) => {
      setProcessingState(prog);
      if (prog.status === 'completed') {
        setShowApplySuccess(true);
        setTimeout(() => setShowApplySuccess(false), 3000);
      }
    });
    return unsubProg;
  }, [clip, slowMoEngine]);

  if (!clip) {
    return (
      <div className="p-6 text-center text-zinc-500 text-xs">
        <Gauge className="w-8 h-8 mx-auto mb-2 opacity-30 text-cyan-400" />
        <p>Select a video clip on the timeline to adjust speed and slow motion.</p>
      </div>
    );
  }

  const speedSettings = speedEngine.getSettings(clip.id);
  const slowMoSettings = speedSettings.slowMotion;
  const activeTab: SpeedTabMode = speedSettings.activeTab || 'normal';

  const sourceDurationSec = Math.max(0.1, rationalTimeToSeconds(clip.sourceRange.duration));
  const currentSpeed = activeTab === 'smooth_slow_mo' || activeTab === 'super_smooth_slow_mo'
    ? slowMoSettings.speed
    : speedSettings.baseSpeed;
  const estimatedDurationSec = sourceDurationSec / Math.max(0.01, currentSpeed);

  // Handlers
  const handleTabChange = (tab: SpeedTabMode) => {
    speedEngine.setActiveTab(clip.id, tab);
    clip.speedSettings = speedEngine.getSettings(clip.id);
    if (tab === 'smooth_slow_mo') {
      clip.speed = speedSettings.slowMotion.speed || 0.5;
    } else if (tab === 'super_smooth_slow_mo') {
      clip.speed = speedSettings.slowMotion.speed || 0.25;
    } else {
      clip.speed = speedSettings.baseSpeed || 1.0;
    }
    projectService.setProject({ ...project });
  };

  const handleBaseSpeedChange = (spd: number) => {
    speedEngine.setBaseSpeed(clip.id, spd);
    clip.speed = spd;
    clip.speedSettings = speedEngine.getSettings(clip.id);
    projectService.setProject({ ...project });
  };

  const handleSlowMoSpeedChange = (spd: number) => {
    speedEngine.setSlowMotionSpeed(clip.id, spd);
    clip.speed = spd;
    clip.speedSettings = speedEngine.getSettings(clip.id);
    projectService.setProject({ ...project });
  };

  const handleSlowMoModeChange = (mode: SlowMotionMode) => {
    speedEngine.setSlowMotionMode(clip.id, mode);
    clip.speedSettings = speedEngine.getSettings(clip.id);
    projectService.setProject({ ...project });
  };

  const handleQualityChange = (quality: SlowMotionQuality) => {
    speedEngine.setSlowMotionQuality(clip.id, quality);
    clip.speedSettings = speedEngine.getSettings(clip.id);
    projectService.setProject({ ...project });
  };

  const handleMethodChange = (method: SlowMotionMethod) => {
    speedEngine.setSlowMotionMethod(clip.id, method);
    clip.speedSettings = speedEngine.getSettings(clip.id);
    projectService.setProject({ ...project });
  };

  const handlePresetCurveChange = (preset: SpeedCurvePreset) => {
    speedEngine.setCurvePreset(clip.id, preset);
    clip.speedSettings = speedEngine.getSettings(clip.id);
    projectService.setProject({ ...project });
  };

  const handleToggleReverse = (val: boolean) => {
    speedEngine.updateSettings(clip.id, { reverse: val });
    clip.speedSettings = speedEngine.getSettings(clip.id);
    projectService.setProject({ ...project });
  };

  const handleTogglePreservePitch = (val: boolean) => {
    speedEngine.updateSettings(clip.id, { preservePitch: val });
    slowMoEngine.updateSlowMotionSettings(clip, { preservePitch: val });
    clip.speedSettings = speedEngine.getSettings(clip.id);
    projectService.setProject({ ...project });
  };

  const handleToggleMuteAudio = (val: boolean) => {
    slowMoEngine.updateSlowMotionSettings(clip, { muteAudio: val });
    clip.muted = val;
    clip.speedSettings = speedEngine.getSettings(clip.id);
    projectService.setProject({ ...project });
  };

  const handleAddPoint = () => {
    const pt = speedEngine.addRampPoint(clip.id, 0.5, 2.0);
    setSelectedPointId(pt.id);
    clip.speedSettings = speedEngine.getSettings(clip.id);
    projectService.setProject({ ...project });
  };

  const handleUpdatePoint = (ptId: string, updates: Partial<SpeedRampPoint>) => {
    speedEngine.updateRampPoint(clip.id, ptId, updates);
    clip.speedSettings = speedEngine.getSettings(clip.id);
    projectService.setProject({ ...project });
  };

  const handleRemovePoint = (ptId: string) => {
    speedEngine.removeRampPoint(clip.id, ptId);
    setSelectedPointId(null);
    clip.speedSettings = speedEngine.getSettings(clip.id);
    projectService.setProject({ ...project });
  };

  // Timeline Duration Sync Handler
  const handleApplyToTimeline = () => {
    const spd = Math.max(0.01, clip.speed || 1.0);
    const newDurationSec = rationalTimeToSeconds(clip.sourceRange.duration) / spd;
    clip.timelineRange = {
      start: clip.timelineRange.start,
      duration: secondsToRationalTime(newDurationSec),
    };
    timelineEngine.recalculateSequenceDuration();
    projectService.setProject({ ...project });
    setShowApplySuccess(true);
    setTimeout(() => setShowApplySuccess(false), 3000);
  };

  // Start background processing
  const handleStartProcessing = async () => {
    try {
      await slowMoEngine.processSmoothSlowMotion(clip, mediaRegistry);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelProcessing = () => {
    slowMoEngine.cancelProcessing(clip.id);
  };

  const selectedPoint = speedSettings.rampPoints.find((p) => p.id === selectedPointId);

  return (
    <div className="space-y-3.5 p-3 bg-[#111320] rounded-xl border border-zinc-800 select-none text-xs">
      {/* Header & Speed Mode Sub-Navigation */}
      <div className="space-y-2 pb-2 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
              Speed & Slow Motion
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-400 font-mono">
              {sourceDurationSec.toFixed(1)}s → <span className="text-cyan-300 font-bold">{estimatedDurationSec.toFixed(1)}s</span>
            </span>
            <span className="text-[11px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              {currentSpeed.toFixed(2)}x
            </span>
          </div>
        </div>

        {/* Mode Selector Tabs: Normal | Custom | Smooth Slow Motion | Super Smooth Slow Motion */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-950/80 rounded-lg border border-zinc-850">
          {[
            { id: 'normal', label: 'Normal' },
            { id: 'custom', label: 'Custom' },
            { id: 'smooth_slow_mo', label: 'Smooth' },
            { id: 'super_smooth_slow_mo', label: 'Super Smooth' },
          ].map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id as SpeedTabMode)}
                className={`py-1.5 px-1 text-[10px] font-medium rounded transition text-center whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500 text-black font-bold shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. NORMAL SPEED TAB */}
      {/* ========================================================================= */}
      {activeTab === 'normal' && (
        <div className="space-y-3">
          {/* Quick Speed Pills */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-zinc-300">Quick Speed Factor</span>
              <span className="text-zinc-500 text-[10px]">Click to set constant speed</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {SPEED_PRESETS.map((spd) => {
                const isCurrent = Math.abs(speedSettings.baseSpeed - spd) < 0.01;
                return (
                  <button
                    key={spd}
                    onClick={() => handleBaseSpeedChange(spd)}
                    className={`py-1.5 rounded border text-[10px] font-medium transition ${
                      isCurrent
                        ? 'bg-cyan-500 text-black font-bold border-cyan-400 shadow-xs'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-cyan-500/60'
                    }`}
                  >
                    {spd}x
                  </button>
                );
              })}
            </div>
          </div>

          {/* Continuous Multiplier Slider */}
          <div className="space-y-1 p-2.5 bg-zinc-900/60 rounded-lg border border-zinc-800/80">
            <div className="flex justify-between text-[11px]">
              <span className="text-zinc-400">Continuous Speed Multiplier</span>
              <span className="text-cyan-400 font-mono font-bold">{speedSettings.baseSpeed.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="10.0"
              step="0.05"
              value={speedSettings.baseSpeed}
              onChange={(e) => handleBaseSpeedChange(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-zinc-500 font-mono pt-1">
              <span>0.1x (Slow-mo)</span>
              <span>1.0x (Normal)</span>
              <span>10.0x (Hyperlapse)</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CUSTOM CURVE SPEED TAB */}
      {/* ========================================================================= */}
      {activeTab === 'custom' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-zinc-300">Speed Ramping Presets</span>
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  'Standard',
                  'Montage',
                  'Bullet',
                  'Hero',
                  'Jump Cut',
                  'Fast In',
                  'Fast Out',
                  'Slow In',
                  'Slow Out',
                ] as SpeedCurvePreset[]
              ).map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePresetCurveChange(preset)}
                  className={`p-1.5 rounded border text-[10px] text-center capitalize transition ${
                    speedSettings.curvePreset === preset
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Visual Graph */}
          <div className="p-2.5 bg-zinc-900/90 rounded-lg border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-300">Curve Graph</span>
              <button
                onClick={handleAddPoint}
                className="flex items-center gap-1 px-2 py-0.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded border border-cyan-500/30 text-[10px] font-bold transition"
              >
                <Plus className="w-3 h-3" />
                <span>Add Point</span>
              </button>
            </div>

            <div className="relative w-full h-24 bg-zinc-950 rounded border border-zinc-800 overflow-hidden">
              <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-zinc-700/60" />
              <span className="absolute left-1 top-1/2 -translate-y-4 text-[9px] text-zinc-500 font-mono">1.0x</span>

              <svg className="w-full h-full">
                {speedSettings.rampPoints.length > 1 && (
                  <path
                    d={speedSettings.rampPoints.reduce((acc, pt, idx, arr) => {
                      const x = pt.timeRatio * 100;
                      const y = 100 - (pt.speed / 5.0) * 80;
                      if (idx === 0) return `M ${x}% ${y}%`;
                      const prev = arr[idx - 1];
                      const prevX = prev.timeRatio * 100;
                      const prevY = 100 - (prev.speed / 5.0) * 80;
                      const cpX = (prevX + x) / 2;
                      return `${acc} C ${cpX}% ${prevY}%, ${cpX}% ${y}%, ${x}% ${y}%`;
                    }, '')}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                  />
                )}

                {speedSettings.rampPoints.map((pt) => {
                  const xPercent = pt.timeRatio * 100;
                  const yPercent = Math.max(10, Math.min(90, 100 - (pt.speed / 5.0) * 80));
                  const isSelected = selectedPointId === pt.id;
                  return (
                    <g key={pt.id} onClick={() => setSelectedPointId(pt.id)} className="cursor-pointer">
                      <circle
                        cx={`${xPercent}%`}
                        cy={`${yPercent}%`}
                        r={isSelected ? 6 : 4}
                        fill={isSelected ? '#22d3ee' : '#0891b2'}
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 2 : 1}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            {selectedPoint && (
              <div className="p-2 bg-zinc-950 rounded border border-zinc-800/80 space-y-2 text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-cyan-300">Point Position & Speed</span>
                  {speedSettings.rampPoints.length > 2 && (
                    <button
                      onClick={() => handleRemovePoint(selectedPoint.id)}
                      className="text-rose-400 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-zinc-400">Pos:</span>{' '}
                    <span className="text-zinc-200 font-mono">{(selectedPoint.timeRatio * 100).toFixed(0)}%</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={selectedPoint.timeRatio}
                      onChange={(e) => handleUpdatePoint(selectedPoint.id, { timeRatio: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="text-zinc-400">Speed:</span>{' '}
                    <span className="text-cyan-400 font-mono font-bold">{selectedPoint.speed.toFixed(2)}x</span>
                    <input
                      type="range"
                      min="0.1"
                      max="6.0"
                      step="0.1"
                      value={selectedPoint.speed}
                      onChange={(e) => handleUpdatePoint(selectedPoint.id, { speed: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SMOOTH SLOW MOTION TAB */}
      {/* ========================================================================= */}
      {activeTab === 'smooth_slow_mo' && (
        <div className="space-y-3">
          {/* Badge and description */}
          <div className="p-2 bg-cyan-950/30 border border-cyan-500/30 rounded-lg flex items-start gap-2 text-[11px] text-cyan-200">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-cyan-300">Free Motion-Aware Optical Flow:</span> Generates
              intermediate frames between existing frames to eliminate stuttering and duplicate frame lag.
            </div>
          </div>

          {/* Speed Presets: 0.75x, 0.5x, 0.25x */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-zinc-200">Slow Motion Speed Rate</span>
              <span className="text-cyan-400 font-mono font-bold">{slowMoSettings.speed.toFixed(2)}x</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {SMOOTH_SLOW_MO_PRESETS.map((spd) => {
                const isCurrent = Math.abs(slowMoSettings.speed - spd) < 0.01;
                return (
                  <button
                    key={spd}
                    onClick={() => handleSlowMoSpeedChange(spd)}
                    className={`py-2 rounded-lg border text-[11px] font-bold transition flex flex-col items-center justify-center ${
                      isCurrent
                        ? 'bg-cyan-500 text-black border-cyan-400 shadow-sm'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-cyan-500'
                    }`}
                  >
                    <span>{spd}x</span>
                    <span className={`text-[9px] font-normal ${isCurrent ? 'text-black/80' : 'text-zinc-500'}`}>
                      {spd === 0.75 ? 'Smooth Savor' : spd === 0.5 ? 'Half Speed' : 'Quarter Speed'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Granular slow motion slider */}
            <div className="pt-1">
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={slowMoSettings.speed}
                onChange={(e) => handleSlowMoSpeedChange(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Processing Mode: Original | Smooth */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-semibold text-zinc-300">Processing Mode</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'original', label: 'Original', desc: 'No interpolation (fastest)' },
                { id: 'smooth', label: 'Smooth', desc: 'Motion-aware optical flow' },
              ].map((m) => {
                const isCurrent = slowMoSettings.mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSlowMoModeChange(m.id as SlowMotionMode)}
                    className={`p-2 rounded-lg border text-left transition ${
                      isCurrent
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="text-[11px] font-semibold">{m.label}</div>
                    <div className="text-[9px] opacity-70">{m.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUPER SMOOTH SLOW MOTION TAB */}
      {/* ========================================================================= */}
      {activeTab === 'super_smooth_slow_mo' && (
        <div className="space-y-3">
          {/* Badge */}
          <div className="p-2 bg-indigo-950/40 border border-indigo-500/30 rounded-lg flex items-start gap-2 text-[11px] text-indigo-200">
            <Flame className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-indigo-300">Super Smooth Optical Flow:</span> Intensive multi-scale
              pyramid frame interpolation with sub-pixel motion refinement for seamless slow-motion down to 0.125x.
            </div>
          </div>

          {/* Speed Presets: 0.5x, 0.25x, 0.125x */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-zinc-200">Super Slow-Mo Speed</span>
              <span className="text-indigo-400 font-mono font-bold">{slowMoSettings.speed.toFixed(3)}x</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {SUPER_SMOOTH_SLOW_MO_PRESETS.map((spd) => {
                const isCurrent = Math.abs(slowMoSettings.speed - spd) < 0.005;
                return (
                  <button
                    key={spd}
                    onClick={() => handleSlowMoSpeedChange(spd)}
                    className={`py-2 rounded-lg border text-[11px] font-bold transition flex flex-col items-center justify-center ${
                      isCurrent
                        ? 'bg-indigo-500 text-white border-indigo-400 shadow-sm'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-indigo-500'
                    }`}
                  >
                    <span>{spd}x</span>
                    <span className={`text-[9px] font-normal ${isCurrent ? 'text-white/80' : 'text-zinc-500'}`}>
                      {spd === 0.5 ? '2x Smooth' : spd === 0.25 ? '4x Ultra' : '8x Extreme'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Slider */}
            <div className="pt-1">
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.025"
                value={slowMoSettings.speed}
                onChange={(e) => handleSlowMoSpeedChange(parseFloat(e.target.value))}
                className="w-full accent-indigo-400 h-1.5 bg-zinc-800 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Processing Mode: Smooth vs Super Smooth */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-semibold text-zinc-300">Interpolation Engine</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'smooth', label: 'Smooth Mode', desc: 'Balanced real-time' },
                { id: 'super_smooth', label: 'Super Smooth', desc: 'Multi-scale optical flow' },
              ].map((m) => {
                const isCurrent = slowMoSettings.mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSlowMoModeChange(m.id as SlowMotionMode)}
                    className={`p-2 rounded-lg border text-left transition ${
                      isCurrent
                        ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="text-[11px] font-semibold">{m.label}</div>
                    <div className="text-[9px] opacity-70">{m.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADVANCED SLOW MOTION CONTROLS (Quality, Method, Motion Smoothing, Blur) */}
      {/* ========================================================================= */}
      {(activeTab === 'smooth_slow_mo' || activeTab === 'super_smooth_slow_mo') && (
        <div className="space-y-3 pt-2 border-t border-zinc-800">
          {/* Quality Options: Draft | High | Ultra */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-zinc-300">Processing Quality</span>
            <div className="grid grid-cols-3 gap-1">
              {(['draft', 'high', 'ultra'] as SlowMotionQuality[]).map((q) => {
                const isCurrent = slowMoSettings.quality === q;
                return (
                  <button
                    key={q}
                    onClick={() => handleQualityChange(q)}
                    className={`py-1.5 px-1 rounded border text-[10px] capitalize transition ${
                      isCurrent
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {q}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Processing Method */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-zinc-300">Processing Method</span>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'optical_flow', label: 'Optical Flow' },
                { id: 'frame_blending', label: 'Frame Blend' },
                { id: 'motion_vector', label: 'Motion Vector' },
              ].map((m) => {
                const isCurrent = slowMoSettings.method === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleMethodChange(m.id as SlowMotionMethod)}
                    className={`py-1.5 px-1 rounded border text-[10px] transition ${
                      isCurrent
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Motion Smoothing Slider */}
          <div className="space-y-1 p-2 bg-zinc-900/60 rounded-lg border border-zinc-800/80">
            <div className="flex justify-between text-[11px]">
              <span className="text-zinc-300">Motion Smoothing Filter</span>
              <span className="text-cyan-400 font-mono font-bold">{slowMoSettings.motionSmoothing}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={slowMoSettings.motionSmoothing}
              onChange={(e) => speedEngine.setMotionSmoothing(clip.id, parseInt(e.target.value, 10))}
              className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
            />
          </div>

          {/* Motion Blur & Shutter Angle */}
          <div className="space-y-1.5 p-2 bg-zinc-900/60 rounded-lg border border-zinc-800/80">
            <label className="flex items-center justify-between text-zinc-300 cursor-pointer">
              <span className="flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-indigo-400" />
                Natural Directional Motion Blur
              </span>
              <input
                type="checkbox"
                checked={slowMoSettings.motionBlur}
                onChange={(e) => {
                  slowMoEngine.updateSlowMotionSettings(clip, { motionBlur: e.target.checked });
                  projectService.setProject({ ...project });
                }}
                className="rounded bg-zinc-800 text-cyan-500 focus:ring-0"
              />
            </label>

            {slowMoSettings.motionBlur && (
              <div className="space-y-1 pt-1 text-[10px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Shutter Angle</span>
                  <span className="text-cyan-400">{slowMoSettings.shutterAngle}° (180° cinematic)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={slowMoSettings.shutterAngle}
                  onChange={(e) => {
                    slowMoEngine.updateSlowMotionSettings(clip, { shutterAngle: parseInt(e.target.value, 10) });
                    projectService.setProject({ ...project });
                  }}
                  className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AUDIO CONTROLS (Pitch Preservation, Mute Audio) */}
      {/* ========================================================================= */}
      <div className="space-y-2 pt-2 border-t border-zinc-800 text-[11px]">
        <span className="font-semibold text-zinc-300">Audio Sync & Pitch</span>

        <label className="flex items-center justify-between text-zinc-300 cursor-pointer p-1.5 bg-zinc-900/60 rounded border border-zinc-800/80">
          <span className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            Preserve Audio Pitch (Time-Stretch)
          </span>
          <input
            type="checkbox"
            checked={speedSettings.preservePitch}
            onChange={(e) => handleTogglePreservePitch(e.target.checked)}
            className="rounded bg-zinc-800 text-cyan-500 focus:ring-0"
          />
        </label>

        <label className="flex items-center justify-between text-zinc-300 cursor-pointer p-1.5 bg-zinc-900/60 rounded border border-zinc-800/80">
          <span className="flex items-center gap-1.5">
            <VolumeX className="w-3.5 h-3.5 text-zinc-400" />
            Mute Clip Audio in Slow Motion
          </span>
          <input
            type="checkbox"
            checked={clip.muted || slowMoSettings.muteAudio}
            onChange={(e) => handleToggleMuteAudio(e.target.checked)}
            className="rounded bg-zinc-800 text-cyan-500 focus:ring-0"
          />
        </label>

        <label className="flex items-center justify-between text-zinc-300 cursor-pointer p-1.5 bg-zinc-900/60 rounded border border-zinc-800/80">
          <span className="flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" /> Reverse Playback
          </span>
          <input
            type="checkbox"
            checked={speedSettings.reverse}
            onChange={(e) => handleToggleReverse(e.target.checked)}
            className="rounded bg-zinc-800 text-cyan-500 focus:ring-0"
          />
        </label>
      </div>

      {/* ========================================================================= */}
      {/* PRE-RENDER PROCESSING & TIMELINE COMMIT */}
      {/* ========================================================================= */}
      <div className="space-y-2.5 pt-2 border-t border-zinc-800">
        {/* Processing Progress Bar */}
        {processingState && processingState.status === 'synthesizing' && (
          <div className="p-2.5 bg-zinc-900 rounded-lg border border-cyan-500/30 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-cyan-300 font-semibold flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                Synthesizing Optical Flow Frames...
              </span>
              <span className="font-mono text-cyan-400 font-bold">
                {Math.round(processingState.progress * 100)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-150"
                style={{ width: `${processingState.progress * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span>
                Frame {processingState.currentFrame} of {processingState.totalFrames}
              </span>
              <button
                onClick={handleCancelProcessing}
                className="text-rose-400 hover:underline text-[10px] font-semibold"
              >
                Cancel Processing
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons: Apply to Timeline | Pre-render */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleApplyToTimeline}
            className="flex-1 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-sm shadow-cyan-500/20"
          >
            <Check className="w-4 h-4" />
            <span>Apply Duration to Timeline</span>
          </button>

          {(activeTab === 'smooth_slow_mo' || activeTab === 'super_smooth_slow_mo') && (
            <button
              onClick={handleStartProcessing}
              disabled={slowMoEngine.isProcessing(clip.id)}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-lg text-xs border border-zinc-700 transition flex items-center gap-1.5"
              title="Pre-render and cache all interpolated frames for instant playback"
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Pre-render</span>
            </button>
          )}
        </div>

        {showApplySuccess && (
          <div className="p-2 bg-emerald-950/60 border border-emerald-500/40 rounded text-emerald-300 text-[11px] text-center font-medium animate-fadeIn">
            ✓ Slow motion speed & timeline duration updated successfully!
          </div>
        )}
      </div>
    </div>
  );
};
