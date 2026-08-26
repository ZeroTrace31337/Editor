/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Youtube,
  Smartphone,
  Square,
  Instagram,
  Film,
  Sliders,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { CANVAS_PRESETS, CanvasPreset } from './homeData';

interface CanvasPresetsSectionProps {
  onSelectPreset: (preset: CanvasPreset) => void;
  onOpenCustomCanvasModal: () => void;
}

export const CanvasPresetsSection: React.FC<CanvasPresetsSectionProps> = ({
  onSelectPreset,
  onOpenCustomCanvasModal,
}) => {
  const getIcon = (type: CanvasPreset['iconType']) => {
    switch (type) {
      case 'youtube':
        return <Youtube className="w-5 h-5 text-red-400" />;
      case 'phone':
        return <Smartphone className="w-5 h-5 text-pink-400" />;
      case 'square':
        return <Square className="w-5 h-5 text-blue-400" />;
      case 'instagram':
        return <Instagram className="w-5 h-5 text-purple-400" />;
      case 'cinematic':
        return <Film className="w-5 h-5 text-amber-400" />;
      case 'sliders':
        return <Sliders className="w-5 h-5 text-cyan-400" />;
    }
  };

  const getAspectVisual = (preset: CanvasPreset) => {
    switch (preset.aspectRatio) {
      case '16:9':
        return (
          <div className="w-14 h-8 rounded border border-cyan-500/40 bg-cyan-500/10 flex items-center justify-center text-[10px] font-mono text-cyan-300">
            16:9
          </div>
        );
      case '9:16':
        return (
          <div className="w-6 h-11 rounded border border-pink-500/40 bg-pink-500/10 flex items-center justify-center text-[10px] font-mono text-pink-300">
            9:16
          </div>
        );
      case '1:1':
        return (
          <div className="w-9 h-9 rounded border border-blue-500/40 bg-blue-500/10 flex items-center justify-center text-[10px] font-mono text-blue-300">
            1:1
          </div>
        );
      case '4:5':
        return (
          <div className="w-8 h-10 rounded border border-purple-500/40 bg-purple-500/10 flex items-center justify-center text-[10px] font-mono text-purple-300">
            4:5
          </div>
        );
      case '21:9':
        return (
          <div className="w-16 h-7 rounded border border-amber-500/40 bg-amber-500/10 flex items-center justify-center text-[10px] font-mono text-amber-300">
            21:9
          </div>
        );
      default:
        return (
          <div className="w-12 h-8 rounded border border-zinc-600 bg-zinc-800 flex items-center justify-center text-[10px] font-mono text-zinc-300">
            Custom
          </div>
        );
    }
  };

  return (
    <section className="flex flex-col gap-3.5" id="canvas-presets-section">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Start Creating</span>
            <span className="text-xs font-normal text-zinc-400">Choose canvas aspect ratio</span>
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {CANVAS_PRESETS.map((preset) => {
          return (
            <div
              key={preset.id}
              id={`preset-card-${preset.id}`}
              onClick={() => {
                if (preset.aspectRatio === 'custom') {
                  onOpenCustomCanvasModal();
                } else {
                  onSelectPreset(preset);
                }
              }}
              className="relative flex flex-col justify-between p-4 rounded-xl bg-[#11131b] hover:bg-[#161a27] border border-zinc-800/80 hover:border-cyan-500/50 transition-all duration-200 group cursor-pointer shadow-sm hover:shadow-lg hover:shadow-cyan-500/5 active:scale-[0.98]"
            >
              {/* Popular Tag */}
              {preset.popular && (
                <div className="absolute top-2.5 right-2.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                    Popular
                  </span>
                </div>
              )}

              {/* Visual Box Frame */}
              <div className="h-16 flex items-center justify-center mb-2">
                {getAspectVisual(preset)}
              </div>

              {/* Title & Specs */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  {getIcon(preset.iconType)}
                  <span className="text-xs font-bold text-zinc-200 group-hover:text-white truncate">
                    {preset.name.split(' ')[0]} {preset.name.split(' ')[1]}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-400 line-clamp-1">
                  {preset.description}
                </p>

                <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                  <span>{preset.width}x{preset.height}</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
