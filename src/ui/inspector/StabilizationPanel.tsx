/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Sliders,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Crop,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Camera,
  Film,
  Zap,
} from 'lucide-react';
import { TimelineClip, VideoClip } from '../../domain/timeline/Clip';
import { useEditor } from '../context/EditorContext';
import { StabilizationEngine } from '../../engine/stabilization/StabilizationEngine';
import {
  StabilizationPreset,
  CameraMotionType,
  createDefaultStabilizationSettings,
} from '../../engine/stabilization/StabilizationTypes';
import { rationalTimeToSeconds } from '../../core/time/RationalTime';

interface StabilizationPanelProps {
  clip?: TimelineClip;
}

export const StabilizationPanel: React.FC<StabilizationPanelProps> = ({ clip: propClip }) => {
  const { selectedClip, project, projectService } = useEditor();
  const clip = (propClip || selectedClip) as VideoClip | undefined;
  const stabEngine = StabilizationEngine.getInstance();

  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = stabEngine.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, [stabEngine]);

  if (!clip || clip.type !== 'video') {
    return (
      <div className="p-6 text-center text-zinc-500 text-xs">
        <Shield className="w-8 h-8 mx-auto mb-2 opacity-30 text-cyan-400" />
        <p>Select a video clip to configure optical and gyro stabilization.</p>
      </div>
    );
  }

  const stabData = stabEngine.getOrCreateStabilizationData(clip.id);
  const settings = stabData.settings;

  const updateSetting = (updates: Partial<typeof settings>) => {
    stabEngine.updateSettings(clip.id, updates);
    clip.stabilization = { ...stabData.settings, ...updates };
    projectService.setProject({ ...project });
  };

  const handleApplyPreset = (preset: StabilizationPreset) => {
    stabEngine.applyPreset(clip.id, preset);
    clip.stabilization = stabEngine.getStabilizationData(clip.id)?.settings;
    projectService.setProject({ ...project });
  };

  const handleStartAnalysis = async () => {
    const durSec = rationalTimeToSeconds(clip.timelineRange.duration);
    await stabEngine.analyzeClip(clip.id, durSec, 30);
    clip.stabilization = stabEngine.getStabilizationData(clip.id)?.settings;
    projectService.setProject({ ...project });
  };

  return (
    <div className="space-y-4 p-3 bg-[#111320] rounded-xl border border-zinc-800 select-none">
      {/* Header & Master Toggle */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Video Stabilization
          </span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => updateSetting({ enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-500"></div>
        </label>
      </div>

      {settings.enabled && (
        <div className="space-y-4">
          {/* Analysis Status & Action */}
          <div className="p-3 bg-zinc-900/90 rounded-lg border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-300">Motion Analysis Status</span>
              {stabData.status === 'ready' ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Stabilized ({stabData.analysisFrames.length} frames)
                </span>
              ) : stabData.status === 'analyzing' ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5" /> Analyzing {Math.round(stabData.progress * 100)}%
                </span>
              ) : stabData.status === 'error' ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5" /> Error
                </span>
              ) : (
                <span className="text-[11px] text-zinc-500">Not analyzed</span>
              )}
            </div>

            {/* Progress bar if analyzing */}
            {stabData.status === 'analyzing' && (
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-100"
                  style={{ width: `${stabData.progress * 100}%` }}
                />
              </div>
            )}

            {/* Trigger Button & Cancel */}
            <div className="flex gap-2 pt-1">
              <button
                disabled={stabData.status === 'analyzing'}
                onClick={handleStartAnalysis}
                className="flex-1 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[11px] transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{stabData.status === 'ready' ? 'Re-analyze Clip' : 'Analyze & Stabilize'}</span>
              </button>
              {stabData.status === 'analyzing' && (
                <button
                  onClick={() => stabEngine.cancelAnalysis()}
                  className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Presets Grid */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-zinc-300">Stabilization Presets</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['minimal', 'recommended', 'strong', 'auto', 'custom'] as StabilizationPreset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handleApplyPreset(p)}
                  className={`py-1.5 px-2 rounded border text-[11px] font-medium capitalize transition ${
                    settings.preset === p
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Camera Motion Type */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-zinc-300">Camera Motion Profile</span>
            <div className="grid grid-cols-3 gap-1">
              {(['handheld', 'shake', 'pan', 'tilt', 'rotation', 'mixed'] as CameraMotionType[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => updateSetting({ cameraMotion: mode })}
                  className={`py-1 rounded border text-[10px] capitalize transition ${
                    settings.cameraMotion === mode
                      ? 'bg-zinc-800 border-cyan-400 text-cyan-300 font-semibold'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders: Amount, Smoothness, Crop, Zoom */}
          <div className="space-y-3 pt-1 border-t border-zinc-800">
            {/* Amount */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Stabilization Strength</span>
                <span className="text-cyan-400 font-mono font-bold">{settings.amount}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.amount}
                onChange={(e) => updateSetting({ amount: parseInt(e.target.value, 10), preset: 'custom' })}
                className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Smoothness */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Camera Smoothness</span>
                <span className="text-cyan-400 font-mono font-bold">{settings.smoothness}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.smoothness}
                onChange={(e) => updateSetting({ smoothness: parseInt(e.target.value, 10), preset: 'custom' })}
                className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Crop Boundary */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Border Crop Limit</span>
                <span className="text-cyan-400 font-mono font-bold">{settings.crop}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={settings.crop}
                onChange={(e) => updateSetting({ crop: parseInt(e.target.value, 10), preset: 'custom' })}
                className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Zoom Factor */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Auto-Zoom Compensation</span>
                <span className="text-cyan-400 font-mono font-bold">
                  {settings.autoZoom ? 'Auto' : `${settings.zoom.toFixed(2)}x`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1.0"
                  max="1.5"
                  step="0.01"
                  disabled={settings.autoZoom}
                  value={settings.zoom}
                  onChange={(e) => updateSetting({ zoom: parseFloat(e.target.value), preset: 'custom' })}
                  className="flex-1 accent-cyan-400 h-1 bg-zinc-800 rounded-lg cursor-pointer disabled:opacity-30"
                />
                <button
                  onClick={() => updateSetting({ autoZoom: !settings.autoZoom })}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    settings.autoZoom
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  Auto
                </button>
              </div>
            </div>
          </div>

          {/* Rolling Shutter & Advanced Features */}
          <div className="space-y-2 pt-2 border-t border-zinc-800 text-[11px]">
            <div className="font-semibold text-zinc-300">Rolling Shutter & AI Compensation</div>

            <label className="flex items-center justify-between text-zinc-300 cursor-pointer p-1.5 bg-zinc-900/60 rounded border border-zinc-800/80">
              <span className="flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-cyan-400" /> Rolling Shutter Correction
              </span>
              <input
                type="checkbox"
                checked={settings.rollingShutter.enabled}
                onChange={(e) =>
                  updateSetting({
                    rollingShutter: { ...settings.rollingShutter, enabled: e.target.checked },
                  })
                }
                className="rounded bg-zinc-800 text-cyan-500 focus:ring-0"
              />
            </label>

            {settings.rollingShutter.enabled && (
              <div className="pl-2 space-y-1">
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>Correction Strength</span>
                  <span className="text-cyan-400">{settings.rollingShutter.strength}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.rollingShutter.strength}
                  onChange={(e) =>
                    updateSetting({
                      rollingShutter: { ...settings.rollingShutter, strength: parseInt(e.target.value, 10) },
                    })
                  }
                  className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>
            )}

            <label className="flex items-center justify-between text-zinc-300 cursor-pointer p-1.5 bg-zinc-900/60 rounded border border-zinc-800/80">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> AI Neural Motion Stabilization
              </span>
              <input
                type="checkbox"
                checked={settings.aiStabilization}
                onChange={(e) => updateSetting({ aiStabilization: e.target.checked })}
                className="rounded bg-zinc-800 text-cyan-500 focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between text-zinc-300 cursor-pointer p-1.5 bg-zinc-900/60 rounded border border-zinc-800/80">
              <span className="flex items-center gap-1.5">
                <Crop className="w-3.5 h-3.5 text-amber-400" /> Auto-Crop Blank Borders
              </span>
              <input
                type="checkbox"
                checked={settings.autoCrop}
                onChange={(e) => updateSetting({ autoCrop: e.target.checked })}
                className="rounded bg-zinc-800 text-cyan-500 focus:ring-0"
              />
            </label>
          </div>

          {/* Before/After Preview Split Toggle */}
          <div className="pt-2 border-t border-zinc-800">
            <button
              onClick={() => stabEngine.toggleBeforeAfter(clip.id)}
              className={`w-full py-1.5 rounded border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition ${
                settings.beforeAfterComparison
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{settings.beforeAfterComparison ? 'Showing: Original Video (Bypassed)' : 'Compare with Original'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
