/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useEditor } from '../context/EditorContext';
import {
  FolderOpen,
  Music,
  Type,
  Smile,
  Sparkles,
  Layers,
  MessageSquareText,
  SlidersHorizontal,
  Wand2,
  Filter,
  Plus,
  Search,
  Grid2X2,
  Grid3X3,
  ArrowUpDown,
  ChevronDown,
  Upload,
  Video,
  Check,
  Crown,
} from 'lucide-react';
import { AddClipCommand } from '../../engine/command/implementations/AddClipCommand';
import { createBaseClip } from '../../domain/timeline/Clip';
import { createRationalTime, secondsToRationalTime, rationalTimeToSeconds } from '../../core/time/RationalTime';

export type TopToolSection =
  | 'media'
  | 'audio'
  | 'text'
  | 'stickers'
  | 'effects'
  | 'transitions'
  | 'captions'
  | 'filters'
  | 'adjustment'
  | 'ai_style';

export const LeftSidebarNav: React.FC = () => {
  const {
    project,
    projectService,
    timelineEngine,
    commandManager,
    importFile,
    currentTime,
    selectedClip,
    setSelectedClipId,
    setWorkspaceMode,
  } = useEditor();

  const [activeTool, setActiveTool] = useState<TopToolSection>('media');
  const [activeCategory, setActiveCategory] = useState<string>('Yours');
  const [searchQuery, setSearchQuery] = useState('');
  const [gridMode, setGridMode] = useState<'2x2' | '3x3'>('3x3');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const assets = project.mediaPool || [];
  const filteredAssets = assets.filter((asset) => {
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
    (clip as any).thumbnailUrl = asset.thumbnailUrl;
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

  const topTools: { id: TopToolSection; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'media', label: 'Media', icon: FolderOpen },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'stickers', label: 'Stickers', icon: Smile },
    { id: 'effects', label: 'Effects', icon: Sparkles },
    { id: 'transitions', label: 'Transitions', icon: Layers },
    { id: 'captions', label: 'Captions', icon: MessageSquareText },
    { id: 'filters', label: 'Filters', icon: Filter },
    { id: 'adjustment', label: 'Adjustment', icon: SlidersHorizontal },
    { id: 'ai_style', label: 'AI style', icon: Wand2 },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0d0f17] border-r border-zinc-800/80 select-none overflow-hidden">
      {/* 1. TOP HORIZONTAL TOOL NAVIGATION BAR */}
      <div className="flex items-center justify-between border-b border-zinc-800/90 px-2 py-1.5 bg-[#0a0c13] shrink-0 overflow-x-auto">
        <div className="flex items-center space-x-1 sm:space-x-2">
          {topTools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  setActiveTool(tool.id);
                  if (tool.id === 'adjustment') setWorkspaceMode('adjust');
                  else if (tool.id === 'effects') setWorkspaceMode('effects');
                  else if (tool.id === 'audio') setWorkspaceMode('audio');
                }}
                className={`flex flex-col items-center justify-center px-1.5 py-1 rounded-md transition-all group relative ${
                  isActive
                    ? 'text-cyan-400 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mb-0.5 transition-transform group-hover:scale-105 ${
                    isActive ? 'text-cyan-400' : 'text-zinc-400'
                  }`}
                />
                <span className="text-[10px] leading-tight whitespace-nowrap">{tool.label}</span>
                {isActive && (
                  <div className="absolute -bottom-1.5 left-1 right-1 h-[2px] bg-cyan-400 rounded-full shadow-sm shadow-cyan-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. MAIN WORKSPACE CONTENT */}
      {activeTool === 'media' && (
        <div className="flex-1 flex min-h-0">
          {/* Left Mini-Sidebar Categories */}
          <div className="w-24 shrink-0 bg-[#0a0c13] border-r border-zinc-850 flex flex-col p-2 space-y-1 text-xs">
            {/* Cyan Import Pill */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-1 px-2 rounded-md bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 text-left font-semibold text-[11px] mb-2 flex items-center justify-between"
            >
              <span>Import</span>
            </button>

            {/* Category list */}
            {[
              { id: 'Yours', label: 'Yours' },
              { id: 'AI media', label: 'AI media', isAi: true },
              { id: 'Spaces', label: 'Spaces' },
              { id: 'Library', label: 'Library' },
              { id: 'Brand assets', label: 'Brand assets' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full py-1.5 px-1.5 rounded flex items-center justify-between text-[11px] transition ${
                  activeCategory === cat.id
                    ? 'text-white font-bold bg-zinc-800/70'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/40'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>{cat.label}</span>
                  {cat.isAi && (
                    <span className="px-1 py-0.2 rounded text-[8px] bg-cyan-500 text-black font-black">
                      AI
                    </span>
                  )}
                </div>
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              </button>
            ))}
          </div>

          {/* Right Media Shelf & Grid */}
          <div
            className="flex-1 flex flex-col min-w-0 bg-[#0d0f17]"
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
            {/* Top Row: Import Button, Record Dropdown, Grid Toggles, Sort */}
            <div className="px-3 pt-2.5 pb-2 flex items-center justify-between border-b border-zinc-850">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 text-[11px] font-semibold transition active:scale-95"
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Import</span>
                </button>

                <button
                  onClick={() => {}}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-[11px] font-medium transition"
                >
                  <Video className="w-3 h-3 text-zinc-400" />
                  <span>Record</span>
                  <ChevronDown className="w-2.5 h-2.5 text-zinc-400" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-zinc-400">
                <button
                  onClick={() => setGridMode('2x2')}
                  className={`p-1 rounded hover:text-white ${gridMode === '2x2' ? 'text-white' : 'text-zinc-500'}`}
                  title="2 Column Grid"
                >
                  <Grid2X2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setGridMode('3x3')}
                  className={`p-1 rounded hover:text-white ${gridMode === '3x3' ? 'text-white' : 'text-zinc-500'}`}
                  title="3 Column Grid"
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {}}
                  className="p-1 rounded text-zinc-500 hover:text-white flex items-center gap-0.5"
                  title="Sort & Filter"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <ChevronDown className="w-2 h-2" />
                </button>
              </div>
            </div>

            {/* Second Row: "All" title + Search Bar */}
            <div className="px-3 py-1.5 space-y-1 border-b border-zinc-850">
              <div className="text-[11px] font-semibold text-zinc-300">All</div>
              <div className="relative">
                <Search className="w-3 h-3 text-zinc-500 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search media..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#121520] border border-zinc-800 rounded px-2 pl-6.5 py-1 text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/80"
                />
              </div>
            </div>

            {/* Media Grid Cards */}
            <div className="flex-1 overflow-y-auto p-2.5">
              <div className={`grid ${gridMode === '2x2' ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
                {filteredAssets.map((asset) => {
                  const isForest = asset.name.includes('Forest');
                  const isCity = asset.name.includes('City');
                  const isAudio = asset.type === 'audio' || asset.name.endsWith('.mp3');
                  const isLogo = asset.name.includes('Logo');

                  return (
                    <div
                      key={asset.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify(asset));
                      }}
                      onClick={() => handleAddAssetToTimeline(asset)}
                      className="group relative bg-[#131622] border border-zinc-800/90 rounded-lg overflow-hidden hover:border-cyan-500/80 transition-all shadow-xs flex flex-col cursor-pointer"
                    >
                      {/* Thumbnail Container */}
                      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                        {asset.thumbnailUrl ? (
                          <img
                            src={asset.thumbnailUrl}
                            alt={asset.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : isAudio ? (
                          <div className="w-full h-full bg-gradient-to-br from-purple-950/80 via-zinc-900 to-indigo-950 flex items-center justify-center">
                            <Music className="w-6 h-6 text-purple-400" />
                          </div>
                        ) : (
                          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                            <FolderOpen className="w-6 h-6 text-zinc-600" />
                          </div>
                        )}

                        {/* Top-Left 'Added' Green Badge for Forest Walk */}
                        {isForest && (
                          <div className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-black/75 text-emerald-400 text-[8px] font-semibold border border-emerald-500/30">
                            Added
                          </div>
                        )}

                        {/* Top-Right Duration & 4K Badges */}
                        <div className="absolute top-1 right-1 flex items-center gap-1">
                          {isCity && (
                            <span className="px-1 py-0.2 rounded bg-black/80 text-[8px] font-bold text-white">
                              4K
                            </span>
                          )}
                          <span className="px-1 py-0.2 rounded bg-black/80 text-[8px] font-mono text-zinc-200">
                            {isForest
                              ? '00:16'
                              : isCity
                              ? '00:18'
                              : asset.name.includes('Cinematic')
                              ? '00:24'
                              : asset.name.includes('Drone')
                              ? '00:26'
                              : isAudio
                              ? '03:26'
                              : '00:06'}
                          </span>
                        </div>

                        {/* Audio / Logo Icons */}
                        {isAudio && (
                          <div className="absolute bottom-1 left-1.5 flex items-center gap-0.5 text-purple-300">
                            <Music className="w-2.5 h-2.5" />
                          </div>
                        )}
                        {isLogo && (
                          <div className="absolute bottom-1 left-1.5 flex items-center gap-0.5 text-cyan-400">
                            <Music className="w-2.5 h-2.5" />
                          </div>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-cyan-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="p-1 rounded-full bg-cyan-500 text-black shadow-lg">
                            <Plus className="w-3 h-3 stroke-[3]" />
                          </span>
                        </div>
                      </div>

                      {/* File Name */}
                      <div className="p-1 px-1.5 bg-[#10121c]">
                        <span className="text-[10px] font-medium text-zinc-300 truncate block group-hover:text-white">
                          {asset.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OTHER TABS (Audio, Text, Effects, Transitions, Filters, etc.) */}
      {activeTool !== 'media' && (
        <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
            <span className="font-bold text-white capitalize">{activeTool} Library</span>
            <span className="text-[10px] text-cyan-400">Pro Presets</span>
          </div>

          {activeTool === 'audio' && (
            <div className="space-y-2">
              <div className="text-[11px] text-zinc-400">Royalty-Free Audio & SFX</div>
              {['Cinematic Intro.mp3', 'Deep Ambient Bass.wav', 'Upbeat Vlog Pop.mp3', 'Cyber Glitch SFX.wav'].map((snd, i) => (
                <div
                  key={snd}
                  onClick={() => {
                    const sampleAudio = {
                      id: `aud_${Date.now()}_${i}`,
                      name: snd,
                      type: 'audio' as const,
                      duration: createRationalTime(30 * 120000, 120000),
                      thumbnailUrl: '',
                    };
                    handleAddAssetToTimeline(sampleAudio);
                  }}
                  className="p-2 rounded bg-zinc-900 border border-zinc-800 hover:border-cyan-500 cursor-pointer flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-2">
                    <Music className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-medium text-zinc-200">{snd}</span>
                  </div>
                  <Plus className="w-3 h-3 text-zinc-500 hover:text-white" />
                </div>
              ))}
            </div>
          )}

          {activeTool === 'text' && (
            <div className="grid grid-cols-2 gap-2">
              {['Default Heading', 'Cinematic Title', 'Lower Third Minimal', 'Neon Subtitle'].map((title) => (
                <div
                  key={title}
                  onClick={() => {
                    const sequence = timelineEngine.getSequence();
                    const track = sequence.tracks.find((t) => t.kind === 'video') || sequence.tracks[0];
                    const dur = secondsToRationalTime(4);
                    const clip = createBaseClip(
                      `text_${Date.now()}`,
                      'text',
                      title,
                      track.id,
                      { start: currentTime, duration: dur },
                      { start: createRationalTime(0), duration: dur }
                    );
                    (clip as any).text = title;
                    (clip as any).fontSize = 48;
                    (clip as any).textColor = '#ffffff';
                    const cmd = new AddClipCommand(timelineEngine, track.id, clip as any);
                    commandManager.execute(cmd);
                  }}
                  className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-cyan-500 cursor-pointer flex flex-col items-center justify-center text-center transition"
                >
                  <Type className="w-5 h-5 text-cyan-400 mb-1" />
                  <span className="font-semibold text-zinc-200">{title}</span>
                </div>
              ))}
            </div>
          )}

          {activeTool === 'effects' && (
            <div className="grid grid-cols-2 gap-2">
              {['Gaussian Blur', 'Neon Glow', '35mm Film Grain', 'Sharpen', 'Chromatic Glitch', 'Vignette'].map((fx) => (
                <div
                  key={fx}
                  onClick={() => {
                    if (selectedClip) {
                      selectedClip.effects = [
                        ...(selectedClip.effects || []),
                        {
                          id: `fx_${Date.now()}`,
                          effectId: fx.toLowerCase().replace(/\s+/g, '-'),
                          name: fx,
                          enabled: true,
                          params: {},
                          opacity: 1.0,
                        },
                      ];
                      projectService.setProject({ ...project });
                    }
                  }}
                  className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-cyan-500 cursor-pointer transition flex flex-col justify-between h-20"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-zinc-200">{fx}</span>
                </div>
              ))}
            </div>
          )}

          {activeTool === 'transitions' && (
            <div className="grid grid-cols-2 gap-2">
              {['Cross Dissolve', 'Wipe Right', 'Zoom In', 'Flash White', 'Blur Dissolve'].map((trans) => (
                <div
                  key={trans}
                  onClick={() => {
                    if (selectedClip) {
                      selectedClip.transitionIn = {
                        id: `trans_${Date.now()}`,
                        type: trans.toLowerCase().replace(/\s+/g, '-') as any,
                        duration: secondsToRationalTime(1.0),
                        position: 'in',
                        alignment: 'start',
                      };
                      projectService.setProject({ ...project });
                    }
                  }}
                  className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-cyan-500 cursor-pointer transition"
                >
                  <Layers className="w-4 h-4 text-purple-400 mb-1" />
                  <span className="font-semibold text-zinc-200">{trans}</span>
                </div>
              ))}
            </div>
          )}

          {activeTool === 'ai_style' && (
            <div className="space-y-2">
              {['Auto Background Removal', 'AI Face Tracking', 'Auto Smart Captions', 'AI Scene Relighting', 'Auto Reframing 9:16'].map((ai) => (
                <div
                  key={ai}
                  className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-cyan-500 cursor-pointer flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-cyan-400" />
                    <span className="font-medium text-zinc-200">{ai}</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/30">
                    AI
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="video/*,audio/*,image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
};
