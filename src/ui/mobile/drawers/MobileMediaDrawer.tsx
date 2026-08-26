/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { useEditor } from '../../context/EditorContext';
import {
  Upload,
  Film,
  Image as ImageIcon,
  Music,
  Plus,
  X,
  Layers,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { createRationalTime, secondsToRationalTime, rationalTimeToSeconds } from '../../../core/time/RationalTime';
import { AddClipCommand } from '../../../engine/command/implementations/AddClipCommand';
import { createBaseClip, VideoClip } from '../../../domain/timeline/Clip';

interface MobileMediaDrawerProps {
  onClose: () => void;
}

export const MobileMediaDrawer: React.FC<MobileMediaDrawerProps> = ({ onClose }) => {
  const {
    project,
    timelineEngine,
    commandManager,
    currentTime,
    importFile,
    removeMediaAsset,
    uploadStates,
  } = useEditor();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      await importFile(files[i]);
    }
  };

  const handleAddMediaToTimeline = (asset: any, isPip = false) => {
    const sequence = timelineEngine.getSequence();
    let targetTrack = isPip
      ? sequence.tracks.find((t) => t.kind === 'video' && t.name.includes('V2')) ||
        sequence.tracks.find((t) => t.kind === 'video')
      : sequence.tracks.find((t) => t.kind === 'video');

    if (!targetTrack && sequence.tracks.length > 0) {
      targetTrack = sequence.tracks[0];
    }

    if (!targetTrack) return;

    const base = createBaseClip(
      `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      asset.type === 'image' ? 'image' : 'video',
      asset.name,
      targetTrack.id,
      {
        start: currentTime,
        duration: asset.duration || secondsToRationalTime(5),
      },
      {
        start: createRationalTime(0),
        duration: asset.duration || secondsToRationalTime(5),
      }
    );

    const newClip: VideoClip = {
      ...base,
      type: 'video',
      mediaAssetId: asset.id,
    };

    if (isPip) {
      newClip.transform.scale = { x: 0.5, y: 0.5 };
      newClip.transform.position = { x: 300, y: 200 };
    }

    try {
      const cmd = new AddClipCommand(timelineEngine, targetTrack.id, newClip);
      commandManager.execute(cmd);
      onClose();
    } catch (err) {
      console.warn('Failed to add clip:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0d17] text-white">
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-sm">Media Pool</h3>
          <span className="text-[11px] text-zinc-500 font-mono">({project.mediaPool.length})</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action Bar */}
      <div className="p-3 border-b border-zinc-850 flex items-center justify-between gap-2 shrink-0">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-extrabold text-xs shadow-md active:scale-95 transition"
        >
          <Upload className="w-4 h-4" />
          <span>Upload From Device</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,image/*,audio/*"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Active Upload Banners */}
      {uploadStates.length > 0 && (
        <div className="px-3 pt-2 space-y-1.5 shrink-0">
          {uploadStates.map((up) => (
            <div
              key={up.id}
              className={`p-2 rounded-lg text-[11px] border ${
                up.status === 'failed'
                  ? 'bg-red-950/40 border-red-500/50 text-red-300'
                  : up.status === 'ready'
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                  : 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200'
              }`}
            >
              <div className="flex items-center justify-between font-medium">
                <span className="truncate max-w-[200px]">{up.name}</span>
                <span className="text-[9px] uppercase font-bold tracking-wider">{up.status}</span>
              </div>
              {up.status !== 'failed' && (
                <div className="w-full h-1 bg-black/60 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 rounded-full"
                    style={{ width: `${up.progress}%` }}
                  />
                </div>
              )}
              {up.error && (
                <div className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{up.error}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Media Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {project.mediaPool.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="h-40 border-2 border-dashed border-zinc-800 hover:border-cyan-500/50 rounded-2xl flex flex-col items-center justify-center p-4 text-center cursor-pointer bg-[#10121c]"
          >
            <Upload className="w-7 h-7 text-cyan-400 mb-2" />
            <p className="text-xs font-semibold text-zinc-300">No media uploaded yet</p>
            <p className="text-[10px] text-zinc-500 mt-1">Tap here to select MP4, MOV, WebM from your device</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {project.mediaPool.map((asset) => {
              const durSec = rationalTimeToSeconds(asset.duration);
              return (
                <div
                  key={asset.id}
                  className="group relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 flex flex-col"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                    {asset.thumbnailUrl ? (
                      <img
                        src={asset.thumbnailUrl}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : asset.type === 'audio' ? (
                      <Music className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <Film className="w-8 h-8 text-zinc-600" />
                    )}

                    <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 text-[9px] font-mono text-zinc-300">
                      {durSec > 0 ? `${durSec.toFixed(1)}s` : asset.type.toUpperCase()}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMediaAsset(asset.id);
                      }}
                      className="absolute top-1 right-1 p-1 bg-black/70 rounded-full text-zinc-400 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Title & Quick Add */}
                  <div className="p-2 flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-zinc-200 truncate" title={asset.name}>
                      {asset.name}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleAddMediaToTimeline(asset, false)}
                        className="flex-1 py-1 rounded-lg bg-zinc-800 hover:bg-cyan-500 hover:text-black text-[10px] font-bold text-zinc-300 transition flex items-center justify-center gap-1 active:scale-95"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Main Track</span>
                      </button>
                      <button
                        onClick={() => handleAddMediaToTimeline(asset, true)}
                        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-purple-500 hover:text-white text-[10px] font-bold text-purple-300 transition flex items-center justify-center gap-1 active:scale-95"
                        title="Add as Picture-in-Picture Overlay (V2)"
                      >
                        <Layers className="w-3 h-3" />
                        <span>PIP</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
