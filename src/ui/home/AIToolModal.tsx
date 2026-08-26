/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Wand2,
  Video,
  Image as ImageIcon,
  Subtitles,
  Mic,
  Scissors,
  Eraser,
  Sliders,
  Play,
  ArrowRight,
  Check,
  RefreshCw,
} from 'lucide-react';
import { AIToolItem } from './homeData';

interface AIToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  tool: AIToolItem | null;
  onApplyToTimeline: (resultInfo: { title: string; type: string }) => void;
}

export const AIToolModal: React.FC<AIToolModalProps> = ({
  isOpen,
  onClose,
  tool,
  onApplyToTimeline,
}) => {
  const [prompt, setPrompt] = useState(
    'Cinematic aerial drone shot of neon-lit cyberpunk city at night with reflections on wet streets, 4K 60fps, slow push in'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedOutput, setGeneratedOutput] = useState<string | null>(null);

  if (!isOpen || !tool) return null;

  const handleGenerate = () => {
    setIsGenerating(true);
    setGenerationProgress(15);
    setGeneratedOutput(null);

    const interval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          setGeneratedOutput('success');
          return 100;
        }
        return prev + 25;
      });
    }, 400);
  };

  const handleApply = () => {
    onApplyToTimeline({
      title: `${tool.name} Output`,
      type: tool.category,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#12141d] border border-zinc-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-tr ${tool.accentGradient} flex items-center justify-center text-white shadow-md`}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{tool.name}</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  {tool.badge || 'Neural Engine'}
                </span>
              </div>
              <p className="text-xs text-zinc-400">{tool.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Prompt / Input Configuration */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                AI Generation Prompt & Parameters
              </label>
              <button
                type="button"
                onClick={() =>
                  setPrompt(
                    'Dramatic golden hour sunlight breaking through mountain mist, anamorphic lens flare, photorealistic cinematic grade'
                  )
                }
                className="text-[11px] text-cyan-400 hover:text-cyan-300 transition"
              >
                Insert Sample Prompt
              </button>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Describe your scene, lighting, camera movement, or styling..."
              className="w-full bg-zinc-900 border border-zinc-750 focus:border-cyan-500 rounded-xl p-3.5 text-xs text-zinc-200 font-medium focus:outline-none transition leading-relaxed resize-none"
            />
          </div>

          {/* Model Features & Controls */}
          <div className="grid grid-cols-3 gap-2.5">
            {tool.features.map((feat, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center gap-2 text-xs text-zinc-300 font-medium"
              >
                <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">{feat}</span>
              </div>
            ))}
          </div>

          {/* Processing / Preview Simulation Area */}
          <div className="relative aspect-video rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center p-4">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                <div>
                  <p className="text-xs font-bold text-white">Neural Processing {generationProgress}%</p>
                  <p className="text-[11px] text-zinc-400">Synthesizing high-frequency temporal motion & color passes...</p>
                </div>
                <div className="w-48 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
              </div>
            ) : generatedOutput ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-cyan-950/40 via-purple-950/40 to-black rounded-lg border border-cyan-500/30">
                <div className="w-12 h-12 rounded-full bg-cyan-400/90 text-black flex items-center justify-center shadow-lg mb-2">
                  <Play className="w-5 h-5 fill-black translate-x-0.5" />
                </div>
                <span className="text-xs font-bold text-white">AI Asset Generated Successfully</span>
                <span className="text-[10px] text-cyan-300 font-mono mt-0.5">Ready to inject into CineFlow timeline</span>
              </div>
            ) : (
              <div className="text-center text-zinc-400">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
                <p className="text-xs font-medium">Click "Generate with AI" to synthesize preview</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Powered by CineFlow Neural Diffusion Models</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-950/80 border-t border-zinc-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition"
          >
            Close
          </button>

          <div className="flex items-center gap-3">
            {!generatedOutput ? (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-xs shadow-md shadow-cyan-400/20 active:scale-95 transition disabled:opacity-50 cursor-pointer"
              >
                <Wand2 className="w-4 h-4" />
                <span>{isGenerating ? 'Generating...' : 'Generate with AI'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-xs shadow-md shadow-cyan-400/20 active:scale-95 transition cursor-pointer"
              >
                <span>Add to Timeline & Open Studio</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
