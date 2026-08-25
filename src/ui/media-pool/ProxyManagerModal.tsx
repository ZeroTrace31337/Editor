/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { HardDrive, X, Zap, RefreshCw, CheckCircle2, AlertTriangle, Play, FolderSync } from 'lucide-react';
import { useEditor } from '../context/EditorContext';
import { ProxyEngine } from '../../engine/proxy/ProxyEngine';
import { ProxyResolution, ProxyCodec, ProxyPolicyMode } from '../../engine/proxy/ProxyTypes';

interface ProxyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProxyManagerModal: React.FC<ProxyManagerModalProps> = ({ isOpen, onClose }) => {
  const { project } = useEditor();
  const proxyEngine = ProxyEngine.getInstance();

  const [settings, setSettings] = useState(proxyEngine.getSettings());
  const [proxies, setProxies] = useState(proxyEngine.getAllProxies());
  const [relinkPath, setRelinkPath] = useState('');
  const [relinkMsg, setRelinkMsg] = useState('');

  useEffect(() => {
    return proxyEngine.subscribe(() => {
      setSettings(proxyEngine.getSettings());
      setProxies(proxyEngine.getAllProxies());
    });
  }, [proxyEngine]);

  if (!isOpen) return null;

  const handleUpdate = (updates: any) => {
    proxyEngine.updateSettings(updates);
  };

  const handleBatchGenerate = () => {
    project.mediaPool.forEach((asset) => {
      proxyEngine.generateProxy(asset);
    });
  };

  const handleRelink = () => {
    if (!relinkPath) return;
    const count = proxyEngine.relinkProxies(relinkPath);
    setRelinkMsg(`Successfully relinked ${count} proxy media files.`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Proxy & Optimized Media Workflow</h2>
              <p className="text-xs text-zinc-400">Accelerate 4K/8K timeline scrub and complex multi-layer editing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs text-zinc-300">
          {/* Master Enable & Policy */}
          <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/80 flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-zinc-100 block">Enable Proxy Playback</span>
              <span className="text-zinc-400">Automatically routes timeline preview to lightweight proxy media</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => handleUpdate({ enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Proxy Resolution & Codec */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-300">Proxy Resolution</label>
              <select
                value={settings.targetResolution}
                onChange={(e) => handleUpdate({ targetResolution: e.target.value as ProxyResolution })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="1080p">1080p Full HD (High Quality)</option>
                <option value="720p">720p HD (Balanced Speed)</option>
                <option value="540p">540p Quarter Res (Max Performance)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-300">Proxy Codec</label>
              <select
                value={settings.codec}
                onChange={(e) => handleUpdate({ codec: e.target.value as ProxyCodec })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="WebM">WebM (VP9 Fast Intra-frame)</option>
                <option value="H.264">H.264 (AVC Hardware Accelerated)</option>
                <option value="ProRes Proxy">Apple ProRes 422 Proxy</option>
              </select>
            </div>
          </div>

          {/* Media Assets Status List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200">Registered Media Pool ({project.mediaPool.length} Assets)</span>
              <button
                onClick={handleBatchGenerate}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow transition-all"
              >
                <Zap className="w-3.5 h-3.5" /> Generate All Missing
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {project.mediaPool.map((asset) => {
                const proxy = proxies.find((p) => p.assetId === asset.id);
                return (
                  <div
                    key={asset.id}
                    className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-zinc-200 block">{asset.name}</span>
                      <span className="text-[11px] text-zinc-500">
                        {asset.videoMetadata?.width || 1920}×{asset.videoMetadata?.height || 1080} •{' '}
                        {((asset.fileSize || 0) / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {proxy?.state === 'ready' ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-medium text-xs">
                          <CheckCircle2 className="w-4 h-4" /> Ready ({proxy.proxyWidth}×{proxy.proxyHeight})
                        </span>
                      ) : proxy?.state === 'generating' ? (
                        <span className="text-amber-400 flex items-center gap-1 font-medium text-xs animate-pulse">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating...
                        </span>
                      ) : (
                        <button
                          onClick={() => proxyEngine.generateProxy(asset)}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-medium text-xs transition-all"
                        >
                          Generate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Relinking Section */}
          <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/80 space-y-2">
            <span className="font-semibold text-zinc-200 block flex items-center gap-1.5">
              <FolderSync className="w-4 h-4 text-indigo-400" /> Relink Offline Proxies
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. /Volumes/FastSSD/Project_Proxies"
                value={relinkPath}
                onChange={(e) => setRelinkPath(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleRelink}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium text-xs"
              >
                Relink
              </button>
            </div>
            {relinkMsg && <p className="text-emerald-400 text-[11px]">{relinkMsg}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-xs shadow transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
