/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { PlaybackDiagnostics, PlaybackMetrics } from '../../rendering/playback/PlaybackDiagnostics';
import { Activity, Zap, Cpu, HardDrive, RefreshCw, X, Sliders } from 'lucide-react';

interface PlaybackDiagnosticsOverlayProps {
  onToggleQuality?: () => void;
}

export const PlaybackDiagnosticsOverlay: React.FC<PlaybackDiagnosticsOverlayProps> = ({ onToggleQuality }) => {
  const diagnostics = PlaybackDiagnostics.getInstance();
  const [metrics, setMetrics] = useState<PlaybackMetrics>(diagnostics.getMetrics());
  const [isVisible, setIsVisible] = useState(diagnostics.isDebugEnabled());

  useEffect(() => {
    return diagnostics.subscribe((m) => {
      setMetrics(m);
      setIsVisible(diagnostics.isDebugEnabled());
    });
  }, [diagnostics]);

  if (!isVisible) return null;

  const fpsColor =
    metrics.currentFps >= metrics.targetFps * 0.95
      ? 'text-emerald-400'
      : metrics.currentFps >= metrics.targetFps * 0.75
      ? 'text-amber-400'
      : 'text-rose-400';

  const audioSyncColor =
    Math.abs(metrics.audioSyncMs) < 15
      ? 'text-emerald-400'
      : Math.abs(metrics.audioSyncMs) < 40
      ? 'text-amber-400'
      : 'text-rose-400';

  return (
    <div
      id="playback-diagnostics-hud"
      className="absolute top-3 left-3 z-40 bg-zinc-950/90 border border-zinc-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-[11px] font-mono text-zinc-300 w-72 pointer-events-auto select-none transition-all"
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
        <div className="flex items-center gap-1.5 font-sans font-semibold text-zinc-200">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Playback Telemetry</span>
          <span className="px-1.5 py-0.2 text-[9px] bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 rounded">
            DEV
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => diagnostics.resetCounters()}
            title="Reset metrics counter"
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          <button
            onClick={() => diagnostics.setDebugEnabled(false)}
            title="Hide HUD (Shift+D to toggle)"
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        {/* FPS & Target */}
        <div className="flex items-center justify-between bg-zinc-900/60 px-2 py-1 rounded border border-zinc-800/50">
          <span className="text-zinc-400">FPS / Target:</span>
          <span className="font-bold">
            <span className={fpsColor}>{metrics.currentFps.toFixed(1)}</span>
            <span className="text-zinc-500"> / {metrics.targetFps} fps</span>
          </span>
        </div>

        {/* Frame & Dropped */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-zinc-900/40 px-2 py-1 rounded border border-zinc-800/40">
            <span className="text-zinc-500 block text-[10px]">Frame Dur</span>
            <span className="font-semibold text-zinc-200">{metrics.frameDurationMs.toFixed(1)} ms</span>
          </div>
          <div className="bg-zinc-900/40 px-2 py-1 rounded border border-zinc-800/40">
            <span className="text-zinc-500 block text-[10px]">Dropped / Skip</span>
            <span
              className={`font-semibold ${
                metrics.droppedFrames === 0 ? 'text-zinc-200' : 'text-amber-400'
              }`}
            >
              {metrics.droppedFrames} / {metrics.skippedFrames}
            </span>
          </div>
        </div>

        {/* Latency Pipeline Breakdown */}
        <div className="bg-zinc-900/30 p-1.5 rounded border border-zinc-800/40 space-y-0.5 text-[10px]">
          <div className="flex justify-between text-zinc-400">
            <span>Video Decode:</span>
            <span className="text-zinc-200">{metrics.decodeLatencyMs.toFixed(1)} ms</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Render Pass:</span>
            <span className="text-zinc-200">{metrics.renderLatencyMs.toFixed(1)} ms</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Timeline Graph:</span>
            <span className="text-zinc-200">{metrics.timelineProcessingMs.toFixed(1)} ms</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Color / FX Stack:</span>
            <span className="text-zinc-200">{metrics.effectsProcessingMs.toFixed(1)} ms</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Audio Clock Sync:</span>
            <span className={audioSyncColor}>
              {metrics.audioSyncMs >= 0 ? `+${metrics.audioSyncMs.toFixed(1)}` : metrics.audioSyncMs.toFixed(1)} ms
            </span>
          </div>
        </div>

        {/* Quality & Mode Status */}
        <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-400">
          <div className="flex items-center gap-1">
            <span className="text-zinc-500">Quality:</span>
            <span className="text-zinc-200 font-semibold">{metrics.qualityLevel}</span>
          </div>
          {metrics.isAutoPerformanceActive && (
            <span className="px-1.5 py-0.2 text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
              AUTO THROTTLED
            </span>
          )}
          {metrics.memoryUsedMb !== undefined && (
            <span className="text-zinc-500 font-mono">
              {metrics.memoryUsedMb}MB
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
