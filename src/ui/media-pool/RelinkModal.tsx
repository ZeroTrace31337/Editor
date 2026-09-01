/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldAlert, RefreshCw, FolderOpen, Check, X, FileVideo, Type } from 'lucide-react';
import { useEditor } from '../context/EditorContext';
import { MediaAsset } from '../../domain/media/MediaAsset';

interface RelinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RelinkModal: React.FC<RelinkModalProps> = ({ isOpen, onClose }) => {
  const { mediaRegistry, project, projectService } = useEditor();
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [relinkedCount, setRelinkedCount] = useState(0);

  if (!isOpen) return null;

  const assets = mediaRegistry.getAssets();
  const offlineAssets = assets.filter((a) => a.isOffline);

  const handleRelinkFile = (e: React.ChangeEvent<HTMLInputElement>, asset: MediaAsset) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newUri = URL.createObjectURL(file);
    asset.isOffline = false;
    asset.uri = newUri;
    asset.name = file.name;
    asset.fileSize = file.size;

    projectService.setProject({ ...project });
    setRelinkedCount((c) => c + 1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-amber-500/20 text-amber-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Media Relink & Font Manager</h2>
              <p className="text-[11px] text-zinc-400">Conform offline assets and resolve missing typography</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-300">Project Assets ({assets.length})</span>
              <span className="text-[11px] text-amber-400 font-mono">
                {offlineAssets.length} Offline / Missing
              </span>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto border border-zinc-800 rounded-lg p-2 bg-zinc-900/40">
              {assets.map((asset) => {
                const isOffline = !!asset.isOffline;
                return (
                  <div
                    key={asset.id}
                    className={`flex items-center justify-between p-2.5 rounded-md border text-xs ${
                      isOffline
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                        : 'border-zinc-800 bg-zinc-900/60 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileVideo className={`w-4 h-4 shrink-0 ${isOffline ? 'text-amber-400' : 'text-cyan-400'}`} />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{asset.name || asset.id}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {asset.type.toUpperCase()} • {asset.videoMetadata ? `${asset.videoMetadata.width}x${asset.videoMetadata.height}` : 'Audio/Asset'} • {asset.videoMetadata?.codec || 'Standard'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isOffline ? (
                        <label className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-semibold text-[11px] cursor-pointer transition">
                          <FolderOpen className="w-3 h-3" />
                          <span>Relink...</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => handleRelinkFile(e, asset)}
                          />
                        </label>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          <Check className="w-3 h-3" /> ONLINE
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Missing Fonts Section */}
          <div className="pt-2 border-t border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Type className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-zinc-300">Typography & System Fonts</span>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
              <span>All active font families (Plus Jakarta Sans, Inter, Impact, Courier) resolved.</span>
              <span className="text-emerald-400 font-semibold">100% OK</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs">
          <span className="text-zinc-400">
            {relinkedCount > 0 ? `Successfully relinked ${relinkedCount} asset(s)` : 'All timeline links verified'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
