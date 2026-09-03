/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Heart,
  Plus,
  Sparkles,
  Flame,
  Clock,
  Instagram,
  Smartphone,
  Zap,
  Youtube,
  Film,
  Compass,
  Video,
  Trophy,
  Gamepad2,
  Gift,
  HeartHandshake,
  Briefcase,
  ShoppingBag,
  Camera,
  Music,
  Smile,
  Maximize2,
  Activity,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Layers,
  Upload,
  Download,
  ShieldCheck,
  Globe,
  Radio,
  Share2,
} from 'lucide-react';
import {
  Template,
  TemplateCategoryId,
  TemplateFilterOptions,
  TemplateStyle,
  TemplatePlatform,
} from '../../domain/template/Template';
import { TEMPLATE_CATEGORIES } from '../../domain/template/templateCategories';
import { TemplateService } from '../../domain/template/templateService';
import { TrendItem } from '../../domain/template/TrendTypes';
import { TemplateCard } from './TemplateCard';
import { TemplatePreviewModal } from './TemplatePreviewModal';
import { UseTemplateModal } from './UseTemplateModal';
import { CreateTemplateModal } from './CreateTemplateModal';
import { LiveTrendsSection } from './LiveTrendsSection';
import { ApiStatusModal } from './ApiStatusModal';
import { TemplateImportExportModal } from './TemplateImportExportModal';
import { VideoReconstructionModal } from './VideoReconstructionModal';

interface TemplatesPageProps {
  onOpenEditor: () => void;
}

const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  Sparkles: <Sparkles className="w-3.5 h-3.5" />,
  Flame: <Flame className="w-3.5 h-3.5" />,
  Clock: <Clock className="w-3.5 h-3.5" />,
  Instagram: <Instagram className="w-3.5 h-3.5" />,
  Smartphone: <Smartphone className="w-3.5 h-3.5" />,
  Zap: <Zap className="w-3.5 h-3.5" />,
  Youtube: <Youtube className="w-3.5 h-3.5" />,
  Film: <Film className="w-3.5 h-3.5" />,
  Compass: <Compass className="w-3.5 h-3.5" />,
  Video: <Video className="w-3.5 h-3.5" />,
  Trophy: <Trophy className="w-3.5 h-3.5" />,
  Gamepad2: <Gamepad2 className="w-3.5 h-3.5" />,
  Gift: <Gift className="w-3.5 h-3.5" />,
  HeartHandshake: <HeartHandshake className="w-3.5 h-3.5" />,
  Briefcase: <Briefcase className="w-3.5 h-3.5" />,
  ShoppingBag: <ShoppingBag className="w-3.5 h-3.5" />,
  Camera: <Camera className="w-3.5 h-3.5" />,
  Music: <Music className="w-3.5 h-3.5" />,
  Smile: <Smile className="w-3.5 h-3.5" />,
  Maximize2: <Maximize2 className="w-3.5 h-3.5" />,
  Activity: <Activity className="w-3.5 h-3.5" />,
  Cpu: <Cpu className="w-3.5 h-3.5" />,
};

type ViewMode = 'templates' | 'trends' | 'custom';

