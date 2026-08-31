/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Play,
  Heart,
  Sparkles,
  Layers,
  Clock,
  Flame,
  CheckCircle2,
  Cpu,
  Star,
  Eye,
  Wand2,
  Youtube,
  Instagram,
  Smartphone,
  Download,
  Share2,
  Film,
} from 'lucide-react';
import { Template } from '../../domain/template/Template';
import { TemplateService } from '../../domain/template/templateService';

interface TemplateCardProps {
  template: Template;
  onPreview: (template: Template) => void;
  onUseTemplate: (template: Template) => void;
  onExportJson?: (template: Template) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (templateId: string) => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onPreview,
  onUseTemplate,
  onExportJson,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [fav, setFav] = useState(isFavorite);
  const templateService = TemplateService.getInstance();

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextFav = !fav;
    setFav(nextFav);
    templateService.toggleFavorite(template.id);
    if (onToggleFavorite) {
      onToggleFavorite(template.id);
    }
  };

  const getPlatformBadge = () => {
    switch (template.primaryPlatform) {
      case 'youtube_shorts':
      case 'youtube':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <Youtube className="w-3 h-3 text-rose-400" />
            Shorts
          </span>
        );
      case 'tiktok':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            <Smartphone className="w-3 h-3 text-sky-400" />
            TikTok
          </span>
        );
      case 'instagram_reels':
      case 'instagram':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-500/20 text-pink-300 border border-pink-500/30">
            <Instagram className="w-3 h-3 text-pink-400" />
            Reels
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <Film className="w-3 h-3 text-indigo-400" />
            Universal
          </span>
        );
    }
  };

  return (
    <div
      id={`template_card_${template.id}`}
      className="group relative flex flex-col bg-[#11131b] border border-white/10 hover:border-sky-500/50 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-2xl hover:shadow-sky-500/10 hover:-translate-y-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Visual Thumbnail & Preview Area */}
      <div
        className="relative w-full aspect-[16/10] bg-black/40 overflow-hidden cursor-pointer"
        onClick={() => onPreview(template)}
      >
        <img
          src={template.thumbnail}
          alt={template.name}
          className={`w-full h-full object-cover transition-transform duration-700 ease-out ${
            isHovered ? 'scale-108 brightness-90' : 'scale-100 brightness-95'
          }`}
          loading="lazy"
        />

        {/* Subtle Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#11131b] via-transparent to-black/40 pointer-events-none" />

        {/* Top Badges Area */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            {template.isTrending && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/90 backdrop-blur-md text-white shadow-md">
                <Flame className="w-3 h-3 fill-white" />
                Trending
              </span>
            )}
            {template.isNew && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/90 backdrop-blur-md text-white shadow-md">
                <Sparkles className="w-3 h-3" />
                New
              </span>
            )}
            {template.isAIPowered && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-500/90 backdrop-blur-md text-white shadow-md">
                <Cpu className="w-3 h-3" />
                AI
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            {onExportJson && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onExportJson(template);
                }}
                className="p-1.5 rounded-full backdrop-blur-md bg-black/60 text-white/70 hover:text-white hover:bg-black/80 hover:scale-110 transition-all"
                title="Export Template JSON"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Favorite Toggle Button */}
            <button
              type="button"
              id={`btn_fav_${template.id}`}
              onClick={handleFavoriteClick}
              className={`p-2 rounded-full backdrop-blur-md transition-all duration-200 shadow-md ${
                fav
                  ? 'bg-rose-500 text-white'
                  : 'bg-black/60 text-white/70 hover:text-white hover:bg-black/80 hover:scale-110'
              }`}
              title={fav ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Duration & Aspect Ratio Badges */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-medium text-white/90 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white/90">
              <Clock className="w-3 h-3 text-sky-400" />
              {template.duration}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-slate-300">
              {template.aspectRatio}
            </span>
          </div>

          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-sky-300">
            <Layers className="w-3 h-3 text-sky-400" />
            {template.mediaSlots.length} Slots
          </span>
        </div>

        {/* Hover Quick Preview Center Button */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-xl border border-white/30 text-white text-xs font-semibold shadow-2xl transition-transform transform group-hover:scale-105">
            <Play className="w-3.5 h-3.5 fill-white" />
            Quick Preview
          </div>
        </div>
      </div>

      {/* Content Metadata Area */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-white text-sm line-clamp-1 group-hover:text-sky-300 transition-colors">
              {template.name}
            </h3>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 shrink-0">
              <Star className="w-3 h-3 fill-amber-400" />
              {template.rating.toFixed(1)}
            </div>
          </div>

          <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {template.description}
          </p>

          <div className="flex items-center gap-2 mt-2">
            {getPlatformBadge()}
            {template.style && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-slate-300 border border-white/10">
                {template.style}
              </span>
            )}
          </div>
        </div>

        {/* Creator Info & Usage Count */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 font-medium text-slate-300">
            <span>{template.creator.name}</span>
            {template.creator.verified && (
              <CheckCircle2 className="w-3 h-3 text-sky-400 fill-sky-400/20" />
            )}
          </div>
          <span>{(template.usageCount / 1000).toFixed(1)}k uses</span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            id={`btn_preview_${template.id}`}
            onClick={() => onPreview(template)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            Preview
          </button>
          <button
            type="button"
            id={`btn_use_${template.id}`}
            onClick={() => onUseTemplate(template)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-md shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Use Template
          </button>
        </div>
      </div>
    </div>
  );
};
