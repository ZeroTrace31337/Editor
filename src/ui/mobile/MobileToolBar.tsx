/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Scissors,
  Music,
  Type,
  Sparkles,
  Sliders,
  Gauge,
  Crop,
  Volume2,
  Trash2,
  Layers,
  PlusCircle,
  Copy,
  Zap,
} from 'lucide-react';
import { useEditor } from '../context/EditorContext';
import { SplitClipCommand } from '../../engine/command/implementations/SplitClipCommand';
import { DeleteClipCommand } from '../../engine/command/implementations/DeleteClipCommand';
import { rationalTimeToSeconds } from '../../core/time/RationalTime';

export type MobileDrawerType =
  | 'media'
  | 'audio'
  | 'text'
  | 'transitions'
  | 'filters'
  | 'effects'
  | 'speed'
  | 'transform'
  | 'volume'
  | null;

interface MobileToolBarProps {
  activeDrawer: MobileDrawerType;
  onOpenDrawer: (drawer: MobileDrawerType) => void;
}

export const MobileToolBar: React.FC<MobileToolBarProps> = ({
  activeDrawer,
  onOpenDrawer,
}) => {
  const {
    timelineEngine,
    commandManager,
    selectedClipId,
    setSelectedClipId,
    currentTime,
  } = useEditor();

  const handleSplit = () => {
    if (!selectedClipId) {
      // Find clip at playhead
      const sequence = timelineEngine.getSequence();
      for (const track of sequence.tracks) {
        for (const clip of track.clips) {
          const startSec = rationalTimeToSeconds(clip.timelineRange.start);
          const durSec = rationalTimeToSeconds(clip.timelineRange.duration);
          const curSec = rationalTimeToSeconds(currentTime);
          if (curSec >= startSec && curSec <= startSec + durSec) {
            try {
              const cmd = new SplitClipCommand(timelineEngine, clip.id, currentTime);
              commandManager.execute(cmd);
              setSelectedClipId(null);
            } catch (err) {
              console.warn(err);
            }
            return;
          }
        }
      }
      return;
    }

    try {
      const cmd = new SplitClipCommand(timelineEngine, selectedClipId, currentTime);
      commandManager.execute(cmd);
      setSelectedClipId(null);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleDelete = () => {
    if (!selectedClipId) return;
    try {
      const cmd = new DeleteClipCommand(timelineEngine, selectedClipId);
      commandManager.execute(cmd);
      setSelectedClipId(null);
    } catch (err) {
      console.warn(err);
    }
  };

  const tools = [
    {
      id: 'split',
      name: 'Split',
      icon: Scissors,
      color: 'text-cyan-400',
      action: handleSplit,
    },
    {
      id: 'media',
      name: 'Media',
      icon: PlusCircle,
      color: 'text-blue-400',
      drawer: 'media' as MobileDrawerType,
    },
    {
      id: 'audio',
      name: 'Audio',
      icon: Music,
      color: 'text-emerald-400',
      drawer: 'audio' as MobileDrawerType,
    },
    {
      id: 'text',
      name: 'Text',
      icon: Type,
      color: 'text-purple-400',
      drawer: 'text' as MobileDrawerType,
    },
    {
      id: 'transitions',
      name: 'Transitions',
      icon: Layers,
      color: 'text-pink-400',
      drawer: 'transitions' as MobileDrawerType,
    },
    {
      id: 'filters',
      name: 'Filters',
      icon: Sliders,
      color: 'text-amber-400',
      drawer: 'filters' as MobileDrawerType,
    },
    {
      id: 'effects',
      name: 'Effects',
      icon: Sparkles,
      color: 'text-rose-400',
      drawer: 'effects' as MobileDrawerType,
    },
    {
      id: 'speed',
      name: 'Speed',
      icon: Gauge,
      color: 'text-indigo-400',
      drawer: 'speed' as MobileDrawerType,
    },
    {
      id: 'transform',
      name: 'Crop & Pos',
      icon: Crop,
      color: 'text-teal-400',
      drawer: 'transform' as MobileDrawerType,
    },
    {
      id: 'volume',
      name: 'Volume',
      icon: Volume2,
      color: 'text-lime-400',
      drawer: 'volume' as MobileDrawerType,
    },
    ...(selectedClipId
      ? [
          {
            id: 'delete',
            name: 'Delete',
            icon: Trash2,
            color: 'text-rose-500',
            action: handleDelete,
          },
        ]
      : []),
  ];

  return (
    <nav aria-label="Mobile editing tools" className="h-16 bg-[#080910] border-t border-zinc-800/90 px-2 flex items-center overflow-x-auto no-scrollbar gap-1.5 shrink-0 z-20 select-none">
      {tools.map((t) => {
        const Icon = t.icon;
        const isActive = activeDrawer === t.id;

        return (
          <button
            key={t.id}
            onClick={() => {
              if (t.action) {
                t.action();
              } else if (t.drawer) {
                onOpenDrawer(isActive ? null : t.drawer);
              }
            }}
            className={`min-w-[60px] sm:min-w-[70px] h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition active:scale-95 touch-manipulation cursor-pointer ${
              isActive
                ? 'bg-zinc-800 text-white font-bold border border-cyan-400/50 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
            }`}
          >
            <Icon className={`w-4 h-4 ${t.color}`} />
            <span className="text-[10px] font-medium leading-none truncate max-w-[56px]">
              {t.name}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
