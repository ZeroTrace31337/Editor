/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { useEditor } from '../context/EditorContext';
import {
  Scissors,
  Trash2,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Crosshair,
  Layers,
} from 'lucide-react';
import {
  RationalTime,
  createRationalTime,
  secondsToRationalTime,
  rationalTimeToSeconds,
} from '../../core/time/RationalTime';
import { SplitClipCommand } from '../../engine/command/implementations/SplitClipCommand';
import { DeleteClipCommand } from '../../engine/command/implementations/DeleteClipCommand';
import { RippleDeleteCommand } from '../../engine/command/implementations/RippleDeleteCommand';
import { createBaseClip, TimelineClip } from '../../domain/timeline/Clip';
import { createTrack } from '../../domain/timeline/Track';

export const TimelinePanel: React.FC = () => {
  const {
    project,
    projectService,
    timelineEngine,
    commandManager,
    currentTime,
    seekSeconds,
    selectedClipId,
    setSelectedClipId,
    snappingEnabled,
    timelineZoom,
    setTimelineZoom,
  } = useEditor();

  const containerRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [activeDrag, setActiveDrag] = useState<{
    type: 'move' | 'trim-left' | 'trim-right';
    clipId: string;
    startMouseX: number;
    initialTimelineStart: RationalTime;
    initialDuration: RationalTime;
    initialSourceIn: RationalTime;
    initialTrackId: string;
  } | null>(null);

  const [snapLineSec, setSnapLineSec] = useState<number | null>(null);

  const sequence = timelineEngine.getSequence();
  const sequenceDurationSec = Math.max(90, rationalTimeToSeconds(sequence.duration) + 10);
  const totalTimelineWidthPx = Math.max(1600, sequenceDurationSec * timelineZoom);
  const currentTimeSec = rationalTimeToSeconds(currentTime);

  const handleSplitAtPlayhead = () => {
    if (!selectedClipId) {
      const activeClips = timelineEngine.getClipsAtTime(currentTime);
      if (activeClips.length > 0) {
        const topClip = activeClips[0].clip;
        try {
          const cmd = new SplitClipCommand(timelineEngine, topClip.id, currentTime);
          commandManager.execute(cmd);
        } catch {}
      }
      return;
    }

    try {
      const cmd = new SplitClipCommand(timelineEngine, selectedClipId, currentTime);
      commandManager.execute(cmd);
    } catch {}
  };

  const handleDeleteSelected = () => {
    if (!selectedClipId) return;
    try {
      const cmd = new DeleteClipCommand(timelineEngine, selectedClipId);
      commandManager.execute(cmd);
      setSelectedClipId(null);
    } catch {}
  };

  const handleRippleDelete = () => {
    if (!selectedClipId) return;
    try {
      const cmd = new RippleDeleteCommand(timelineEngine, selectedClipId);
      commandManager.execute(cmd);
      setSelectedClipId(null);
    } catch {}
  };

  const handleAddAdjustmentLayer = () => {
    let targetTrack = sequence.tracks.find((t) => t.kind === 'video');
    if (!targetTrack) {
      targetTrack = createTrack(`track_v1_${Date.now().toString(36)}`, 'Video 1', 'video');
      sequence.tracks.unshift(targetTrack);
    }

    const dur = secondsToRationalTime(5.0);
    const adjClip = createBaseClip(
      `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      'adjustment',
      'Adjustment Layer',
      targetTrack.id,
      { start: currentTime, duration: dur },
      { start: createRationalTime(0), duration: dur }
    );
    projectService.setProject({ ...project });
  };

  const handleAddTrack = (kind: 'video' | 'audio') => {
    const count = sequence.tracks.filter((t) => t.kind === kind).length + 1;
    const name = kind === 'video' ? `Video ${count}` : `Audio ${count}`;
    const newTrack = createTrack(`track_${kind}_${Date.now()}`, name, kind);
    if (kind === 'video') {
      sequence.tracks.unshift(newTrack);
    } else {
      sequence.tracks.push(newTrack);
    }
    projectService.setProject({ ...project });
  };

  // Scrubbing on ruler
  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    updatePlayheadFromMouse(e.clientX);
  };

  const updatePlayheadFromMouse = (clientX: number) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const scrollLeft = rulerRef.current.scrollLeft || 0;
    const offsetX = clientX - rect.left + scrollLeft;
    const newSec = Math.max(0, offsetX / timelineZoom);
    seekSeconds(newSec);
  };

  // Global mouse move & up listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isScrubbing) {
        updatePlayheadFromMouse(e.clientX);
      } else if (activeDrag) {
        const deltaPx = e.clientX - activeDrag.startMouseX;
        const deltaSec = deltaPx / timelineZoom;

        if (activeDrag.type === 'move') {
          const initStartSec = rationalTimeToSeconds(activeDrag.initialTimelineStart);
          let newStartSec = Math.max(0, initStartSec + deltaSec);

          if (snappingEnabled) {
            const SNAP_THRESHOLD_SEC = 6 / timelineZoom;
            if (Math.abs(newStartSec - currentTimeSec) < SNAP_THRESHOLD_SEC) {
              newStartSec = currentTimeSec;
              setSnapLineSec(currentTimeSec);
            } else {
              setSnapLineSec(null);
            }
          }

          const newStart = secondsToRationalTime(newStartSec);
          const found = timelineEngine.findClip(activeDrag.clipId);
          if (found) {
            found.clip.timelineRange = {
              ...found.clip.timelineRange,
              start: newStart,
            };
            projectService.setProject({ ...project });
          }
        } else if (activeDrag.type === 'trim-left') {
          const initStartSec = rationalTimeToSeconds(activeDrag.initialTimelineStart);
          const initDurSec = rationalTimeToSeconds(activeDrag.initialDuration);
          const maxDelta = initDurSec - 0.2;
          const deltaClamped = Math.min(maxDelta, Math.max(-initStartSec, deltaSec));

          const newStart = secondsToRationalTime(initStartSec + deltaClamped);
          const newDur = secondsToRationalTime(initDurSec - deltaClamped);

          const found = timelineEngine.findClip(activeDrag.clipId);
          if (found) {
            found.clip.timelineRange = {
              start: newStart,
              duration: newDur,
            };
            projectService.setProject({ ...project });
          }
        } else if (activeDrag.type === 'trim-right') {
          const initDurSec = rationalTimeToSeconds(activeDrag.initialDuration);
          const newDurSec = Math.max(0.2, initDurSec + deltaSec);
          const newDur = secondsToRationalTime(newDurSec);

          const found = timelineEngine.findClip(activeDrag.clipId);
          if (found) {
            found.clip.timelineRange = {
              start: found.clip.timelineRange.start,
              duration: newDur,
            };
            projectService.setProject({ ...project });
          }
        }
      }
    };

    const handleMouseUp = () => {
      if (isScrubbing) setIsScrubbing(false);
      if (activeDrag) {
        setSnapLineSec(null);
        setActiveDrag(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, activeDrag, timelineZoom, snappingEnabled, currentTimeSec, timelineEngine, project, projectService]);

  // Generate ruler tick marks: 00:00, 00:05, 00:15, 00:25...
  const rulerTicks = [];
  const tickIntervalSec = 5;
  for (let sec = 0; sec <= sequenceDurationSec; sec += tickIntervalSec) {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    const label = `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    rulerTicks.push({ sec, label, left: sec * timelineZoom });
  }

  const getClipThumbnail = (clip: TimelineClip) => {
    const assetId = (clip as any).mediaAssetId;
    if (assetId) {
      const asset = (project.mediaPool || []).find((a) => a.id === assetId);
      if (asset && asset.thumbnailUrl) return asset.thumbnailUrl;
    }
    return (clip as any).thumbnailUrl || null;
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-[#080911] select-none overflow-hidden"
    >
      {/* Main Track Workspace (Header Column + Scrollable Tracks) */}
      <div className="flex-1 flex overflow-hidden">
        {/* 1. Left Track Headers Column */}
        <div className="w-44 bg-[#090b14] border-r border-zinc-800/80 shrink-0 flex flex-col z-10">
          {/* Top ruler placeholder */}
          <div className="h-6 border-b border-zinc-800/80 bg-[#090a12] px-2.5 flex items-center justify-between text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
            <span>TRACKS</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleAddTrack('video')}
                className="text-cyan-400 hover:text-cyan-300 font-bold px-1"
                title="Add Video Track"
              >
                +V
              </button>
              <button
                onClick={() => handleAddTrack('audio')}
                className="text-emerald-400 hover:text-emerald-300 font-bold px-1"
                title="Add Audio Track"
              >
                +A
              </button>
            </div>
          </div>

          {/* Track Headers List */}
          <div className="flex-1 overflow-hidden flex flex-col justify-start">
            {sequence.tracks.map((track, idx) => {
              const isVideo = track.kind === 'video';
              const trackShort = isVideo ? `V${sequence.tracks.filter(t => t.kind === 'video').length - idx}` : `A${idx - 2}`;

              return (
                <div
                  key={track.id}
                  className="h-14 border-b border-zinc-800/70 px-2.5 flex items-center justify-between bg-[#0b0d17] hover:bg-zinc-900/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-4.5 rounded flex items-center justify-center font-bold text-[9px] text-white ${
                        isVideo ? 'bg-indigo-600' : 'bg-emerald-600'
                      }`}
                    >
                      {trackShort}
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-300">{track.name}</span>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    {isVideo ? (
                      <button
                        onClick={() => {
                          track.visible = !track.visible;
                          projectService.setProject({ ...project });
                        }}
                        className="hover:text-zinc-100"
                      >
                        {track.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-zinc-600" />}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          track.muted = !track.muted;
                          projectService.setProject({ ...project });
                        }}
                        className="hover:text-zinc-100"
                      >
                        {track.muted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3" />}
                      </button>
                    )}

                    <button
                      onClick={() => {
                        track.locked = !track.locked;
                        projectService.setProject({ ...project });
                      }}
                      className="hover:text-zinc-100"
                    >
                      {track.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Scrollable Tracks & Ruler Stage */}
        <div
          ref={rulerRef}
          className="flex-1 overflow-x-auto overflow-y-auto relative bg-[#07080f]"
          onClick={() => setSelectedClipId(null)}
        >
          <div style={{ width: totalTimelineWidthPx }} className="relative min-h-full">
            {/* Interactive Time Ruler */}
            <div
              className="h-6 border-b border-zinc-800/80 bg-[#0a0c16] relative cursor-pointer select-none"
              onMouseDown={handleRulerMouseDown}
            >
              {rulerTicks.map((tick) => (
                <div
                  key={tick.sec}
                  className="absolute top-0 bottom-0 flex flex-col justify-between"
                  style={{ left: tick.left }}
                >
                  <span className="text-[9px] font-mono text-zinc-400 font-semibold pl-1">{tick.label}</span>
                  <div className="w-[1px] h-1.5 bg-zinc-700" />
                </div>
              ))}
            </div>

            {/* Track Lanes */}
            <div className="relative">
              {sequence.tracks.map((track) => (
                <div
                  key={track.id}
                  onDragOver={(e) => e.preventDefault()}
                  className={`h-14 border-b border-zinc-800/60 relative transition-colors ${
                    track.locked ? 'bg-zinc-950/60 opacity-60' : 'hover:bg-zinc-900/20'
                  }`}
                >
                  {/* Clips on Track */}
                  {track.clips.map((clip) => {
                    const startSec = rationalTimeToSeconds(clip.timelineRange.start);
                    const durSec = rationalTimeToSeconds(clip.timelineRange.duration);
                    const leftPx = startSec * timelineZoom;
                    const widthPx = Math.max(20, durSec * timelineZoom);
                    const isSelected = selectedClipId === clip.id;
                    const thumb = getClipThumbnail(clip);

                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClipId(clip.id);
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setSelectedClipId(clip.id);
                          if (track.locked) return;
                          setActiveDrag({
                            type: 'move',
                            clipId: clip.id,
                            startMouseX: e.clientX,
                            initialTimelineStart: clip.timelineRange.start,
                            initialDuration: clip.timelineRange.duration,
                            initialSourceIn: clip.sourceRange.start,
                            initialTrackId: track.id,
                          });
                        }}
                        style={{ left: leftPx, width: widthPx }}
                        className={`absolute top-1 bottom-1 rounded-md overflow-hidden cursor-move transition-shadow flex items-center justify-between group select-none shadow-sm ${
                          clip.type === 'audio'
                            ? 'bg-[#0b1c15] border border-emerald-500/80 text-white'
                            : clip.type === 'adjustment'
                            ? 'bg-gradient-to-r from-cyan-900 via-indigo-900 to-purple-900 border border-cyan-400 text-white'
                            : 'bg-[#151728] border border-indigo-500/80 text-white'
                        } ${isSelected ? 'ring-2 ring-cyan-400 shadow-md shadow-cyan-500/30' : ''}`}
                      >
                        {/* Filmstrip Thumbnail Background for Video Clips */}
                        {clip.type === 'video' && thumb && (
                          <div className="absolute inset-0 opacity-40 pointer-events-none flex overflow-hidden">
                            {Array.from({ length: Math.ceil(widthPx / 75) }).map((_, i) => (
                              <img
                                key={i}
                                src={thumb}
                                alt=""
                                className="h-full w-[75px] object-cover shrink-0 border-r border-black/40"
                              />
                            ))}
                          </div>
                        )}

                        {/* Audio Waveform SVG for Audio Clips */}
                        {clip.type === 'audio' && (
                          <div className="absolute inset-0 opacity-80 pointer-events-none flex items-center px-1">
                            <svg className="w-full h-7" preserveAspectRatio="none" viewBox="0 0 100 20">
                              <path
                                d="M 0 10 Q 5 2, 10 10 T 20 10 T 30 4 T 40 10 T 50 16 T 60 10 T 70 2 T 80 10 T 90 14 T 100 10"
                                stroke="#10b981"
                                strokeWidth="2"
                                fill="none"
                              />
                              <path
                                d="M 0 10 Q 5 18, 10 10 T 20 10 T 30 16 T 40 10 T 50 4 T 60 10 T 70 18 T 80 10 T 90 6 T 100 10"
                                stroke="#34d399"
                                strokeWidth="1.5"
                                fill="none"
                              />
                            </svg>
                          </div>
                        )}

                        {/* Left Trim Handle */}
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            if (track.locked) return;
                            setActiveDrag({
                              type: 'trim-left',
                              clipId: clip.id,
                              startMouseX: e.clientX,
                              initialTimelineStart: clip.timelineRange.start,
                              initialDuration: clip.timelineRange.duration,
                              initialSourceIn: clip.sourceRange.start,
                              initialTrackId: track.id,
                            });
                          }}
                          className="w-1.5 h-full bg-white/20 hover:bg-white/70 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shrink-0 z-20"
                        />

                        {/* Clip Content Label & Badges */}
                        <div className="flex-1 px-1.5 overflow-hidden flex flex-col justify-center z-10">
                          <div className="flex items-center space-x-1 truncate">
                            <span className="text-[10px] font-bold truncate text-white drop-shadow">
                              {clip.name}
                            </span>
                            {clip.effects && clip.effects.length > 0 && (
                              <span className="px-1 py-0.2 bg-purple-600 text-white rounded text-[7px] font-bold shadow-xs">
                                FX
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right Trim Handle */}
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            if (track.locked) return;
                            setActiveDrag({
                              type: 'trim-right',
                              clipId: clip.id,
                              startMouseX: e.clientX,
                              initialTimelineStart: clip.timelineRange.start,
                              initialDuration: clip.timelineRange.duration,
                              initialSourceIn: clip.sourceRange.start,
                              initialTrackId: track.id,
                            });
                          }}
                          className="w-1.5 h-full bg-white/20 hover:bg-white/70 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shrink-0 z-20"
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Snapping Visual Guideline */}
            {snapLineSec !== null && (
              <div
                style={{ left: snapLineSec * timelineZoom }}
                className="absolute top-0 bottom-0 w-[2px] bg-amber-400 z-30 pointer-events-none shadow-sm shadow-amber-400"
              />
            )}

            {/* White Playhead Needle */}
            <div
              style={{ left: currentTimeSec * timelineZoom }}
              className="absolute top-0 bottom-0 w-[1.5px] bg-white z-40 pointer-events-none flex flex-col items-center shadow-md shadow-white/40"
            >
              {/* Playhead Header Cap */}
              <div className="w-3.5 h-3.5 bg-white rotate-45 -mt-1 shadow-lg shadow-white/60 rounded-xs" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Timeline Control & Zoom Bar */}
      <div className="h-7 bg-[#090a12] border-t border-zinc-800/80 px-3 flex items-center justify-between shrink-0 text-xs select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSplitAtPlayhead}
            className="flex items-center gap-1 text-[11px] font-medium text-zinc-300 hover:text-white"
          >
            <Scissors className="w-3 h-3 text-cyan-400" />
            <span>Split (Ctrl+B)</span>
          </button>

          <button
            onClick={handleDeleteSelected}
            disabled={!selectedClipId}
            className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-red-300 disabled:opacity-30"
          >
            <Trash2 className="w-3 h-3" />
            <span>Delete</span>
          </button>

          <button
            onClick={handleRippleDelete}
            disabled={!selectedClipId}
            className="flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:text-amber-200 disabled:opacity-30"
          >
            <span>Ripple Delete</span>
          </button>

          <button
            onClick={handleAddAdjustmentLayer}
            className="flex items-center gap-1 text-[11px] font-medium text-cyan-300 hover:text-cyan-100"
          >
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>+ Adjustment Layer</span>
          </button>
        </div>

        {/* Zoom Slider */}
        <div className="flex items-center gap-2 text-zinc-400">
          <button
            onClick={() => setTimelineZoom(Math.max(20, timelineZoom - 15))}
            className="hover:text-white"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <input
            type="range"
            min="20"
            max="180"
            value={timelineZoom}
            onChange={(e) => setTimelineZoom(Number(e.target.value))}
            className="w-24 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <button
            onClick={() => setTimelineZoom(Math.min(180, timelineZoom + 15))}
            className="hover:text-white"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
          <span className="font-mono text-[10px] text-zinc-500 w-8 text-right">{timelineZoom}%</span>
        </div>
      </div>
    </div>
  );
};
