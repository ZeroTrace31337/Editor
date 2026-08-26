/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Zap,
  HardDrive,
  Cpu,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  X,
  Play,
  Trash2,
  RefreshCw,
  Sliders,
  Film,
} from 'lucide-react';
import { useEditor } from '../context/EditorContext';
import { ProxyEngine } from '../../engine/proxy/ProxyEngine';
import {
  ProxyResolutionQuality,
  ProxyWorkflowMode,
  ProxyCodecFormat,
} from '../../engine/proxy/ProxyTypes';

interface ProxyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProxyManagerModal: React.FC<ProxyManagerModalProps> = ({ isOpen, onClose }) => {
  const { project } = useEditor();
  const proxyEngine = ProxyEngine.getInstance();
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = proxyEngine.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, [proxyEngine]);

  if (!isOpen) return null;

  const settings = proxyEngine.getSettings();
  const assetStatuses = proxyEngine.getAllStatuses();

  // Register any project assets not yet registered
  project.mediaPool.forEach((a) => proxyEngine.registerAsset(a));

  const totalOriginalMb = assetStatuses.reduce((acc, a) => acc + a.originalSizeMb, 0);
  const totalProxyMb = assetStatuses
    .filter((a) => a.status === 'ready')
    .reduce((acc, a) => acc + (a.proxySizeMb || 0), 0);
  const readyCount = assetStatuses.filter((a) => a.status === 'ready').length;

  const handleGenerateAll = () => {
    proxyEngine.generateAll(project.mediaPool);
  };

  const handleDeleteAll = () => {
    proxyEngine.deleteAllProxies();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="bg-[#111320] border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Professional Proxy Workflow Deck
              </h2>
              <p className="text-xs text-zinc-400">
                Smooth timeline scrubbing for 4K/8K media with background downsampling
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Top Stats Banner */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Proxy Engine</span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                <Zap className="w-3.5 h-3.5" />
                <span>{settings.enabled ? 'ACTIVE' : 'BYPASSED'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Proxies Ready</span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {readyCount} / {assetStatuses.length} Clips
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Source Footprint</span>
              <div className="text-xs font-mono font-bold text-zinc-300">
                {totalOriginalMb} MB (High-Res)
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Memory Bandwidth</span>
              <div className="text-xs font-mono font-bold text-cyan-300">
                {totalProxyMb} MB (~85% lighter)
              </div>
            </div>
          </div>

          {/* Master Toggle & Global Options */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-zinc-200">Enable Timeline Proxy Playback</span>
                <p className="text-[11px] text-zinc-400">
                  Substitutes high-res video streams with lightweight proxies during scrub
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => proxyEngine.updateSettings({ enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>

            {/* Quality & Format Controls */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-zinc-800/80 text-[11px]">
              <div className="space-y-1">
                <span className="font-semibold text-zinc-300">Resolution Quality</span>
                <select
                  value={settings.defaultQuality}
                  onChange={(e) =>
                    proxyEngine.updateSettings({ defaultQuality: e.target.value as ProxyResolutionQuality })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="half">1/2 Resolution (Balanced 1080p)</option>
                  <option value="quarter">1/4 Resolution (Performance 540p)</option>
                  <option value="eighth">1/8 Resolution (Ultra Fast 270p)</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-zinc-300">Proxy Codec Format</span>
                <select
                  value={settings.defaultFormat}
                  onChange={(e) =>
                    proxyEngine.updateSettings({ defaultFormat: e.target.value as ProxyCodecFormat })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="webm">WebM Fast Transcode</option>
                  <option value="h264">H.264 Optimized</option>
                  <option value="prores_proxy">Apple ProRes Proxy</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-zinc-300">Workflow Automation</span>
                <select
                  value={settings.workflowMode}
                  onChange={(e) =>
                    proxyEngine.updateSettings({ workflowMode: e.target.value as ProxyWorkflowMode })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="smart_auto">Smart Auto (4K / 60fps only)</option>
                  <option value="all">Generate for All Media</option>
                  <option value="off">Manual Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Media Assets Proxy Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Project Media Assets ({assetStatuses.length})
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateAll}
                  className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Generate All Proxies</span>
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Clear All</span>
                </button>
              </div>
            </div>

            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-zinc-900/80 border-b border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                <div className="col-span-5">Media Asset</div>
                <div className="col-span-3">Original Res & Size</div>
                <div className="col-span-2">Proxy Status</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              <div className="divide-y divide-zinc-800/60">
                {assetStatuses.length > 0 ? (
                  assetStatuses.map((status) => {
                    const originalAsset = project.mediaPool.find((a) => a.id === status.assetId);
                    return (
                      <div
                        key={status.assetId}
                        className="grid grid-cols-12 gap-2 px-4 py-3 items-center text-xs text-zinc-300 hover:bg-zinc-900/40 transition"
                      >
                        <div className="col-span-5 flex items-center gap-2 truncate">
                          <Film className="w-4 h-4 text-zinc-500 shrink-0" />
                          <span className="font-semibold text-zinc-200 truncate">
                            {status.assetName}
                          </span>
                        </div>

                        <div className="col-span-3 font-mono text-[11px] text-zinc-400">
                          {status.originalWidth}×{status.originalHeight} ({status.originalSizeMb} MB)
                        </div>

                        <div className="col-span-2">
                          {status.status === 'ready' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" /> READY
                            </span>
                          ) : status.status === 'generating' ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 text-cyan-400 text-[10px] font-bold animate-pulse">
                                <Sparkles className="w-3 h-3" /> {Math.round(status.progress * 100)}%
                              </span>
                              <div className="w-16 bg-zinc-800 h-1 rounded-full overflow-hidden">
                                <div
                                  className="bg-cyan-500 h-full transition-all"
                                  style={{ width: `${status.progress * 100}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-500">Original Only</span>
                          )}
                        </div>

                        <div className="col-span-2 flex justify-end gap-1.5">
                          {status.status !== 'ready' && originalAsset && (
                            <button
                              onClick={() =>
                                proxyEngine.generateProxy(
                                  status.assetId,
                                  originalAsset.uri,
                                  status.originalWidth,
                                  status.originalHeight
                                )
                              }
                              className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded border border-cyan-500/30 text-[10px] font-bold transition"
                            >
                              Create
                            </button>
                          )}
                          {status.status === 'ready' && (
                            <button
                              onClick={() => proxyEngine.deleteProxy(status.assetId)}
                              className="p-1 text-zinc-500 hover:text-rose-400 transition"
                              title="Delete Proxy"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-xs text-zinc-500">
                    No video clips in media pool yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800 bg-zinc-950/60">
          <span className="text-[11px] text-zinc-400">
            Export mode automatically renders at full 100% pristine source resolution.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
