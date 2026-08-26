/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Layers,
  Play,
  Star,
  Download,
  Clock,
  Sparkles,
  Sliders,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { TRENDING_TEMPLATES, TemplateItem } from './homeData';

interface TemplatesSectionProps {
  onUseTemplate: (template: TemplateItem) => void;
  onPreviewTemplate?: (template: TemplateItem) => void;
}

export const TemplatesSection: React.FC<TemplatesSectionProps> = ({
  onUseTemplate,
  onPreviewTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Trending');

  const categories = [
    'Trending',
    'Cinematic',
    'YouTube',
    'Shorts',
    'Reels',
    'Gaming',
    'Business',
    'Travel',
    'Music',
  ];

  const filteredTemplates = selectedCategory === 'Trending'
    ? TRENDING_TEMPLATES
    : TRENDING_TEMPLATES.filter(
        (t) => t.category.toLowerCase() === selectedCategory.toLowerCase()
      );

  return (
    <section className="flex flex-col gap-4" id="trending-templates-section">
      {/* Header & Category Pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h2 className="text-base font-bold text-white">Trending Templates</h2>
          <span className="text-xs text-zinc-400">Ready-made multi-track projects</span>
        </div>

        {/* Categories Scrollable Container */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-cyan-400 text-black shadow-xs font-bold'
                  : 'bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredTemplates.map((template) => {
          return (
            <div
              key={template.id}
              id={`template-card-${template.id}`}
              className="group relative flex flex-col rounded-xl bg-[#11131b] hover:bg-[#141724] border border-zinc-800/80 hover:border-zinc-700/90 overflow-hidden shadow-sm transition-all duration-200"
            >
              {/* Thumbnail Container */}
              <div 
                onClick={() => onUseTemplate(template)}
                className="relative aspect-video w-full bg-black/60 overflow-hidden cursor-pointer"
              >
                <img
                  src={template.thumbnail}
                  alt={template.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                    <Play className="w-4 h-4 fill-black translate-x-0.5" />
                  </div>
                </div>

                {/* Category & Aspect Ratio Badges */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-bold uppercase tracking-wider text-cyan-300 border border-cyan-500/30 backdrop-blur-xs">
                  {template.category}
                </div>

                <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white backdrop-blur-xs">
                  {template.duration}
                </div>

                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-zinc-300 backdrop-blur-xs">
                  {template.aspectRatio}
                </div>
              </div>

              {/* Template Info & Action */}
              <div className="p-3.5 flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <h3
                      onClick={() => onUseTemplate(template)}
                      className="text-xs font-bold text-zinc-200 group-hover:text-white truncate cursor-pointer"
                      title={template.name}
                    >
                      {template.name}
                    </h3>
                  </div>

                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {template.description}
                  </p>

                  <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-400">
                    <span className="flex items-center gap-1 text-amber-400">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {template.rating}
                    </span>
                    <span>•</span>
                    <span>{template.downloads} uses</span>
                    <span>•</span>
                    <span>{template.trackCount} Tracks</span>
                  </div>
                </div>

                {/* Action CTA */}
                <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 font-mono">
                    By {template.author}
                  </span>
                  <button
                    onClick={() => onUseTemplate(template)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-850 hover:bg-cyan-400 text-zinc-200 hover:text-black text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    <span>Use Template</span>
                    <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
