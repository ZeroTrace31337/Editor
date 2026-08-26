/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Diamond,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  Clipboard,
  Activity,
  Sliders,
  Move,
  Maximize2,
  RotateCw,
  Sun,
  Volume2,
  Sparkles,
  Layers,
  CheckCircle2,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { useEditor } from '../context/EditorContext';
import { TimelineClip } from '../../domain/timeline/Clip';
import { RationalTime, subtractRationalTime, addRationalTime, rationalTimeToSeconds } from '../../core/time/RationalTime';
import { KeyframeControl } from './KeyframeControl';
import { KeyframeEvaluator } from '../../domain/keyframe/KeyframeEvaluator';
import { KeyframeInterpolation, KeyframeTrack } from '../../domain/keyframe/Keyframe';
import { SetKeyframeCommand } from '../../engine/command/implementations/SetKeyframeCommand';
import { RemoveKeyframeCommand } from '../../engine/command/implementations/RemoveKeyframeCommand';
import { UpdateKeyframeEasingCommand } from '../../engine/command/implementations/UpdateKeyframeEasingCommand';
import { ClearKeyframeTrackCommand } from '../../engine/command/implementations/ClearKeyframeTrackCommand';

interface KeyframesPanelProps {
  clip?: TimelineClip;
}

const EASING_LIST: { id: KeyframeInterpolation; label: string; desc: string }[] = [
  { id: 'smooth', label: 'Smooth', desc: 'Natural smooth ease in and out' },
  { id: 'linear', label: 'Linear', desc: 'Constant straight velocity' },
  { id: 'easeIn', label: 'Ease In', desc: 'Slow start, accelerates towards target' },
  { id: 'easeOut', label: 'Ease Out', desc: 'Fast initial movement, gentle landing' },
  { id: 'easeInOut', label: 'Ease In & Out', desc: 'Accelerates and decelerates smoothly' },
  { id: 'bezier', label: 'Bezier Curve', desc: 'Custom curve tangents' },
  { id: 'step', label: 'Step / Hold', desc: 'Holds value until keyframe arrives' },
];

