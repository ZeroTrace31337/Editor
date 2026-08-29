/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Layers,
  Play,
  Star,
  Clock,
  Sparkles,
  ArrowRight,
  Flame,
  Wand2,
  Eye,
} from 'lucide-react';
import { Template } from '../../domain/template/Template';
import { TemplateService } from '../../domain/template/templateService';
import { TemplatePreviewModal } from '../templates/TemplatePreviewModal';
import { UseTemplateModal } from '../templates/UseTemplateModal';

interface TemplatesSectionProps {
  onUseTemplate?: (template: any) => void;
  onOpenTemplatesTab?: () => void;
  onOpenEditor?: () => void;
}

export const TemplatesSection: React.FC<TemplatesSectionProps> = ({
  onUseTemplate,
  onOpenTemplatesTab,
  onOpenEditor,
}) => {
  const templateService = TemplateService.getInstance();
  const [selectedCategory, setSelectedCategory] = useState<string>('trending');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [customizingTemplate, setCustomizingTemplate] = useState<Template | null>(null);

  const categories = [
    { id: 'trending', label: 'Trending' },
    { id: 'for_you', label: 'For You' },
    { id: 'reels', label: 'Reels' },
    { id: 'tiktok', label: 'TikTok' },
    { id: 'shorts', label: 'Shorts' },
    { id: 'cinematic', label: 'Cinematic' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'beat_sync', label: 'Beat Sync' },
    { id: 'ai_templates', label: 'AI Templates' },
  ];

  const templates = templateService.getTemplates({
    category: selectedCategory as any,
  }).slice(0, 8);

  const handleUse = (template: Template) => {
    setCustomizingTemplate(template);
    if (onUseTemplate) {
      onUseTemplate(template);
    }
  };

  return (
    <section className="flex flex-col gap-4" id="trending-templates-section">
      {/* Header & Category Pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-sky-400" />
          <h2 className="text-base font-bold text-white">Trending Templates</h2>
          <span className="text-xs text-slate-400">Ready-made multi-track projects with keyframes & effects</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Categories Scrollable Container */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-sky-400 text-black shadow-xs font-bold'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {onOpenTemplatesTab && (
            <button
              type="button"
              onClick={onOpenTemplatesTab}
              className="hidden sm:flex items-center gap-1 text-xs font-bold text-sky-400 hover:text-sky-300 shrink-0"
            >
              <span>View All 22 Categories</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {templates.map((template) => {
          return (
            <div
              key={template.id}
              id={`template-card-${template.id}`}
              className="group relative flex flex-col rounded-2xl bg-[#11131b] hover:bg-[#141724] border border-white/10 hover:border-sky-500/40 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              {/* Thumbnail Container */}
              <div
                onClick={() => setPreviewTemplate(template)}
                className="relative aspect-[16/10] w-full bg-black/60 overflow-hidden cursor-pointer"
              >
                <img
                  src={template.thumbnail}
                  alt={template.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Badges */}
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  {template.isTrending && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-md">
                      <Flame className="w-2.5 h-2.5 fill-white" />
                      Trending
                    </span>
                  )}
                  {template.isNew && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-md">
                      <Sparkles className="w-2.5 h-2.5" />
                      New
                    </span>
                  )}
                </div>

                <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white backdrop-blur-md">
                  {template.duration}
                </div>

                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-slate-300 backdrop-blur-md">
                  {template.aspectRatio}
                </div>
              </div>

              {/* Template Info & Action */}
              <div className="p-3.5 flex flex-col justify-between flex-1 gap-2">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <h3
                      onClick={() => setPreviewTemplate(template)}
                      className="text-xs font-bold text-white group-hover:text-sky-300 truncate cursor-pointer"
                      title={template.name}
                    >
                      {template.name}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 shrink-0">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {template.rating.toFixed(1)}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {template.description}
                  </p>

                  <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                    <span>{(template.usageCount / 1000).toFixed(1)}k uses</span>
                    <span>•</span>
                    <span>{template.mediaSlots.length} Slots</span>
                    <span>•</span>
                    <span className="text-sky-400">{template.style}</span>
                  </div>
                </div>

                {/* Action CTA */}
                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(template)}
                    className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
                  >
                    <Eye className="w-3 h-3 text-slate-400" />
                    <span>Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUse(template)}
                    className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>Use</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onUseTemplate={(tmpl) => {
          setPreviewTemplate(null);
          setCustomizingTemplate(tmpl);
        }}
      />

      {/* Use Template Modal */}
      <UseTemplateModal
        template={customizingTemplate}
        isOpen={!!customizingTemplate}
        onClose={() => setCustomizingTemplate(null)}
        onOpenEditor={() => {
          if (onOpenEditor) onOpenEditor();
        }}
      />
    </section>
  );
};

