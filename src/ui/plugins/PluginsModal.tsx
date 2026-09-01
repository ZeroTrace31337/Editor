/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Package, Shield, Check, X, ToggleLeft, ToggleRight, Sparkles, Plus, Code } from 'lucide-react';
import { PluginManager } from '../../engine/plugins/PluginManager';
import { PluginInstance } from '../../engine/plugins/PluginSDK';

interface PluginsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PluginsModal: React.FC<PluginsModalProps> = ({ isOpen, onClose }) => {
  const pluginManager = PluginManager.getInstance();
  const [plugins, setPlugins] = useState<PluginInstance[]>(pluginManager.getPlugins());
  const [showManifestJson, setShowManifestJson] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = pluginManager.subscribe(() => {
      setPlugins(pluginManager.getPlugins());
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleToggle = (id: string, current: boolean) => {
    pluginManager.setPluginEnabled(id, !current);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 border border-zinc-800 rounded-xl max-w-2xl w-full shadow-2xl text-zinc-100 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-indigo-500/20 text-indigo-400">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide text-white">Plugin Extension Ecosystem</h2>
              <p className="text-[11px] text-zinc-400">Sandboxed video filters, audio DSP nodes, and canvas generators</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Plugin List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {plugins.map((plugin) => (
            <div
              key={plugin.manifest.id}
              className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-start justify-between gap-4 transition hover:border-zinc-700"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-white">{plugin.manifest.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                    v{plugin.manifest.version}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 uppercase font-mono">
                    {plugin.manifest.capability.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">{plugin.manifest.description}</p>

                <div className="flex items-center gap-4 text-[11px] text-zinc-500 pt-1">
                  <span>Author: {plugin.manifest.author}</span>
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-emerald-400" />
                    <span>Permissions: {plugin.manifest.permissions.join(', ')}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() =>
                    setShowManifestJson(
                      showManifestJson === plugin.manifest.id ? null : plugin.manifest.id
                    )
                  }
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                  title="View Manifest JSON"
                >
                  <Code className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleToggle(plugin.manifest.id, plugin.enabled)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    plugin.enabled
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {plugin.enabled ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </>
                  ) : (
                    <span>Disabled</span>
                  )}
                </button>
              </div>
            </div>
          ))}

          {showManifestJson && (
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-cyan-300 overflow-x-auto">
              <pre>
                {JSON.stringify(
                  plugins.find((p) => p.manifest.id === showManifestJson)?.manifest,
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs">
          <span className="text-zinc-500">
            {plugins.filter((p) => p.enabled).length} of {plugins.length} plugins active
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
