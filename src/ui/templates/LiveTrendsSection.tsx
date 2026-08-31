/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Flame,
  Youtube,
  Instagram,
  Smartphone,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Wand2,
  TrendingUp,
  Globe,
  Radio,
  Eye,
  Heart,
  Music2,
  Layers,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { TrendItem, TrendEngineResponse, TrendPlatform } from '../../domain/template/TrendTypes';
import { TrendService } from '../../domain/template/trendService';
import { Template } from '../../domain/template/Template';
import { TemplateService } from '../../domain/template/templateService';

interface LiveTrendsSectionProps {
  onSelectTrend: (trend: TrendItem) => void;
  onUseTemplate: (template: Template) => void;
  onOpenApiStatus: () => void;
}

const REGION_OPTIONS = [
  { code: 'GLOBAL', label: 'Global', flag: '🌐' },
  { code: 'US', label: 'United States', flag: '🇺🇸' },
  { code: 'GB', label: 'United Kingdom', flag: '🇬🇧' },
  { code: 'BR', label: 'Brazil', flag: '🇧🇷' },
  { code: 'IN', label: 'India', flag: '🇮🇳' },
  { code: 'JP', label: 'Japan', flag: '🇯🇵' },
  { code: 'DE', label: 'Germany', flag: '🇩🇪' },
];

