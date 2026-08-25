/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Film,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Plus,
  Trash2,
  RotateCcw,
  Zap,
  HardDrive,
  Cpu,
  Layers,
} from 'lucide-react';
import { useEditor } from '../context/EditorContext';
import { RenderQueueManager, RenderJob, ExportFormatPreset } from '../../rendering/export/RenderQueueManager';
import { COMMON_FRAME_RATES } from '../../core/time/RationalTime';

export const DeliverWorkspaceView: React.FC = () => {
  const { project, timelineEngine, compositor } = useEditor();
  const queueManager = RenderQueueManager.getInstance();

  const [jobs, setJobs] = useState<RenderJob[]>(queueManager.getJobs());
  const [jobName, setJobName] = useState<string>(`${project.metadata.name}_Master`);
  const [preset, setPreset] = useState<ExportFormatPreset>('mp4_h264');
  const [resolutionPreset, setResolutionPreset] = useState<'4k' | '1080p' | '720p' | 'vertical'>('1080p');
  const [fps, setFps] = useState<number>(30);
  const [bitrateMbps, setBitrateMbps] = useState<number>(16);
  const [useProxies, setUseProxies] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(false);

  useEffect(() => {
    return queueManager.subscribe(() => {
      setJobs([...queueManager.getJobs()]);
    });
  }, [queueManager]);

  const handleAddJob = () => {
    let width = 1920;
    let height = 1080;
    if (resolutionPreset === '4k') {
      width = 3840;
      height = 2160;
    } else if (resolutionPreset === '720p') {
      width = 1280;
      height = 720;
    } else if (resolutionPreset === 'vertical') {
      width = 1080;
      height = 1920;
    }

    queueManager.addJob(jobName, preset, width, height, fps, bitrateMbps, useProxies);
    setJobName(`${project.metadata.name}_Job_${jobs.length + 2}`);
  };

  const handleStartRender = async () => {
    setIsRendering(true);
    await queueManager.processQueue(project, timelineEngine, compositor);
    setIsRendering(false);
  };

  return (
    <div className="flex-1 grid grid-cols-12 gap-5 p-5 bg-zinc-950 text-zinc-200 overflow-y-auto">
      {/* Left Column: Job Configuration Panel */}
      <div className="col-span-5 flex flex-col gap-4 bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-5 shadow-xl">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          <Film className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-semibold text-zinc-100">Export & Render Settings</h2>
        </div>

        <div className="space-y-4 text-xs">
          {/* File Name */}
          <div>
            <label className="block text-zinc-400 font-medium mb-1">Render Job Name</label>
            <input
              type="text"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Format Preset */}
          <div>
            <label className="block text-zinc-400 font-medium mb-1">Format & Codec Preset</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'mp4_h264', label: 'MP4 (H.264 High Profile)' },
                { id: 'webm_vp9', label: 'WebM (VP9 Studio Web)' },
                { id: 'mov_prores', label: 'QuickTime (Apple ProRes 422)' },
                { id: 'audio_wav', label: 'Waveform Master (24-bit PCM)' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setPreset(fmt.id as ExportFormatPreset)}
                  className={`p-2.5 rounded-lg border text-left font-medium transition-all ${
                    preset === fmt.id
                      ? 'border-indigo-500 bg-indigo-950/50 text-white'
                      : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution Preset */}
          <div>
            <label className="block text-zinc-400 font-medium mb-1">Master Resolution</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: '4k', label: '4K UHD (3840×2160)' },
                { id: '1080p', label: '1080p FHD (1920×1080)' },
                { id: '720p', label: '720p HD (1280×720)' },
                { id: 'vertical', label: '9:16 Vertical (1080×1920)' },
              ].map((res) => (
                <button
                  key={res.id}
                  onClick={() => setResolutionPreset(res.id as any)}
                  className={`p-2 rounded-lg border text-center font-medium transition-all ${
                    resolutionPreset === res.id
                      ? 'border-indigo-500 bg-indigo-950/50 text-white'
                      : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {res.label}
                </button>
              ))}
            </div>
          </div>

          {/* FPS and Bitrate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 font-medium mb-1">Frame Rate (FPS)</label>
              <select
                value={fps}
                onChange={(e) => setFps(parseInt(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                <option value={24}>24.00 fps (Cinematic)</option>
                <option value={25}>25.00 fps (PAL)</option>
                <option value={30}>30.00 fps (Standard NTSC)</option>
                <option value={60}>60.00 fps (Smooth / Gaming)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-zinc-400 font-medium mb-1">
                <span>Target Bitrate</span>
                <span className="font-mono text-zinc-200">{bitrateMbps} Mbps</span>
              </div>
              <input
                type="range"
                min="4"
                max="80"
                step="2"
                value={bitrateMbps}
                onChange={(e) => setBitrateMbps(parseInt(e.target.value))}
                className="w-full accent-indigo-500 mt-2"
              />
            </div>
          </div>

          {/* Proxy toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
            <div>
              <span className="font-semibold text-zinc-200 block">Fast Proxy Export</span>
              <span className="text-[11px] text-zinc-400">
                Uses proxy media for lightning fast draft exports. Turn off for final master quality.
              </span>
            </div>
            <input
              type="checkbox"
              checked={useProxies}
              onChange={(e) => setUseProxies(e.target.checked)}
              className="w-4 h-4 accent-indigo-500 rounded"
            />
          </div>

          {/* Add Job Button */}
          <button
            onClick={handleAddJob}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all mt-2"
          >
            <Plus className="w-4 h-4" />
            Add to Render Queue
          </button>
        </div>
      </div>

      {/* Right Column: Render Queue & Live Stage Monitor */}
      <div className="col-span-7 flex flex-col gap-4 bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Render Queue ({jobs.length} Jobs)</h2>
          </div>

          <button
            disabled={isRendering || jobs.filter((j) => j.status === 'queued').length === 0}
            onClick={handleStartRender}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
          >
            <Play className="w-3.5 h-3.5" />
            {isRendering ? 'Rendering in Progress...' : 'Render All Jobs'}
          </button>
        </div>

        {jobs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-zinc-800 rounded-xl text-center text-zinc-500 gap-2">
            <Film className="w-8 h-8 opacity-40" />
            <p className="text-sm font-medium">Render queue is empty.</p>
            <p className="text-xs text-zinc-600">Configure export parameters on the left and click "Add to Render Queue".</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                      {job.name}
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                        {job.resolution.width}×{job.resolution.height} @ {job.fps}fps
                      </span>
                    </h4>
                    <span className="text-xs text-zinc-400">{job.preset.toUpperCase()} • {job.bitrateMbps} Mbps</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        job.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : job.status === 'rendering'
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse'
                          : job.status === 'failed'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {job.status.toUpperCase()}
                    </span>

                    {job.status === 'completed' && job.outputUrl && (
                      <a
                        href={job.outputUrl}
                        download={`${job.name}.mp4`}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1 shadow"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    )}

                    <button
                      onClick={() => queueManager.deleteJob(job.id)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 rounded hover:bg-zinc-900 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar and pipeline stages */}
                {job.status === 'rendering' && (
                  <div className="space-y-2 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span className="flex items-center gap-1 font-semibold text-indigo-400 capitalize">
                        <Zap className="w-3.5 h-3.5" /> Stage: {job.currentStage}...
                      </span>
                      <span className="font-mono">
                        {Math.round(job.progress * 100)}% • {job.renderFps} FPS • ETA {job.estimatedRemainingSec}s
                      </span>
                    </div>

                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all duration-100"
                        style={{ width: `${job.progress * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
