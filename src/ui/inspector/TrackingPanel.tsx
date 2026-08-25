/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Crosshair, Play, Pause, RotateCcw, Target, Shield, Type, Layers, CheckCircle2 } from 'lucide-react';
import { useEditor } from '../context/EditorContext';
import { TrackingEngine } from '../../engine/tracking/TrackingEngine';
import { TrackingData, TrackingMode, TrackingTargetType } from '../../engine/tracking/TrackingTypes';
import { rationalTimeToSeconds } from '../../core/time/RationalTime';

export const TrackingPanel: React.FC = () => {
  const { selectedClip, currentTime } = useEditor();
  const trackingEngine = TrackingEngine.getInstance();

  const [trackData, setTrackData] = useState<TrackingData | undefined>(
    selectedClip ? trackingEngine.getTrack(selectedClip.id) : undefined
  );
  const [progress, setProgress] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  useEffect(() => {
    return trackingEngine.subscribe(() => {
      if (selectedClip) {
        setTrackData(trackingEngine.getTrack(selectedClip.id));
      }
    });
  }, [selectedClip, trackingEngine]);

  if (!selectedClip) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500">
        <Crosshair className="w-10 h-10 mb-2 opacity-40" />
        <p className="text-sm font-medium">Select a video or image clip on the timeline to enable Motion Tracking.</p>
      </div>
    );
  }

  const handleCreateTrack = (mode: TrackingMode = 'object') => {
    const newTrack = trackingEngine.createTrack(selectedClip.id, `Track: ${selectedClip.name}`, mode);
    setTrackData(newTrack);
  };

  const handleStartAnalysis = async (direction: 'forward' | 'backward') => {
    if (!selectedClip) return;
    setIsAnalyzing(true);
    const durSec = rationalTimeToSeconds(selectedClip.timelineRange.duration);
    await trackingEngine.analyzeTrack(selectedClip.id, direction, durSec, 30, (p) => setProgress(p));
    setIsAnalyzing(false);
  };

  const handlePause = () => {
    trackingEngine.pause();
    setIsAnalyzing(false);
  };

  const handleClear = () => {
    if (!selectedClip) return;
    trackingEngine.clearTrack(selectedClip.id);
    setTrackData(undefined);
    setProgress(0);
  };

  const handleTargetChange = (type: TrackingTargetType) => {
    if (!selectedClip) return;
    trackingEngine.setTargetAttachment(selectedClip.id, type);
  };

  const currentFramePt = trackData
    ? trackingEngine.evaluateTrackAtTime(selectedClip.id, rationalTimeToSeconds(currentTime))
    : null;

  return (
    <div className="flex flex-col gap-5 p-4 text-zinc-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Motion Tracking Engine</h3>
        </div>
        {trackData && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              trackData.status === 'completed'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : trackData.status.startsWith('tracking')
                ? 'bg-amber-500/20 text-amber-300 animate-pulse border border-amber-500/30'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {trackData.status.toUpperCase()}
          </span>
        )}
      </div>

      {!trackData ? (
        <div className="flex flex-col items-center justify-center p-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/40 text-center gap-3">
          <Target className="w-8 h-8 text-indigo-400 opacity-60" />
          <div>
            <h4 className="text-sm font-semibold text-zinc-200">No Active Track</h4>
            <p className="text-xs text-zinc-400 max-w-xs mt-1">
              Analyze movement, camera pan, or subjects in this clip to automatically stick titles, masks, or privacy censors.
            </p>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => handleCreateTrack('object')}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition-all flex items-center gap-1.5"
            >
              <Target className="w-3.5 h-3.5" />
              Object Track
            </button>
            <button
              onClick={() => handleCreateTrack('point')}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Crosshair className="w-3.5 h-3.5" />
              Point Track
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Tracking Mode & ROI */}
          <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800/80 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">Track Type:</span>
              <span className="font-semibold text-indigo-400 capitalize">{trackData.mode} Tracking</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Region of Interest (ROI):</span>
                <span>
                  {Math.round(trackData.roi.width * 100)}% × {Math.round(trackData.roi.height * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-zinc-950 px-2.5 py-1.5 rounded border border-zinc-800/60 flex justify-between">
                  <span className="text-zinc-500">Center X</span>
                  <span className="font-mono text-zinc-300">{(trackData.roi.x * 100).toFixed(1)}%</span>
                </div>
                <div className="bg-zinc-950 px-2.5 py-1.5 rounded border border-zinc-800/60 flex justify-between">
                  <span className="text-zinc-500">Center Y</span>
                  <span className="font-mono text-zinc-300">{(trackData.roi.y * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Controls */}
          <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-200">Analysis Controls</span>
              <span className="text-zinc-400">{trackData.points.length} Keyframes</span>
            </div>

            {isAnalyzing && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>Tracking Progress</span>
                  <span>{Math.round(progress * 100)}%</span>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-75"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <button
                disabled={isAnalyzing}
                onClick={() => handleStartAnalysis('backward')}
                className="px-2 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 rounded text-xs font-medium flex items-center justify-center gap-1 transition-all"
              >
                ◀ Track Back
              </button>

              {isAnalyzing ? (
                <button
                  onClick={handlePause}
                  className="px-2 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold flex items-center justify-center gap-1 transition-all shadow"
                >
                  <Pause className="w-3.5 h-3.5" /> Pause
                </button>
              ) : (
                <button
                  onClick={() => handleStartAnalysis('forward')}
                  className="px-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold flex items-center justify-center gap-1 transition-all shadow"
                >
                  <Play className="w-3.5 h-3.5" /> Track Fwd ▶
                </button>
              )}

              <button
                onClick={handleClear}
                className="px-2 py-2 bg-zinc-800 hover:bg-rose-900/40 text-zinc-300 hover:text-rose-400 rounded text-xs font-medium flex items-center justify-center gap-1 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>
          </div>

          {/* Target Attachment */}
          <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-200">Attached Layer / Destination</span>
              {trackData.points.length > 0 && (
                <div className="flex items-center gap-1 text-emerald-400 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleTargetChange('text')}
                className={`p-2 rounded border text-xs font-medium flex items-center gap-2 transition-all ${
                  trackData.targetType === 'text'
                    ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                    : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Type className="w-4 h-4 text-indigo-400" />
                <span>Text / Title</span>
              </button>

              <button
                onClick={() => handleTargetChange('blur')}
                className={`p-2 rounded border text-xs font-medium flex items-center gap-2 transition-all ${
                  trackData.targetType === 'blur'
                    ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                    : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Shield className="w-4 h-4 text-indigo-400" />
                <span>Blur / Censor</span>
              </button>

              <button
                onClick={() => handleTargetChange('mosaic')}
                className={`p-2 rounded border text-xs font-medium flex items-center gap-2 transition-all ${
                  trackData.targetType === 'mosaic'
                    ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                    : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Pixel Censor</span>
              </button>

              <button
                onClick={() => handleTargetChange('mask')}
                className={`p-2 rounded border text-xs font-medium flex items-center gap-2 transition-all ${
                  trackData.targetType === 'mask'
                    ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                    : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Crosshair className="w-4 h-4 text-indigo-400" />
                <span>Follow Mask</span>
              </button>
            </div>
          </div>

          {/* Current Frame Readout */}
          {currentFramePt && (
            <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800/80 font-mono text-[11px] text-zinc-400 space-y-1">
              <div className="flex justify-between">
                <span>Evaluated X/Y:</span>
                <span className="text-zinc-200">
                  {(currentFramePt.x * 100).toFixed(1)}%, {(currentFramePt.y * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Rotation / Scale:</span>
                <span className="text-zinc-200">
                  {currentFramePt.rotation.toFixed(1)}° / {(currentFramePt.scale * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tracking Confidence:</span>
                <span className="text-emerald-400">{(currentFramePt.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
