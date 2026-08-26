/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Diamond, MoreVertical, Trash2, Copy, Sliders, Activity } from 'lucide-react';
import { TimelineClip } from '../../domain/timeline/Clip';
import { RationalTime, subtractRationalTime, addRationalTime } from '../../core/time/RationalTime';
import { KeyframeEvaluator } from '../../domain/keyframe/KeyframeEvaluator';
import { KeyframeInterpolation } from '../../domain/keyframe/Keyframe';
import { useEditor } from '../context/EditorContext';
import { SetKeyframeCommand } from '../../engine/command/implementations/SetKeyframeCommand';
import { RemoveKeyframeCommand } from '../../engine/command/implementations/RemoveKeyframeCommand';
import { UpdateKeyframeEasingCommand } from '../../engine/command/implementations/UpdateKeyframeEasingCommand';
import { ClearKeyframeTrackCommand } from '../../engine/command/implementations/ClearKeyframeTrackCommand';

interface KeyframeControlProps {
  clip?: TimelineClip;
  propertyPath: string;
  propertyName: string;
  currentValue: any;
  compact?: boolean;
}

const EASING_OPTIONS: { id: KeyframeInterpolation; label: string; desc: string }[] = [
  { id: 'smooth', label: 'Smooth', desc: 'Natural smooth ease in and out' },
  { id: 'linear', label: 'Linear', desc: 'Constant rate of change' },
  { id: 'easeIn', label: 'Ease In', desc: 'Slow start, accelerates' },
  { id: 'easeOut', label: 'Ease Out', desc: 'Fast start, decelerates gently' },
  { id: 'easeInOut', label: 'Ease In & Out', desc: 'Gentle start and end' },
  { id: 'bezier', label: 'Bezier Curve', desc: 'Custom parametric curvature' },
  { id: 'step', label: 'Hold / Step', desc: 'Instant jump without transition' },
];

