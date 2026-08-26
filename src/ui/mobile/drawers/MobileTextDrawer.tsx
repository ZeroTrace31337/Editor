/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import {
  Type,
  X,
  Plus,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  PlaySquare,
} from 'lucide-react';
import { createRationalTime, secondsToRationalTime } from '../../../core/time/RationalTime';
import { AddClipCommand } from '../../../engine/command/implementations/AddClipCommand';
import { createBaseClip, TextClip } from '../../../domain/timeline/Clip';

interface MobileTextDrawerProps {
  onClose: () => void;
}

const TEXT_STYLES = [
  {
    name: 'TikTok Viral Bold',
    font: 'Impact',
    color: '#FFE600',
    stroke: '#000000',
    strokeWidth: 4,
    animation: 'pop' as const,
  },
  {
    name: 'Cyber Neon Cyan',
    font: 'Arial Black',
    color: '#00F0FF',
    glow: '#00F0FF',
    animation: 'typewriter' as const,
  },
  {
    name: 'Cinematic Gold Serif',
    font: 'Georgia',
    color: '#F3C969',
    stroke: '#000000',
    animation: 'fade' as const,
  },
  {
    name: 'Clean Modern Minimal',
    font: 'Helvetica',
    color: '#FFFFFF',
    bg: '#000000',
    animation: 'slide-up' as const,
  },
  {
    name: 'Crimson Title Flare',
    font: 'Impact',
    color: '#FF2E63',
    stroke: '#FFFFFF',
    animation: 'zoom-in' as const,
  },
];

export const MobileTextDrawer: React.FC<MobileTextDrawerProps> = ({ onClose }) => {
  const {
    timelineEngine,
    commandManager,
    currentTime,
  } = useEditor();

  const [customText, setCustomText] = useState('YOUR TITLE HERE');
  const [selectedFont, setSelectedFont] = useState('Arial Black');
  const [textColor, setTextColor] = useState('#FFE600');
  const [fontSize, setFontSize] = useState(72);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('center');

  const handleAddText = (stylePreset?: typeof TEXT_STYLES[0]) => {
    const sequence = timelineEngine.getSequence();
    let textTrack = sequence.tracks.find((t) => t.kind === 'video' && t.name.includes('V2')) ||
      sequence.tracks.find((t) => t.kind === 'video');

    if (!textTrack && sequence.tracks.length > 0) {
      textTrack = sequence.tracks[0];
    }
    if (!textTrack) return;

    const base = createBaseClip(
      `text_${Date.now()}`,
      'text',
      customText || 'Text Title',
      textTrack.id,
      {
        start: currentTime,
        duration: secondsToRationalTime(4),
      },
      {
        start: createRationalTime(0),
        duration: secondsToRationalTime(4),
      }
    );

    const textClip: TextClip = {
      ...base,
      type: 'text',
      text: customText,
      fontFamily: stylePreset ? stylePreset.font : selectedFont,
      fontSize: fontSize,
      textColor: stylePreset ? stylePreset.color : textColor,
      strokeColor: stylePreset?.stroke || '#000000',
      strokeWidth: stylePreset?.strokeWidth || 3,
      alignment: alignment,
      animation: stylePreset?.animation || 'fade',
    };

    try {
      const cmd = new AddClipCommand(timelineEngine, textTrack.id, textClip);
      commandManager.execute(cmd);
      onClose();
    } catch (err) {
      console.warn(err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0d17] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-purple-400" />
          <h3 className="font-bold text-sm">Add Text & Viral Captions</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Input Box */}
      <div className="p-3 border-b border-zinc-850 flex flex-col gap-2 shrink-0">
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Enter title or subtitle text..."
          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-750 text-white font-bold text-sm focus:outline-none focus:border-purple-400"
        />

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setAlignment('left')}
              className={`p-1.5 rounded-lg ${alignment === 'left' ? 'bg-purple-600 text-white' : 'text-zinc-400'}`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setAlignment('center')}
              className={`p-1.5 rounded-lg ${alignment === 'center' ? 'bg-purple-600 text-white' : 'text-zinc-400'}`}
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setAlignment('right')}
              className={`p-1.5 rounded-lg ${alignment === 'right' ? 'bg-purple-600 text-white' : 'text-zinc-400'}`}
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => handleAddText()}
            className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Insert Text Layer</span>
          </button>
        </div>
      </div>

      {/* Preset Typography Styles */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
          Viral Typography Presets
        </div>

        <div className="space-y-2">
          {TEXT_STYLES.map((style) => (
            <div
              key={style.name}
              className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-purple-500/40 transition"
            >
              <div>
                <div
                  className="text-base font-black tracking-wide"
                  style={{
                    color: style.color,
                    fontFamily: style.font,
                    textShadow: style.stroke ? `0 0 2px ${style.stroke}` : 'none',
                  }}
                >
                  {customText || 'SAMPLE TEXT'}
                </div>
                <span className="text-[10px] text-zinc-400">
                  {style.name} • {style.animation.toUpperCase()}
                </span>
              </div>

              <button
                onClick={() => handleAddText(style)}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
                <span>Apply</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