export const LiveTrendsSection: React.FC<LiveTrendsSectionProps> = ({
  onSelectTrend,
  onUseTemplate,
  onOpenApiStatus,
}) => {
  const trendService = TrendService.getInstance();
  const templateService = TemplateService.getInstance();

  const [platform, setPlatform] = useState<TrendPlatform>('all');
  const [region, setRegion] = useState('US');
  const [category, setCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [trendData, setTrendData] = useState<TrendEngineResponse | null>(null);
  const [selectedTrend, setSelectedTrend] = useState<TrendItem | null>(null);
  const [matchedTemplates, setMatchedTemplates] = useState<Template[]>([]);

  const fetchTrends = async (force = false) => {
    setIsLoading(true);
    try {
      const data = await trendService.getTrends(
        {
          platform,
          region,
          category,
          sortBy: 'score',
        },
        force
      );
      setTrendData(data);
      if (data.trends.length > 0 && !selectedTrend) {
        handleSelectTrendItem(data.trends[0]);
      }
    } catch (err) {
      console.error('Failed to fetch live trends:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends(false);
  }, [platform, region, category]);

  const handleSelectTrendItem = (trend: TrendItem) => {
    setSelectedTrend(trend);
    onSelectTrend(trend);

    // Find matched VeeCut editable templates
    const allTemplates = templateService.getAllTemplates();
    const query = `${trend.title} ${(trend.tags || []).join(' ')} ${trend.category}`.toLowerCase();

    const matches = allTemplates.filter((t) => {
      if (trend.aspectRatio && t.aspectRatio === trend.aspectRatio) return true;
      const inTags = t.tags.some((tag) => query.includes(tag.toLowerCase()));
      const inCategory = query.includes(t.category.toLowerCase());
      return inTags || inCategory;
    });

    setMatchedTemplates(matches.slice(0, 3));
  };

  const getPlatformIcon = (plt: string) => {
    switch (plt) {
      case 'youtube':
        return <Youtube className="w-3.5 h-3.5 text-rose-400" />;
      case 'instagram':
        return <Instagram className="w-3.5 h-3.5 text-pink-400" />;
      case 'tiktok':
        return <Smartphone className="w-3.5 h-3.5 text-sky-400" />;
      default:
        return <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  const formatNumber = (num?: number) => {
    if (!num) return '—';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <div id="live_trends_section" className="bg-[#0b0e17] border border-white/10 rounded-2xl p-4 sm:p-6 mb-8 shadow-2xl">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-500 fill-rose-500/20" />
              Real-Time Trend Radar
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Live Aggregator
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Aggregating trending video formats, audio tracks, and pacing styles across YouTube Shorts, TikTok & Reels.
          </p>
        </div>

        {/* Action Controls: Platform tabs, Region picker, Refresh, API Status */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Platform Pills */}
          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
            {(['all', 'youtube', 'tiktok', 'instagram'] as TrendPlatform[]).map((plt) => (
              <button
                key={plt}
                type="button"
                id={`btn_trend_platform_${plt}`}
                onClick={() => setPlatform(plt)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  platform === plt
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {plt === 'all' ? <Globe className="w-3 h-3" /> : getPlatformIcon(plt)}
                <span>{plt === 'all' ? 'All' : plt}</span>
              </button>
            ))}
          </div>

          {/* Region Select */}
          <select
            id="select_trend_region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            {REGION_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code} className="bg-slate-900 text-white">
                {opt.flag} {opt.label}
              </option>
            ))}
          </select>

          {/* Refresh Button */}
          <button
            type="button"
            id="btn_refresh_trends"
            onClick={() => fetchTrends(true)}
            disabled={isLoading}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors disabled:opacity-50"
            title="Refresh trend feed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>

          {/* API Status Button */}
          <button
            type="button"
            id="btn_open_api_status"
            onClick={onOpenApiStatus}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">APIs</span>
          </button>
        </div>
      </div>

      {/* Main Trends Grid & Match Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
        {/* Left 7 Cols: Trending Cards Carousel / Grid */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Trending Topics ({trendData?.trends.length || 0})
            </span>
            {trendData?.isCached && (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Radio className="w-3 h-3 text-sky-400 animate-pulse" />
                Updated {new Date(trendData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {trendData?.trends.map((trend) => {
              const isSelected = selectedTrend?.id === trend.id;
              return (
                <div
                  key={trend.id}
                  id={`trend_item_${trend.id}`}
                  onClick={() => handleSelectTrendItem(trend)}
                  className={`group flex items-start gap-3.5 p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-950/30 border-sky-500/50 shadow-md shadow-sky-500/10'
                      : 'bg-black/30 border-white/5 hover:border-white/20 hover:bg-white/5'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-slate-900 border border-white/10">
                    <img
                      src={trend.thumbnailUrl}
                      alt={trend.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-1 left-1 p-1 rounded-md bg-black/70 backdrop-blur-md">
                      {getPlatformIcon(trend.platform)}
                    </div>
                    {trend.aspectRatio && (
                      <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded text-[9px] font-mono bg-black/80 text-slate-300">
                        {trend.aspectRatio}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-1">
                        {trend.title}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                        {trend.trendVelocity}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {trend.description}
                    </p>

                    {/* Tags */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-slate-300 border border-white/10">
                        {trend.category}
                      </span>
                      {(trend.tags || []).slice(0, 3).map((h) => (
                        <span key={h} className="text-[10px] text-sky-400 font-mono">
                          #{h}
                        </span>
                      ))}
                    </div>

                    {/* Stats metrics */}
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                      {trend.metrics?.views && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-slate-400" />
                          {formatNumber(trend.metrics.views)}
                        </span>
                      )}
                      {trend.metrics?.likes && (
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-rose-400" />
                          {formatNumber(trend.metrics.likes)}
                        </span>
                      )}
                      {trend.soundTitle && (
                        <span className="flex items-center gap-1 truncate text-slate-400">
                          <Music2 className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span className="truncate">{trend.soundTitle}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Matched VeeCut Templates for Selected Trend */}
        <div className="lg:col-span-5 bg-black/40 rounded-xl border border-white/10 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-white">VeeCut Template Match</span>
              </div>
              <span className="text-[11px] text-sky-400 font-semibold">
                {matchedTemplates.length} Available
              </span>
            </div>

            {selectedTrend ? (
              <div className="mt-3 space-y-3">
                <div className="p-2.5 rounded-lg bg-sky-950/20 border border-sky-500/20">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                    Active Trend Signal
                  </div>
                  <div className="text-xs font-bold text-white mt-0.5 line-clamp-1">
                    {selectedTrend.title}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-2">
                    <span>Aspect: <strong>{selectedTrend.aspectRatio || '9:16'}</strong></span>
                    <span>•</span>
                    <span>Score: <strong>{selectedTrend.trendScore}/100</strong></span>
                  </div>
                </div>

                {/* List of matched templates */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {matchedTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={template.thumbnail}
                          alt={template.name}
                          className="w-10 h-10 rounded-md object-cover border border-white/10 shrink-0"
                        />
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-white truncate group-hover:text-sky-300">
                            {template.name}
                          </h5>
                          <span className="text-[10px] text-slate-400">
                            {template.duration} • {template.mediaSlots.length} clips
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onUseTemplate(template)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-sm flex items-center gap-1 shrink-0"
                      >
                        <Wand2 className="w-3 h-3" />
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-slate-400">
                Select a trending topic on the left to see matching VeeCut templates
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>Powered by Trend Engine API</span>
            <button
              type="button"
              onClick={onOpenApiStatus}
              className="text-sky-400 hover:underline flex items-center gap-0.5"
            >
              Verify API connections <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
