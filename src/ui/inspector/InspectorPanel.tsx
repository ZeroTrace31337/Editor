/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useEditor } from '../context/EditorContext';
import {
  Sliders,
  Palette,
  Volume2,
  History,
  RotateCcw,
  Sparkles,
  Move,
  Blend,
  Bookmark,
  Layers,
  Crosshair,
  Type,
  Square,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Copy,
  Crop,
} from 'lucide-react';
import { UpdateTransformCommand } from '../../engine/command/implementations/UpdateTransformCommand';
import { DuplicateClipCommand } from '../../engine/command/implementations/DuplicateClipCommand';
import { Transform2D, createDefaultTransform } from '../../core/math/Transform2D';
import { TextClip } from '../../domain/timeline/Clip';
import { KeyframeControl } from './KeyframeControl';
import { ColorPanel } from './ColorPanel';
import { AdjustPanel } from './AdjustPanel';
import { EffectsPanel } from './EffectsPanel';
import { TransitionsPanel } from './TransitionsPanel';
import { PresetsPanel } from './PresetsPanel';
import { TrackingPanel } from './TrackingPanel';
import { MasksPanel } from './MasksPanel';
import { TextPanel } from './TextPanel';

const blendModes: { label: string; value: GlobalCompositeOperation }[] = [
  { label: 'Normal (Source Over)', value: 'source-over' },
  { label: 'Screen', value: 'screen' },
  { label: 'Multiply', value: 'multiply' },
  { label: 'Overlay', value: 'overlay' },
  { label: 'Soft Light', value: 'soft-light' },
  { label: 'Hard Light', value: 'hard-light' },
  { label: 'Color Dodge', value: 'color-dodge' },
  { label: 'Color Burn', value: 'color-burn' },
  { label: 'Darken', value: 'darken' },
  { label: 'Lighten', value: 'lighten' },
  { label: 'Difference', value: 'difference' },
  { label: 'Exclusion', value: 'exclusion' },
];

