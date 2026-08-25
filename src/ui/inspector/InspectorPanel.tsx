/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useEditor } from '../context/EditorContext';
import {
  Sliders,
  Volume2,
  Gauge,
  Sparkles,
  SlidersHorizontal,
  Wand2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  RotateCw,
  Eye,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { UpdateTransformCommand } from '../../engine/command/implementations/UpdateTransformCommand';
import { Transform2D } from '../../core/math/Transform2D';
import { ColorPanel } from './ColorPanel';
import { AdjustPanel } from './AdjustPanel';
import { EffectsPanel } from './EffectsPanel';
import { TransitionsPanel } from './TransitionsPanel';
import { MasksPanel } from './MasksPanel';
import { TextPanel } from './TextPanel';
import { TrackingPanel } from './TrackingPanel';

export type InspectorMainTab = 'video' | 'audio' | 'speed' | 'animation' | 'adjustment' | 'ai_style';
export type VideoSubTab = 'basic' | 'remove_bg' | 'mask' | 'retouch';

const blendModes: { label: string; value: GlobalCompositeOperation }[] = [
  { label: 'Normal', value: 'source-over' },
  { label: 'Screen', value: 'screen' },
  { label: 'Multiply', value: 'multiply' },
  { label: 'Overlay', value: 'overlay' },
  { label: 'Soft Light', value: 'soft-light' },
  { label: 'Hard Light', value: 'hard-light' },
  { label: 'Color Dodge', value: 'color-dodge' },
  { label: 'Color Burn', value: 'color-burn' },
  { label: 'Darken', value: 'darken' },
  { label: 'Lighten', value: 'lighten' },
];

export const InspectorPanel: React.FC = () => {
  const {
    selectedClip,
    timelineEngine,
    commandManager,
    project,
    projectService,
    workspaceMode,
  } = useEditor();

  const [activeTab, setActiveTab] = useState<InspectorMainTab>('video');
  const [videoSubTab, setVideoSubTab] = useState<VideoSubTab>('basic');
  const [isTransformOpen, setIsTransformOpen] = useState(true);
  const [isBlendOpen, setIsBlendOpen] = useState(true);
  const [uniformScale, setUniformScale] = useState(true);
  const [blendEnabled, setBlendEnabled] = useState(true);

  // Sync workspace mode if needed
  React.useEffect(() => {
    if (workspaceMode === 'color' || workspaceMode === 'adjust') {
      setActiveTab('adjustment');
    } else if (workspaceMode === 'audio') {
      setActiveTab('audio');
    } else if (workspaceMode === 'effects') {
      setActiveTab('animation');
    }
  }, [workspaceMode]);

  const handleTransformChange = (key: keyof Transform2D, val: any) => {
    if (!selectedClip) return;
    const newTrans: Transform2D = {
      ...selectedClip.transform,
      [key]: val,
    };
    const cmd = new UpdateTransformCommand(timelineEngine, selectedClip.id, newTrans);
    commandManager.execute(cmd).then(() => projectService.setProject({ ...project }));
  };

  const handleOpacityChange = (val: number) => {
    if (!selectedClip) return;
    selectedClip.opacity = val;
    projectService.setProject({ ...project });
  };

  const handleBlendModeChange = (mode: GlobalCompositeOperation) => {
    if (!selectedClip) return;
    selectedClip.blendMode = mode;
    projectService.setProject({ ...project });
  };

  const trans = selectedClip?.transform || {
    position: { x: 0, y: 0 },
    scale: { x: 1.0, y: 1.0 },
    rotation: 0,
    anchorPoint: { x: 0.5, y: 0.5 },
    opacity: 1.0,
  };

  const mainTabs: { id: InspectorMainTab; label: string }[] = [
    { id: 'video', label: 'Video' },
    { id: 'audio', label: 'Audio' },
    { id: 'speed', label: 'Speed' },
    { id: 'animation', label: 'Animation' },
    { id: 'adjustment', label: 'Adjustment' },
    { id: 'ai_style', label: 'AI style' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0d0f17] border-l border-zinc-800/80 select-none overflow-hidden text-xs">
      {/* 1. TOP MAIN CATEGORY TABS (Video | Audio | Speed | Animation | Adjustment | AI style) */}
      <div className="flex items-center justify-between border-b border-zinc-850 px-2 bg-[#0a0c13] shrink-0 overflow-x-auto">
        <div className="flex items-center space-x-1 sm:space-x-3 py-1.5">
          {mainTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-1 px-1 text-[11px] font-semibold transition-all relative ${
                  isActive
                    ? 'text-cyan-400 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <div className="absolute -bottom-1.5 left-0 right-0 h-[2px] bg-cyan-400 rounded-full shadow-sm shadow-cyan-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. SUB-TABS (Only when Video is selected) */}
      {activeTab === 'video' && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-850 bg-[#0c0e18] shrink-0">
          {[
            { id: 'basic', label: 'Basic' },
            { id: 'remove_bg', label: 'Remove BG' },
            { id: 'mask', label: 'Mask' },
            { id: 'retouch', label: 'Retouch' },
          ].map((sub) => {
            const isSubActive = videoSubTab === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => setVideoSubTab(sub.id as VideoSubTab)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition ${
                  isSubActive
                    ? 'bg-white text-black font-bold shadow-xs'
                    : 'bg-zinc-850/80 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                {sub.label}
              </button>
            );
          })}
        </div>
      )}

      {/* 3. CONTENT PANELS */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* TAB: VIDEO -> BASIC */}
        {activeTab === 'video' && videoSubTab === 'basic' && (
          <div className="space-y-4">
            {/* SECTION 1: TRANSFORM */}
            <div className="border border-zinc-800/80 rounded-xl bg-[#111320] overflow-hidden">
              <div
                onClick={() => setIsTransformOpen(!isTransformOpen)}
                className="px-3 py-2.5 bg-[#141726] flex items-center justify-between cursor-pointer hover:bg-zinc-800/50 transition"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-200 text-[11px]">Transform</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="text-zinc-500 hover:text-cyan-400 transition"
                    title="Add Keyframe"
                  >
                    <span className="text-xs">◇</span>
                  </button>
                  {isTransformOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                </div>
              </div>

              {isTransformOpen && (
                <div className="p-3 space-y-3">
                  {/* Scale */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Scale</span>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 hover:text-cyan-400 cursor-pointer">◇</span>
                        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5">
                          <span className="text-zinc-200 font-mono text-[11px]">
                            {Math.round(trans.scale.x * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="4.0"
                      step="0.01"
                      value={trans.scale.x}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (uniformScale) {
                          handleTransformChange('scale', { x: val, y: val });
                        } else {
                          handleTransformChange('scale', { ...trans.scale, x: val });
                        }
                      }}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  {/* Uniform scale toggle */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-zinc-400">Uniform scale</span>
                    <button
                      onClick={() => setUniformScale(!uniformScale)}
                      className={`w-8 h-4 rounded-full transition-colors relative ${
                        uniformScale ? 'bg-cyan-500' : 'bg-zinc-800'
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full bg-black transition-transform absolute top-0.5 ${
                          uniformScale ? 'left-4.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Position X & Y */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Position</span>
                      <span className="text-zinc-500 hover:text-cyan-400 cursor-pointer">◇</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded px-2 py-1 justify-between">
                        <span className="text-zinc-500 font-medium">X</span>
                        <input
                          type="number"
                          value={Math.round(trans.position.x)}
                          onChange={(e) =>
                            handleTransformChange('position', {
                              ...trans.position,
                              x: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-14 bg-transparent text-right text-zinc-200 font-mono focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded px-2 py-1 justify-between">
                        <span className="text-zinc-500 font-medium">Y</span>
                        <input
                          type="number"
                          value={Math.round(trans.position.y)}
                          onChange={(e) =>
                            handleTransformChange('position', {
                              ...trans.position,
                              y: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-14 bg-transparent text-right text-zinc-200 font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Rotate */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Rotate</span>
                      <span className="text-zinc-500 hover:text-cyan-400 cursor-pointer">◇</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center bg-zinc-900 border border-zinc-800 rounded px-2 py-1 justify-between">
                        <RotateCw className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-zinc-200 font-mono text-[11px]">
                          {trans.rotation.toFixed(2)}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={trans.rotation}
                        onChange={(e) => handleTransformChange('rotation', parseFloat(e.target.value))}
                        className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>
                  </div>

                  {/* Alignment Toolbar */}
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-zinc-400 px-1">
                    <button
                      onClick={() => handleTransformChange('position', { ...trans.position, x: -300 })}
                      className="p-1 rounded hover:text-white hover:bg-zinc-800"
                      title="Align Left"
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleTransformChange('position', { x: 0, y: 0 })}
                      className="p-1 rounded hover:text-white hover:bg-zinc-800"
                      title="Align Center"
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleTransformChange('position', { ...trans.position, x: 300 })}
                      className="p-1 rounded hover:text-white hover:bg-zinc-800"
                      title="Align Right"
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleTransformChange('position', { ...trans.position, y: -200 })}
                      className="p-1 rounded hover:text-white hover:bg-zinc-800"
                      title="Align Top"
                    >
                      <span className="text-[11px] font-bold">⊤</span>
                    </button>
                    <button
                      onClick={() => handleTransformChange('position', { ...trans.position, y: 200 })}
                      className="p-1 rounded hover:text-white hover:bg-zinc-800"
                      title="Align Bottom"
                    >
                      <span className="text-[11px] font-bold">⊥</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: BLEND */}
            <div className="border border-zinc-800/80 rounded-xl bg-[#111320] overflow-hidden">
              <div
                onClick={() => setIsBlendOpen(!isBlendOpen)}
                className="px-3 py-2.5 bg-[#141726] flex items-center justify-between cursor-pointer hover:bg-zinc-800/50 transition"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={blendEnabled}
                    onChange={(e) => {
                      e.stopPropagation();
                      setBlendEnabled(e.target.checked);
                    }}
                    className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0"
                  />
                  <span className="font-bold text-zinc-200 text-[11px]">Blend</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-zinc-500 hover:text-cyan-400 cursor-pointer">◇</span>
                  {isBlendOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                </div>
              </div>

              {isBlendOpen && (
                <div className="p-3 space-y-3">
                  {/* Blend Mode */}
                  <div className="space-y-1">
                    <span className="text-zinc-400 text-[11px]">Mode</span>
                    <select
                      value={selectedClip?.blendMode || 'source-over'}
                      onChange={(e) => handleBlendModeChange(e.target.value as GlobalCompositeOperation)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-cyan-500"
                    >
                      {blendModes.map((bm) => (
                        <option key={bm.value} value={bm.value}>
                          {bm.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Opacity Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Opacity</span>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 hover:text-cyan-400 cursor-pointer">◇</span>
                        <div className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-200 font-mono text-[11px]">
                          {Math.round((selectedClip?.opacity ?? 1.0) * 100)}%
                        </div>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1.0"
                      step="0.01"
                      value={selectedClip?.opacity ?? 1.0}
                      onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: VIDEO -> OTHER SUBTABS */}
        {activeTab === 'video' && videoSubTab === 'mask' && <MasksPanel />}
        {activeTab === 'video' && videoSubTab === 'remove_bg' && (
          <div className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-3">
            <div className="font-bold text-zinc-200">AI Background Removal</div>
            <p className="text-zinc-400 text-[11px]">
              Automatically segments human subjects or foreground elements in real-time.
            </p>
            <button className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition">
              Extract Foreground Subject
            </button>
          </div>
        )}
        {activeTab === 'video' && videoSubTab === 'retouch' && (
          <div className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-3">
            <div className="font-bold text-zinc-200">Portrait & Face Retouch</div>
            <p className="text-zinc-400 text-[11px]">Skin smoothing, eye brightening, and facial lighting enhancements.</p>
          </div>
        )}

        {/* TAB: AUDIO */}
        {activeTab === 'audio' && (
          <div className="p-3 bg-[#111320] rounded-xl border border-zinc-800 space-y-4">
            <div className="font-bold text-zinc-200 text-xs">Audio Master Controls</div>
            <div className="space-y-2">
              <div className="flex justify-between text-zinc-400 text-[11px]">
                <span>Volume</span>
                <span className="font-mono text-zinc-200">0.0 dB</span>
              </div>
              <input type="range" min="0" max="2.0" step="0.05" defaultValue="1.0" className="w-full accent-cyan-400" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                <div className="font-semibold text-zinc-300">Fade In</div>
                <div className="text-zinc-500 font-mono">0.0s</div>
              </div>
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                <div className="font-semibold text-zinc-300">Fade Out</div>
                <div className="text-zinc-500 font-mono">0.0s</div>
              </div>
            </div>
            <div className="p-2 rounded bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="font-semibold text-zinc-300">Noise Reduction</div>
              <input type="range" min="0" max="100" defaultValue="40" className="w-full accent-cyan-400" />
            </div>
          </div>
        )}

        {/* TAB: SPEED */}
        {activeTab === 'speed' && (
          <div className="p-3 bg-[#111320] rounded-xl border border-zinc-800 space-y-4">
            <div className="font-bold text-zinc-200 text-xs">Playback Speed & Curve</div>
            <div className="flex items-center gap-1.5">
              {['0.5x', '1x', '2x', '5x', '10x'].map((spd) => (
                <button
                  key={spd}
                  className="flex-1 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-cyan-500 text-zinc-300 text-[11px] font-medium"
                >
                  {spd}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400 text-[11px]">
                <span>Speed Multiplier</span>
                <span className="text-cyan-400 font-mono">1.00x</span>
              </div>
              <input type="range" min="0.1" max="10.0" step="0.1" defaultValue="1.0" className="w-full accent-cyan-400" />
            </div>
          </div>
        )}

        {/* TAB: ANIMATION */}
        {activeTab === 'animation' && <EffectsPanel />}

        {/* TAB: ADJUSTMENT (Color Grading Deck) */}
        {activeTab === 'adjustment' && <ColorPanel />}

        {/* TAB: AI STYLE */}
        {activeTab === 'ai_style' && <TrackingPanel />}
      </div>
    </div>
  );
};
