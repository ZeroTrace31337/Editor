/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Keyboard,
  Play,
  Layers,
  Palette,
  Volume2,
  Sparkles,
  Zap,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface TutorialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'tutorials' | 'shortcuts' | 'about';
}

export const TutorialsModal: React.FC<TutorialsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'tutorials',
}) => {
  const [activeTab, setActiveTab] = useState<'tutorials' | 'shortcuts' | 'about'>(initialTab);

  if (!isOpen) return null;

  const shortcutsList = [
    { key: 'Space', desc: 'Toggle Play / Pause Timeline' },
    { key: 'Ctrl / ⌘ + Z', desc: 'Undo last edit' },
    { key: 'Ctrl / ⌘ + Shift + Z', desc: 'Redo last action' },
    { key: 'Ctrl / ⌘ + B', desc: 'Split clip at Playhead' },
    { key: 'Delete / Backspace', desc: 'Delete selected clip' },
    { key: 'S', desc: 'Toggle Timeline Magnetic Snapping' },
    { key: 'Left / Right Arrow', desc: 'Step 1 frame backward / forward' },
    { key: '\\ (Backslash)', desc: 'Toggle Color Grade Before / After' },
    { key: 'Ctrl / ⌘ + O', desc: 'Import Project file (.lumina / .json)' },
    { key: 'Ctrl / ⌘ + S', desc: 'Save & Export Project archive' },
  ];

  const tutorials = [
    {
      title: 'Mastering the Multi-Track Timeline & Ripple Edits',
      duration: '4 min',
      level: 'Beginner',
      category: 'Editing',
      desc: 'Learn how to split clips with Ctrl+B, arrange B-roll overlays on Video tracks V2/V3, and lock tracks.',
    },
    {
      title: '32-Bit Float Color Grading & LUT Workflow',
      duration: '6 min',
      level: 'Intermediate',
      category: 'Color',
      desc: 'Use primary lift/gamma/gain wheels, exposure, HDR tone mapping, and compare Before/After with \\.',
    },
    {
      title: 'AI Rotoscoping & Neural Background Cutout',
      duration: '3 min',
      level: 'Advanced',
      category: 'AI Tools',
      desc: 'Isolate subjects with hair-level accuracy without green screen and composite animated backdrops.',
    },
    {
      title: 'Studio Voice AI Denoise & Audio Mastering',
      duration: '5 min',
      level: 'Intermediate',
      category: 'Audio',
      desc: 'Clean background traffic and reverb, apply dynamic compression, and pan multi-channel sound.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#12141d] border border-zinc-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">VeeCut Knowledge & Help Center</h2>
              <p className="text-xs text-zinc-400">Tutorials, shortcuts, and documentation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 py-2.5 bg-zinc-900/60 border-b border-zinc-800/80 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('tutorials')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'tutorials' ? 'bg-zinc-800 text-cyan-400 border border-cyan-500/30' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Video Tutorials
          </button>
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'shortcuts' ? 'bg-zinc-800 text-cyan-400 border border-cyan-500/30' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Keyboard Shortcuts
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'about' ? 'bg-zinc-800 text-cyan-400 border border-cyan-500/30' : 'text-zinc-400 hover:text-white'
            }`}
          >
            About VeeCut
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === 'tutorials' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {tutorials.map((tut, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                        {tut.category}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">{tut.duration}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1">{tut.title}</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{tut.desc}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">{tut.level}</span>
                    <button
                      onClick={() => alert(`Starting video walkthrough for: ${tut.title}`)}
                      className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" /> Watch Guide
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="divide-y divide-zinc-800/80 bg-zinc-900/60 rounded-xl border border-zinc-800 overflow-hidden">
              {shortcutsList.map((sc, i) => (
                <div key={i} className="p-3 flex items-center justify-between text-xs">
                  <span className="text-zinc-300">{sc.desc}</span>
                  <kbd className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-700 text-cyan-300 font-mono font-bold text-[11px] shadow-xs">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-4 text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-5 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-black font-black text-lg">
                  <Play className="w-5 h-5 fill-black translate-x-0.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">VeeCut Pro Studio</h3>
                  <span className="text-[11px] text-cyan-400 font-mono">v3.4.2 Desktop Edition</span>
                </div>
              </div>
              <p>
                VeeCut is a high-performance, non-linear video editing workstation engineered for creators, filmmakers, and digital artists. Combining the lightning-fast workflow of modern creator tools with professional color grading, multi-track audio mastering, and neural AI generators.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800">
                  <span className="font-bold text-white block mb-1">GPU Compositor</span>
                  <p className="text-[11px] text-zinc-400">Zero-latency canvas compositing with WebGL2 shader pipelines and 32-bit float color science.</p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800">
                  <span className="font-bold text-white block mb-1">Lossless Codec Engine</span>
                  <p className="text-[11px] text-zinc-400">Hardware accelerated H.264 / ProRes export with custom bitrate and multi-channel audio stems.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-950/80 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
