/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { useEditor } from '../context/EditorContext';
import {
  Scissors,
  Plus,
  ZoomIn,
  ZoomOut,
  Layers,
  Music,
  Video,
  Type,
  Trash2,
  Copy,
  ChevronRight,
  Move,
  Volume2,
} from 'lucide-react';
import {
  RationalTime,
  createRationalTime,
  rationalTimeToSeconds,
  secondsToRationalTime,
  formatTimecode,
} from '../../core/time/RationalTime';
import { SplitClipCommand } from '../../engine/command/implementations/SplitClipCommand';
import { DeleteClipCommand } from '../../engine/command/implementations/DeleteClipCommand';
import { DuplicateClipCommand } from '../../engine/command/implementations/DuplicateClipCommand';
import { TrimClipCommand } from '../../engine/command/implementations/TrimClipCommand';
import { TimelineClip } from '../../domain/timeline/Clip';
import { Track } from '../../domain/timeline/Track';

interface MobileTouchTimelineProps {
  onOpenMediaDrawer: () => void;
  onOpenTransitionsDrawer?: () => void;
}

export const MobileTouchTimeline: React.FC<MobileTouchTimelineProps> = ({
  onOpenMediaDrawer,
  onOpenTransitionsDrawer,
}) => {
  const {
    project,
    timelineEngine,
    commandManager,
    currentTime,
    seek,
    seekSeconds,
    selectedClipId,
    setSelectedClipId,
    timelineZoom,
    setTimelineZoom,
    isPlaying,
  } = useEditor();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef<boolean>(false);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [activeTrimSide, setActiveTrimSide] = useState<'start' | 'end' | null>(null);

  const sequence = timelineEngine.getSequence();
  const currentSec = rationalTimeToSeconds(currentTime);
  const totalDurationSec = Math.max(rationalTimeToSeconds(sequence.duration), 5);

  // Zoom scale: pixels per second (clamp between 25px/s and 180px/s)
  const pxPerSec = Math.max(25, Math.min(timelineZoom || 60, 180));
  const timelineContentWidth = Math.max(totalDurationSec * pxPerSec + 400, 800);

  // Auto-scroll timeline to keep playhead centered during playback
  useEffect(() => {
    if (!scrollContainerRef.current || isUserScrollingRef.current) return;
    const container = scrollContainerRef.current;
    const containerWidth = container.clientWidth;
    const playheadPx = currentSec * pxPerSec;
    const targetScroll = playheadPx - containerWidth / 2 + 100;

    if (isPlaying) {
      container.scrollLeft = targetScroll;
    }
  }, [currentSec, pxPerSec, isPlaying]);

  // Handle timeline scroll to scrub currentTime
  const handleScroll = () => {
    if (!scrollContainerRef.current || isPlaying) return;
    isUserScrollingRef.current = true;

    const container = scrollContainerRef.current;
    const containerWidth = container.clientWidth;
    const scrollLeft = container.scrollLeft;
    const centerOffset = scrollLeft + containerWidth / 2 - 100;
    const newSec = Math.max(0, centerOffset / pxPerSec);

    seekSeconds(newSec);

    clearTimeout((window as any).__scrollTimeout);
    (window as any).__scrollTimeout = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 150);
  };

  // Quick 1-Tap Split Action at Playhead
  const handleQuickSplit = () => {
    // Find clip under playhead on targeted or first video track
    let targetClipId = selectedClipId;
    if (!targetClipId) {
      for (const track of sequence.tracks) {
        for (const clip of track.clips) {
          const startSec = rationalTimeToSeconds(clip.timelineRange.start);
          const endSec = startSec + rationalTimeToSeconds(clip.timelineRange.duration);
          if (currentSec >= startSec && currentSec <= endSec) {
            targetClipId = clip.id;
            break;
          }
        }
        if (targetClipId) break;
      }
    }

    if (targetClipId) {
      try {
        const cmd = new SplitClipCommand(timelineEngine, targetClipId, currentTime);
        commandManager.execute(cmd);
        setSelectedClipId(null);
      } catch (err) {
        console.warn('Split error:', err);
      }
    }
  };

  // Delete Selected Clip
  const handleDeleteSelected = () => {
    if (!selectedClipId) return;
    try {
      const cmd = new DeleteClipCommand(timelineEngine, selectedClipId);
      commandManager.execute(cmd);
      setSelectedClipId(null);
    } catch (err) {
      console.warn('Delete error:', err);
    }
  };

  // Duplicate Selected Clip
  const handleDuplicateSelected = () => {
    if (!selectedClipId) return;
    try {
      const cmd = new DuplicateClipCommand(timelineEngine, selectedClipId);
      commandManager.execute(cmd);
    } catch (err) {
      console.warn('Duplicate error:', err);
    }
  };

  // Zoom in / out controls
  const handleZoomIn = () => {
    setTimelineZoom(Math.min(pxPerSec + 20, 180));
  };
  const handleZoomOut = () => {
    setTimelineZoom(Math.max(pxPerSec - 20, 25));
  };

  // Ruler tick interval
  const tickIntervalSec = pxPerSec > 80 ? 1 : pxPerSec > 40 ? 2 : 5;
  const numTicks = Math.ceil(totalDurationSec / tickIntervalSec) + 4;

  const videoTracks = sequence.tracks.filter((t) => t.kind === 'video');
  const audioTracks = sequence.tracks.filter((t) => t.kind === 'audio');

  return (
    <div className="flex-1 min-h-[160px] max-h-[260px] bg-[#090b12] border-t border-zinc-800/90 flex flex-col select-none relative overflow-hidden">
      {/* Timeline Controls Header (Split shortcut, Zoom buttons, Active clip actions) */}
      <div className="h-9 px-3 bg-[#0d0f1a] border-b border-zinc-850 flex items-center justify-between shrink-0 text-xs">
        {/* Left: Quick Actions */}
        <div className="flex items-center gap-1.5">
          {/* Quick Split Button */}
          <button
            onClick={handleQuickSplit}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-black font-extrabold text-[11px] shadow-sm transition touch-manipulation cursor-pointer"
            title="Split clip at playhead needle"
          >
            <Scissors className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Split</span>
          </button>

          {selectedClipId && (
            <>
              {/* Delete Clip */}
              <button
                onClick={handleDeleteSelected}
                className="p-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/40 active:scale-95 transition touch-manipulation"
                title="Delete Selected Clip"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Duplicate Clip */}
              <button
                onClick={handleDuplicateSelected}
                className="p-1 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 active:scale-95 transition touch-manipulation"
                title="Duplicate Clip"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Center: Selected Clip Info */}
        {selectedClipId ? (
          <div className="text-[10px] font-semibold text-cyan-300 truncate max-w-[120px] sm:max-w-[200px]">
            Selected: <span className="text-white">Active Clip</span>
          </div>
        ) : (
          <div className="text-[10px] text-zinc-500 font-mono">
            {formatTimecode(currentTime)}
          </div>
        )}

        {/* Right: Zoom & Add Layer */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="p-1 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 active:scale-95 transition touch-manipulation"
            title="Zoom Out Timeline"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 active:scale-95 transition touch-manipulation"
            title="Zoom In Timeline"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenMediaDrawer}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-cyan-400 text-[11px] font-bold border border-zinc-700 active:scale-95 transition ml-1 touch-manipulation"
            title="Add Media / PIP Layer"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            <span>Layer</span>
          </button>
        </div>
      </div>

      {/* Main Touch Filmstrip Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#090b12] cursor-grab active:cursor-grabbing no-scrollbar touch-pan-x"
      >
        {/* Needle Playhead (Fixed in center of viewport container) */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center">
          {/* Top Playhead Triangle Head */}
          <div className="w-3.5 h-3.5 bg-cyan-400 rotate-45 -translate-y-1.5 shadow-md shadow-cyan-400/50" />
          {/* Playhead Vertical Line */}
          <div className="w-0.5 flex-1 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
        </div>

        {/* Timeline Dynamic Canvas Content */}
        <div
          className="relative h-full flex flex-col py-1"
          style={{ width: `${timelineContentWidth}px`, paddingLeft: '50%', paddingRight: '50%' }}
        >
          {/* 1. Time Ruler */}
          <div className="h-5 relative border-b border-zinc-800/80 mb-1">
            {Array.from({ length: numTicks }).map((_, i) => {
              const sec = i * tickIntervalSec;
              const left = sec * pxPerSec;
              const mins = Math.floor(sec / 60);
              const remainingSec = Math.floor(sec % 60);
              const label = `${mins}:${remainingSec.toString().padStart(2, '0')}`;

              return (
                <div
                  key={i}
                  className="absolute top-0 flex flex-col items-start"
                  style={{ left: `${left}px` }}
                >
                  <div className="w-px h-2 bg-zinc-700" />
                  <span className="text-[9px] font-mono text-zinc-500 -ml-2 -mt-0.5 select-none">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 2. Video Tracks (V2 PIP overlay / V1 Main Video) */}
          <div className="space-y-1 flex-1 flex flex-col justify-center">
            {videoTracks.map((track, trackIdx) => (
              <div
                key={track.id}
                className="h-10 sm:h-12 relative rounded-lg bg-zinc-950/60 border border-zinc-850/60 overflow-hidden flex items-center"
              >
                {/* Track Label Badge */}
                <div className="absolute left-1.5 top-1 px-1 py-0.2 rounded bg-black/60 text-[8px] font-mono text-zinc-400 z-10 pointer-events-none">
                  {track.name || `V${trackIdx + 1}`}
                </div>

                {/* Clips on Track */}
                {track.clips.map((clip) => {
                  const clipStartSec = rationalTimeToSeconds(clip.timelineRange.start);
                  const clipDurSec = rationalTimeToSeconds(clip.timelineRange.duration);
                  const clipLeft = clipStartSec * pxPerSec;
                  const clipWidth = Math.max(clipDurSec * pxPerSec, 24);
                  const isSelected = selectedClipId === clip.id;

                  return (
                    <div
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClipId(isSelected ? null : clip.id);
                      }}
                      style={{
                        left: `${clipLeft}px`,
                        width: `${clipWidth}px`,
                      }}
                      className={`absolute top-1 bottom-1 rounded-lg flex items-center justify-between px-2 text-xs font-bold transition-all overflow-hidden cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-600/90 to-blue-600/90 text-white ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/20 z-20'
                          : clip.type === 'text'
                          ? 'bg-purple-950/80 border border-purple-600/50 text-purple-200 hover:bg-purple-900/80'
                          : 'bg-zinc-850 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200'
                      }`}
                    >
                      {/* Left Trim Handle (When selected) */}
                      {isSelected && (
                        <div className="absolute left-0 top-0 bottom-0 w-3 bg-cyan-400 flex items-center justify-center cursor-ew-resize">
                          <div className="w-0.5 h-3 bg-black rounded-full" />
                        </div>
                      )}

                      {/* Clip Title & Type Icon */}
                      <div className="flex items-center gap-1.5 truncate pointer-events-none z-10 pl-2">
                        {clip.type === 'text' ? (
                          <Type className="w-3 h-3 text-purple-300 shrink-0" />
                        ) : (
                          <Video className="w-3 h-3 text-cyan-300 shrink-0" />
                        )}
                        <span className="truncate text-[11px] font-medium">
                          {clip.name || 'Video Clip'}
                        </span>
                      </div>

                      {/* Right Trim Handle (When selected) */}
                      {isSelected && (
                        <div className="absolute right-0 top-0 bottom-0 w-3 bg-cyan-400 flex items-center justify-center cursor-ew-resize">
                          <div className="w-0.5 h-3 bg-black rounded-full" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* 3. Audio Tracks (A1 Music / SFX) */}
            {audioTracks.map((track, trackIdx) => (
              <div
                key={track.id}
                className="h-7 sm:h-8 relative rounded-lg bg-zinc-950/60 border border-emerald-950/50 overflow-hidden flex items-center"
              >
                <div className="absolute left-1.5 top-0.5 px-1 py-0.2 rounded bg-black/60 text-[8px] font-mono text-emerald-400 z-10 pointer-events-none">
                  {track.name || `A${trackIdx + 1}`}
                </div>

                {track.clips.map((clip) => {
                  const clipStartSec = rationalTimeToSeconds(clip.timelineRange.start);
                  const clipDurSec = rationalTimeToSeconds(clip.timelineRange.duration);
                  const clipLeft = clipStartSec * pxPerSec;
                  const clipWidth = Math.max(clipDurSec * pxPerSec, 24);
                  const isSelected = selectedClipId === clip.id;

                  return (
                    <div
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClipId(isSelected ? null : clip.id);
                      }}
                      style={{
                        left: `${clipLeft}px`,
                        width: `${clipWidth}px`,
                      }}
                      className={`absolute top-0.5 bottom-0.5 rounded-md flex items-center justify-between px-2 text-xs font-bold transition-all overflow-hidden cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-black ring-2 ring-emerald-300 shadow-md z-20'
                          : 'bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/70'
                      }`}
                    >
                      <div className="flex items-center gap-1 truncate pointer-events-none">
                        <Music className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate text-[10px]">{clip.name || 'Audio Track'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
