/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useEditor } from '../context/EditorContext';
import { MediaAsset } from '../../domain/media/MediaAsset';
import { AddClipCommand } from '../../engine/command/implementations/AddClipCommand';
import { createBaseClip } from '../../domain/timeline/Clip';
import { rationalTimeToSeconds, createRationalTime } from '../../core/time/RationalTime';
import {
  Film,
  Music,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  Search,
  Clock,
  Layers,
  AlertTriangle,
} from 'lucide-react';

export const MediaPoolPanel: React.FC = () => {
  const { project, projectService, mediaRegistry, timelineEngine, commandManager, importFile, currentTime } = useEditor();
  const [filterType, setFilterType] = useState<'all' | 'video' | 'audio' | 'image'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const assets = project.mediaPool || [];

  const filteredAssets = assets.filter((asset) => {
    if (filterType !== 'all' && asset.type !== filterType) return false;
    if (searchQuery && !asset.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      try {
        await importFile(files[i]);
      } catch (e) {
        console.error('Import failed', e);
      }
    }
  };

  const handleAddAssetToTimeline = (asset: MediaAsset) => {
    const sequence = timelineEngine.getSequence();
    let targetTrack = sequence.tracks.find((t) => (asset.type === 'audio' ? t.kind === 'audio' : t.kind === 'video'));

    if (!targetTrack) {
      targetTrack = sequence.tracks[0];
    }

    const clipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const clip = createBaseClip(
      clipId,
      asset.type === 'audio' ? 'audio' : asset.type === 'image' ? 'image' : 'video',
      asset.name,
      targetTrack.id,
      { start: currentTime, duration: asset.duration },
      { start: createRationalTime(0), duration: asset.duration }
    );

    (clip as any).mediaAssetId = asset.id;
    if (asset.type === 'audio') {
      (clip as any).volume = 1.0;
      (clip as any).pan = 0.0;
      (clip as any).fadeInDuration = createRationalTime(0);
      (clip as any).fadeOutDuration = createRationalTime(0);
    }

    const cmd = new AddClipCommand(timelineEngine, targetTrack.id, clip as any);
    commandManager.execute(cmd).catch((err) => {
      alert(err.message || 'Failed to place clip on timeline. Check track space.');
    });
  };

  const handleRemoveAsset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    mediaRegistry.removeAsset(id);
    project.mediaPool = project.mediaPool.filter((a) => a.id !== id);
    projectService.setProject({ ...project });
  };

  return (
    <div
      className="flex flex-col h-full bg-zinc-950/70 border-r border-zinc-850 select-none"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      {/* Panel Header */}
      <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-zinc-200 tracking-wide uppercase">Media Pool</span>
          <span className="text-[10px] text-zinc-500 font-mono">({assets.length})</span>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="video/*,audio/*,image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 rounded-md hover:bg-indigo-900/80 hover:text-white transition-all shadow-xs"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Import</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="p-2.5 space-y-2 border-b border-zinc-850">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search media..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-8 pr-2.5 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 text-[11px]">
          {(['all', 'video', 'audio', 'image'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex-1 py-1 rounded text-center capitalize transition-colors ${
                filterType === type
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Assets Grid */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {filteredAssets.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all ${
              isDraggingOver
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/30'
            }`}
          >
            <Upload className="w-8 h-8 text-zinc-600 mb-2" />
            <p className="text-xs font-medium text-zinc-400">Drag & Drop media here</p>
            <p className="text-[10px] text-zinc-600 mt-1">MP4, MOV, WebM, PNG, JPG, WAV, MP3</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredAssets.map((asset) => {
              const durSec = rationalTimeToSeconds(asset.duration);
              return (
                <div
                  key={asset.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify(asset));
                  }}
                  className="group relative bg-zinc-900 border border-zinc-800/90 rounded-lg overflow-hidden hover:border-indigo-500/70 transition-all shadow-xs flex flex-col"
                >
                  {/* Thumbnail Container */}
                  <div className="relative aspect-video bg-zinc-950 flex items-center justify-center overflow-hidden">
                    {asset.thumbnailUrl ? (
                      <img
                        src={asset.thumbnailUrl}
                        alt={asset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : asset.type === 'audio' ? (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-950/60 to-zinc-900 flex items-center justify-center">
                        <Music className="w-8 h-8 text-emerald-400/80" />
                      </div>
                    ) : (
                      <Film className="w-8 h-8 text-zinc-700" />
                    )}

                    {/* Duration Badge */}
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[10px] font-mono text-zinc-200 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-zinc-400" />
                      <span>{durSec.toFixed(1)}s</span>
                    </div>

                    {/* Media Type Icon Badge */}
                    <div className="absolute top-1 left-1 p-1 rounded bg-black/70 backdrop-blur-xs text-zinc-300">
                      {asset.type === 'video' ? (
                        <Film className="w-3 h-3 text-indigo-400" />
                      ) : asset.type === 'audio' ? (
                        <Music className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <ImageIcon className="w-3 h-3 text-amber-400" />
                      )}
                    </div>

                    {/* Quick Add Overlay Button */}
                    <button
                      onClick={() => handleAddAssetToTimeline(asset)}
                      title="Add to Timeline at playhead"
                      className="absolute inset-0 bg-indigo-950/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-1 text-xs font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Place</span>
                    </button>
                  </div>

                  {/* Metadata info */}
                  <div className="p-2 flex items-center justify-between gap-1 bg-zinc-900/90">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-zinc-200 truncate" title={asset.name}>
                        {asset.name}
                      </p>
                      <p className="text-[9px] text-zinc-500 font-mono">
                        {asset.videoMetadata
                          ? `${asset.videoMetadata.width}x${asset.videoMetadata.height}`
                          : asset.audioMetadata
                          ? `${asset.audioMetadata.sampleRate}Hz`
                          : `${(asset.fileSize / 1024 / 1024).toFixed(1)}MB`}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleRemoveAsset(asset.id, e)}
                      title="Remove from project"
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-all rounded hover:bg-zinc-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {asset.isOffline && (
                    <div className="absolute inset-0 bg-red-950/90 border border-red-500/50 flex flex-col items-center justify-center p-2 text-center">
                      <AlertTriangle className="w-6 h-6 text-red-400 mb-1" />
                      <span className="text-xs font-bold text-red-200">Media Offline</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