export const KeyframesPanel: React.FC<KeyframesPanelProps> = ({ clip: propClip }) => {
  const {
    currentTime,
    selectedClip,
    timelineEngine,
    commandManager,
    seek,
    autoKeyframeEnabled,
    setAutoKeyframeEnabled,
    selectedKeyframeId,
    selectedKeyframePropertyPath,
    setSelectedKeyframe,
    copiedKeyframes,
    copyClipKeyframes,
    pasteClipKeyframes,
    jumpToPrevKeyframe,
    jumpToNextKeyframe,
  } = useEditor();

  const clip = propClip || selectedClip;

  const [openSections, setOpenSections] = useState({
    transform: true,
    appearance: true,
    color: false,
    audio: false,
    effects: true,
    masks: false,
  });

  if (!clip) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500 text-xs">
        <Diamond className="w-10 h-10 text-amber-500/30 mb-3" />
        <p className="text-zinc-400 font-medium mb-1">No Clip Selected</p>
        <p className="text-zinc-600 text-[11px]">Select a video, image, or audio clip to view and edit keyframes.</p>
      </div>
    );
  }

  const clipElapsed = subtractRationalTime(currentTime, clip.timelineRange.start);
  const clipElapsedSec = Math.max(0, rationalTimeToSeconds(clipElapsed));
  const clipDurationSec = rationalTimeToSeconds(clip.timelineRange.duration);

  const toggleSection = (sec: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const handleClearAll = () => {
    const cmd = new ClearKeyframeTrackCommand(timelineEngine, clip.id);
    commandManager.execute(cmd);
    setSelectedKeyframe(null, null);
  };

  // Find currently selected keyframe object if any
  let currentKfObj: { track: KeyframeTrack<any>; kf: any } | null = null;
  if (selectedKeyframePropertyPath && clip.keyframeTracks?.[selectedKeyframePropertyPath]) {
    const trk = clip.keyframeTracks[selectedKeyframePropertyPath];
    const foundKf = trk.keyframes.find((k) => k.id === selectedKeyframeId);
    if (foundKf) {
      currentKfObj = { track: trk, kf: foundKf };
    }
  }

  // If no explicit selection but playhead is exactly over a keyframe on any track, find that keyframe
  if (!currentKfObj && clip.keyframeTracks) {
    for (const [p, trk] of Object.entries(clip.keyframeTracks)) {
      if (trk) {
        const trackObj = trk as KeyframeTrack<any>;
        const kf = KeyframeEvaluator.hasKeyframeAt(trackObj, clipElapsed);
        if (kf) {
          currentKfObj = { track: trackObj, kf };
          break;
        }
      }
    }
  }

  const handleEasingChange = (interpolation: KeyframeInterpolation) => {
    if (!currentKfObj) return;
    const cmd = new UpdateKeyframeEasingCommand(
      timelineEngine,
      clip.id,
      currentKfObj.track.propertyPath,
      currentKfObj.kf.id,
      interpolation
    );
    commandManager.execute(cmd);
  };

  const handleValueChange = (val: number) => {
    if (!currentKfObj) return;
    const cmd = new SetKeyframeCommand(
      timelineEngine,
      clip.id,
      currentKfObj.track.propertyPath,
      currentKfObj.track.propertyName,
      currentKfObj.kf.time,
      val,
      currentKfObj.kf.interpolation
    );
    commandManager.execute(cmd);
  };

  const handleDeleteSelectedKf = () => {
    if (!currentKfObj) return;
    const cmd = new RemoveKeyframeCommand(
      timelineEngine,
      clip.id,
      currentKfObj.track.propertyPath,
      currentKfObj.kf.id
    );
    commandManager.execute(cmd);
    setSelectedKeyframe(null, null);
  };

  // Total keyframe count
  const allClipKeyframes = KeyframeEvaluator.getAllKeyframesForClip(clip);

  return (
    <div className="flex flex-col h-full bg-[#0d0f19] text-zinc-300 select-none overflow-hidden">
      {/* 1. Header Toolbar */}
      <div className="px-3 py-2 border-b border-zinc-800/80 bg-zinc-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-amber-500/20 text-amber-400">
            <Diamond className="w-4 h-4 fill-amber-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
              <span>Keyframe Animation</span>
              {allClipKeyframes.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                  {allClipKeyframes.length}
                </span>
              )}
            </div>
            <div className="text-[10px] text-zinc-500">
              Offset: {clipElapsedSec.toFixed(2)}s / {clipDurationSec.toFixed(2)}s
            </div>
          </div>
        </div>

        {/* Global Navigation & Actions */}
        <div className="flex items-center gap-1">
          {/* Jump Prev Keyframe */}
          <button
            type="button"
            onClick={jumpToPrevKeyframe}
            className="p-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
            title="Jump to Previous Keyframe across clip (◀)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Jump Next Keyframe */}
          <button
            type="button"
            onClick={jumpToNextKeyframe}
            className="p-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
            title="Jump to Next Keyframe across clip (▶)"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Auto-Keyframe Toggle */}
          <button
            type="button"
            onClick={() => setAutoKeyframeEnabled(!autoKeyframeEnabled)}
            className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition ${
              autoKeyframeEnabled
                ? 'bg-amber-500 text-black shadow-xs shadow-amber-500/40'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
            }`}
            title="Auto-Keyframe: automatically record keyframe when adjusting values during playback"
          >
            <Activity className="w-3 h-3" />
            <span>Auto-Key</span>
          </button>

          {/* Copy Animation */}
          <button
            type="button"
            onClick={() => copyClipKeyframes(clip.id)}
            className="p-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
            title="Copy all keyframes from this clip"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Paste Animation */}
          <button
            type="button"
            disabled={!copiedKeyframes}
            onClick={() => pasteClipKeyframes(clip.id)}
            className={`p-1 rounded transition ${
              copiedKeyframes
                ? 'bg-zinc-800/80 hover:bg-zinc-700 text-amber-300 hover:text-amber-200'
                : 'bg-zinc-800/30 text-zinc-700 cursor-default'
            }`}
            title="Paste copied animation to current clip at playhead"
          >
            <Clipboard className="w-3.5 h-3.5" />
          </button>

          {/* Clear All */}
          {allClipKeyframes.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="p-1 rounded bg-zinc-800/80 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 transition"
              title="Clear all keyframes on this clip"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Active Selected Keyframe Inspector Card (if any selected) */}
      {currentKfObj && (
        <div className="p-3 bg-zinc-950/80 border-b border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-xs shadow-amber-400/80" />
              <span className="text-xs font-bold text-white">
                Selected: {currentKfObj.track.propertyName}
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                @ {rationalTimeToSeconds(currentKfObj.kf.time).toFixed(2)}s
              </span>
            </div>

            <button
              type="button"
              onClick={handleDeleteSelectedKf}
              className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
              title="Delete this keyframe"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Interpolation Selector */}
            <div>
              <label className="text-[10px] text-zinc-400 font-medium block mb-1">Easing Curve</label>
              <select
                value={currentKfObj.kf.interpolation}
                onChange={(e) => handleEasingChange(e.target.value as KeyframeInterpolation)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-amber-300 font-medium outline-hidden focus:border-amber-400 cursor-pointer"
              >
                {EASING_LIST.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Value Editor */}
            {typeof currentKfObj.kf.value === 'number' && (
              <div>
                <label className="text-[10px] text-zinc-400 font-medium block mb-1">Keyframe Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentKfObj.kf.value}
                  onChange={(e) => handleValueChange(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono outline-hidden focus:border-amber-400"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Property Keyframe Track Rows */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* TRANSFORM SECTION */}
        <div className="rounded-xl border border-zinc-800/80 bg-[#121422] overflow-hidden">
          <div
            onClick={() => toggleSection('transform')}
            className="flex items-center justify-between px-3 py-2 bg-zinc-900/60 border-b border-zinc-800/60 cursor-pointer hover:bg-zinc-900/80 transition"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Move className="w-3.5 h-3.5 text-indigo-400" />
              <span>Transform Properties</span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                openSections.transform ? 'rotate-180' : ''
              }`}
            />
          </div>

          {openSections.transform && (
            <div className="p-3 space-y-2 text-xs">
              {/* Position X */}
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Position X</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="transform.position.x"
                  propertyName="Position X"
                  currentValue={clip.transform.position.x}
                />
              </div>

              {/* Position Y */}
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Position Y</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="transform.position.y"
                  propertyName="Position Y"
                  currentValue={clip.transform.position.y}
                />
              </div>

              {/* Scale */}
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Scale (Uniform)</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="transform.scale"
                  propertyName="Scale"
                  currentValue={clip.transform.scale?.x ?? 1.0}
                />
              </div>

              {/* Scale X */}
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Scale X</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="transform.scale.x"
                  propertyName="Scale X"
                  currentValue={clip.transform.scale?.x ?? 1.0}
                />
              </div>

              {/* Scale Y */}
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Scale Y</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="transform.scale.y"
                  propertyName="Scale Y"
                  currentValue={clip.transform.scale?.y ?? 1.0}
                />
              </div>

              {/* Rotation */}
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Rotation</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="transform.rotation"
                  propertyName="Rotation"
                  currentValue={clip.transform.rotation}
                />
              </div>

              {/* Anchor X */}
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Anchor X</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="transform.anchor.x"
                  propertyName="Anchor X"
                  currentValue={clip.transform.anchor?.x ?? 0.5}
                />
              </div>

              {/* Anchor Y */}
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Anchor Y</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="transform.anchor.y"
                  propertyName="Anchor Y"
                  currentValue={clip.transform.anchor?.y ?? 0.5}
                />
              </div>

              {/* Skew X */}
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Skew X</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="transform.skew.x"
                  propertyName="Skew X"
                  currentValue={clip.transform.skew?.x ?? 0}
                />
              </div>

              {/* Skew Y */}
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Skew Y</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="transform.skew.y"
                  propertyName="Skew Y"
                  currentValue={clip.transform.skew?.y ?? 0}
                />
              </div>
            </div>
          )}
        </div>

        {/* APPEARANCE & BLEND */}
        <div className="rounded-xl border border-zinc-800/80 bg-[#121422] overflow-hidden">
          <div
            onClick={() => toggleSection('appearance')}
            className="flex items-center justify-between px-3 py-2 bg-zinc-900/60 border-b border-zinc-800/60 cursor-pointer hover:bg-zinc-900/80 transition"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Appearance & Opacity</span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                openSections.appearance ? 'rotate-180' : ''
              }`}
            />
          </div>

          {openSections.appearance && (
            <div className="p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Opacity</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="opacity"
                  propertyName="Opacity"
                  currentValue={clip.opacity ?? 1.0}
                />
              </div>
            </div>
          )}
        </div>

        {/* COLOR & LIGHT */}
        <div className="rounded-xl border border-zinc-800/80 bg-[#121422] overflow-hidden">
          <div
            onClick={() => toggleSection('color')}
            className="flex items-center justify-between px-3 py-2 bg-zinc-900/60 border-b border-zinc-800/60 cursor-pointer hover:bg-zinc-900/80 transition"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              <span>Color & Lighting Adjustments</span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                openSections.color ? 'rotate-180' : ''
              }`}
            />
          </div>

          {openSections.color && (
            <div className="p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Exposure</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="colorGrade.exposure"
                  propertyName="Exposure"
                  currentValue={clip.colorGrade?.exposure ?? 0}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Contrast</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="colorGrade.contrast"
                  propertyName="Contrast"
                  currentValue={clip.colorGrade?.contrast ?? 1.0}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Brightness</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="colorGrade.brightness"
                  propertyName="Brightness"
                  currentValue={clip.colorGrade?.brightness ?? 0}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Saturation</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="colorGrade.saturation"
                  propertyName="Saturation"
                  currentValue={clip.colorGrade?.saturation ?? 1.0}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Temperature</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="colorGrade.temperature"
                  propertyName="Temperature"
                  currentValue={clip.colorGrade?.temperature ?? 0}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Tint</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="colorGrade.tint"
                  propertyName="Tint"
                  currentValue={clip.colorGrade?.tint ?? 0}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Highlights</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="colorGrade.highlights"
                  propertyName="Highlights"
                  currentValue={clip.colorGrade?.highlights ?? 0}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Shadows</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="colorGrade.shadows"
                  propertyName="Shadows"
                  currentValue={clip.colorGrade?.shadows ?? 0}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Vignette</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="colorGrade.vignette"
                  propertyName="Vignette"
                  currentValue={clip.colorGrade?.vignette ?? 0}
                />
              </div>
            </div>
          )}
        </div>

        {/* AUDIO SECTION */}
        <div className="rounded-xl border border-zinc-800/80 bg-[#121422] overflow-hidden">
          <div
            onClick={() => toggleSection('audio')}
            className="flex items-center justify-between px-3 py-2 bg-zinc-900/60 border-b border-zinc-800/60 cursor-pointer hover:bg-zinc-900/80 transition"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Audio Controls</span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                openSections.audio ? 'rotate-180' : ''
              }`}
            />
          </div>

          {openSections.audio && (
            <div className="p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Volume Level</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="volume"
                  propertyName="Volume"
                  currentValue={(clip as any).volume ?? 1.0}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Pan (L/R)</span>
                <KeyframeControl
                  clip={clip}
                  propertyPath="pan"
                  propertyName="Pan"
                  currentValue={(clip as any).pan ?? 0.0}
                />
              </div>
            </div>
          )}
        </div>

        {/* EFFECTS KEYFRAMES */}
        {clip.effects && clip.effects.length > 0 && (
          <div className="rounded-xl border border-zinc-800/80 bg-[#121422] overflow-hidden">
            <div
              onClick={() => toggleSection('effects')}
              className="flex items-center justify-between px-3 py-2 bg-zinc-900/60 border-b border-zinc-800/60 cursor-pointer hover:bg-zinc-900/80 transition"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>Applied Effects Keyframes</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                  openSections.effects ? 'rotate-180' : ''
                }`}
              />
            </div>

            {openSections.effects && (
              <div className="p-3 space-y-2 text-xs">
                {clip.effects.map((fx, idx) => (
                  <div key={fx.id} className="space-y-1 pb-2 border-b border-zinc-800/60 last:border-0 last:pb-0">
                    <div className="text-[11px] font-semibold text-zinc-200">{fx.name}</div>
                    {Object.entries(fx.params).map(([pKey, pVal]) => {
                      if (typeof pVal !== 'number') return null;
                      return (
                        <div key={pKey} className="flex items-center justify-between">
                          <span className="text-zinc-400 capitalize">{pKey}</span>
                          <KeyframeControl
                            clip={clip}
                            propertyPath={`effects[${idx}].params.${pKey}`}
                            propertyName={`${fx.name} ${pKey}`}
                            currentValue={pVal}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MASKS KEYFRAMES */}
        {clip.masks && clip.masks.length > 0 && (
          <div className="rounded-xl border border-zinc-800/80 bg-[#121422] overflow-hidden">
            <div
              onClick={() => toggleSection('masks')}
              className="flex items-center justify-between px-3 py-2 bg-zinc-900/60 border-b border-zinc-800/60 cursor-pointer hover:bg-zinc-900/80 transition"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Mask Keyframes</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                  openSections.masks ? 'rotate-180' : ''
                }`}
              />
            </div>

            {openSections.masks && (
              <div className="p-3 space-y-2 text-xs">
                {clip.masks.map((mask, mIdx) => (
                  <div key={mask.id} className="space-y-1">
                    <div className="text-[11px] font-semibold text-zinc-200">{mask.name || `Mask ${mIdx + 1}`}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Position X</span>
                      <KeyframeControl
                        clip={clip}
                        propertyPath={`masks[${mIdx}].position.x`}
                        propertyName={`Mask ${mIdx + 1} Pos X`}
                        currentValue={mask.position.x}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Position Y</span>
                      <KeyframeControl
                        clip={clip}
                        propertyPath={`masks[${mIdx}].position.y`}
                        propertyName={`Mask ${mIdx + 1} Pos Y`}
                        currentValue={mask.position.y}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Feather</span>
                      <KeyframeControl
                        clip={clip}
                        propertyPath={`masks[${mIdx}].feather`}
                        propertyName={`Mask ${mIdx + 1} Feather`}
                        currentValue={mask.feather}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Opacity</span>
                      <KeyframeControl
                        clip={clip}
                        propertyPath={`masks[${mIdx}].opacity`}
                        propertyName={`Mask ${mIdx + 1} Opacity`}
                        currentValue={mask.opacity}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
