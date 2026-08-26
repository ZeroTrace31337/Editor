/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Crosshair,
  Play,
  Pause,
  RotateCcw,
  Target,
  Shield,
  Type,
  Layers,
  CheckCircle2,
  Sparkles,
  User,
  Smile,
  Maximize2,
  Plus,
  Trash2,
  Sliders,
  Compass,
  ArrowRight,
  ArrowLeft,
  Key,
} from 'lucide-react';
import { useEditor } from '../context/EditorContext';
import { TrackingEngine } from '../../engine/tracking/TrackingEngine';
import {
  TrackingData,
  TrackingMode,
  TrackingAccuracy,
  TrackingTargetType,
} from '../../engine/tracking/TrackingTypes';
import { rationalTimeToSeconds } from '../../core/time/RationalTime';

export const TrackingPanel: React.FC = () => {
  const { selectedClip, currentTime, project, projectService } = useEditor();
  const trackingEngine = TrackingEngine.getInstance();

  const [activeTrackId, setActiveTrackId] = useState<string | undefined>(undefined);
  const [progress, setProgress] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    return trackingEngine.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, [trackingEngine]);

  if (!selectedClip) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500">
        <Crosshair className="w-10 h-10 mb-2 opacity-40 text-cyan-400" />
        <p className="text-sm font-medium">Select a video or image clip on the timeline to enable Motion Tracking.</p>
      </div>
    );
  }

  const tracks = trackingEngine.getTracksForClip(selectedClip.id);
  const activeTrack = tracks.find((t) => t.id === activeTrackId) || tracks[0];

  const handleCreateTrack = (mode: TrackingMode = 'object') => {
    const newTrack = trackingEngine.createTrack(selectedClip.id, undefined, mode, 'high');
    setActiveTrackId(newTrack.id);
  };

  const handleStartAnalysis = async (direction: 'forward' | 'backward') => {
    if (!selectedClip || !activeTrack) return;
    setIsAnalyzing(true);
    const durSec = rationalTimeToSeconds(selectedClip.timelineRange.duration);
    await trackingEngine.analyzeTrack(selectedClip.id, direction, durSec, 30, (p) => setProgress(p), activeTrack.id);
    setIsAnalyzing(false);
  };

  const handlePause = () => {
    trackingEngine.pause();
    setIsAnalyzing(false);
  };

  const handleDeleteActiveTrack = () => {
    if (!selectedClip || !activeTrack) return;
    trackingEngine.deleteTrack(selectedClip.id, activeTrack.id);
    setActiveTrackId(undefined);
  };

  const currentSec = rationalTimeToSeconds(currentTime);
  const currentPt = activeTrack ? trackingEngine.evaluateTrackAtTime(selectedClip.id, currentSec, activeTrack.id) : null;

  // Find other clips on timeline (for attachment)
  const otherClips = project.sequences[0]?.tracks
    .flatMap((t) => t.clips)
    .filter((c) => c.id !== selectedClip.id) || [];

  return (
    <div className="flex flex-col gap-4 p-3 text-zinc-300 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Motion Tracking Deck
          </h3>
        </div>
        {activeTrack && (
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              activeTrack.status === 'completed'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : activeTrack.status.startsWith('tracking')
                ? 'bg-cyan-500/20 text-cyan-300 animate-pulse border border-cyan-500/30'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {activeTrack.status.replace('_', ' ').toUpperCase()}
          </span>
        )}
      </div>

      {/* Multi-Track Tabs / List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-zinc-400">Clip Motion Tracks</span>
          <button
            onClick={() => handleCreateTrack('object')}
            className="flex items-center gap-1 px-2 py-0.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded border border-cyan-500/30 text-[10px] font-bold transition"
          >
            <Plus className="w-3 h-3" />
            <span>Add Track</span>
          </button>
        </div>

        {tracks.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tracks.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTrackId(t.id)}
                className={`px-2.5 py-1 rounded border text-[11px] font-medium transition flex items-center gap-1.5 ${
                  activeTrack?.id === t.id
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {t.mode === 'face' ? (
                  <Smile className="w-3 h-3 text-amber-400" />
                ) : t.mode === 'person' ? (
                  <User className="w-3 h-3 text-purple-400" />
                ) : (
                  <Target className="w-3 h-3 text-cyan-400" />
                )}
                <span>{t.name}</span>
                <span className="text-[9px] opacity-60">({t.points.length} pts)</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-center space-y-2">
            <Target className="w-6 h-6 mx-auto text-zinc-500" />
            <p className="text-[11px] text-zinc-400">No tracks initialized for this clip.</p>
            <div className="flex justify-center gap-1.5 pt-1">
              <button
                onClick={() => handleCreateTrack('object')}
                className="px-2.5 py-1 rounded bg-cyan-500 text-black font-bold text-[10px] flex items-center gap-1"
              >
                <Target className="w-3 h-3" /> Object Track
              </button>
              <button
                onClick={() => handleCreateTrack('face')}
                className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-200 text-[10px] flex items-center gap-1"
              >
                <Smile className="w-3 h-3 text-amber-400" /> Face Track
              </button>
              <button
                onClick={() => handleCreateTrack('person')}
                className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-200 text-[10px] flex items-center gap-1"
              >
                <User className="w-3 h-3 text-purple-400" /> Person Track
              </button>
            </div>
          </div>
        )}
      </div>

      {activeTrack && (
        <div className="space-y-4 pt-2 border-t border-zinc-800">
          {/* Track Mode & Accuracy */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-zinc-400">Tracking Mode</span>
              <select
                value={activeTrack.mode}
                onChange={(e) =>
                  trackingEngine.updateTrack(selectedClip.id, activeTrack.id, {
                    mode: e.target.value as TrackingMode,
                  })
                }
                className="w-full bg-zinc-900 border border-zinc-800 rounded p-1 text-zinc-200 text-[11px] focus:outline-none focus:border-cyan-500"
              >
                <option value="object">Object Tracking</option>
                <option value="face">Face Tracking</option>
                <option value="person">Person / Body Tracking</option>
                <option value="point">Single Point Tracking</option>
                <option value="area">Area Feature Tracking</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-zinc-400">AI Accuracy</span>
              <select
                value={activeTrack.accuracy}
                onChange={(e) =>
                  trackingEngine.updateTrack(selectedClip.id, activeTrack.id, {
                    accuracy: e.target.value as TrackingAccuracy,
                  })
                }
                className="w-full bg-zinc-900 border border-zinc-800 rounded p-1 text-zinc-200 text-[11px] focus:outline-none focus:border-cyan-500"
              >
                <option value="draft">Draft (Ultra Fast)</option>
                <option value="standard">Standard Precision</option>
                <option value="high">High Optical Flow</option>
                <option value="ultra_ai">Ultra AI Deep Feature</option>
              </select>
            </div>
          </div>

          {/* Region of Interest (ROI) adjustments */}
          <div className="p-2.5 bg-zinc-900/80 rounded-lg border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-zinc-300">Target Region Box (ROI)</span>
              <button
                onClick={() =>
                  trackingEngine.updateROI(
                    selectedClip.id,
                    { x: 0.4, y: 0.4, width: 0.2, height: 0.2 },
                    activeTrack.id
                  )
                }
                className="text-[10px] text-cyan-400 hover:underline"
              >
                Reset Center
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-zinc-400">Box Center X:</span>{' '}
                <span className="text-zinc-200 font-mono">{(activeTrack.roi.x * 100).toFixed(0)}%</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={activeTrack.roi.x}
                  onChange={(e) =>
                    trackingEngine.updateROI(selectedClip.id, { x: parseFloat(e.target.value) }, activeTrack.id)
                  }
                  className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                />
              </div>
              <div>
                <span className="text-zinc-400">Box Center Y:</span>{' '}
                <span className="text-zinc-200 font-mono">{(activeTrack.roi.y * 100).toFixed(0)}%</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={activeTrack.roi.y}
                  onChange={(e) =>
                    trackingEngine.updateROI(selectedClip.id, { y: parseFloat(e.target.value) }, activeTrack.id)
                  }
                  className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="space-y-2">
            {isAnalyzing && (
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full transition-all duration-75"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            )}

            <div className="flex gap-1.5">
              <button
                disabled={isAnalyzing}
                onClick={() => handleStartAnalysis('backward')}
                className="flex-1 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition disabled:opacity-40"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Track Back</span>
              </button>

              <button
                disabled={isAnalyzing}
                onClick={() => handleStartAnalysis('forward')}
                className="flex-1 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black text-[11px] font-bold flex items-center justify-center gap-1 transition shadow-sm disabled:opacity-40"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Track Forward</span>
              </button>

              {isAnalyzing && (
                <button
                  onClick={handlePause}
                  className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Target Attachment */}
          <div className="p-3 bg-zinc-900/90 rounded-lg border border-zinc-800 space-y-3">
            <span className="text-[11px] font-semibold text-zinc-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Attach Layer to Follow Track
            </span>

            <div className="grid grid-cols-3 gap-1">
              {(['text', 'sticker', 'mask', 'blur', 'mosaic', 'effect'] as TrackingTargetType[]).map((type) => (
                <button
                  key={type}
                  onClick={() =>
                    trackingEngine.setTargetAttachment(
                      selectedClip.id,
                      type,
                      activeTrack.attachedClipId,
                      activeTrack.attachedMaskId,
                      activeTrack.id
                    )
                  }
                  className={`py-1 rounded border text-[10px] capitalize transition ${
                    activeTrack.targetType === type
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Link to specific clip on timeline */}
            {otherClips.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-zinc-400">Target Timeline Clip:</span>
                <select
                  value={activeTrack.attachedClipId || ''}
                  onChange={(e) => {
                    const targetId = e.target.value || undefined;
                    trackingEngine.setTargetAttachment(
                      selectedClip.id,
                      activeTrack.targetType || 'text',
                      targetId,
                      activeTrack.attachedMaskId,
                      activeTrack.id
                    );
                    // Also bind clip back-reference
                    if (targetId) {
                      const targetClip = otherClips.find((c) => c.id === targetId);
                      if (targetClip) {
                        targetClip.attachedToClipId = selectedClip.id;
                        targetClip.attachedToTrackId = activeTrack.id;
                        projectService.setProject({ ...project });
                      }
                    }
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-1 text-zinc-200 text-[11px] focus:outline-none focus:border-cyan-500"
                >
                  <option value="">None (Stand-alone Tracking Data)</option>
                  {otherClips.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.type.toUpperCase()}] {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Manual Keyframe & Drift Correction */}
          {currentPt && (
            <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-zinc-300 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-amber-400" /> Current Frame Track State
                </span>
                <span className="text-zinc-400 font-mono text-[10px]">{currentSec.toFixed(2)}s</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-300">
                <div>X: {(currentPt.x * 100).toFixed(1)}%</div>
                <div>Y: {(currentPt.y * 100).toFixed(1)}%</div>
                <div>Rot: {currentPt.rotation.toFixed(1)}°</div>
                <div>Scale: {currentPt.scale.toFixed(2)}x</div>
              </div>

              {/* Quick Nudge Buttons for Drift Correction */}
              <div className="space-y-1 pt-1 border-t border-zinc-800">
                <span className="text-[10px] text-zinc-400">Manual Nudge Keyframe Correction:</span>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    onClick={() =>
                      trackingEngine.addOrUpdateManualKeyframe(
                        selectedClip.id,
                        currentSec,
                        { x: currentPt.x - 0.01, y: currentPt.y },
                        activeTrack.id
                      )
                    }
                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] text-center"
                  >
                    ← Left
                  </button>
                  <button
                    onClick={() =>
                      trackingEngine.addOrUpdateManualKeyframe(
                        selectedClip.id,
                        currentSec,
                        { x: currentPt.x + 0.01, y: currentPt.y },
                        activeTrack.id
                      )
                    }
                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] text-center"
                  >
                    Right →
                  </button>
                  <button
                    onClick={() =>
                      trackingEngine.addOrUpdateManualKeyframe(
                        selectedClip.id,
                        currentSec,
                        { x: currentPt.x, y: currentPt.y - 0.01 },
                        activeTrack.id
                      )
                    }
                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] text-center"
                  >
                    ↑ Up
                  </button>
                  <button
                    onClick={() =>
                      trackingEngine.addOrUpdateManualKeyframe(
                        selectedClip.id,
                        currentSec,
                        { x: currentPt.x, y: currentPt.y + 0.01 },
                        activeTrack.id
                      )
                    }
                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] text-center"
                  >
                    Down ↓
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Track Button */}
          <div className="pt-2 border-t border-zinc-800 flex justify-end">
            <button
              onClick={handleDeleteActiveTrack}
              className="px-2.5 py-1 text-rose-400 hover:bg-rose-500/10 rounded border border-rose-500/30 text-[11px] font-medium transition flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete Track</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
