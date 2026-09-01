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
  Maximize2,
  Minimize2,
  FlipHorizontal,
  FlipVertical,
  Layers,
  Music,
  Activity,
  Zap,
  Play,
  Rotate3D,
  Sun,
  Shield,
  Palette,
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
import { KeyframesPanel } from './KeyframesPanel';
import { SpeedPanel } from './SpeedPanel';
import { AudioPanel } from './AudioPanel';
import { KeyframeControl } from './KeyframeControl';
import { secondsToRationalTime, createRationalTime } from '../../core/time/RationalTime';

export type InspectorMainTab = 'video' | 'audio' | 'speed' | 'animation' | 'keyframes' | 'adjustment' | 'ai_style';
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

  // Chroma Key & BG Removal state
  const [chromaColor, setChromaColor] = useState('#00ff00');
  const [chromaSimilarity, setChromaSimilarity] = useState(40);
  const [chromaSmoothness, setChromaSmoothness] = useState(15);
  const [chromaSpill, setChromaSpill] = useState(30);
  const [autoCutoutEnabled, setAutoCutoutEnabled] = useState(false);

  // Retouch state
  const [faceSmooth, setFaceSmooth] = useState(35);
  const [skinBright, setSkinBright] = useState(10);
  const [eyeBright, setEyeBright] = useState(20);
  const [teethWhite, setTeethWhite] = useState(15);
  const [faceSlim, setFaceSlim] = useState(0);

  // Speed Curve State
  const [selectedSpeedCurve, setSelectedSpeedCurve] = useState('Standard');
  const [speedReverse, setSpeedReverse] = useState(false);
  const [keepPitch, setKeepPitch] = useState(true);
  const [smoothSlowMo, setSmoothSlowMo] = useState(false);

  // AI Style prompt state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAiStyle, setIsGeneratingAiStyle] = useState(false);
  const [activeAiStyle, setActiveAiStyle] = useState<string | null>(null);

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

  const handleSpeedChange = (speedVal: number) => {
    if (!selectedClip) return;
    selectedClip.speed = Math.max(0.1, Math.min(100, speedVal));
    projectService.setProject({ ...project });
  };

  const handleAudioPropChange = (prop: string, val: any) => {
    if (!selectedClip) return;
    (selectedClip as any)[prop] = val;
    projectService.setProject({ ...project });
  };

  const handleApplyAiStyle = (styleName: string) => {
    if (!selectedClip) return;
    setActiveAiStyle(styleName);

    if (styleName === 'Cyberpunk Neon') {
      selectedClip.colorGrade.saturation = 1.6;
      selectedClip.colorGrade.contrast = 1.3;
      selectedClip.colorGrade.tint = 30;
      selectedClip.colorGrade.temp = -20;
    } else if (styleName === 'Cinematic Film Look') {
      selectedClip.colorGrade.contrast = 1.25;
      selectedClip.colorGrade.saturation = 0.9;
      selectedClip.colorGrade.shadows = -0.15;
      selectedClip.colorGrade.highlights = 0.1;
      selectedClip.colorGrade.vignette = 0.35;
    } else if (styleName === 'Anime Aesthetic') {
      selectedClip.colorGrade.brightness = 0.1;
      selectedClip.colorGrade.saturation = 1.4;
      selectedClip.colorGrade.contrast = 1.15;
      selectedClip.colorGrade.temp = 10;
    } else if (styleName === 'Vintage 70s') {
      selectedClip.colorGrade.temp = 35;
      selectedClip.colorGrade.tint = 15;
      selectedClip.colorGrade.saturation = 0.8;
      selectedClip.colorGrade.contrast = 0.95;
    } else if (styleName === 'Dramatic Noir') {
      selectedClip.colorGrade.saturation = 0.0;
      selectedClip.colorGrade.contrast = 1.5;
      selectedClip.colorGrade.exposure = -0.2;
    }
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
    { id: 'keyframes', label: 'Keyframes ◆' },
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
                      handleTransformChange('position', { x: 0, y: 0 });
                      handleTransformChange('scale', { x: 1.0, y: 1.0 });
                      handleTransformChange('rotation', 0);
                    }}
                    className="text-zinc-500 hover:text-cyan-400 transition text-[10px]"
                    title="Reset Transform"
                  >
                    <RotateCcw className="w-3 h-3" />
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
                        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5">
                          <span className="text-zinc-200 font-mono text-[11px]">
                            {Math.round(trans.scale.x * 100)}%
                          </span>
                        </div>
                        {selectedClip && (
                          <KeyframeControl
                            clip={selectedClip}
                            propertyPath="transform.scale"
                            propertyName="Scale"
                            currentValue={trans.scale.x}
                          />
                        )}
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
                      {selectedClip && (
                        <div className="flex items-center gap-1">
                          <KeyframeControl
                            clip={selectedClip}
                            propertyPath="transform.position.x"
                            propertyName="Pos X"
                            currentValue={trans.position.x}
                            compact
                          />
                          <KeyframeControl
                            clip={selectedClip}
                            propertyPath="transform.position.y"
                            propertyName="Pos Y"
                            currentValue={trans.position.y}
                            compact
                          />
                        </div>
                      )}
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
                      {selectedClip && (
                        <KeyframeControl
                          clip={selectedClip}
                          propertyPath="transform.rotation"
                          propertyName="Rotation"
                          currentValue={trans.rotation}
                        />
                      )}
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

                  {/* Flip & Quick Rotate */}
                  <div className="flex items-center justify-between gap-1 pt-1">
                    <button
                      onClick={() =>
                        handleTransformChange('scale', {
                          ...trans.scale,
                          x: trans.scale.x * -1,
                        })
                      }
                      className="flex-1 py-1 px-2 rounded bg-zinc-900 border border-zinc-800 hover:border-cyan-500 text-zinc-300 text-[10px] flex items-center justify-center gap-1"
                    >
                      <FlipHorizontal className="w-3 h-3" />
                      <span>Flip H</span>
                    </button>
                    <button
                      onClick={() =>
                        handleTransformChange('scale', {
                          ...trans.scale,
                          y: trans.scale.y * -1,
                        })
                      }
                      className="flex-1 py-1 px-2 rounded bg-zinc-900 border border-zinc-800 hover:border-cyan-500 text-zinc-300 text-[10px] flex items-center justify-center gap-1"
                    >
                      <FlipVertical className="w-3 h-3" />
                      <span>Flip V</span>
                    </button>
                    <button
                      onClick={() =>
                        handleTransformChange('rotation', ((trans.rotation + 90) % 360))
                      }
                      className="flex-1 py-1 px-2 rounded bg-zinc-900 border border-zinc-800 hover:border-cyan-500 text-zinc-300 text-[10px] flex items-center justify-center gap-1"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>90°</span>
                    </button>
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

            {/* SECTION 2: BLEND & OPACITY */}
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
                        <div className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-200 font-mono text-[11px]">
                          {Math.round((selectedClip?.opacity ?? 1.0) * 100)}%
                        </div>
                        {selectedClip && (
                          <KeyframeControl
                            clip={selectedClip}
                            propertyPath="opacity"
                            propertyName="Opacity"
                            currentValue={selectedClip.opacity ?? 1.0}
                          />
                        )}
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

        {/* TAB: VIDEO -> REMOVE BG */}
        {activeTab === 'video' && videoSubTab === 'remove_bg' && (
          <div className="space-y-3">
            {/* Auto Cutout Card */}
            <div className="p-3 bg-[#111320] rounded-xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-200 text-xs">Auto Subject Cutout</span>
                <button
                  onClick={() => setAutoCutoutEnabled(!autoCutoutEnabled)}
                  className={`w-8 h-4 rounded-full transition-colors relative ${
                    autoCutoutEnabled ? 'bg-cyan-500' : 'bg-zinc-800'
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-black transition-transform absolute top-0.5 ${
                      autoCutoutEnabled ? 'left-4.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
              <p className="text-zinc-400 text-[11px]">
                Intelligently isolates portrait subjects and foreground objects from the background.
              </p>
            </div>

            {/* Chroma Key */}
            <div className="p-3 bg-[#111320] rounded-xl border border-zinc-800 space-y-3">
              <div className="font-bold text-zinc-200 text-xs">Chroma Key (Green/Blue Screen)</div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-[11px]">Key Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={chromaColor}
                    onChange={(e) => setChromaColor(e.target.value)}
                    className="w-6 h-6 rounded border border-zinc-700 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-zinc-300 text-[11px]">{chromaColor}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-zinc-400 text-[11px]">
                  <span>Similarity / Tolerance</span>
                  <span className="font-mono text-zinc-200">{chromaSimilarity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={chromaSimilarity}
                  onChange={(e) => setChromaSimilarity(parseInt(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-zinc-400 text-[11px]">
                  <span>Smoothness & Feather</span>
                  <span className="font-mono text-zinc-200">{chromaSmoothness}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={chromaSmoothness}
                  onChange={(e) => setChromaSmoothness(parseInt(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-zinc-400 text-[11px]">
                  <span>Spill Reduction</span>
                  <span className="font-mono text-zinc-200">{chromaSpill}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={chromaSpill}
                  onChange={(e) => setChromaSpill(parseInt(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB: VIDEO -> MASK */}
        {activeTab === 'video' && videoSubTab === 'mask' && <MasksPanel />}

        {/* TAB: VIDEO -> RETOUCH */}
        {activeTab === 'video' && videoSubTab === 'retouch' && (
          <div className="p-3 bg-[#111320] rounded-xl border border-zinc-800 space-y-3.5">
            <div className="font-bold text-zinc-200 text-xs">Portrait & Face Beautify</div>

            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400 text-[11px]">
                <span>Skin Smoothing</span>
                <span className="font-mono text-cyan-400">{faceSmooth}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={faceSmooth}
                onChange={(e) => setFaceSmooth(parseInt(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400 text-[11px]">
                <span>Skin Brightening</span>
                <span className="font-mono text-cyan-400">{skinBright}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={skinBright}
                onChange={(e) => setSkinBright(parseInt(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400 text-[11px]">
                <span>Eye Brightening</span>
                <span className="font-mono text-cyan-400">{eyeBright}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={eyeBright}
                onChange={(e) => setEyeBright(parseInt(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400 text-[11px]">
                <span>Teeth Whitening</span>
                <span className="font-mono text-cyan-400">{teethWhite}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={teethWhite}
                onChange={(e) => setTeethWhite(parseInt(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
          </div>
        )}

        {/* TAB: AUDIO */}
        {activeTab === 'audio' && <AudioPanel clip={selectedClip || undefined} />}

        {/* TAB: SPEED */}
        {activeTab === 'speed' && <SpeedPanel clip={selectedClip || undefined} />}

        {/* TAB: ANIMATION */}
        {activeTab === 'animation' && <EffectsPanel />}

        {/* TAB: KEYFRAMES */}
        {activeTab === 'keyframes' && <KeyframesPanel />}

        {/* TAB: ADJUSTMENT (Color Grading Deck) */}
        {activeTab === 'adjustment' && <ColorPanel />}

        {/* TAB: AI STYLE */}
        {activeTab === 'ai_style' && (
          <div className="p-3 bg-[#111320] rounded-xl border border-zinc-800 space-y-4">
            <div className="font-bold text-zinc-200 text-xs">AI Visual Style Transformations</div>

            {/* Text-to-Style Prompt Engine */}
            <div className="space-y-1.5 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
              <span className="text-[11px] font-semibold text-cyan-400">Text-to-Style Prompt</span>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. Cinematic golden hour sunlight with teal shadows, moody 35mm film..."
                rows={2}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 text-[11px] focus:outline-none focus:border-cyan-500 resize-none"
              />
              <button
                disabled={isGeneratingAiStyle}
                onClick={() => {
                  setIsGeneratingAiStyle(true);
                  setTimeout(() => {
                    handleApplyAiStyle('Cinematic Film Look');
                    setIsGeneratingAiStyle(false);
                  }, 600);
                }}
                className="w-full py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[11px] transition flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3 h-3" />
                <span>{isGeneratingAiStyle ? 'Applying Neural Style...' : 'Generate & Apply Style'}</span>
              </button>
            </div>

            {/* AI Style Presets */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-zinc-300">AI Visual Presets</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Cinematic Film Look',
                  'Cyberpunk Neon',
                  'Anime Aesthetic',
                  'Vintage 70s',
                  'Dramatic Noir',
                  'Golden Hour Magic',
                ].map((style) => (
                  <button
                    key={style}
                    onClick={() => handleApplyAiStyle(style)}
                    className={`p-2 rounded-lg border text-left flex flex-col justify-between h-16 transition ${
                      activeAiStyle === style
                        ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[10px] truncate">{style}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Scene Relighting */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <span className="text-[11px] font-semibold text-zinc-300">AI Scene Relighting</span>
              <div className="grid grid-cols-3 gap-1.5">
                {['Studio Key', 'Rim Light', 'Neon Sun', 'Sunset Glow', 'Moody Noir', 'Spotlight'].map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      if (selectedClip) {
                        selectedClip.colorGrade.exposure = 0.2;
                        selectedClip.colorGrade.highlights = 0.3;
                        projectService.setProject({ ...project });
                      }
                    }}
                    className="p-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-cyan-500 text-zinc-300 text-[10px] text-center"
                  >
                    <Sun className="w-3 h-3 mx-auto mb-0.5 text-amber-400" />
                    <span>{l}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
