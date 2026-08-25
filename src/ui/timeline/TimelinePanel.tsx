/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { useEditor } from '../context/EditorContext';
import {
  Scissors,
  Trash2,
  Magnet,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Plus,
  Layers,
  Sparkles,
  Crosshair,
  Activity,
  Cpu,
  ChevronDown,
} from 'lucide-react';
import {
  RationalTime,
  createRationalTime,
  secondsToRationalTime,
  rationalTimeToSeconds,
  addRationalTime,
  subtractRationalTime,
} from '../../core/time/RationalTime';
import { SplitClipCommand } from '../../engine/command/implementations/SplitClipCommand';
import { DeleteClipCommand } from '../../engine/command/implementations/DeleteClipCommand';
import { RippleDeleteCommand } from '../../engine/command/implementations/RippleDeleteCommand';
import { SlipEditCommand } from '../../engine/command/implementations/SlipEditCommand';
import { MoveClipCommand } from '../../engine/command/implementations/MoveClipCommand';
import { TrimClipCommand } from '../../engine/command/implementations/TrimClipCommand';
import { AddClipCommand } from '../../engine/command/implementations/AddClipCommand';
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
    setSnappingEnabled,
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

  // Handle Split at playhead
  const handleSplitAtPlayhead = () => {
    if (!selectedClipId) {
      const activeClips = timelineEngine.getClipsAtTime(currentTime);
      if (activeClips.length > 0) {
        const topClip = activeClips[0].clip;
        try {
          const cmd = new SplitClipCommand(timelineEngine, topClip.id, currentTime);
          commandManager.execute(cmd);
        } catch (e: any) {
          alert(e.message || 'Cannot split at current position');
        }
      }
      return;
    }

    try {
      const cmd = new SplitClipCommand(timelineEngine, selectedClipId, currentTime);
      commandManager.execute(cmd);
    } catch (e: any) {
      alert(e.message || 'Playhead must be inside the selected clip to split it');
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedClipId) return;
    try {
      const cmd = new DeleteClipCommand(timelineEngine, selectedClipId);
      commandManager.execute(cmd);
      setSelectedClipId(null);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleRippleDelete = () => {
    if (!selectedClipId) return;
    try {
      const cmd = new RippleDeleteCommand(timelineEngine, selectedClipId);
      commandManager.execute(cmd);
      setSelectedClipId(null);
    } catch (e: any) {
      console.error(e);
    }
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

    const cmd = new AddClipCommand(timelineEngine, targetTrack.id, adjClip as any);
    commandManager.execute(cmd).then(() => {
      setSelectedClipId(adjClip.id);
      projectService.setProject({ ...project });
    });
  };

  const handleAddTrack = (kind: 'video' | 'audio') => {
    const existing = sequence.tracks.filter((t) => t.kind === kind);
    const num = existing.length + 1;
    const newTrack = createTrack(`track_${kind}_${Date.now().toString(36)}`, `${kind === 'video' ? 'Video' : 'Audio'} ${num}`, kind);
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
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const scrollLeft = rulerRef.current.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft;
    const newSec = Math.max(0, x / timelineZoom);
    seekSeconds(newSec);
  };

  // Global mouse handlers for Drag & Trim
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isScrubbing && rulerRef.current) {
        const rect = rulerRef.current.getBoundingClientRect();
        const scrollLeft = rulerRef.current.scrollLeft;
        const x = e.clientX - rect.left + scrollLeft;
        const newSec = Math.max(0, x / timelineZoom);
        seekSeconds(newSec);
      }

      if (activeDrag && rulerRef.current) {
        const deltaX = e.clientX - activeDrag.startMouseX;
        const deltaSec = deltaX / timelineZoom;

        if (activeDrag.type === 'move') {
          const initSec = rationalTimeToSeconds(activeDrag.initialTimelineStart);
          let targetSec = Math.max(0, initSec + deltaSec);

          if (snappingEnabled) {
            const snapPoints = [0, currentTimeSec];
            sequence.tracks.forEach((tr) => {
              tr.clips.forEach((cl) => {
                if (cl.id !== activeDrag.clipId) {
                  snapPoints.push(rationalTimeToSeconds(cl.timelineRange.start));
                  snapPoints.push(
                    rationalTimeToSeconds(cl.timelineRange.start) + rationalTimeToSeconds(cl.timelineRange.duration)
                  );
                }
              });
            });

            const durSec = rationalTimeToSeconds(activeDrag.initialDuration);
            let snapped = false;
            for (const sp of snapPoints) {
              if (Math.abs(targetSec - sp) < 0.15) {
                targetSec = sp;
                setSnapLineSec(sp);
                snapped = true;
                break;
              }
              if (Math.abs(targetSec + durSec - sp) < 0.15) {
                targetSec = sp - durSec;
                setSnapLineSec(sp);
                snapped = true;
                break;
              }
            }
            if (!snapped) setSnapLineSec(null);
          }

          const targetTime = secondsToRationalTime(targetSec);
          const found = timelineEngine.findClip(activeDrag.clipId);
          if (found) {
            found.clip.timelineRange = {
              start: targetTime,
              duration: found.clip.timelineRange.duration,
            };
            projectService.setProject({ ...project });
          }
        } else if (activeDrag.type === 'trim-left') {
          const initStartSec = rationalTimeToSeconds(activeDrag.initialTimelineStart);
          const initDurSec = rationalTimeToSeconds(activeDrag.initialDuration);
          const deltaClamped = Math.max(-initStartSec, Math.min(initDurSec - 0.2, deltaSec));

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

  // Generate ruler tick marks: 00:00, 00:10, 00:20...
  const rulerTicks = [];
  const tickIntervalSec = 10;
  for (let sec = 0; sec <= sequenceDurationSec; sec += tickIntervalSec) {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    const label = `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    rulerTicks.push({ sec, label, left: sec * timelineZoom });
  }

  // Get asset thumbnail for clip
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
      className="flex flex-col h-full bg-[#080a10] select-none overflow-hidden"
    >
      {/* Main Track Workspace (Header Column + Scrollable Tracks) */}
      <div className="flex-1 flex overflow-hidden">
        {/* 1. Track Headers Column */}
        <div className="w-52 bg-[#090b14] border-r border-zinc-800/80 shrink-0 flex flex-col z-10">
          {/* Top ruler placeholder */}
          <div className="h-7 border-b border-zinc-800/80 bg-zinc-950/90 px-3 flex items-center justify-between text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
            <span>TRACKS</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleAddTrack('video')}
                className="text-purple-400 hover:text-purple-300 font-bold px-1"
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
              const trackShort = isVideo ? `V${sequence.tracks.length - idx}` : `A${idx - 2}`;

              return (
                <React.Fragment key={track.id}>
                  <div
                    className="h-16 border-b border-zinc-800/70 px-3 flex items-center justify-between bg-zinc-950/40 hover:bg-zinc-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-5 rounded flex items-center justify-center font-bold text-[10px] text-white ${
                          isVideo ? 'bg-purple-600' : 'bg-emerald-600'
                        }`}
                      >
                        {isVideo ? `V${3 - idx}` : `A${idx - 2}`}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-zinc-200">{track.name}</span>
                        <span className="text-[9px] text-zinc-500 font-mono uppercase">{track.kind}</span>
                      </div>
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
                          {track.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-600" />}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            track.muted = !track.muted;
                            projectService.setProject({ ...project });
                          }}
                          className="hover:text-zinc-100"
                        >
                          {track.muted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      <button
                        onClick={() => {
                          track.locked = !track.locked;
                          projectService.setProject({ ...project });
                        }}
                        className="hover:text-zinc-100"
                      >
                        {track.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Performance Diagnostics Widget inside track header column */}
                  {idx === 2 && (
                    <div className="p-2 border-b border-zinc-800/80 bg-[#0d0f1c] text-[10px] space-y-1">
                      <div className="flex items-center justify-between text-zinc-400 font-semibold">
                        <span>Performance</span>
                        <ChevronDown className="w-3 h-3 text-zinc-500" />
                      </div>
                      <div className="flex items-center justify-between text-zinc-300 font-mono text-[9px]">
                        <span>GPU 78%</span>
                        <span className="text-zinc-500">6.4 GB</span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-300 font-mono text-[9px]">
                        <span>CPU 33%</span>
                        <span className="text-zinc-500">2.1 GB</span>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-semibold text-emerald-400 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Realtime Preview</span>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* 2. Scrollable Tracks & Ruler Stage */}
        <div
          ref={rulerRef}
          className="flex-1 overflow-x-auto overflow-y-auto relative bg-[#090a12]"
          onClick={() => setSelectedClipId(null)}
        >
          <div style={{ width: totalTimelineWidthPx }} className="relative min-h-full">
            {/* Interactive Time Ruler */}
            <div
              className="h-7 border-b border-zinc-800/80 bg-zinc-950 relative cursor-pointer select-none"
              onMouseDown={handleRulerMouseDown}
            >
              {rulerTicks.map((tick) => (
                <div
                  key={tick.sec}
                  className="absolute top-0 bottom-0 flex flex-col justify-between"
                  style={{ left: tick.left }}
                >
                  <span className="text-[10px] font-mono text-zinc-400 font-bold pl-1">{tick.label}</span>
                  <div className="w-[1px] h-2 bg-zinc-700" />
                </div>
              ))}
            </div>

            {/* Track Lanes */}
            <div className="relative">
              {sequence.tracks.map((track, trackIdx) => (
                <div
                  key={track.id}
                  onDragOver={(e) => e.preventDefault()}
                  className={`h-16 border-b border-zinc-800/60 relative transition-colors ${
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
                        className={`absolute top-1.5 bottom-1.5 rounded-xl overflow-hidden cursor-move transition-shadow flex items-center justify-between group select-none shadow-md ${
                          clip.type === 'audio'
                            ? 'bg-[#0f1f18] border border-emerald-500/70 text-white shadow-emerald-950/40'
                            : clip.type === 'adjustment'
                            ? 'bg-gradient-to-r from-cyan-900 via-indigo-900 to-purple-900 border border-cyan-400 text-white'
                            : 'bg-[#181a2e] border border-purple-500/80 text-white shadow-purple-950/40'
                        } ${isSelected ? 'ring-2 ring-purple-400 shadow-lg shadow-purple-500/40' : ''}`}
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
                          <div className="absolute inset-0 opacity-70 pointer-events-none flex items-center px-1">
                            <svg className="w-full h-8" preserveAspectRatio="none" viewBox="0 0 100 20">
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
                          className="w-2 h-full bg-white/20 hover:bg-white/60 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shrink-0 z-20"
                        >
                          <div className="w-[1px] h-3 bg-white" />
                        </div>

                        {/* Clip Content Label & Badges */}
                        <div className="flex-1 px-2 overflow-hidden flex flex-col justify-center z-10">
                          <div className="flex items-center space-x-1.5 truncate">
                            <span className="text-[11px] font-bold truncate text-white drop-shadow-md">
                              {clip.name}
                            </span>

                            {clip.effects && clip.effects.length > 0 && (
                              <span className="px-1 py-0.2 bg-purple-600 text-white rounded text-[8px] font-bold shadow-xs">
                                FX
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] font-mono text-zinc-300 drop-shadow">
                            {durSec.toFixed(1)}s
                          </span>
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
                          className="w-2 h-full bg-white/20 hover:bg-white/60 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shrink-0 z-20"
                        >
                          <div className="w-[1px] h-3 bg-white" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Floating Motion Tracking Active Badge at 00:40 on timeline */}
              <div
                style={{ left: 40 * timelineZoom, top: 4 }}
                className="absolute z-20 pointer-events-none px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur-md border border-purple-500 text-purple-300 text-[10px] font-bold shadow-xl shadow-purple-500/20 flex items-center gap-1.5 animate-pulse"
              >
                <Crosshair className="w-3.5 h-3.5 text-purple-400" />
                <span>Motion Track Active</span>
              </div>
            </div>

            {/* Snapping Visual Guideline */}
            {snapLineSec !== null && (
              <div
                style={{ left: snapLineSec * timelineZoom }}
                className="absolute top-0 bottom-0 w-[2px] bg-amber-400 z-30 pointer-events-none shadow-sm shadow-amber-400"
              />
            )}

            {/* Playhead Needle */}
            <div
              style={{ left: currentTimeSec * timelineZoom }}
              className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-40 pointer-events-none flex flex-col items-center"
            >
              {/* Playhead Header Cap */}
              <div className="w-4 h-4 bg-red-500 rotate-45 -mt-1.5 shadow-lg shadow-red-500/60 rounded-xs" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Timeline Control & Zoom Bar */}
      <div className="h-8 bg-[#090b14] border-t border-zinc-800/80 px-3 flex items-center justify-between shrink-0 text-xs select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSplitAtPlayhead}
            className="flex items-center gap-1 text-[11px] font-medium text-zinc-300 hover:text-white"
          >
            <Scissors className="w-3 h-3 text-purple-400" />
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
            className="w-24 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
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
