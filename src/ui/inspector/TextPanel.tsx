/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TextClip } from '../../domain/timeline/Clip';
import { useEditor } from '../context/EditorContext';
import {
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Sparkles,
  Layers,
  Square,
  Eye,
  Film,
} from 'lucide-react';

interface TextPanelProps {
  clip?: TextClip;
}

const FONT_FAMILIES = [
  { name: 'Inter (Modern Clean)', value: 'Inter, sans-serif' },
  { name: 'Montserrat (Bold Clean)', value: 'Montserrat, sans-serif' },
  { name: 'Poppins (Geometric)', value: 'Poppins, sans-serif' },
  { name: 'Playfair Display (Luxury Serif)', value: 'Playfair Display, serif' },
  { name: 'Cinzel (Cinematic Epic)', value: 'Cinzel, serif' },
  { name: 'Oswald (Punchy Condensed)', value: 'Oswald, sans-serif' },
  { name: 'Bebas Neue (Impact Headline)', value: 'Bebas Neue, sans-serif' },
  { name: 'Roboto Mono (Tech / Code)', value: 'Roboto Mono, monospace' },
  { name: 'Courier Prime (Script / Vintage)', value: 'Courier Prime, monospace' },
  { name: 'Pacifico (Handwritten Brush)', value: 'Pacifico, cursive' },
  { name: 'Lobster (Retro Script)', value: 'Lobster, cursive' },
  { name: 'Impact (Meme / Bold)', value: 'Impact, sans-serif' },
];

const TEXT_PRESETS = [
  {
    name: 'Cinematic Gold',
    fontFamily: 'Cinzel, serif',
    fontSize: 56,
    fontWeight: '700',
    textColor: '#fef08a',
    backgroundColor: 'transparent',
    strokeWidth: 0,
    shadowColor: 'rgba(0,0,0,0.9)',
    shadowBlur: 12,
    animation: 'fade' as const,
  },
  {
    name: 'Cyberpunk Neon',
    fontFamily: 'Montserrat, sans-serif',
    fontSize: 60,
    fontWeight: '800',
    textColor: '#22d3ee',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    backgroundPadding: 16,
    backgroundRadius: 8,
    strokeColor: '#ec4899',
    strokeWidth: 4,
    shadowColor: 'rgba(236,72,153,0.8)',
    shadowBlur: 20,
    animation: 'typewriter' as const,
  },
  {
    name: 'Lower Third Clean',
    fontFamily: 'Inter, sans-serif',
    fontSize: 36,
    fontWeight: '600',
    textColor: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backgroundPadding: 14,
    backgroundRadius: 6,
    alignment: 'left' as const,
    animation: 'slide-up' as const,
  },
  {
    name: 'Retro 80s Synth',
    fontFamily: 'Oswald, sans-serif',
    fontSize: 64,
    fontWeight: '700',
    textColor: '#facc15',
    strokeColor: '#7e22ce',
    strokeWidth: 6,
    shadowColor: 'rgba(126, 34, 206, 0.9)',
    shadowBlur: 16,
    animation: 'pop' as const,
  },
  {
    name: 'Minimal Subtitle',
    fontFamily: 'Inter, sans-serif',
    fontSize: 34,
    fontWeight: '600',
    textColor: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 4,
    shadowColor: 'rgba(0,0,0,0.8)',
    shadowBlur: 6,
    animation: 'fade' as const,
  },
  {
    name: 'Viral Pop Punch',
    fontFamily: 'Impact, sans-serif',
    fontSize: 72,
    fontWeight: '800',
    textColor: '#38bdf8',
    strokeColor: '#000000',
    strokeWidth: 8,
    shadowColor: 'rgba(0,0,0,1)',
    shadowBlur: 10,
    animation: 'bounce' as const,
  },
];

