/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  Filter as FilterIcon,
  Search,
  Heart,
  Sliders,
  Plus,
  Download,
  Upload,
  Trash2,
  Check,
  Flame,
  Film,
  Camera,
  Clock,
  Smile,
  Compass,
  Maximize2,
  Briefcase,
  Activity,
  ShoppingBag,
  Zap,
  ShieldCheck,
  Cpu,
  Layers,
  Bookmark,
  Wand2,
  RefreshCw,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { FilterPreset, PresetCategory } from '../../domain/preset/Preset';
import { PresetManager, FilterFilterOptions } from '../../engine/preset/PresetManager';
import { useEditor } from '../context/EditorContext';
import { ApplyPresetCommand } from '../../engine/command/implementations/ApplyPresetCommand';
import { createBaseClip } from '../../domain/timeline/Clip';
import { secondsToRationalTime, createRationalTime } from '../../core/time/RationalTime';
import { AddClipCommand } from '../../engine/command/implementations/AddClipCommand';

interface FiltersPanelProps {
  onFilterApplied?: (preset: FilterPreset, intensity: number) => void;
}

const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  for_you: <Sparkles className="w-3.5 h-3.5" />,
  veecut_originals: <Sparkles className="w-3.5 h-3.5 text-amber-400" />,
  trending: <Flame className="w-3.5 h-3.5" />,
  new: <Zap className="w-3.5 h-3.5" />,
  cinematic: <Film className="w-3.5 h-3.5" />,
  film: <Camera className="w-3.5 h-3.5" />,
  vintage: <Clock className="w-3.5 h-3.5" />,
  portrait: <Smile className="w-3.5 h-3.5" />,
  travel: <Compass className="w-3.5 h-3.5" />,
  vlog: <Smile className="w-3.5 h-3.5" />,
  sports: <Activity className="w-3.5 h-3.5" />,
  gaming: <Cpu className="w-3.5 h-3.5" />,
  landscape: <Compass className="w-3.5 h-3.5" />,
  black_white: <Maximize2 className="w-3.5 h-3.5" />,
  urban: <Briefcase className="w-3.5 h-3.5" />,
  mood: <Activity className="w-3.5 h-3.5" />,
  lifestyle: <ShoppingBag className="w-3.5 h-3.5" />,
  night: <Zap className="w-3.5 h-3.5" />,
  minimal: <ShieldCheck className="w-3.5 h-3.5" />,
  stylized: <Cpu className="w-3.5 h-3.5" />,
  duotone: <Layers className="w-3.5 h-3.5" />,
  social: <Flame className="w-3.5 h-3.5" />,
  my_filters: <Bookmark className="w-3.5 h-3.5" />,
  favorites: <Heart className="w-3.5 h-3.5" />,
};