export const TemplatesPage: React.FC<TemplatesPageProps> = ({ onOpenEditor }) => {
  const templateService = TemplateService.getInstance();

  // Top Nav View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('templates');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<TemplateCategoryId | 'all'>('for_you');
  const [platformFilter, setPlatformFilter] = useState<'all' | TemplatePlatform>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [aspectRatio, setAspectRatio] = useState<'all' | '9:16' | '16:9' | '1:1' | '4:5'>('all');
  const [durationBucket, setDurationBucket] = useState<'all' | 'under_10' | '10_30' | '30_60' | '60_plus'>('all');
  const [styleFilter, setStyleFilter] = useState<'all' | TemplateStyle>('all');
  const [sortBy, setSortBy] = useState<'recommended' | 'popular' | 'newest' | 'most_used' | 'trending_score'>('recommended');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [aiOnly, setAiOnly] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showLiveTrendsBanner, setShowLiveTrendsBanner] = useState(true);

  // Modals State
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [customizingTemplate, setCustomizingTemplate] = useState<Template | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReconstructModalOpen, setIsReconstructModalOpen] = useState(false);
  const [isApiStatusOpen, setIsApiStatusOpen] = useState(false);
  const [importExportModal, setImportExportModal] = useState<{
    isOpen: boolean;
    mode: 'import' | 'export';
    template?: Template | null;
  }>({
    isOpen: false,
    mode: 'import',
    template: null,
  });

  // Category Bar Scroll Ref
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Favorites & Sync Trigger
  const [favUpdateCount, setFavUpdateCount] = useState(0);

  useEffect(() => {
    templateService.syncWithServer();
  }, []);

  const scrollCategoryBar = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Filtered Templates List
  const filteredTemplates = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = favUpdateCount;
    return templateService.getTemplates({
      searchQuery,
      category: activeCategory,
      platform: platformFilter,
      region: regionFilter,
      aspectRatio,
      durationBucket,
      style: styleFilter,
      sortBy,
      favoritesOnly,
      aiOnly,
    });
  }, [
    searchQuery,
    activeCategory,
    platformFilter,
    regionFilter,
    aspectRatio,
    durationBucket,
    styleFilter,
    sortBy,
    favoritesOnly,
    aiOnly,
    favUpdateCount,
    templateService,
  ]);

  const favoritesCount = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = favUpdateCount;
    return templateService.getFavoritesList().length;
  }, [favUpdateCount, templateService]);

  const activeCategoryInfo = TEMPLATE_CATEGORIES.find((c) => c.id === activeCategory);

  const resetAllFilters = () => {
    setSearchQuery('');
    setActiveCategory('for_you');
    setPlatformFilter('all');
    setRegionFilter('all');
    setAspectRatio('all');
    setDurationBucket('all');
    setStyleFilter('all');
    setFavoritesOnly(false);
    setAiOnly(false);
    setSortBy('recommended');
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    activeCategory !== 'for_you' ||
    platformFilter !== 'all' ||
    regionFilter !== 'all' ||
    aspectRatio !== 'all' ||
    durationBucket !== 'all' ||
    styleFilter !== 'all' ||
    favoritesOnly ||
    aiOnly;

  const handleSelectTrend = (trend: TrendItem) => {
    if (trend.aspectRatio) {
      setAspectRatio(trend.aspectRatio as any);
    }
  };

  return (
    <div id="templates_page_container" className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col">
      {/* 1. TOP HERO & HEADER BAR */}
      <header className="sticky top-0 z-30 bg-[#07090e]/95 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Title & Badge */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white tracking-tight">VeeCut Template Hub</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  Live Discovery
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Multi-track video templates & real-time viral trends across YouTube, TikTok & Reels.
              </p>
            </div>
          </div>

          {/* View Mode Switcher & Top Actions */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end flex-wrap sm:flex-nowrap">
            {/* View Mode Pills */}
            <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                id="btn_view_templates"
                onClick={() => setViewMode('templates')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === 'templates'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Templates
              </button>
              <button
                type="button"
                id="btn_view_trends"
                onClick={() => setViewMode('trends')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === 'trends'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                Live Trends
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                id="input_template_search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates, tags..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/5 hover:bg-white/10 focus:bg-black/80 border border-white/10 focus:border-sky-400 text-white text-xs outline-none transition-all placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/20 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              id="btn_toggle_filters"
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                showFilterDrawer || hasActiveFilters
                  ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
            </button>

            {/* Favorites Toggle Button */}
            <button
              type="button"
              id="btn_toggle_favorites_view"
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                favoritesOnly
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
              title="View your saved favorites"
            >
              <Heart className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-rose-400' : ''}`} />
              <span className="hidden sm:inline">Saved</span>
              {favoritesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Import JSON Button */}
            <button
              type="button"
              id="btn_import_template_json"
              onClick={() => setImportExportModal({ isOpen: true, mode: 'import' })}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs transition-colors hidden sm:block"
              title="Import Template JSON"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>

            {/* Analyze Video to Template Button */}
            <button
              type="button"
              id="btn_open_reconstruct_video"
              onClick={() => setIsReconstructModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95"
              title="Analyze any video and reconstruct an editable template"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Analyze Video</span>
            </button>

            {/* Create Template Button */}
            <button
              type="button"
              id="btn_open_create_template"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. ADVANCED FILTER DRAWER (Collapsible) */}
      {showFilterDrawer && (
        <div className="bg-[#0b0e17] border-b border-white/10 px-4 sm:px-8 py-5 animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Filter className="w-3.5 h-3.5 text-sky-400" />
                <span>Refine Templates</span>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
                >
                  Reset all filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-xs">
              {/* Platform Selector */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-medium">Platform Target</label>
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="all" className="bg-slate-900">All Platforms</option>
                  <option value="youtube_shorts" className="bg-slate-900">YouTube Shorts</option>
                  <option value="tiktok" className="bg-slate-900">TikTok</option>
                  <option value="instagram_reels" className="bg-slate-900">Instagram Reels</option>
                  <option value="cinema" className="bg-slate-900">Cinematic 16:9</option>
                </select>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-medium">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="all" className="bg-slate-900">All Formats</option>
                  <option value="9:16" className="bg-slate-900">9:16 (Vertical Story/Reel)</option>
                  <option value="16:9" className="bg-slate-900">16:9 (Landscape HD)</option>
                  <option value="1:1" className="bg-slate-900">1:1 (Square Post)</option>
                  <option value="4:5" className="bg-slate-900">4:5 (Portrait Feed)</option>
                </select>
              </div>

              {/* Duration Bucket */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-medium">Pacing & Duration</label>
                <select
                  value={durationBucket}
                  onChange={(e) => setDurationBucket(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="all" className="bg-slate-900">Any Duration</option>
                  <option value="under_10" className="bg-slate-900">Under 10s (Fast Hook)</option>
                  <option value="10_30" className="bg-slate-900">10 - 30s (Short-form)</option>
                  <option value="30_60" className="bg-slate-900">30 - 60s (Medium Story)</option>
                  <option value="60_plus" className="bg-slate-900">60s+ (Long Form)</option>
                </select>
              </div>

              {/* Visual Style */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-medium">Aesthetic Style</label>
                <select
                  value={styleFilter}
                  onChange={(e) => setStyleFilter(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="all" className="bg-slate-900">All Styles</option>
                  <option value="Fast-Paced" className="bg-slate-900">Fast-Paced & Energetic</option>
                  <option value="Cinematic" className="bg-slate-900">Cinematic & Moody</option>
                  <option value="Minimal" className="bg-slate-900">Clean & Minimalist</option>
                  <option value="Cyberpunk" className="bg-slate-900">Cyberpunk / Neon</option>
                  <option value="Vintage" className="bg-slate-900">Vintage & Retro</option>
                  <option value="Bold" className="bg-slate-900">Bold & Dynamic</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-medium">Sort Order</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="recommended" className="bg-slate-900">Recommended for You</option>
                  <option value="trending_score" className="bg-slate-900">Trend Velocity Score</option>
                  <option value="popular" className="bg-slate-900">Highest Rated</option>
                  <option value="most_used" className="bg-slate-900">Most Used</option>
                  <option value="newest" className="bg-slate-900">Recently Published</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CATEGORIES SCROLLABLE BAR */}
      <div className="border-b border-white/5 bg-[#090c14] px-4 sm:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => scrollCategoryBar('left')}
            className="hidden sm:flex p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Scroll Left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={categoryScrollRef}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1"
          >
            {TEMPLATE_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              const icon = CATEGORY_ICON_MAP[cat.iconName] || <Sparkles className="w-3.5 h-3.5" />;

              return (
                <button
                  key={cat.id}
                  type="button"
                  id={`tab_category_${cat.id}`}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setFavoritesOnly(false);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${
                    isActive
                      ? 'bg-white text-slate-950 shadow-md shadow-white/10 scale-105'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  <span className={isActive ? 'text-slate-950' : 'text-slate-400'}>{icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollCategoryBar('right')}
            className="hidden sm:flex p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Scroll Right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. MAIN CONTENT & GRID */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Real-time Trend Radar Component */}
        {(viewMode === 'trends' || (showLiveTrendsBanner && activeCategory === 'for_you' && !searchQuery)) && (
          <LiveTrendsSection
            onSelectTrend={handleSelectTrend}
            onUseTemplate={(tmpl) => setCustomizingTemplate(tmpl)}
            onOpenApiStatus={() => setIsApiStatusOpen(true)}
          />
        )}

        {/* Category Description Banner */}
        {activeCategoryInfo && !favoritesOnly && !searchQuery && (
          <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-white/[0.04] to-transparent border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white tracking-tight">
                  {activeCategoryInfo.label}
                </span>
                <span className="text-xs text-slate-400">• {filteredTemplates.length} Templates</span>
              </div>
              <p className="mt-1 text-xs text-slate-400 max-w-xl">
                {activeCategoryInfo.description}
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-slate-300 shrink-0">
              {activeCategoryInfo.tagline}
            </div>
          </div>
        )}

        {/* Favorites Header Notice */}
        {favoritesOnly && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
              <Heart className="w-4 h-4 fill-rose-400 text-rose-400" />
              <span>Showing your saved favorite templates ({filteredTemplates.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setFavoritesOnly(false)}
              className="text-xs text-slate-300 hover:text-white font-medium underline"
            >
              Show All
            </button>
          </div>
        )}

        {/* Template Cards Grid */}
        {filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isFavorite={templateService.isFavorite(template.id)}
                onToggleFavorite={() => setFavUpdateCount((c) => c + 1)}
                onPreview={(tmpl) => setPreviewTemplate(tmpl)}
                onUseTemplate={(tmpl) => setCustomizingTemplate(tmpl)}
                onExportJson={(tmpl) =>
                  setImportExportModal({
                    isOpen: true,
                    mode: 'export',
                    template: tmpl,
                  })
                }
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
              <Layers className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No matching templates found</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Try adjusting your search query, clear active filters, or explore our 22 template categories.
              </p>
            </div>
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-md transition-all hover:scale-105"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </main>

      {/* 5. MODALS */}
      {/* A. Template Preview Modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onUseTemplate={(tmpl) => {
          setPreviewTemplate(null);
          setCustomizingTemplate(tmpl);
        }}
      />

      {/* B. Use Template Multi-Step Wizard Modal */}
      <UseTemplateModal
        template={customizingTemplate}
        isOpen={!!customizingTemplate}
        onClose={() => setCustomizingTemplate(null)}
        onOpenEditor={onOpenEditor}
      />

      {/* C. Create Template Modal */}
      <CreateTemplateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => {
          setFavUpdateCount((c) => c + 1);
          setActiveCategory('new');
        }}
      />

      {/* D. API Status Modal */}
      <ApiStatusModal
        isOpen={isApiStatusOpen}
        onClose={() => setIsApiStatusOpen(false)}
      />

      {/* E. Template Import / Export JSON Modal */}
      <TemplateImportExportModal
        isOpen={importExportModal.isOpen}
        mode={importExportModal.mode}
        templateToExport={importExportModal.template}
        onClose={() => setImportExportModal({ isOpen: false, mode: 'import', template: null })}
        onImportSuccess={(newTmpl) => {
          setFavUpdateCount((c) => c + 1);
          setCustomizingTemplate(newTmpl);
        }}
      />

      {/* F. Video to Template Neural Reconstruction Modal */}
      <VideoReconstructionModal
        isOpen={isReconstructModalOpen}
        onClose={() => setIsReconstructModalOpen(false)}
        onLoadedIntoProject={() => {
          onOpenEditor();
        }}
      />
    </div>
  );
};
