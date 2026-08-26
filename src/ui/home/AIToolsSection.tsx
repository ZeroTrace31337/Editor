/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Sparkles,
  Video,
  Image,
  Palette,
  Scissors,
  Eraser,
  Crosshair,
  Subtitles,
  Mic,
  Wand2,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { AI_TOOLS_LIST, AIToolItem } from './homeData';

interface AIToolsSectionProps {
  onOpenAITool: (tool: AIToolItem) => void;
}

export const AIToolsSection: React.FC<AIToolsSectionProps> = ({ onOpenAITool }) => {
  const getToolIcon = (name: string) => {
    switch (name) {
      case 'Video':
        return <Video className="w-4 h-4" />;
      case 'Image':
        return <Image className="w-4 h-4" />;
      case 'Palette':
        return <Palette className="w-4 h-4" />;
      case 'Scissors':
        return <Scissors className="w-4 h-4" />;
      case 'Eraser':
        return <Eraser className="w-4 h-4" />;
      case 'Crosshair':
        return <Crosshair className="w-4 h-4" />;
      case 'Subtitles':
        return <Subtitles className="w-4 h-4" />;
      case 'Mic':
        return <Mic className="w-4 h-4" />;
      case 'Wand2':
        return <Wand2 className="w-4 h-4" />;
      case 'Sparkles':
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  return (
    <section className="flex flex-col gap-4" id="ai-tools-suite-section">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-base font-bold text-white">AI Tools Suite</h2>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            10 Neural Models
          </span>
        </div>
        <p className="text-xs text-zinc-400">
          Professional generative and computer-vision toolset integrated into your timeline
        </p>
      </div>

      {/* 10 AI Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {AI_TOOLS_LIST.map((tool) => {
          return (
            <div
              key={tool.id}
              id={`ai-tool-card-${tool.id}`}
              onClick={() => onOpenAITool(tool)}
              className="relative flex flex-col justify-between p-4 rounded-xl bg-[#11131b] hover:bg-[#151826] border border-zinc-800/80 hover:border-cyan-500/40 transition-all duration-200 group cursor-pointer shadow-sm hover:shadow-lg hover:shadow-cyan-500/5 active:scale-[0.98]"
            >
              {/* Header with Icon and Badge */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-9 h-9 rounded-lg bg-gradient-to-tr ${tool.accentGradient} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}
                  >
                    {getToolIcon(tool.iconName)}
                  </div>

                  {tool.badge && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/80">
                      {tool.badge}
                    </span>
                  )}
                </div>

                {/* Category & Title */}
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                  {tool.category}
                </span>
                <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors mt-0.5 mb-1.5">
                  {tool.name}
                </h3>

                <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                  {tool.description}
                </p>
              </div>

              {/* Bottom Feature Tags & Action Trigger */}
              <div className="mt-3.5 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-medium">
                  {tool.features[0]}
                </span>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                  <span>Launch</span>
                  <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