export const TextPanel: React.FC<TextPanelProps> = ({ clip: propClip }) => {
  const { project, projectService, selectedClip } = useEditor();
  const clip = (propClip || (selectedClip?.type === 'text' ? (selectedClip as TextClip) : undefined)) as TextClip | undefined;

  if (!clip) {
    return (
      <div className="p-6 text-center text-zinc-500 text-xs">
        <Type className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
        <p>Select a title or text clip on the timeline to edit typography & styling.</p>
      </div>
    );
  }

  const updateClip = (patch: Partial<TextClip>) => {
    Object.assign(clip, patch);
    projectService.setProject({ ...project });
  };

  return (
    <div className="space-y-4 text-xs">
      {/* 1. Text Content Input */}
      <div className="space-y-1.5 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
        <label className="text-[11px] font-semibold text-zinc-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-purple-400" />
            <span>Text Content</span>
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">{(clip.text || '').length} chars</span>
        </label>
        <textarea
          value={clip.text || ''}
          onChange={(e) => updateClip({ text: e.target.value })}
          rows={3}
          placeholder="Enter caption or title..."
          className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 font-medium resize-y"
        />
      </div>

      {/* 2. Quick Typography Presets */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-zinc-400">
          <span className="font-semibold text-zinc-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Title Styles & Presets</span>
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {TEXT_PRESETS.map((pst) => (
            <button
              key={pst.name}
              type="button"
              onClick={() => updateClip(pst)}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-purple-500 hover:bg-zinc-850 text-left transition active:scale-95 flex flex-col justify-between h-14"
            >
              <span className="text-[10px] font-bold text-zinc-200 truncate">{pst.name}</span>
              <span className="text-[9px] text-purple-400 font-mono capitalize">{pst.animation}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Font Family & Weight */}
      <div className="space-y-2 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-400 font-medium">Font Family</label>
          <select
            value={clip.fontFamily || 'Inter, sans-serif'}
            onChange={(e) => updateClip({ fontFamily: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Font Size & Weight & Alignment */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
              <span>Font Size</span>
              <span className="font-mono text-purple-400">{clip.fontSize || 48}px</span>
            </div>
            <input
              type="range"
              min="16"
              max="140"
              value={clip.fontSize || 48}
              onChange={(e) => updateClip({ fontSize: parseInt(e.target.value, 10) })}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">Style & Alignment</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => updateClip({ fontWeight: clip.fontWeight === 'bold' ? 'normal' : 'bold' })}
                className={`p-1.5 rounded border ${
                  clip.fontWeight === 'bold'
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
                title="Toggle Bold"
              >
                <Bold className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => updateClip({ fontStyle: clip.fontStyle === 'italic' ? 'normal' : 'italic' })}
                className={`p-1.5 rounded border ${
                  clip.fontStyle === 'italic'
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
                title="Toggle Italic"
              >
                <Italic className="w-3 h-3" />
              </button>

              {(['left', 'center', 'right'] as const).map((align) => {
                const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
                return (
                  <button
                    key={align}
                    type="button"
                    onClick={() => updateClip({ alignment: align })}
                    className={`p-1.5 rounded border ${
                      (clip.alignment || 'center') === align
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                    title={`Align ${align}`}
                  >
                    <Icon className="w-3 h-3" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Text & Background Colors */}
      <div className="grid grid-cols-2 gap-2 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-400 font-medium">Text Color</label>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={clip.textColor || '#ffffff'}
              onChange={(e) => updateClip({ textColor: e.target.value })}
              className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
            />
            <input
              type="text"
              value={clip.textColor || '#ffffff'}
              onChange={(e) => updateClip({ textColor: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-200 font-mono"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-zinc-400 font-medium">Background Box</label>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={clip.backgroundColor?.startsWith('#') ? clip.backgroundColor : '#000000'}
              onChange={(e) => updateClip({ backgroundColor: e.target.value })}
              className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
            />
            <button
              type="button"
              onClick={() =>
                updateClip({
                  backgroundColor:
                    clip.backgroundColor && clip.backgroundColor !== 'transparent'
                      ? 'transparent'
                      : 'rgba(0,0,0,0.8)',
                })
              }
              className={`px-2 py-1 rounded text-[10px] font-medium border flex-1 ${
                clip.backgroundColor && clip.backgroundColor !== 'transparent'
                  ? 'bg-purple-950/60 border-purple-600 text-purple-300'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {clip.backgroundColor && clip.backgroundColor !== 'transparent' ? 'Enabled' : 'None'}
            </button>
          </div>
        </div>
      </div>

      {/* 5. Stroke & Shadow */}
      <div className="space-y-2 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
        <span className="font-semibold text-zinc-300 text-[11px] flex items-center gap-1">
          <Layers className="w-3 h-3 text-indigo-400" />
          <span>Outline & Shadow</span>
        </span>

        {/* Outline / Stroke */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
              <span>Outline Width</span>
              <span className="font-mono">{clip.strokeWidth || 0}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="16"
              value={clip.strokeWidth || 0}
              onChange={(e) => updateClip({ strokeWidth: parseInt(e.target.value, 10) })}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 pt-3">
            <label className="text-[10px] text-zinc-400">Color:</label>
            <input
              type="color"
              value={clip.strokeColor || '#000000'}
              onChange={(e) => updateClip({ strokeColor: e.target.value })}
              className="w-6 h-6 rounded border border-zinc-700 bg-transparent cursor-pointer"
            />
          </div>
        </div>

        {/* Drop Shadow Blur */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800">
          <div>
            <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
              <span>Shadow Blur</span>
              <span className="font-mono">{clip.shadowBlur ?? 8}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={clip.shadowBlur ?? 8}
              onChange={(e) => updateClip({ shadowBlur: parseInt(e.target.value, 10) })}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 pt-3">
            <label className="text-[10px] text-zinc-400">Shadow:</label>
            <input
              type="color"
              value={clip.shadowColor?.startsWith('#') ? clip.shadowColor : '#000000'}
              onChange={(e) => updateClip({ shadowColor: e.target.value })}
              className="w-6 h-6 rounded border border-zinc-700 bg-transparent cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 6. Kinetic Typography Animations */}
      <div className="space-y-2 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
        <div className="flex items-center justify-between text-zinc-400">
          <span className="font-semibold text-zinc-300 text-[11px] flex items-center gap-1">
            <Film className="w-3 h-3 text-cyan-400" />
            <span>Kinetic Animation</span>
          </span>
          <span className="text-[10px] font-mono text-cyan-400 capitalize">{clip.animation || 'none'}</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { id: 'none', label: 'None' },
              { id: 'fade', label: 'Fade In' },
              { id: 'slide-up', label: 'Slide Up' },
              { id: 'slide-down', label: 'Slide Down' },
              { id: 'pop', label: 'Pop Bounce' },
              { id: 'typewriter', label: 'Typewriter' },
            ] as const
          ).map((anim) => (
            <button
              key={anim.id}
              type="button"
              onClick={() => updateClip({ animation: anim.id })}
              className={`py-1.5 px-2 rounded text-[10px] font-medium border text-center transition ${
                (clip.animation || 'none') === anim.id
                  ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 shadow-xs'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {anim.label}
            </button>
          ))}
        </div>

        {clip.animation && clip.animation !== 'none' && (
          <div className="pt-2">
            <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
              <span>Animation Duration</span>
              <span className="font-mono text-cyan-400">{(clip.animationDuration || 1.0).toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="4.0"
              step="0.1"
              value={clip.animationDuration || 1.0}
              onChange={(e) => updateClip({ animationDuration: parseFloat(e.target.value) })}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>
        )}
      </div>
    </div>
  );
};