export const InspectorPanel: React.FC = () => {
  const { selectedClip, timelineEngine, commandManager, project, projectService, workspaceMode } = useEditor();
  const [activeTab, setActiveTab] = useState<'transform' | 'text' | 'masks' | 'adjust' | 'tracking' | 'color' | 'effects' | 'transitions' | 'presets' | 'audio' | 'history'>('transform');

  // Automatically switch tab if workspace changes or if text clip selected
  React.useEffect(() => {
    if (selectedClip?.type === 'text') {
      setActiveTab('text');
    } else if (workspaceMode === 'adjust') {
      setActiveTab('adjust');
    } else if (workspaceMode === 'color') {
      setActiveTab('color');
    } else if (workspaceMode === 'effects') {
      setActiveTab('effects');
    } else if (workspaceMode === 'audio') {
      setActiveTab('audio');
    }
  }, [workspaceMode, selectedClip?.id, selectedClip?.type]);

  if (!selectedClip) {
    return (
      <div className="flex flex-col h-full bg-zinc-950/70 border-l border-zinc-850 p-6 items-center justify-center text-center select-none text-zinc-500">
        <Sliders className="w-10 h-10 mb-3 text-zinc-700" />
        <p className="text-xs font-medium text-zinc-400">No Clip Selected</p>
        <p className="text-[11px] text-zinc-600 mt-1 max-w-[180px]">
          Click any clip on the timeline to inspect and edit its transform, keyframes, effects, color grading, and transitions.
        </p>
      </div>
    );
  }

  // Handle Transform Updates
  const handleTransformChange = (key: keyof Transform2D, val: any) => {
    const newTrans: Transform2D = {
      ...selectedClip.transform,
      [key]: val,
    };
    const cmd = new UpdateTransformCommand(timelineEngine, selectedClip.id, newTrans);
    commandManager.execute(cmd).then(() => projectService.setProject({ ...project }));
  };

  const handleBlendModeChange = (mode: GlobalCompositeOperation) => {
    selectedClip.blendMode = mode;
    projectService.setProject({ ...project });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/80 border-l border-zinc-850 select-none overflow-hidden">
      {/* Clip Header Title */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              selectedClip.type === 'video'
                ? 'bg-indigo-500'
                : selectedClip.type === 'audio'
                ? 'bg-emerald-500'
                : 'bg-amber-500'
            }`}
          />
          <span className="text-xs font-semibold text-zinc-200 truncate">{selectedClip.name}</span>
        </div>
        <span className="text-[10px] font-mono text-zinc-500 uppercase px-1.5 py-0.5 rounded bg-zinc-900">
          {selectedClip.type}
        </span>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center border-b border-zinc-800 bg-zinc-900/50 p-1 gap-0.5 text-[11px] overflow-x-auto">
        {selectedClip.type === 'text' && (
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-1.5 px-2 flex items-center justify-center gap-1 rounded whitespace-nowrap transition-colors ${
              activeTab === 'text'
                ? 'bg-purple-900/60 text-purple-300 font-bold shadow-xs border border-purple-700/50'
                : 'text-purple-400 hover:text-purple-200'
            }`}
            title="Text Typography & Presets"
          >
            <Type className="w-3 h-3" />
            <span>Text</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('transform')}
          className={`flex-1 py-1.5 px-2 flex items-center justify-center gap-1 rounded whitespace-nowrap transition-colors ${
            activeTab === 'transform'
              ? 'bg-zinc-800 text-indigo-400 font-medium shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Transform & Keyframing"
        >
          <Move className="w-3 h-3" />
          <span>Transform</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('adjust')}
          className={`flex-1 py-1.5 px-2 flex items-center justify-center gap-1 rounded whitespace-nowrap transition-colors ${
            activeTab === 'adjust'
              ? 'bg-zinc-800 text-purple-400 font-medium shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Pro Adjustments (Light, Color, Detail, Image)"
        >
          <Sliders className="w-3 h-3" />
          <span>Adjust</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('masks')}
          className={`flex-1 py-1.5 px-2 flex items-center justify-center gap-1 rounded whitespace-nowrap transition-colors ${
            activeTab === 'masks'
              ? 'bg-zinc-800 text-blue-400 font-medium shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Clip Masks & Feathering"
        >
          <Square className="w-3 h-3" />
          <span>Masks</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tracking')}
          className={`flex-1 py-1.5 px-2 flex items-center justify-center gap-1 rounded whitespace-nowrap transition-colors ${
            activeTab === 'tracking'
              ? 'bg-zinc-800 text-rose-400 font-medium shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Optical Motion Tracking & Attach"
        >
          <Crosshair className="w-3 h-3" />
          <span>Tracking</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('color')}
          className={`flex-1 py-1.5 px-2 flex items-center justify-center gap-1 rounded whitespace-nowrap transition-colors ${
            activeTab === 'color'
              ? 'bg-zinc-800 text-amber-400 font-medium shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="DaVinci-Grade Color Correction"
        >
          <Palette className="w-3 h-3" />
          <span>Color</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('effects')}
          className={`flex-1 py-1.5 px-2 flex items-center justify-center gap-1 rounded whitespace-nowrap transition-colors ${
            activeTab === 'effects'
              ? 'bg-zinc-800 text-purple-400 font-medium shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Effects Stack (Blur, Glow, Grain, Vignette...)"
        >
          <Sparkles className="w-3 h-3" />
          <span>Effects</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transitions')}
          className={`flex-1 py-1.5 px-2 flex items-center justify-center gap-1 rounded whitespace-nowrap transition-colors ${
            activeTab === 'transitions'
              ? 'bg-zinc-800 text-cyan-400 font-medium shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Transitions (Dissolve, Wipe, Slide, Zoom)"
        >
          <Blend className="w-3 h-3" />
          <span>Transitions</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-1.5 px-2 flex items-center justify-center gap-1 rounded whitespace-nowrap transition-colors ${
            activeTab === 'presets'
              ? 'bg-zinc-800 text-amber-300 font-medium shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Filter & Look Presets"
        >
          <Bookmark className="w-3 h-3" />
          <span>Presets</span>
        </button>

        {selectedClip.type === 'audio' && (
          <button
            type="button"
            onClick={() => setActiveTab('audio')}
            className={`flex-1 py-1.5 px-2 flex items-center justify-center gap-1 rounded whitespace-nowrap transition-colors ${
              activeTab === 'audio'
                ? 'bg-zinc-800 text-emerald-400 font-medium shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Volume2 className="w-3 h-3" />
            <span>Audio</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`py-1.5 px-2 flex items-center justify-center rounded whitespace-nowrap transition-colors ${
            activeTab === 'history'
              ? 'bg-zinc-800 text-zinc-200 font-medium shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Undo History"
        >
          <History className="w-3 h-3" />
        </button>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* TAB 1: TRANSFORM & COMPOSITING */}
        {activeTab === 'transform' && (
          <div className="space-y-4">
            {/* Blend Mode */}
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400 font-medium flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Layer Blend Mode</span>
              </label>
              <select
                value={selectedClip.blendMode || 'source-over'}
                onChange={(e) => handleBlendModeChange(e.target.value as GlobalCompositeOperation)}
                className="w-full bg-zinc-900 text-zinc-200 border border-zinc-800 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
              >
                {blendModes.map((bm) => (
                  <option key={bm.value} value={bm.value}>
                    {bm.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Position X / Y with Keyframing */}
            <div className="space-y-2 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="font-medium text-xs text-zinc-200">Position (px)</span>
                <span className="font-mono text-[10px] text-zinc-500">
                  X: {Math.round(selectedClip.transform.position.x)}, Y: {Math.round(selectedClip.transform.position.y)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-zinc-500">X Position</label>
                    <KeyframeControl
                      clip={selectedClip}
                      propertyPath="transform.position.x"
                      propertyName="Position X"
                      currentValue={selectedClip.transform.position.x}
                    />
                  </div>
                  <input
                    type="range"
                    min="-600"
                    max="600"
                    value={selectedClip.transform.position.x}
                    onChange={(e) =>
                      handleTransformChange('position', {
                        ...selectedClip.transform.position,
                        x: parseFloat(e.target.value),
                      })
                    }
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-zinc-500">Y Position</label>
                    <KeyframeControl
                      clip={selectedClip}
                      propertyPath="transform.position.y"
                      propertyName="Position Y"
                      currentValue={selectedClip.transform.position.y}
                    />
                  </div>
                  <input
                    type="range"
                    min="-600"
                    max="600"
                    value={selectedClip.transform.position.y}
                    onChange={(e) =>
                      handleTransformChange('position', {
                        ...selectedClip.transform.position,
                        y: parseFloat(e.target.value),
                      })
                    }
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Scale X / Y with Keyframing */}
            <div className="space-y-1.5 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="font-medium text-xs text-zinc-200">Scale (Zoom)</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-[10px] text-zinc-400">
                    {(selectedClip.transform.scale.x * 100).toFixed(0)}%
                  </span>
                  <KeyframeControl
                    clip={selectedClip}
                    propertyPath="transform.scale.x"
                    propertyName="Scale"
                    currentValue={selectedClip.transform.scale.x}
                  />
                </div>
              </div>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.05"
                value={selectedClip.transform.scale.x}
                onChange={(e) => {
                  const s = parseFloat(e.target.value);
                  handleTransformChange('scale', { x: s, y: s });
                }}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Rotation with Keyframing */}
            <div className="space-y-1.5 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="font-medium text-xs text-zinc-200">Rotation Angle</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-[10px] text-zinc-400">
                    {Math.round(selectedClip.transform.rotation)}°
                  </span>
                  <KeyframeControl
                    clip={selectedClip}
                    propertyPath="transform.rotation"
                    propertyName="Rotation"
                    currentValue={selectedClip.transform.rotation}
                  />
                </div>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={selectedClip.transform.rotation}
                onChange={(e) => handleTransformChange('rotation', parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Opacity with Keyframing */}
            <div className="space-y-1.5 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="font-medium text-xs text-zinc-200">Opacity (Transparency)</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-[10px] text-zinc-400">
                    {Math.round((selectedClip.opacity ?? 1.0) * 100)}%
                  </span>
                  <KeyframeControl
                    clip={selectedClip}
                    propertyPath="opacity"
                    propertyName="Opacity"
                    currentValue={selectedClip.opacity ?? 1.0}
                  />
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={selectedClip.opacity ?? 1.0}
                onChange={(e) => {
                  selectedClip.opacity = parseFloat(e.target.value);
                  projectService.setProject({ ...project });
                }}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Orientation & Flip Tools */}
            <div className="space-y-1.5 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
              <span className="font-medium text-xs text-zinc-200 block mb-1">Orientation & Mirror</span>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const currentRot = selectedClip.transform.rotation || 0;
                    handleTransformChange('rotation', (currentRot + 90) % 360);
                  }}
                  className="p-1.5 rounded bg-zinc-950 border border-zinc-800 hover:border-indigo-500 text-zinc-300 hover:text-white flex flex-col items-center justify-center gap-1 text-[10px]"
                  title="Rotate +90° Clockwise"
                >
                  <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
                  <span>+90°</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const currentRot = selectedClip.transform.rotation || 0;
                    handleTransformChange('rotation', (currentRot - 90) % 360);
                  }}
                  className="p-1.5 rounded bg-zinc-950 border border-zinc-800 hover:border-indigo-500 text-zinc-300 hover:text-white flex flex-col items-center justify-center gap-1 text-[10px]"
                  title="Rotate -90° Counter-Clockwise"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                  <span>-90°</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTransformChange('flipH', !selectedClip.transform.flipH)}
                  className={`p-1.5 rounded border flex flex-col items-center justify-center gap-1 text-[10px] transition ${
                    selectedClip.transform.flipH
                      ? 'bg-indigo-950/70 border-indigo-500 text-indigo-300 font-semibold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                  title="Flip Horizontal"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>Flip H</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTransformChange('flipV', !selectedClip.transform.flipV)}
                  className={`p-1.5 rounded border flex flex-col items-center justify-center gap-1 text-[10px] transition ${
                    selectedClip.transform.flipV
                      ? 'bg-indigo-950/70 border-indigo-500 text-indigo-300 font-semibold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                  title="Flip Vertical"
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                  <span>Flip V</span>
                </button>
              </div>
            </div>

            {/* Crop & Clip Inset Controls */}
            <div className="space-y-2 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="font-medium text-xs text-zinc-200 flex items-center gap-1">
                  <Crop className="w-3 h-3 text-indigo-400" />
                  <span>Crop & Inset</span>
                </span>
                {(selectedClip.transform.crop?.left ||
                  selectedClip.transform.crop?.top ||
                  selectedClip.transform.crop?.right ||
                  selectedClip.transform.crop?.bottom) ? (
                  <button
                    type="button"
                    onClick={() => handleTransformChange('crop', { left: 0, top: 0, right: 0, bottom: 0 })}
                    className="text-[10px] text-rose-400 hover:text-rose-300 underline"
                  >
                    Reset Crop
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                    <span>Left</span>
                    <span className="font-mono">{Math.round((selectedClip.transform.crop?.left || 0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.45"
                    step="0.01"
                    value={selectedClip.transform.crop?.left || 0}
                    onChange={(e) =>
                      handleTransformChange('crop', {
                        ...(selectedClip.transform.crop || { left: 0, top: 0, right: 0, bottom: 0 }),
                        left: parseFloat(e.target.value),
                      })
                    }
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                    <span>Right</span>
                    <span className="font-mono">{Math.round((selectedClip.transform.crop?.right || 0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.45"
                    step="0.01"
                    value={selectedClip.transform.crop?.right || 0}
                    onChange={(e) =>
                      handleTransformChange('crop', {
                        ...(selectedClip.transform.crop || { left: 0, top: 0, right: 0, bottom: 0 }),
                        right: parseFloat(e.target.value),
                      })
                    }
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                    <span>Top</span>
                    <span className="font-mono">{Math.round((selectedClip.transform.crop?.top || 0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.45"
                    step="0.01"
                    value={selectedClip.transform.crop?.top || 0}
                    onChange={(e) =>
                      handleTransformChange('crop', {
                        ...(selectedClip.transform.crop || { left: 0, top: 0, right: 0, bottom: 0 }),
                        top: parseFloat(e.target.value),
                      })
                    }
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                    <span>Bottom</span>
                    <span className="font-mono">{Math.round((selectedClip.transform.crop?.bottom || 0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.45"
                    step="0.01"
                    value={selectedClip.transform.crop?.bottom || 0}
                    onChange={(e) =>
                      handleTransformChange('crop', {
                        ...(selectedClip.transform.crop || { left: 0, top: 0, right: 0, bottom: 0 }),
                        bottom: parseFloat(e.target.value),
                      })
                    }
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Playback Speed */}
            <div className="space-y-1.5 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="font-medium text-xs text-zinc-200">Playback Speed Multiplier</span>
                <span className="font-mono text-[10px] text-indigo-400 font-bold">{selectedClip.speed}x</span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {[0.25, 0.5, 0.75, 1.0, 1.5, 2.0].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      selectedClip.speed = s;
                      projectService.setProject({ ...project });
                    }}
                    className={`py-1 rounded text-[10px] border transition-colors ${
                      selectedClip.speed === s
                        ? 'bg-indigo-600 border-indigo-500 text-white font-medium shadow-xs'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Duplicate & Reset Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  try {
                    const cmd = new DuplicateClipCommand(timelineEngine, selectedClip.id);
                    commandManager.execute(cmd).then(() => projectService.setProject({ ...project }));
                  } catch {}
                }}
                className="flex items-center justify-center gap-1.5 py-1.5 text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md transition-colors text-xs"
              >
                <Copy className="w-3.5 h-3.5 text-purple-400" />
                <span>Duplicate Clip</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const cmd = new UpdateTransformCommand(timelineEngine, selectedClip.id, createDefaultTransform());
                  commandManager.execute(cmd).then(() => projectService.setProject({ ...project }));
                }}
                className="flex items-center justify-center gap-1.5 py-1.5 text-zinc-400 hover:text-zinc-100 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md transition-colors text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB: TEXT (Kinetic Typography, Presets, Fonts) */}
        {activeTab === 'text' && selectedClip.type === 'text' && <TextPanel clip={selectedClip as TextClip} />}

        {/* TAB: MASKS */}
        {activeTab === 'masks' && <MasksPanel clip={selectedClip} />}

        {/* TAB: ADJUST (Light, Color, Detail, Image Adjustments) */}
        {activeTab === 'adjust' && <AdjustPanel clip={selectedClip} />}

        {/* TAB: MOTION TRACKING */}
        {activeTab === 'tracking' && <TrackingPanel clip={selectedClip} />}

        {/* TAB 2: COLOR GRADING */}
        {activeTab === 'color' && <ColorPanel clip={selectedClip} />}

        {/* TAB 3: EFFECTS STACK */}
        {activeTab === 'effects' && <EffectsPanel clip={selectedClip} />}

        {/* TAB 4: TRANSITIONS */}
        {activeTab === 'transitions' && <TransitionsPanel clip={selectedClip} />}

        {/* TAB 5: PRESETS */}
        {activeTab === 'presets' && <PresetsPanel clip={selectedClip} />}

        {/* TAB 6: AUDIO */}
        {activeTab === 'audio' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-zinc-400">
                <span className="font-medium">Audio Volume</span>
                <span className="font-mono text-[10px]">
                  {Math.round(((selectedClip as any).volume || 1.0) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={(selectedClip as any).volume || 1.0}
                onChange={(e) => {
                  (selectedClip as any).volume = parseFloat(e.target.value);
                  projectService.setProject({ ...project });
                }}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-zinc-400">
                <span className="font-medium">Stereo Pan (L / R)</span>
                <span className="font-mono text-[10px]">
                  {((selectedClip as any).pan || 0) === 0 ? 'Center' : ((selectedClip as any).pan || 0).toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={(selectedClip as any).pan || 0}
                onChange={(e) => {
                  (selectedClip as any).pan = parseFloat(e.target.value);
                  projectService.setProject({ ...project });
                }}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
        )}

        {/* TAB 7: HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-2">
            <span className="font-medium text-zinc-300">Command Undo/Redo Log</span>
            <div className="space-y-1.5">
              {commandManager.getUndoStack().map((cmd, idx) => (
                <div
                  key={cmd.id || idx}
                  className="p-2 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-between text-[11px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="font-medium text-zinc-200">{cmd.name}</span>
                  </div>
                  <span className="text-zinc-500 text-[10px] font-mono">
                    {new Date(cmd.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
