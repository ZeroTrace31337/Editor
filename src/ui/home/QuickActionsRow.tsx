/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import {
  Plus,
  Upload,
  Video,
  Sparkles,
  Subtitles,
  Scissors,
  Layers,
  Wand2,
  Mic,
  Disc,
} from 'lucide-react';

interface QuickActionsRowProps {
  onNewProject: () => void;
  onImportVideo: (files: FileList) => void;
  onOpenRecord: () => void;
  onOpenAIVideo: () => void;
  onOpenAutoCaptions: () => void;
  onOpenRemoveBg: () => void;
  onOpenTemplates: () => void;
}

export const QuickActionsRow: React.FC<QuickActionsRowProps> = ({
  onNewProject,
  onImportVideo,
  onOpenRecord,
  onOpenAIVideo,
  onOpenAutoCaptions,
  onOpenRemoveBg,
  onOpenTemplates,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const actions = [
    {
      id: 'quick_new_project',
      title: 'New Project',
      desc: 'Start with a fresh timeline',
      icon: Plus,
      badge: 'Fast',
      color: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30',
      action: onNewProject,
    },
    {
      id: 'quick_import_video',
      title: 'Import Video',
      desc: 'Upload files directly to canvas',
      icon: Upload,
      color: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30',
      action: () => fileInputRef.current?.click(),
    },
    {
      id: 'quick_record',
      title: 'Record',
      desc: 'Screen, webcam & voiceover',
      icon: Disc,
      badge: 'Studio',
      color: 'from-rose-500/20 to-pink-500/20 text-rose-400 border-rose-500/30',
      action: onOpenRecord,
    },
    {
      id: 'quick_ai_video',
      title: 'AI Video',
      desc: 'Generate scenes from text',
      icon: Sparkles,
      badge: 'AI',
      color: 'from-purple-500/20 to-violet-500/20 text-purple-400 border-purple-500/30',
      action: onOpenAIVideo,
    },
    {
      id: 'quick_auto_captions',
      title: 'Auto Captions',
      desc: 'Whisper 99% accurate subtitles',
      icon: Subtitles,
      badge: 'AI',
      color: 'from-violet-500/20 to-indigo-500/20 text-violet-400 border-violet-500/30',
      action: onOpenAutoCaptions,
    },
    {
      id: 'quick_remove_bg',
      title: 'Remove Background',
      desc: 'One-click neural rotoscoping',
      icon: Scissors,
      badge: 'AI',
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
      action: onOpenRemoveBg,
    },
    {
      id: 'quick_template',
      title: 'From Template',
      desc: 'Browse trending presets',
      icon: Layers,
      color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
      action: onOpenTemplates,
    },
  ];

  return (
    <section className="flex flex-col gap-3" id="quick-actions-section">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          Quick Actions
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              id={`btn-${act.id}`}
              onClick={act.action}
              className="flex flex-col items-start p-3.5 rounded-xl bg-[#11131b] hover:bg-[#151824] border border-zinc-800/80 hover:border-zinc-700 transition-all duration-200 group text-left relative overflow-hidden shadow-sm active:scale-[0.98] cursor-pointer"
            >
              {/* Top Accent Icon & Badge */}
              <div className="flex items-center justify-between w-full mb-2.5">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${act.color} flex items-center justify-center border group-hover:scale-110 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
                {act.badge && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {act.badge}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <span className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors">
                {act.title}
              </span>
              <span className="text-[11px] text-zinc-400 leading-tight mt-0.5 line-clamp-2">
                {act.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onImportVideo(e.target.files);
          }
        }}
        multiple
        accept="video/*,audio/*,image/*"
        className="hidden"
      />
    </section>
  );
};