export const KeyframeControl: React.FC<KeyframeControlProps> = ({
  clip: propClip,
  propertyPath,
  propertyName,
  currentValue,
  compact = false,
}) => {
  const {
    currentTime,
    timelineEngine,
    commandManager,
    seek,
    selectedClip,
    setSelectedKeyframe,
    copyClipKeyframes,
  } = useEditor();

  const clip = propClip || selectedClip;
  const [showEasingMenu, setShowEasingMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowEasingMenu(false);
      }
    };
    if (showEasingMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEasingMenu]);

  if (!clip) return null;

  const clipElapsed = subtractRationalTime(currentTime, clip.timelineRange.start);
  const track = clip.keyframeTracks?.[propertyPath];

  const activeKf = KeyframeEvaluator.hasKeyframeAt(track, clipElapsed);
  const { prev, next } = KeyframeEvaluator.getNeighborKeyframes(track, clipElapsed);
  const hasAnyKeyframes = track && track.keyframes.length > 0;

  const toggleKeyframe = () => {
    if (activeKf) {
      // Remove keyframe
      const cmd = new RemoveKeyframeCommand(timelineEngine, clip.id, propertyPath, activeKf.id);
      commandManager.execute(cmd);
      setSelectedKeyframe(null, null);
    } else {
      // Add keyframe
      const cmd = new SetKeyframeCommand(
        timelineEngine,
        clip.id,
        propertyPath,
        propertyName,
        clipElapsed,
        currentValue,
        'smooth'
      );
      commandManager.execute(cmd);
    }
  };

  const handleEasingSelect = (interpolation: KeyframeInterpolation) => {
    if (activeKf) {
      const cmd = new UpdateKeyframeEasingCommand(
        timelineEngine,
        clip.id,
        propertyPath,
        activeKf.id,
        interpolation
      );
      commandManager.execute(cmd);
    }
    setShowEasingMenu(false);
  };

  const handleClearTrack = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cmd = new ClearKeyframeTrackCommand(timelineEngine, clip.id, propertyPath);
    commandManager.execute(cmd);
    setShowEasingMenu(false);
  };

  const handleCopyTrack = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyClipKeyframes(clip.id, propertyPath);
    setShowEasingMenu(false);
  };

  const jumpToPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (prev) {
      seek(addRationalTime(clip.timelineRange.start, prev.time));
      setSelectedKeyframe(propertyPath, prev.id);
    }
  };

  const jumpToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (next) {
      seek(addRationalTime(clip.timelineRange.start, next.time));
      setSelectedKeyframe(propertyPath, next.id);
    }
  };

  return (
    <div className="relative flex items-center space-x-0.5 select-none">
      {/* Prev Keyframe Jump */}
      {!compact && (
        <button
          type="button"
          disabled={!prev}
          onClick={jumpToPrev}
          className={`p-0.5 rounded transition ${
            prev
              ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              : 'text-zinc-700/60 cursor-default opacity-40'
          }`}
          title={prev ? 'Jump to previous keyframe (◀)' : 'No previous keyframe'}
        >
          <ChevronLeft className="w-3 h-3" />
        </button>
      )}

      {/* Diamond Keyframe Button */}
      <button
        type="button"
        onClick={toggleKeyframe}
        onContextMenu={(e) => {
          if (activeKf || hasAnyKeyframes) {
            e.preventDefault();
            setShowEasingMenu((v) => !v);
          }
        }}
        className={`p-1 rounded transition relative group/kf ${
          activeKf
            ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30 ring-1 ring-amber-400/40 shadow-xs shadow-amber-500/30'
            : hasAnyKeyframes
            ? 'text-amber-300/80 hover:text-amber-300 hover:bg-zinc-800'
            : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
        }`}
        title={
          activeKf
            ? `Active Keyframe on ${propertyName} (${activeKf.interpolation}) - Click to Remove, Right-Click for Easing`
            : hasAnyKeyframes
            ? `Add Keyframe on ${propertyName} at Playhead (${track.keyframes.length} existing)`
            : `Add Keyframe on ${propertyName} (◆)`
        }
      >
        <Diamond
          className={`w-3.5 h-3.5 transition-transform group-hover/kf:scale-110 ${
            activeKf
              ? 'fill-amber-400 stroke-amber-400'
              : hasAnyKeyframes
              ? 'stroke-amber-300 stroke-[2]'
              : 'stroke-zinc-500 stroke-[1.5]'
          }`}
        />
        {/* Dot indicator if track has keyframes elsewhere */}
        {!activeKf && hasAnyKeyframes && (
          <span className="absolute bottom-0.5 right-0.5 w-1 h-1 bg-amber-400 rounded-full" />
        )}
      </button>

      {/* Next Keyframe Jump */}
      {!compact && (
        <button
          type="button"
          disabled={!next}
          onClick={jumpToNext}
          className={`p-0.5 rounded transition ${
            next
              ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              : 'text-zinc-700/60 cursor-default opacity-40'
          }`}
          title={next ? 'Jump to next keyframe (▶)' : 'No next keyframe'}
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      )}

      {/* Easing & Track Menu Popup */}
      {showEasingMenu && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 z-50 w-52 bg-zinc-900 border border-zinc-700/80 rounded-lg shadow-xl shadow-black/80 py-1 text-xs text-zinc-200"
        >
          <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 flex items-center justify-between">
            <span>{propertyName} Keyframe</span>
            {activeKf && (
              <span className="text-amber-400 lowercase text-[10px] font-mono">
                {activeKf.interpolation}
              </span>
            )}
          </div>

          {/* Interpolation choices */}
          {activeKf && (
            <div className="py-1">
              <div className="px-2.5 py-0.5 text-[10px] text-zinc-500">Interpolation / Easing:</div>
              {EASING_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleEasingSelect(opt.id)}
                  className={`w-full px-3 py-1 text-left flex items-center justify-between transition text-[11px] ${
                    activeKf.interpolation === opt.id
                      ? 'bg-amber-500/20 text-amber-300 font-medium'
                      : 'hover:bg-zinc-800 text-zinc-300'
                  }`}
                >
                  <div>
                    <div>{opt.label}</div>
                    <div className="text-[9px] text-zinc-500">{opt.desc}</div>
                  </div>
                  {activeKf.interpolation === opt.id && <span className="text-amber-400 text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}

          {/* Track actions */}
          <div className="border-t border-zinc-800 pt-1">
            <button
              type="button"
              onClick={handleCopyTrack}
              className="w-full px-3 py-1 text-left flex items-center gap-2 hover:bg-zinc-800 text-zinc-300 text-[11px]"
            >
              <Copy className="w-3 h-3 text-zinc-400" />
              <span>Copy Track Animation</span>
            </button>
            <button
              type="button"
              onClick={handleClearTrack}
              className="w-full px-3 py-1 text-left flex items-center gap-2 hover:bg-rose-950/40 text-rose-400 text-[11px]"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span>Clear Track Keyframes</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
