/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Plus,
  Trash2,
  Layers,
  Type,
  Check,
  Film,
  Sliders,
} from 'lucide-react';
import {
  TemplateCategoryId,
  TemplateStyle,
  CreateTemplatePayload,
  TemplateMediaSlot,
  TemplateTextSlot,
} from '../../domain/template/Template';
import { TEMPLATE_CATEGORIES } from '../../domain/template/templateCategories';
import { TemplateService } from '../../domain/template/templateService';

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateTemplateModal: React.FC<CreateTemplateModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<TemplateCategoryId>('reels');
  const [description, setDescription] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1' | '4:5'>('9:16');
  const [style, setStyle] = useState<TemplateStyle>('Cinematic');
  const [durationSeconds, setDurationSeconds] = useState(15);
  const [tagsInput, setTagsInput] = useState('Trending, Viral, Modern');
  const [creatorName, setCreatorName] = useState('My Creator Studio');
  const [mediaSlotsCount, setMediaSlotsCount] = useState(4);
  const [textPlaceholder, setTextPlaceholder] = useState('MY EPIC TITLE');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const width = aspectRatio === '9:16' ? 1080 : aspectRatio === '1:1' ? 1080 : 1920;
    const height = aspectRatio === '9:16' ? 1920 : aspectRatio === '1:1' ? 1080 : 1080;
    const slotDuration = durationSeconds / mediaSlotsCount;

    const mediaSlots: TemplateMediaSlot[] = Array.from({ length: mediaSlotsCount }).map((_, i) => ({
      id: `slot_${i + 1}`,
      slotIndex: i,
      name: `Media Slot ${i + 1}`,
      type: 'any',
      startTimeSeconds: i * slotDuration,
      durationSeconds: slotDuration,
      defaultUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&auto=format&fit=crop&q=80',
      label: `Clip ${i + 1}`,
    }));

    const textSlots: TemplateTextSlot[] = [
      {
        id: 'text_1',
        slotIndex: 0,
        name: 'Main Title',
        defaultText: textPlaceholder.trim() || 'CUSTOM TITLE',
        startTimeSeconds: 0.5,
        durationSeconds: Math.min(4.0, durationSeconds),
        fontFamily: 'Montserrat',
        fontSize: 48,
        fontWeight: '800',
        color: '#ffffff',
        alignment: 'center',
      },
    ];

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload: CreateTemplatePayload = {
      name: name.trim(),
      category,
      description: description.trim() || 'Custom created template in VeeCut.',
      aspectRatio,
      width,
      height,
      fps: 60,
      durationSeconds,
      thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
      style,
      tags,
      mediaSlots,
      textSlots,
      transitions: ['Cross Dissolve', 'Whip Pan'],
      effects: ['Dynamic Glow'],
      filters: ['VeeCut Clean Grade'],
      creatorName: creatorName.trim() || 'You',
    };

    TemplateService.getInstance().saveCustomTemplate(payload);
    onCreated();
    onClose();
  };

  return (
    <div
      id="create_template_modal_backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="create_template_modal_content"
        className="relative w-full max-w-2xl bg-[#0d1117] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#11131b]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Create & Publish Template</h2>
              <p className="text-xs text-slate-400">Define a reusable template layout for the VeeCut community</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Template Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cyberpunk Velocity Drop"
              className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 focus:border-sky-400 text-white text-xs outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TemplateCategoryId)}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs outline-none"
              >
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Aspect Ratio
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs outline-none"
              >
                <option value="9:16">9:16 (Vertical / Reels / TikTok)</option>
                <option value="16:9">16:9 (Landscape / YouTube)</option>
                <option value="1:1">1:1 (Square / Instagram Feed)</option>
                <option value="4:5">4:5 (Portrait / Photography)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Duration (sec)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(parseInt(e.target.value) || 15)}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Media Slots Count
              </label>
              <input
                type="number"
                min="1"
                max="16"
                value={mediaSlotsCount}
                onChange={(e) => setMediaSlotsCount(parseInt(e.target.value) || 4)}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Visual Style
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as TemplateStyle)}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs outline-none"
              >
                <option value="Cinematic">Cinematic</option>
                <option value="Minimal">Minimal</option>
                <option value="Fast">Fast</option>
                <option value="Emotional">Emotional</option>
                <option value="Professional">Professional</option>
                <option value="Energetic">Energetic</option>
                <option value="Aesthetic">Aesthetic</option>
                <option value="Humorous">Humorous</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Main Title Placeholder
            </label>
            <input
              type="text"
              value={textPlaceholder}
              onChange={(e) => setTextPlaceholder(e.target.value)}
              placeholder="e.g. YOUR HOOK TEXT HERE"
              className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the pacing, mood, and ideal footage for this template..."
              className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Reels, Kinetic, Fast"
                className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Creator Name
              </label>
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="Your Studio Name"
                className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs outline-none"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20 transition-all hover:scale-105"
            >
              <Check className="w-4 h-4" />
              Save Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
