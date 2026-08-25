/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Blend, Moon, Sun, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, MoveLeft, MoveRight, Maximize, Minimize, Trash2 } from 'lucide-react';
import { TimelineClip } from '../../domain/timeline/Clip';
import { useEditor } from '../context/EditorContext';
import { TransitionRegistry } from '../../rendering/transitions/TransitionRegistry';
import { TransitionType, ClipTransition } from '../../rendering/transitions/TransitionTypes';
import { SetTransitionCommand } from '../../engine/command/implementations/SetTransitionCommand';
import { createRationalTime, rationalTimeToSeconds, secondsToRationalTime } from '../../core/time/RationalTime';

interface TransitionsPanelProps {
  clip?: TimelineClip;
}

const transitionIcons: Record<TransitionType, React.ReactNode> = {
  'cross-dissolve': <Blend className="w-4 h-4 text-cyan-400" />,
  'fade-black': <Moon className="w-4 h-4 text-zinc-400" />,
  'fade-white': <Sun className="w-4 h-4 text-amber-300" />,
  'wipe-left': <ChevronLeft className="w-4 h-4 text-blue-400" />,
  'wipe-right': <ChevronRight className="w-4 h-4 text-blue-400" />,
  'wipe-up': <ChevronUp className="w-4 h-4 text-blue-400" />,
  'wipe-down': <ChevronDown className="w-4 h-4 text-blue-400" />,
  'slide-left': <MoveLeft className="w-4 h-4 text-purple-400" />,
  'slide-right': <MoveRight className="w-4 h-4 text-purple-400" />,
  'zoom-in': <Maximize className="w-4 h-4 text-emerald-400" />,
  'zoom-out': <Minimize className="w-4 h-4 text-emerald-400" />,
};

export const TransitionsPanel: React.FC<TransitionsPanelProps> = ({ clip: propClip }) => {
  const { timelineEngine, commandManager, selectedClip } = useEditor();
  const clip = propClip || selectedClip;

  if (!clip) {
    return (
      <div className="p-6 text-center text-zinc-500 text-xs">
        <Blend className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
        <p>Select a clip on the timeline to configure in/out transitions.</p>
      </div>
    );
  }

  const registry = TransitionRegistry.getInstance();
  const transitions = registry.getAllTransitions();

  const handleSetTransition = (
    position: 'in' | 'out',
    type: TransitionType,
    durationSec = 1.0
  ) => {
    const newTransition: ClipTransition = {
      id: `trans_${Date.now()}`,
      type,
      duration: secondsToRationalTime(durationSec),
      position,
      alignment: 'center',
    };

    const cmd = new SetTransitionCommand(timelineEngine, clip.id, position, newTransition);
    commandManager.execute(cmd);
  };

  const handleRemoveTransition = (position: 'in' | 'out') => {
    const cmd = new SetTransitionCommand(timelineEngine, clip.id, position, undefined);
    commandManager.execute(cmd);
  };

  const handleDurationChange = (position: 'in' | 'out', durationSec: number) => {
    const current = position === 'in' ? clip.transitionIn : clip.transitionOut;
    if (!current) return;

    handleSetTransition(position, current.type, durationSec);
  };

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
        Apply optical fades, directional wipes, slides, and zooms seamlessly to clip boundaries.
      </div>

      {/* Transition IN */}
      <div className="space-y-3 bg-zinc-900/90 border border-zinc-800 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Blend className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              Transition In (Head)
            </span>
          </div>

          {clip.transitionIn && (
            <button
              type="button"
              onClick={() => handleRemoveTransition('in')}
              className="p-1 text-zinc-400 hover:text-red-400 rounded hover:bg-zinc-800"
              title="Remove Transition In"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {clip.transitionIn ? (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between bg-zinc-800/80 p-2.5 rounded-lg border border-zinc-700/60">
              <div className="flex items-center space-x-2">
                {transitionIcons[clip.transitionIn.type]}
                <span className="text-xs font-medium text-white">
                  {registry.getTransition(clip.transitionIn.type)?.name}
                </span>
              </div>
              <span className="text-xs font-mono text-cyan-400">
                {rationalTimeToSeconds(clip.transitionIn.duration).toFixed(1)}s
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-zinc-400 font-medium">
                <span>Duration</span>
                <span>{rationalTimeToSeconds(clip.transitionIn.duration).toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={rationalTimeToSeconds(clip.transitionIn.duration)}
                onChange={(e) => handleDurationChange('in', parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {transitions.map((t) => (
              <button
                key={`in_${t.type}`}
                type="button"
                onClick={() => handleSetTransition('in', t.type, 1.0)}
                className="flex items-center space-x-2 p-2 rounded bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-800/80 hover:border-cyan-500/50 text-left transition"
              >
                {transitionIcons[t.type]}
                <span className="text-[11px] font-medium text-zinc-300 truncate">{t.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Transition OUT */}
      <div className="space-y-3 bg-zinc-900/90 border border-zinc-800 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Blend className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              Transition Out (Tail)
            </span>
          </div>

          {clip.transitionOut && (
            <button
              type="button"
              onClick={() => handleRemoveTransition('out')}
              className="p-1 text-zinc-400 hover:text-red-400 rounded hover:bg-zinc-800"
              title="Remove Transition Out"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {clip.transitionOut ? (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between bg-zinc-800/80 p-2.5 rounded-lg border border-zinc-700/60">
              <div className="flex items-center space-x-2">
                {transitionIcons[clip.transitionOut.type]}
                <span className="text-xs font-medium text-white">
                  {registry.getTransition(clip.transitionOut.type)?.name}
                </span>
              </div>
              <span className="text-xs font-mono text-purple-400">
                {rationalTimeToSeconds(clip.transitionOut.duration).toFixed(1)}s
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-zinc-400 font-medium">
                <span>Duration</span>
                <span>{rationalTimeToSeconds(clip.transitionOut.duration).toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={rationalTimeToSeconds(clip.transitionOut.duration)}
                onChange={(e) => handleDurationChange('out', parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {transitions.map((t) => (
              <button
                key={`out_${t.type}`}
                type="button"
                onClick={() => handleSetTransition('out', t.type, 1.0)}
                className="flex items-center space-x-2 p-2 rounded bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-800/80 hover:border-purple-500/50 text-left transition"
              >
                {transitionIcons[t.type]}
                <span className="text-[11px] font-medium text-zinc-300 truncate">{t.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
