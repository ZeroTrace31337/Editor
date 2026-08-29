/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
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
} from 'lucide-react';
import {
  Template,
  TemplateCategoryId,
  TemplateFilterOptions,
  TemplateStyle,
} from '../../domain/template/Template';
import { TEMPLATE_CATEGORIES } from '../../domain/template/templateCategories';
import { TemplateService } from '../../domain/template/templateService';
import { TemplateCard } from './TemplateCard';
import { TemplatePreviewModal } from './TemplatePreviewModal';
import { UseTemplateModal } from './UseTemplateModal';
import { CreateTemplateModal } from './CreateTemplateModal';

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

export const TemplatesPage: React.FC<TemplatesPageProps> = ({ onOpenEditor }) => {
  const templateService = TemplateService.getInstance();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<TemplateCategoryId | 'all'>('for_you');
  const [aspectRatio, setAspectRatio] = useState<'all' | '9:16' | '16:9' | '1:1' | '4:5'>('all');
  const [durationBucket, setDurationBucket] = useState<'all' | 'under_10' | '10_30' | '30_60' | '60_plus'>('all');
  const [styleFilter, setStyleFilter] = useState<'all' | TemplateStyle>('all');
  const [sortBy, setSortBy] = useState<'recommended' | 'popular' | 'newest' | 'most_used'>('recommended');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [aiOnly, setAiOnly] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Modals State
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [customizingTemplate, setCustomizingTemplate] = useState<Template | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Category Bar Scroll Ref
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Favorites trigger update
  const [favUpdateCount, setFavUpdateCount] = useState(0);

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
    aspectRatio !== 'all' ||
    durationBucket !== 'all' ||
    styleFilter !== 'all' ||
    favoritesOnly ||
    aiOnly;

  return (
    <div id="templates_page_container" className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col">
      {/* 1. TOP HERO & HEADER BAR */}
      <header className="sticky top-0 z-30 bg-[#07090e]/95 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Title & Badge */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white tracking-tight">Templates</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  22 Categories
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Professional multi-track video templates. Customize media, text & timing instantly.
              </p>
            </div>
          </div>

          {/* Search, Filter, Favorites & Create Buttons */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end flex-wrap sm:flex-nowrap">
            {/* Search Input Bar */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                id="input_template_search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates, tags, styles..."
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

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                id="select_template_sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="recommended">Recommended</option>
                <option value="popular">Most Popular</option>
                <option value="newest">Newest First</option>
                <option value="most_used">Most Used</option>
              </select>
            </div>

            {/* Create Template Button */}
            <button
              type="button"
              id="btn_create_new_template"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-md shadow-sky-500/20 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>Create</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. FILTER & CRITERIA DRAWER (CONDITIONAL) */}
      {showFilterDrawer && (
        <div className="bg-[#0e111a] border-b border-white/10 px-4 sm:px-8 py-4 animate-in slide-in-from-top duration-200">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Refine by Aspect Ratio, Duration & Style
              </span>
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
              >
                Reset All
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              {/* Aspect Ratio */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Aspect Ratio</label>
                <div className="flex flex-wrap gap-1.5">
                  {(['all', '9:16', '16:9', '1:1', '4:5'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        aspectRatio === ratio
                          ? 'bg-sky-500 text-white'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {ratio === 'all' ? 'All Ratios' : ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Bucket */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Duration</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'Any' },
                    { id: 'under_10', label: '< 10s' },
                    { id: '10_30', label: '10-30s' },
                    { id: '30_60', label: '30-60s' },
                    { id: '60_plus', label: '60s+' },
                  ].map((dur) => (
                    <button
                      key={dur.id}
                      type="button"
                      onClick={() => setDurationBucket(dur.id as any)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        durationBucket === dur.id
                          ? 'bg-sky-500 text-white'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Style */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Visual Style</label>
                <select
                  value={styleFilter}
                  onChange={(e) => setStyleFilter(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white font-medium outline-none"
                >
                  <option value="all">All Styles</option>
                  <option value="Cinematic">Cinematic</option>
                  <option value="Minimal">Minimal</option>
                  <option value="Fast">Fast / Velocity</option>
                  <option value="Emotional">Emotional</option>
                  <option value="Professional">Professional</option>
                  <option value="Energetic">Energetic</option>
                  <option value="Aesthetic">Aesthetic</option>
                  <option value="Humorous">Humorous</option>
                </select>
              </div>

              {/* AI Powered Toggle */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">AI Models</label>
                <button
                  type="button"
                  onClick={() => setAiOnly(!aiOnly)}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                    aiOnly
                      ? 'bg-sky-500/20 border-sky-500/40 text-sky-400'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>AI Powered Only</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. HORIZONTAL 22 CATEGORY NAVIGATION BAR */}
      <div className="sticky top-[73px] z-20 bg-[#07090e]/95 backdrop-blur-md border-b border-white/5 px-4 sm:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
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
    </div>
  );
};
