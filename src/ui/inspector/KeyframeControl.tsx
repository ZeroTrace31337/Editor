/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronLeft, ChevronRight, Diamond } from 'lucide-react';
import { TimelineClip } from '../../domain/timeline/Clip';
import { RationalTime, subtractRationalTime, addRationalTime } from '../../core/time/RationalTime';
import { KeyframeEvaluator } from '../../domain/keyframe/KeyframeEvaluator';
import { useEditor } from '../context/EditorContext';
import { SetKeyframeCommand } from '../../engine/command/implementations/SetKeyframeCommand';
import { RemoveKeyframeCommand } from '../../engine/command/implementations/RemoveKeyframeCommand';

interface KeyframeControlProps {
  clip: TimelineClip;
  propertyPath: string;
  propertyName: string;
  currentValue: any;
}

export const KeyframeControl: React.FC<KeyframeControlProps> = ({
  clip,
  propertyPath,
  propertyName,
  currentValue,
}) => {
  const { currentTime, timelineEngine, commandManager, seek } = useEditor();

  const clipElapsed = subtractRationalTime(currentTime, clip.timelineRange.start);
  const track = clip.keyframeTracks?.[propertyPath];

  const activeKf = KeyframeEvaluator.hasKeyframeAt(track, clipElapsed);
  const { prev, next } = KeyframeEvaluator.getNeighborKeyframes(track, clipElapsed);

  const toggleKeyframe = () => {
    if (activeKf) {
      // Remove keyframe
      const cmd = new RemoveKeyframeCommand(timelineEngine, clip.id, propertyPath, activeKf.id);
      commandManager.execute(cmd);
    } else {
      // Add keyframe
      const cmd = new SetKeyframeCommand(
        timelineEngine,
        clip.id,
        propertyPath,
        propertyName,
        clipElapsed,
        currentValue
      );
      commandManager.execute(cmd);
    }
  };

  const jumpToPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (prev) {
      seek(addRationalTime(clip.timelineRange.start, prev.time));
    }
  };

  const jumpToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (next) {
      seek(addRationalTime(clip.timelineRange.start, next.time));
    }
  };

  return (
    <div className="flex items-center space-x-1" title="Animate with Keyframes">
      <button
        type="button"
        disabled={!prev}
        onClick={jumpToPrev}
        className={`p-0.5 rounded transition ${
          prev ? 'text-zinc-400 hover:text-white hover:bg-zinc-700' : 'text-zinc-700 cursor-default'
        }`}
        title="Jump to previous keyframe"
      >
        <ChevronLeft className="w-3 h-3" />
      </button>

      <button
        type="button"
        onClick={toggleKeyframe}
        className={`p-1 rounded transition ${
          activeKf
            ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30'
            : track && track.keyframes.length > 0
            ? 'text-amber-200/60 hover:text-amber-400 hover:bg-zinc-700'
            : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700'
        }`}
        title={activeKf ? 'Remove Keyframe at Current Time' : 'Add Keyframe at Current Time'}
      >
        <Diamond className={`w-3.5 h-3.5 ${activeKf ? 'fill-amber-400' : ''}`} />
      </button>

      <button
        type="button"
        disabled={!next}
        onClick={jumpToNext}
        className={`p-0.5 rounded transition ${
          next ? 'text-zinc-400 hover:text-white hover:bg-zinc-700' : 'text-zinc-700 cursor-default'
        }`}
        title="Jump to next keyframe"
      >
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
};