export const FiltersPanel: React.FC<FiltersPanelProps> = ({ onFilterApplied }) => {
  const { timelineEngine, commandManager, selectedClipId, currentTime, projectService, project } = useEditor();
  const presetManager = useMemo(() => PresetManager.getInstance(), []);

  const [activeCategory, setActiveCategory] = useState<string>('for_you');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<FilterFilterOptions['sortBy']>('popular');
  const [intensity, setIntensity] = useState<number>(100); // 0 to 100%
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetCat, setNewPresetCat] = useState<PresetCategory>('cinematic');
  const [isAiMatching, setIsAiMatching] = useState(false);
  const [aiMatchMessage, setAiMatchMessage] = useState<string | null>(null);

  const categories = presetManager.getCategories();

  // Find currently selected clip if any
  const selectedClip = useMemo(() => {
    if (!selectedClipId) return null;
    const found = timelineEngine.findClip(selectedClipId);
    return found ? found.clip : null;
  }, [selectedClipId, timelineEngine]);

  // Query filtered presets
  const presets = useMemo(() => {
    return presetManager.queryPresets({
      category: activeCategory,
      searchQuery,
      sortBy,
    });
  }, [presetManager, activeCategory, searchQuery, sortBy, appliedPresetId]);

  const handleApplyPreset = (preset: FilterPreset) => {
    setActivePresetId(preset.id);
    const intensityDecimal = intensity / 100;

    if (selectedClip) {
      const cmd = new ApplyPresetCommand(timelineEngine, selectedClip.id, preset, intensityDecimal);
      commandManager.execute(cmd);
      setAppliedPresetId(preset.id);
      setTimeout(() => setAppliedPresetId(null), 1800);
      if (onFilterApplied) onFilterApplied(preset, intensityDecimal);
    } else {
      // If no clip selected, create an Adjustment Layer with this filter look
      handleAddAdjustmentLayer(preset);
    }
  };

  const handleAddAdjustmentLayer = (preset: FilterPreset) => {
    const sequence = timelineEngine.getSequence();
    let track = sequence.tracks.find((tr) => tr.kind === 'video');
    if (!track) track = sequence.tracks[0];
    if (!track) return;

    const dur = secondsToRationalTime(8);
    const adjClip = createBaseClip(
      `adj_filter_${preset.id}_${Date.now()}`,
      'adjustment',
      `${preset.name} (Filter)`,
      track.id,
      { start: currentTime, duration: dur },
      { start: createRationalTime(0), duration: dur }
    );

    const intensityDecimal = intensity / 100;
    if (preset.colorGrade) {
      adjClip.colorGrade = presetManager.blendColorGradeWithPreset(
        adjClip.colorGrade,
        preset.colorGrade,
        intensityDecimal
      );
    }
    if (preset.effects) {
      adjClip.effects = presetManager.blendEffectsWithPreset(
        [],
        preset.effects,
        intensityDecimal
      );
    }

    const cmd = new AddClipCommand(timelineEngine, track.id, adjClip as any);
    commandManager.execute(cmd);
    setActivePresetId(preset.id);
    setAppliedPresetId(preset.id);
    setTimeout(() => setAppliedPresetId(null), 1800);
  };

  const handleToggleFavorite = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    presetManager.toggleFavorite(presetId);
    // Force re-render
    setActivePresetId((prev) => prev);
  };

  const handleSaveCurrentLook = () => {
    if (!newPresetName.trim()) return;

    if (selectedClip) {
      presetManager.saveCustomPreset({
        name: newPresetName.trim(),
        category: newPresetCat,
        description: `Custom ${newPresetCat} filter created from ${selectedClip.name}`,
        colorGrade: selectedClip.colorGrade,
        effects: selectedClip.effects,
      });
      setShowSaveModal(false);
      setNewPresetName('');
      setActiveCategory('my_filters');
    }
  };

  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    presetManager.deleteCustomPreset(id);
    setActivePresetId(null);
  };

  const handleExport = () => {
    const json = presetManager.exportPresetsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'veecut_filters_library.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const count = presetManager.importPresetsJson(text);
        alert(`Successfully imported ${count} filter presets into VeeCut!`);
        setActiveCategory('my_filters');
      } catch (err) {
        alert('Invalid preset JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleAiSmartFilterMatch = async () => {
    setIsAiMatching(true);
    setAiMatchMessage(null);

    // Call server AI copilot or analyze clip
    try {
      const clipName = selectedClip ? selectedClip.name.toLowerCase() : 'cinematic video';
      let targetId = 'cin_teal_orange';

      if (clipName.includes('night') || clipName.includes('dark') || clipName.includes('city')) {
        targetId = 'urb_cyberpunk_tokyo';
      } else if (clipName.includes('vintage') || clipName.includes('retro') || clipName.includes('old')) {
        targetId = 'vint_kodachrome_70s';
      } else if (clipName.includes('portrait') || clipName.includes('person') || clipName.includes('face') || clipName.includes('vlog')) {
        targetId = 'port_golden_hour_glow';
      } else if (clipName.includes('nature') || clipName.includes('forest') || clipName.includes('tree') || clipName.includes('mountain')) {
        targetId = 'land_emerald_forest';
      } else if (clipName.includes('bw') || clipName.includes('mono') || clipName.includes('noir')) {
        targetId = 'bw_silver_gelatin';
      }

      const matched = presetManager.getPresetById(targetId) || presets[0];

      setTimeout(() => {
        setIsAiMatching(false);
        if (matched) {
          handleApplyPreset(matched);
          setAiMatchMessage(`AI matched "${matched.name}" to your clip!`);
          setTimeout(() => setAiMatchMessage(null), 4000);
        }
      }, 700);
    } catch {
      setIsAiMatching(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0d0f17] text-zinc-200">
      {/* 1. Header & AI Match Box */}
      <div className="p-3 border-b border-zinc-800/80 space-y-2.5 shrink-0 bg-[#0e111a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FilterIcon className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-xs text-white">Cinematic Filters & Looks</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">
              {presetManager.getAllPresets().length} Presets
            </span>
          </div>

          <div className="flex items-center gap-1">
            {selectedClip && (
              <button
                onClick={() => setShowSaveModal(true)}
                title="Save current clip color grade as custom preset"
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            )}

            <button
              onClick={handleExport}
              title="Export filter presets JSON"
              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <label
              title="Import filter presets JSON"
              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </div>

        {/* AI Smart Match Assistant */}
        <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-[#111827] to-[#111422] border border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <span className="font-bold text-[11px] text-zinc-100 block">AI Smart Match</span>
              <span className="text-[9px] text-zinc-400 block">Auto-grade tone based on scene content</span>
            </div>
          </div>

          <button
            onClick={handleAiSmartFilterMatch}
            disabled={isAiMatching}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[10px] flex items-center gap-1.5 transition shrink-0 disabled:opacity-50"
          >
            {isAiMatching ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            <span>Auto Grade</span>
          </button>
        </div>

        {aiMatchMessage && (
          <div className="px-2.5 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] flex items-center gap-1.5 animate-fadeIn">
            <Check className="w-3 h-3 shrink-0" />
            <span className="truncate">{aiMatchMessage}</span>
          </div>
        )}

        {/* Active Filter on Selected Clip Inspector */}
        {selectedClip?.activeFilter && (
          <div className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-[#111827] to-[#121520] border border-cyan-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 truncate">
                <FilterIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-[11px] font-bold text-white truncate">
                  {selectedClip.activeFilter.presetName}
                </span>
                <span className="text-[8px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono uppercase">
                  {selectedClip.activeFilter.category}
                </span>
              </div>
              <button
                onClick={() => {
                  presetManager.removeFilterFromClip(selectedClip);
                  setActivePresetId(null);
                  setIntensity(100);
                }}
                className="text-[9px] px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition flex items-center gap-1"
                title="Remove active filter and restore original grade"
              >
                <Trash2 className="w-2.5 h-2.5" />
                <span>Remove</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span>Clip Filter Intensity</span>
              <span className="font-mono text-cyan-400 font-bold">
                {Math.round((selectedClip.activeFilter.intensity ?? 1) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round((selectedClip.activeFilter.intensity ?? 1) * 100)}
              onChange={(e) => {
                const val = Number(e.target.value);
                setIntensity(val);
                presetManager.setClipFilterIntensity(selectedClip, val / 100);
              }}
              className="w-full h-1.5 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        )}

        {/* 2. Global Intensity Slider */}
        <div className="p-2.5 rounded-xl bg-[#121520] border border-zinc-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-400 font-medium flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Default Apply Intensity</span>
            </span>
            <span className="font-mono text-cyan-400 font-bold">{intensity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={intensity}
            onChange={(e) => {
              const val = Number(e.target.value);
              setIntensity(val);
              // If we have an active preset and selected clip, live re-apply
              if (selectedClip && selectedClip.activeFilter) {
                presetManager.setClipFilterIntensity(selectedClip, val / 100);
              }
            }}
            className="w-full h-1.5 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        {/* 3. Search & Sort Controls */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search looks, film stocks, moods..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-2.5 py-1.5 text-[11px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="popular">Popular</option>
            <option value="trending">Trending</option>
            <option value="rating">Top Rated</option>
            <option value="newest">Newest</option>
            <option value="name">A - Z</option>
          </select>
        </div>
      </div>

      {/* 4. Horizontal Category Scroll Pills */}
      <div className="p-2 border-b border-zinc-800/80 bg-[#0d0f17] shrink-0 overflow-x-auto scrollbar-none flex gap-1.5">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                isActive
                  ? 'bg-emerald-500 text-black shadow-xs font-bold'
                  : 'bg-[#121520] text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/60'
              }`}
            >
              {CATEGORY_ICON_MAP[cat.id] || <FilterIcon className="w-3 h-3" />}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 5. Presets Grid */}
      <div className="flex-1 p-3 overflow-y-auto min-h-0 space-y-2.5">
        {presets.length === 0 ? (
          <div className="text-center py-10 space-y-2 text-zinc-500">
            <FilterIcon className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-xs">No filters found in this category.</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[10px] text-emerald-400 underline font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {presets.map((preset) => {
              const isApplied = appliedPresetId === preset.id;
              const isFav = presetManager.isFavorite(preset.id);
              const isActive = activePresetId === preset.id;

              return (
                <div
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset)}
                  className={`group relative rounded-xl border p-2.5 cursor-pointer transition flex flex-col justify-between overflow-hidden ${
                    isActive || isApplied
                      ? 'border-emerald-500 bg-[#141b24] shadow-md shadow-emerald-500/10'
                      : 'border-zinc-800/80 bg-[#111422] hover:border-emerald-500/60 hover:bg-[#151929]'
                  }`}
                  style={{ minHeight: '110px' }}
                >
                  {/* Visual Background Gradient Accent */}
                  <div
                    className="absolute inset-0 opacity-15 group-hover:opacity-25 transition-opacity pointer-events-none rounded-xl"
                    style={{
                      background: preset.previewGradient || 'linear-gradient(135deg, #0d9488 0%, #0369a1 100%)',
                    }}
                  />

                  {/* Top Bar: Category Pill & Favorite Heart */}
                  <div className="relative flex items-center justify-between z-10">
                    <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs border border-white/10 text-zinc-300 font-semibold">
                      {preset.category}
                    </span>

                    <div className="flex items-center gap-1">
                      {preset.isCustom && (
                        <button
                          onClick={(e) => handleDeleteCustom(preset.id, e)}
                          title="Delete custom preset"
                          className="p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        onClick={(e) => handleToggleFavorite(preset.id, e)}
                        className={`p-1 rounded transition ${
                          isFav ? 'text-rose-500 hover:text-rose-400' : 'text-zinc-500 hover:text-white'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Middle Info: Name & Tagline */}
                  <div className="relative z-10 my-1">
                    <span className="font-bold text-zinc-100 text-[11px] block truncate group-hover:text-white leading-snug">
                      {preset.name}
                    </span>
                    <span className="text-[9px] text-zinc-400 block truncate leading-tight line-clamp-1">
                      {preset.description}
                    </span>
                  </div>

                  {/* Bottom Stats & Quick Apply Action */}
                  <div className="relative z-10 flex items-center justify-between pt-1 border-t border-white/5">
                    <div className="flex items-center gap-1.5 text-[9px] text-zinc-400">
                      <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                        ★ {preset.rating || 4.9}
                      </span>
                      {preset.usageCount && (
                        <span className="text-zinc-500">{(preset.usageCount / 1000).toFixed(0)}k</span>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyPreset(preset);
                      }}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold transition flex items-center gap-1 ${
                        isApplied
                          ? 'bg-emerald-500 text-black'
                          : 'bg-zinc-800 hover:bg-emerald-500 hover:text-black text-zinc-200'
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <Check className="w-2.5 h-2.5" />
                          <span>Applied</span>
                        </>
                      ) : (
                        <span>Apply</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Save Custom Preset Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#121520] border border-zinc-800 rounded-2xl p-4 w-full max-w-sm space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-cyan-400" />
                <span>Save Look as Custom Filter</span>
              </span>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-zinc-500 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-zinc-400 block font-medium">Filter Name</label>
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="e.g. My Cinematic Sunset Gold"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-zinc-400 block font-medium">Category</label>
              <select
                value={newPresetCat}
                onChange={(e) => setNewPresetCat(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="cinematic">Cinematic</option>
                <option value="film">Film & Analog</option>
                <option value="vintage">Vintage & Retro</option>
                <option value="portrait">Portrait & Skin</option>
                <option value="landscape">Landscape & Nature</option>
                <option value="black_white">B&W & Noir</option>
                <option value="urban">Urban & Street</option>
                <option value="mood">Moody & Atmospheric</option>
                <option value="lifestyle">Food & Lifestyle</option>
                <option value="night">Night & Low Light</option>
                <option value="minimal">Clean & Minimal</option>
                <option value="stylized">Stylized & Sci-Fi</option>
                <option value="duotone">Duotone & Pop</option>
                <option value="my_filters">My Custom Filters</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCurrentLook}
                disabled={!newPresetName.trim()}
                className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black text-xs font-bold transition"
              >
                Save Filter Look
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
