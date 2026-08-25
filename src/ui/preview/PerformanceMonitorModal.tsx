/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Zap, X, CheckCircle2, Layers, RefreshCw } from 'lucide-react';
import { GPUDeviceManager } from '../../rendering/gpu/GPUDeviceManager';
import { SmartDependencyCache } from '../../rendering/cache/SmartDependencyCache';
import { TaskManager } from '../../engine/tasks/TaskManager';

interface PerformanceMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PerformanceMonitorModal: React.FC<PerformanceMonitorModalProps> = ({ isOpen, onClose }) => {
  const gpuManager = GPUDeviceManager.getInstance();
  const cache = SmartDependencyCache.getInstance();
  const taskManager = TaskManager.getInstance();

  const [gpuInfo] = useState(gpuManager.getCapabilities());
  const [cacheStats, setCacheStats] = useState(cache.getStats());
  const [tasks, setTasks] = useState(taskManager.getTasks());

  useEffect(() => {
    const interval = setInterval(() => {
      setCacheStats(cache.getStats());
      setTasks(taskManager.getTasks());
    }, 500);
    return () => clearInterval(interval);
  }, [cache, taskManager]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Engine Performance & GPU Diagnostics</h2>
              <p className="text-xs text-zinc-400">Real-time telemetry and hardware acceleration metrics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs text-zinc-300 overflow-y-auto max-h-[75vh]">
          {/* Hardware & GPU Acceleration */}
          <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-400" /> GPU Acceleration Layer
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-medium text-[11px] ${
                  gpuInfo.isHardwareAccelerated
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {gpuInfo.backend.toUpperCase()} ACCELERATED
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 block">Renderer / Adapter</span>
                <span className="font-medium text-zinc-200 truncate block">{gpuInfo.deviceName}</span>
              </div>
              <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 block">Max Texture Dimensions</span>
                <span className="font-mono text-zinc-200">{gpuInfo.maxTextureSize} × {gpuInfo.maxTextureSize} px</span>
              </div>
              <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 block">32-Bit Float Color Buffer</span>
                <span className="font-medium text-emerald-400">{gpuInfo.supportsFloatTextures ? 'Supported' : 'No'}</span>
              </div>
              <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 block">Allocated VRAM Pool</span>
                <span className="font-mono text-zinc-200">{(gpuInfo.estimatedVRAMBytes / 1024 / 1024).toFixed(0)} MB</span>
              </div>
            </div>
          </div>

          {/* Smart Dependency Cache Stats */}
          <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-emerald-400" /> Smart Render Cache
              </span>
              <button
                onClick={() => cache.invalidate()}
                className="text-[11px] text-zinc-400 hover:text-rose-400 underline"
              >
                Purge Cache
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">Cache Hits</span>
                <span className="font-mono text-emerald-400 text-base font-bold">{cacheStats.hits}</span>
              </div>
              <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">Cached Frames</span>
                <span className="font-mono text-indigo-400 text-base font-bold">{cacheStats.cachedFrames}</span>
              </div>
              <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">Hit Efficiency</span>
                <span className="font-mono text-zinc-200 text-base font-bold">{(cacheStats.hitRatio * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Background Tasks */}
          <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/80 space-y-2">
            <span className="font-semibold text-zinc-200 block flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" /> Background Tasks ({tasks.length})
            </span>
            {tasks.length === 0 ? (
              <p className="text-zinc-500 text-[11px] italic">No active background tasks.</p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {tasks.slice(0, 5).map((t) => (
                  <div key={t.id} className="p-2 bg-zinc-900 rounded border border-zinc-800 flex justify-between items-center text-[11px]">
                    <span className="text-zinc-200 font-medium">{t.name}</span>
                    <span className="font-mono text-indigo-400">{Math.round(t.progress * 100)}% ({t.status})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-xs shadow transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
