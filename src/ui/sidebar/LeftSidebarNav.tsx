/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useEditor } from '../context/EditorContext';
import {
  Film,
  Sparkles,
  Layers,
  Type,
  Smile,
  Boxes,
  Package,
  Plus,
  Search,
  Music,
  Image as ImageIcon,
  Upload,
  Crown,
  Grid,
  ListFilter,
  MoreVertical,
  Check,
} from 'lucide-react';
import { EffectRegistry } from '../../rendering/effects/EffectRegistry';
import { TransitionRegistry } from '../../rendering/transitions/TransitionRegistry';
import { AddClipCommand } from '../../engine/command/implementations/AddClipCommand';
import { createBaseClip } from '../../domain/timeline/Clip';
import { createRationalTime, secondsToRationalTime, rationalTimeToSeconds } from '../../core/time/RationalTime';

export type SidebarSection = 'media' | 'effects' | 'transitions' | 'text' | 'stickers' | 'overlay' | 'assets';

export const LeftSidebarNav: React.FC = () => {
  const {
    project,
    projectService,
    mediaRegistry,
    timelineEngine,
    commandManager,
    importFile,
    currentTime,
    selectedClip,
    setSelectedClipId,
  } = useEditor();

  const [activeSection, setActiveSection] = useState<SidebarSection>('media');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'image' | 'audio'>('video');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const assets = project.mediaPool || [];
  const filteredAssets = assets.filter((asset) => {
    if (filterType === 'video' && asset.type !== 'image' && asset.type !== 'video') {
      // If the asset name ends in .mp4 or .mov or type is image/video
      if (!asset.name.endsWith('.mp4') && !asset.name.endsWith('.mov')) return false;
    }
    if (filterType === 'image' && !asset.name.endsWith('.png') && !asset.name.endsWith('.jpg')) {
      if (asset.type !== 'image' || asset.name.endsWith('.mp4')) return false;
    }
    if (filterType === 'audio' && asset.type !== 'audio' && !asset.name.endsWith('.mp3') && !asset.name.endsWith('.wav')) {
      return false;
    }
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

  const handleAddAssetToTimeline = (asset: any) => {
    const sequence = timelineEngine.getSequence();
    let targetTrack = sequence.tracks.find((t) => (asset.type === 'audio' ? t.kind === 'audio' : t.kind === 'video'));
    if (!targetTrack) targetTrack = sequence.tracks[0];

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
    }

    const cmd = new AddClipCommand(timelineEngine, targetTrack.id, clip as any);
    commandManager.execute(cmd).then(() => {
      setSelectedClipId(clipId);
      projectService.setProject({ ...project });
    });
  };

  const formatDurationBadge = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const sidebarButtons: { id: SidebarSection; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'media', label: 'Media', icon: Film },
    { id: 'effects', label: 'Effects', icon: Sparkles },
    { id: 'transitions', label: 'Transitions', icon: Layers },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'stickers', label: 'Stickers', icon: Smile },
    { id: 'overlay', label: 'Overlay', icon: Boxes },
    { id: 'assets', label: 'Assets', icon: Package },
  ];

  const effectsList = [
    { id: 'gaussian-blur', name: 'Gaussian Blur', category: 'Blur', previewColor: 'from-blue-600 to-indigo-800' },
    { id: 'glow', name: 'Neon Glow', category: 'Light', previewColor: 'from-purple-600 to-pink-800' },
    { id: 'sharpen', name: 'Cinematic Sharpen', category: 'Enhance', previewColor: 'from-emerald-600 to-teal-800' },
    { id: 'vignette', name: 'Vignette Shade', category: 'Stylize', previewColor: 'from-zinc-700 to-zinc-950' },
    { id: 'chromatic-aberration', name: 'Chromatic Glitch', category: 'Glitch', previewColor: 'from-red-600 to-cyan-600' },
    { id: 'film-grain', name: '35mm Film Grain', category: 'Retro', previewColor: 'from-amber-700 to-stone-900' },
  ];

  const transitionsList = [
    { id: 'crossfade', name: 'Cross Dissolve', category: 'Basic', duration: '1.0s' },
    { id: 'wipe-right', name: 'Wipe Right', category: 'Wipe', duration: '0.8s' },
    { id: 'zoom-in', name: 'Zoom In', category: 'Motion', duration: '0.6s' },
    { id: 'flash-white', name: 'Flash White', category: 'Impact', duration: '0.4s' },
    { id: 'blur-dissolve', name: 'Directional Blur', category: 'Blur', duration: '1.2s' },
  ];

  const textTemplates = [
    { name: 'Cinematic Title', size: 64, style: 'Bold Minimal' },
    { name: 'Lower Third Pro', size: 36, style: 'Gradient Modern' },
    { name: 'Minimal Subtitle', size: 28, style: 'Clean White' },
    { name: 'Neon Glow Title', size: 56, style: 'Cyberpunk' },
  ];

  return (
    <div className="flex h-full bg-zinc-950 border-r border-zinc-800/80 select-none overflow-hidden">
      {/* 1. Far-Left Vertical Icon Ribbon */}
      <div className="w-16 shrink-0 bg-[#090b12] border-r border-zinc-850 flex flex-col items-center py-3 space-y-1.5 z-10">
        {sidebarButtons.map((btn) => {
          const Icon = btn.icon;
          const isActive = activeSection === btn.id;
          return (
            <button
              key={btn.id}
              type="button"
              onClick={() => setActiveSection(btn.id)}
              className={`w-13 py-2 flex flex-col items-center justify-center rounded-xl text-[10px] font-medium transition-all group relative ${
                isActive
                  ? 'bg-purple-950/60 text-purple-300 font-bold border border-purple-800/50 shadow-inner'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-purple-500 rounded-r-full shadow-sm shadow-purple-500" />
              )}
              <Icon
                className={`w-4 h-4 mb-1 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-purple-400' : 'text-zinc-400'
                }`}
              />
              <span className="leading-tight">{btn.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Content Shelf / Media Library Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0c0d16]">
        {/* SECTION: MEDIA */}
        {activeSection === 'media' && (
          <div
            className="flex-1 flex flex-col min-h-0"
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
            {/* Header with Title & Action Icons */}
            <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white tracking-wide">Project Media</span>
                <div className="flex items-center gap-1 text-zinc-500 ml-2">
                  <Grid className="w-3 h-3 hover:text-zinc-300 cursor-pointer" />
                  <ListFilter className="w-3 h-3 hover:text-zinc-300 cursor-pointer" />
                </div>
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
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-md shadow-xs shadow-purple-600/30 transition active:scale-95"
              >
                <Upload className="w-3 h-3" />
                <span>Import</span>
              </button>
            </div>

            {/* Filter Tabs & Search */}
            <div className="p-2 space-y-2 border-b border-zinc-850">
              {/* Category Pills: Videos, Images, Audio */}
              <div className="flex items-center gap-1 bg-zinc-900/80 p-0.5 rounded-lg border border-zinc-800 text-[11px] font-medium">
                {(
                  [
                    { id: 'video', label: 'Videos' },
                    { id: 'image', label: 'Images' },
                    { id: 'audio', label: 'Audio' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id)}
                    className={`flex-1 py-1 rounded-md text-center transition-all ${
                      filterType === tab.id
                        ? 'bg-purple-600 text-white font-semibold shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search media..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900/90 border border-zinc-800 rounded-md pl-8 pr-2.5 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Media 2-Column Grid */}
            <div className="flex-1 overflow-y-auto p-2.5">
              {filteredAssets.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`h-44 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all ${
                    isDraggingOver
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/30'
                  }`}
                >
                  <Upload className="w-6 h-6 text-zinc-500 mb-1" />
                  <p className="text-xs font-semibold text-zinc-300">Drag & Drop media here</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">MP4, MOV, PNG, JPG, WAV, MP3</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {filteredAssets.map((asset) => {
                    const durSec = rationalTimeToSeconds(asset.duration);
                    const isCrown = ['asset_cinematic_01', 'asset_city_night', 'asset_music_track', 'asset_logo_png'].includes(
                      asset.id
                    );

                    return (
                      <div
                        key={asset.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/json', JSON.stringify(asset));
                        }}
                        onClick={() => handleAddAssetToTimeline(asset)}
                        className="group relative bg-[#111320] border border-zinc-800/90 rounded-xl overflow-hidden hover:border-purple-500/80 transition-all shadow-md flex flex-col cursor-pointer hover:shadow-purple-500/10"
                      >
                        {/* Thumbnail Stage */}
                        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                          {asset.thumbnailUrl ? (
                            <img
                              src={asset.thumbnailUrl}
                              alt={asset.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : asset.type === 'audio' ? (
                            <div className="w-full h-full bg-gradient-to-br from-purple-950 to-zinc-900 flex items-center justify-center">
                              <Music className="w-8 h-8 text-purple-400" />
                            </div>
                          ) : (
                            <Film className="w-8 h-8 text-zinc-700" />
                          )}

                          {/* Golden Crown Pro Badge */}
                          {isCrown && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-500/90 text-black flex items-center justify-center shadow-md">
                              <Crown className="w-3 h-3 fill-black" />
                            </div>
                          )}

                          {/* Duration Badge */}
                          <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[9px] font-mono font-medium text-white">
                            {formatDurationBadge(durSec)}
                          </div>

                          {/* Quick Add Overlay on Hover */}
                          <div className="absolute inset-0 bg-purple-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="p-1 rounded-full bg-purple-600 text-white shadow-lg">
                              <Plus className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>

                        {/* Title & Metadata */}
                        <div className="p-1.5 flex items-center justify-between text-[11px]">
                          <span className="font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                            {asset.name}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION: EFFECTS */}
        {activeSection === 'effects' && (
          <div className="flex-1 flex flex-col p-3 overflow-y-auto space-y-2">
            <div className="text-xs font-bold text-white mb-1">Visual Effects & Shaders</div>
            <div className="grid grid-cols-2 gap-2">
              {effectsList.map((eff) => (
                <div
                  key={eff.id}
                  onClick={() => {
                    if (!selectedClip) {
                      alert('Select a clip on the timeline first to apply this effect.');
                      return;
                    }
                    selectedClip.effects = [
                      ...(selectedClip.effects || []),
                      {
                        id: `fx_${Date.now()}`,
                        effectId: eff.id,
                        name: eff.name,
                        enabled: true,
                        params: {},
                        opacity: 1.0,
                      },
                    ];
                    projectService.setProject({ ...project });
                  }}
                  className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-purple-500 cursor-pointer transition shadow-xs flex flex-col justify-between h-20"
                >
                  <div className={`w-full h-8 rounded-lg bg-gradient-to-r ${eff.previewColor} mb-1 flex items-center justify-center`}>
                    <Sparkles className="w-3.5 h-3.5 text-white/80" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-zinc-200 truncate">{eff.name}</div>
                    <div className="text-[9px] text-zinc-500">{eff.category}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: TRANSITIONS */}
        {activeSection === 'transitions' && (
          <div className="flex-1 flex flex-col p-3 overflow-y-auto space-y-2">
            <div className="text-xs font-bold text-white mb-1">Video Transitions</div>
            <div className="text-[10px] text-zinc-400 mb-2">
              {selectedClip ? `Applying to: ${selectedClip.name}` : 'Select a clip to apply transition'}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {transitionsList.map((trans) => (
                <div
                  key={trans.id}
                  onClick={() => {
                    let targetClip = selectedClip;
                    if (!targetClip) {
                      const sequence = timelineEngine.getSequence();
                      const currentSec = rationalTimeToSeconds(currentTime);
                      for (const track of sequence.tracks) {
                        for (const clip of track.clips) {
                          const cStart = rationalTimeToSeconds(clip.timelineRange.start);
                          const cEnd = cStart + rationalTimeToSeconds(clip.timelineRange.duration);
                          if (currentSec >= cStart && currentSec <= cEnd) {
                            targetClip = clip;
                            break;
                          }
                        }
                        if (targetClip) break;
                      }
                    }
                    if (targetClip) {
                      targetClip.transitionIn = {
                        id: `trans_${Date.now()}`,
                        type: trans.id as any,
                        duration: secondsToRationalTime(1.0),
                        position: 'in',
                        alignment: 'start',
                      };
                      projectService.setProject({ ...project });
                    }
                  }}
                  className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-purple-500 cursor-pointer transition shadow-xs group"
                >
                  <div className="w-full h-8 rounded-lg bg-purple-950/60 border border-purple-800/40 mb-2 flex items-center justify-center group-hover:bg-purple-900/60 transition">
                    <Layers className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-[11px] font-semibold text-zinc-200 truncate">{trans.name}</div>
                  <div className="flex items-center justify-between text-[9px] text-zinc-500 mt-0.5">
                    <span>{trans.category}</span>
                    <span className="font-mono">{trans.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: TEXT */}
        {activeSection === 'text' && (
          <div className="flex-1 flex flex-col p-3 overflow-y-auto space-y-2">
            <div className="text-xs font-bold text-white mb-1">Titles & Kinetic Typography</div>
            <div className="space-y-2">
              {textTemplates.map((item) => (
                <div
                  key={item.name}
                  onClick={() => {
                    const sequence = timelineEngine.getSequence();
                    const track = sequence.tracks.find((t) => t.kind === 'video') || sequence.tracks[0];
                    const dur = secondsToRationalTime(4.0);
                    const clip = createBaseClip(
                      `txt_${Date.now()}`,
                      'text',
                      item.name,
                      track.id,
                      { start: currentTime, duration: dur },
                      { start: createRationalTime(0), duration: dur }
                    );
                    (clip as any).text = item.name.toUpperCase();
                    (clip as any).fontSize = item.size;
                    (clip as any).fontFamily = item.name.includes('Neon') ? 'Arial' : item.name.includes('Cinematic') ? 'Georgia' : 'Inter, sans-serif';
                    (clip as any).textColor = item.name.includes('Neon') ? '#38bdf8' : '#ffffff';
                    (clip as any).shadowColor = item.name.includes('Neon') ? 'rgba(56,189,248,0.9)' : 'rgba(0,0,0,0.8)';
                    (clip as any).shadowBlur = item.name.includes('Neon') ? 20 : 6;
                    (clip as any).animation = item.name.includes('Pop') ? 'pop' : item.name.includes('Typewriter') ? 'typewriter' : item.name.includes('Bounce') ? 'bounce' : 'fade';
                    (clip as any).align = 'center';
                    const cmd = new AddClipCommand(timelineEngine, track.id, clip as any);
                    commandManager.execute(cmd);
                  }}
                  className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-purple-500 cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-white">{item.name}</div>
                    <div className="text-[10px] text-zinc-500">{item.style} • {item.size}px</div>
                  </div>
                  <Plus className="w-4 h-4 text-purple-400" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: STICKERS / OVERLAY / ASSETS */}
        {['stickers', 'overlay', 'assets'].includes(activeSection) && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-zinc-400">
            <Package className="w-8 h-8 text-purple-500 mb-2 opacity-80" />
            <div className="text-xs font-semibold text-zinc-200 capitalize">{activeSection} Library</div>
            <p className="text-[10px] text-zinc-500 mt-1 max-w-44">
              Premium built-in asset packs and overlay shaders ready for one-click drag & drop.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
