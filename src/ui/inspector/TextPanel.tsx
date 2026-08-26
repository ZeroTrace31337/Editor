/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TextClip } from '../../domain/timeline/Clip';
import { useEditor } from '../context/EditorContext';
import {
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Sparkles,
  Layers,
  Film,
  Compass,
  Palette,
  Sliders,
  Wand2,
  Check,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface TextPanelProps {
  clip?: TextClip;
}

const FONT_FAMILIES = [
  { name: 'Inter (Clean Modern)', value: 'Inter, sans-serif' },
  { name: 'Montserrat (Bold Clean)', value: 'Montserrat, sans-serif' },
  { name: 'Poppins (Geometric)', value: 'Poppins, sans-serif' },
  { name: 'Playfair Display (Luxury Serif)', value: 'Playfair Display, serif' },
  { name: 'Cinzel (Cinematic Epic)', value: 'Cinzel, serif' },
  { name: 'Oswald (Punchy Condensed)', value: 'Oswald, sans-serif' },
  { name: 'Bebas Neue (Impact Headline)', value: 'Bebas Neue, sans-serif' },
  { name: 'Roboto Mono (Tech / Code)', value: 'Roboto Mono, monospace' },
  { name: 'Courier Prime (Vintage Script)', value: 'Courier Prime, monospace' },
  { name: 'Pacifico (Brush Script)', value: 'Pacifico, cursive' },
  { name: 'Lobster (Retro Title)', value: 'Lobster, cursive' },
  { name: 'Impact (Viral Meme / Bold)', value: 'Impact, sans-serif' },
];

const TEXT_PRESETS = [
  {
    name: 'Cinematic Gold',
    fontFamily: 'Cinzel, serif',
    fontSize: 56,
    fontWeight: '700',
    textColor: '#fef08a',
    gradientType: 'linear' as const,
    gradientColors: ['#fef08a', '#eab308'],
    gradientAngle: 45,
    backgroundColor: 'transparent',
    strokeWidth: 0,
    shadowColor: 'rgba(0,0,0,0.9)',
    shadowBlur: 14,
    animation: 'fade' as const,
  },
  {
    name: 'Cyber Neon Glow',
    fontFamily: 'Montserrat, sans-serif',
    fontSize: 60,
    fontWeight: '800',
    textColor: '#22d3ee',
    gradientType: 'linear' as const,
    gradientColors: ['#22d3ee', '#818cf8'],
    gradientAngle: 90,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    backgroundPadding: 16,
    backgroundRadius: 8,
    strokeColor: '#ec4899',
    strokeWidth: 3,
    glowColor: '#22d3ee',
    glowBlur: 16,
    glowIntensity: 1.0,
    animation: 'pop' as const,
  },
  {
    name: 'Viral Pop Punch',
    fontFamily: 'Impact, sans-serif',
    fontSize: 72,
    fontWeight: '800',
    textColor: '#facc15',
    strokeColor: '#000000',
    strokeWidth: 8,
    shadowColor: 'rgba(0,0,0,1)',
    shadowBlur: 12,
    animation: 'bounce' as const,
  },
  {
    name: 'Lower Third Minimal',
    fontFamily: 'Inter, sans-serif',
    fontSize: 36,
    fontWeight: '600',
    textColor: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    textColor: '#f43f5e',
    gradientType: 'linear' as const,
    gradientColors: ['#f43f5e', '#fb923c'],
    gradientAngle: 0,
    strokeColor: '#581c87',
    strokeWidth: 6,
    shadowColor: 'rgba(88, 28, 135, 0.9)',
    shadowBlur: 18,
    animation: 'typewriter' as const,
  },
  {
    name: 'Karaoke Pop Highlight',
    fontFamily: 'Poppins, sans-serif',
    fontSize: 52,
    fontWeight: '700',
    textColor: '#ffffff',
    backgroundColor: 'rgba(24, 24, 27, 0.75)',
    backgroundPadding: 12,
    backgroundRadius: 10,
    strokeColor: '#38bdf8',
    strokeWidth: 2,
    glowColor: '#38bdf8',
    glowBlur: 12,
    animation: 'word-reveal' as const,
  },
];

export const TextPanel: React.FC<TextPanelProps> = ({ clip: propClip }) => {
  const { project, projectService, selectedClip } = useEditor();
  const [activeTab, setActiveTab] = useState<'content' | 'style' | 'layout' | 'animation' | 'ai'>('content');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

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

  const handleAITextGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAI(true);
    try {
      const res = await fetch('/api/ai/text-writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: aiPrompt, style: 'cinematic', tone: 'impactful' }),
      });
      const data = await res.json();
      if (data.title) {
        updateClip({
          text: data.title,
          ...(data.suggestedStyle || {}),
        });
        if (data.variations) {
          setAiSuggestions(data.variations);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleAISmartStyle = async () => {
    setIsGeneratingAI(true);
    try {
      const res = await fetch('/api/ai/smart-text-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clip.text || 'TITLE', mood: 'viral modern' }),
      });
      const styleData = await res.json();
      updateClip(styleData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="space-y-3 text-xs">
      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-950 px-1 pt-1 gap-1">
        {[
          { id: 'content', label: 'Content', icon: Type },
          { id: 'style', label: 'Style & Color', icon: Palette },
          { id: 'layout', label: 'Layout & Warp', icon: Compass },
          { id: 'animation', label: 'Animation', icon: Film },
          { id: 'ai', label: 'AI Magic', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium transition border-b-2 ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-300 bg-zinc-900/60'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: CONTENT & PRESETS */}
      {activeTab === 'content' && (
        <div className="space-y-3">
          {/* Text Area */}
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
              placeholder="Enter title, caption, or subtitle..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 font-medium resize-y"
            />
          </div>

          {/* Quick Style Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="font-semibold text-zinc-300 text-[11px] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Pro Typography Presets</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {TEXT_PRESETS.map((pst) => (
                <button
                  key={pst.name}
                  type="button"
                  onClick={() => updateClip(pst)}
                  className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-purple-500 hover:bg-zinc-850 text-left transition active:scale-95 flex flex-col justify-between h-14"
                >
                  <span className="text-[10px] font-bold text-zinc-200 truncate">{pst.name}</span>
                  <span className="text-[9px] text-purple-400 font-mono capitalize">{pst.animation}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STYLE & COLOR */}
      {activeTab === 'style' && (
        <div className="space-y-3">
          {/* Typography Controls */}
          <div className="space-y-2 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-medium">Font Family</label>
              <select
                value={clip.fontFamily || 'Inter, sans-serif'}
                onChange={(e) => updateClip({ fontFamily: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-500 font-medium"
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size & Weight & Style */}
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
                <label className="text-[10px] text-zinc-400 block mb-1">Formatting</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateClip({ fontWeight: clip.fontWeight === 'bold' || clip.fontWeight === '700' ? 'normal' : 'bold' })}
                    className={`p-1.5 rounded border ${
                      clip.fontWeight === 'bold' || clip.fontWeight === '700'
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                    title="Bold"
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
                    title="Italic"
                  >
                    <Italic className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => updateClip({ underline: !clip.underline })}
                    className={`p-1.5 rounded border ${
                      clip.underline
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                    title="Underline"
                  >
                    <Underline className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Color & Gradient */}
          <div className="space-y-2 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
            <div className="flex items-center justify-between text-zinc-300 font-semibold text-[11px]">
              <span className="flex items-center gap-1">
                <Palette className="w-3 h-3 text-pink-400" />
                <span>Text Color & Gradient</span>
              </span>
              <div className="flex gap-1">
                {(['none', 'linear', 'radial'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      updateClip({
                        gradientType: mode,
                        gradientColors: clip.gradientColors || ['#f43f5e', '#38bdf8'],
                      })
                    }
                    className={`px-2 py-0.5 rounded text-[9px] font-medium capitalize border ${
                      (clip.gradientType || 'none') === mode
                        ? 'bg-pink-950/60 border-pink-500 text-pink-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    {mode === 'none' ? 'Solid' : mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Solid or Gradient Pickers */}
            {(!clip.gradientType || clip.gradientType === 'none') ? (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={clip.textColor || '#ffffff'}
                  onChange={(e) => updateClip({ textColor: e.target.value })}
                  className="w-8 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={clip.textColor || '#ffffff'}
                  onChange={(e) => updateClip({ textColor: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs font-mono text-zinc-200"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-400">Stops:</span>
                  <input
                    type="color"
                    value={clip.gradientColors?.[0] || '#f43f5e'}
                    onChange={(e) =>
                      updateClip({
                        gradientColors: [e.target.value, clip.gradientColors?.[1] || '#38bdf8'],
                      })
                    }
                    className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="color"
                    value={clip.gradientColors?.[1] || '#38bdf8'}
                    onChange={(e) =>
                      updateClip({
                        gradientColors: [clip.gradientColors?.[0] || '#f43f5e', e.target.value],
                      })
                    }
                    className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
                  />
                </div>
                {clip.gradientType === 'linear' && (
                  <div>
                    <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                      <span>Gradient Angle</span>
                      <span className="font-mono">{clip.gradientAngle || 0}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={clip.gradientAngle || 0}
                      onChange={(e) => updateClip({ gradientAngle: parseInt(e.target.value, 10) })}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Outline & Glow & Shadow */}
          <div className="space-y-2 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
            <span className="font-semibold text-zinc-300 text-[11px] flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-400" />
              <span>Stroke, Glow & Shadow</span>
            </span>

            {/* Stroke / Outline */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                  <span>Stroke Width</span>
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

            {/* Glow */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800">
              <div>
                <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                  <span>Glow Blur</span>
                  <span className="font-mono">{clip.glowBlur || 0}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={clip.glowBlur || 0}
                  onChange={(e) => updateClip({ glowBlur: parseInt(e.target.value, 10) })}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              <div className="flex items-center gap-1.5 pt-3">
                <label className="text-[10px] text-zinc-400">Glow:</label>
                <input
                  type="color"
                  value={clip.glowColor || '#22d3ee'}
                  onChange={(e) => updateClip({ glowColor: e.target.value })}
                  className="w-6 h-6 rounded border border-zinc-700 bg-transparent cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LAYOUT & WARP */}
      {activeTab === 'layout' && (
        <div className="space-y-3">
          {/* Alignment */}
          <div className="space-y-2 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
            <label className="text-[10px] text-zinc-400 font-medium">Text Alignment</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'left', icon: AlignLeft, label: 'Left' },
                { id: 'center', icon: AlignCenter, label: 'Center' },
                { id: 'right', icon: AlignRight, label: 'Right' },
                { id: 'justify', icon: AlignJustify, label: 'Justify' },
              ].map((al) => {
                const Icon = al.icon;
                return (
                  <button
                    key={al.id}
                    type="button"
                    onClick={() => updateClip({ alignment: al.id as any })}
                    className={`py-1.5 rounded flex items-center justify-center gap-1 border text-[10px] font-medium transition ${
                      (clip.alignment || 'center') === al.id
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{al.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Curved Text Arc */}
          <div className="space-y-2 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-300 text-[11px]">Curved Arc Text</span>
              <button
                type="button"
                onClick={() => updateClip({ curvedText: !clip.curvedText, curveAmount: clip.curvedText ? 0 : 50 })}
                className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                  clip.curvedText
                    ? 'bg-purple-950/60 border-purple-500 text-purple-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                {clip.curvedText ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {clip.curvedText && (
              <div>
                <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                  <span>Curve Bend Amount</span>
                  <span className="font-mono">{clip.curveAmount || 50}%</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={clip.curveAmount || 50}
                  onChange={(e) => updateClip({ curveAmount: parseInt(e.target.value, 10) })}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            )}
          </div>

          {/* Text Warp */}
          <div className="space-y-2 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
            <label className="text-[10px] text-zinc-400 font-medium">Text Warp Mesh</label>
            <div className="grid grid-cols-3 gap-1.5">
              {['none', 'wave', 'arch'].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => updateClip({ textWarp: w as any, warpIntensity: w === 'none' ? 0 : 12 })}
                  className={`py-1.5 rounded text-[10px] font-medium capitalize border ${
                    (clip.textWarp || 'none') === w
                      ? 'bg-purple-950/60 border-purple-500 text-purple-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ANIMATION */}
      {activeTab === 'animation' && (
        <div className="space-y-3">
          {/* Kinetic Entrance Animations */}
          <div className="space-y-2 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="font-semibold text-zinc-300 text-[11px] flex items-center gap-1">
                <Film className="w-3 h-3 text-cyan-400" />
                <span>Kinetic Typography Animation</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400 capitalize">{clip.animation || 'none'}</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'none', label: 'None' },
                { id: 'fade', label: 'Fade In' },
                { id: 'slide-up', label: 'Slide Up' },
                { id: 'slide-down', label: 'Slide Down' },
                { id: 'slide-left', label: 'Slide Left' },
                { id: 'slide-right', label: 'Slide Right' },
                { id: 'zoom-in', label: 'Zoom In' },
                { id: 'zoom-out', label: 'Zoom Out' },
                { id: 'pop', label: 'Pop Bounce' },
                { id: 'bounce', label: 'Elastic' },
                { id: 'typewriter', label: 'Typewriter' },
                { id: 'blur', label: 'Blur Focus' },
                { id: 'rotate', label: 'Spin In' },
                { id: 'glitch', label: 'Glitch' },
                { id: 'word-reveal', label: 'Word Reveal' },
              ].map((anim) => (
                <button
                  key={anim.id}
                  type="button"
                  onClick={() => updateClip({ animation: anim.id as any })}
                  className={`py-1.5 px-1.5 rounded text-[10px] font-medium border text-center transition ${
                    (clip.animation || 'none') === anim.id
                      ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200'
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
                  <span className="font-mono text-cyan-400">{(clip.animationDuration || 0.6).toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="4.0"
                  step="0.1"
                  value={clip.animationDuration || 0.6}
                  onChange={(e) => updateClip({ animationDuration: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            )}
          </div>

          {/* Loop Animations */}
          <div className="space-y-2 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
            <label className="text-[10px] text-zinc-400 font-medium">Continuous Loop Motion</label>
            <div className="grid grid-cols-4 gap-1.5">
              {['none', 'pulse', 'float', 'shake'].map((lp) => (
                <button
                  key={lp}
                  type="button"
                  onClick={() => updateClip({ loopAnimation: lp as any })}
                  className={`py-1.5 rounded text-[10px] font-medium capitalize border ${
                    (clip.loopAnimation || 'none') === lp
                      ? 'bg-purple-950/60 border-purple-500 text-purple-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {lp}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AI MAGIC */}
      {activeTab === 'ai' && (
        <div className="space-y-3">
          {/* AI Writer */}
          <div className="space-y-2 bg-zinc-900/60 p-3 rounded-lg border border-purple-500/40">
            <div className="flex items-center gap-1.5 text-purple-300 font-semibold text-[11px]">
              <Wand2 className="w-3.5 h-3.5" />
              <span>AI Typography Director & Writer</span>
            </div>
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. Catchy title for a futuristic travel vlog..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
            />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleAITextGenerate}
                disabled={isGeneratingAI || !aiPrompt.trim()}
                className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                {isGeneratingAI ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                <span>Generate Title & Style</span>
              </button>

              <button
                type="button"
                onClick={handleAISmartStyle}
                disabled={isGeneratingAI}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium flex items-center gap-1 transition"
                title="AI Auto-Style based on existing text"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Smart Style</span>
              </button>
            </div>

            {/* AI Variations */}
            {aiSuggestions.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                <span className="text-[10px] text-zinc-400 font-medium">Alternative Titles:</span>
                <div className="space-y-1">
                  {aiSuggestions.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => updateClip({ text: sug })}
                      className="w-full text-left p-1.5 rounded bg-zinc-950 border border-zinc-800/80 hover:border-purple-500 text-[11px] text-zinc-300 hover:text-white truncate"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
