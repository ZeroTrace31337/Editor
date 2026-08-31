/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useEditor } from '../context/EditorContext';
import { ExportSettings } from '../../rendering/export/CanvasVideoExporter';
import { Download, X, Film, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const ExportModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { project, exporter } = useEditor();

  const [resolution, setResolution] = useState<'720p' | '1080p' | '1440p' | '4k'>('1080p');
  const [fps, setFps] = useState<number>(30);
  const [bitrateMode, setBitrateMode] = useState<'ultra' | 'high' | 'standard'>('high');
  const [filename, setFilename] = useState<string>(
    `${project.metadata.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_rendered`
  );

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [exportedBlobUrl, setExportedBlobUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setErrorMsg(null);
    setExportedBlobUrl(null);

    let width = 1920;
    let height = 1080;
    if (resolution === '720p') {
      width = 1280;
      height = 720;
    } else if (resolution === '1080p') {
      width = 1920;
      height = 1080;
    } else if (resolution === '1440p') {
      width = 2560;
      height = 1440;
    } else if (resolution === '4k') {
      width = 3840;
      height = 2160;
    }

    // Handle aspect ratio
    if (project.settings.aspectRatio === '9:16') {
      const temp = width;
      width = height;
      height = temp;
    } else if (project.settings.aspectRatio === '1:1') {
      height = width;
    }

    const settings: ExportSettings = {
      width,
      height,
      fps,
      format: 'video/webm',
      filename,
    };

    try {
      const blob = await exporter.exportVideo(project, settings, (p, text) => {
        setProgress(p);
        setStatusText(text);
      });

      const url = URL.createObjectURL(blob);
      setExportedBlobUrl(url);

      // Auto trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      setErrorMsg(err.message || 'Video export encountered an error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCancelExport = () => {
    exporter.cancel();
    setIsExporting(false);
    setStatusText('Export cancelled');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs select-none p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Export Timeline Composition</h3>
              <p className="text-[10px] text-zinc-500">Master rendering with hardware acceleration</p>
            </div>
          </div>
          {!isExporting && (
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-800/80 flex items-center gap-2 text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {exportedBlobUrl && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Export succeeded! Your video file was downloaded.</span>
            </div>
          )}

          {!isExporting && !exportedBlobUrl && (
            <>
              {/* File Name */}
              <div className="space-y-1.5">
                <label className="text-zinc-400 font-medium">Output Filename</label>
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />
              </div>

              {/* Resolution Options */}
              <div className="space-y-1.5">
                <label className="text-zinc-400 font-medium">Resolution</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: '720p', label: '720p HD' },
                    { id: '1080p', label: '1080p FHD' },
                    { id: '1440p', label: '2K QHD' },
                    { id: '4k', label: '4K UHD' },
                  ].map((res) => (
                    <button
                      key={res.id}
                      onClick={() => setResolution(res.id as any)}
                      className={`py-2 rounded-lg border text-center transition-all ${
                        resolution === res.id
                          ? 'border-indigo-500 bg-indigo-950/40 text-white font-semibold'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {res.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frame Rate Options */}
              <div className="space-y-1.5">
                <label className="text-zinc-400 font-medium">Frame Rate</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { fps: 24, label: '24 (Cinema)' },
                    { fps: 25, label: '25 (PAL)' },
                    { fps: 30, label: '30 (Web)' },
                    { fps: 50, label: '50 (High)' },
                    { fps: 60, label: '60 (Smooth)' },
                  ].map((f) => (
                    <button
                      key={f.fps}
                      onClick={() => setFps(f.fps)}
                      className={`py-1.5 rounded-lg border text-center transition-all text-[11px] ${
                        fps === f.fps
                          ? 'border-indigo-500 bg-indigo-950/40 text-white font-semibold'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bitrate & Quality */}
              <div className="space-y-1.5">
                <label className="text-zinc-400 font-medium">Bitrate & Quality</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'standard', label: 'Standard (8 Mbps)' },
                    { id: 'high', label: 'High (16 Mbps)' },
                    { id: 'ultra', label: 'Ultra Cinema (32 Mbps)' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setBitrateMode(b.id as any)}
                      className={`py-1.5 rounded-lg border text-center transition-all text-[10px] ${
                        bitrateMode === b.id
                          ? 'border-indigo-500 bg-indigo-950/40 text-white font-semibold'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Progress Rendering Bar */}
          {isExporting && (
            <div className="space-y-3 py-4">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                  <span>{statusText || 'Rendering frame sequence...'}</span>
                </span>
                <span className="font-mono font-bold text-indigo-400">{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-150"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>


        {/* Footer */}
        <div className="px-5 py-3 bg-zinc-900/60 border-t border-zinc-800 flex items-center justify-end gap-2">
          {isExporting ? (
            <button
              onClick={handleCancelExport}
              className="px-4 py-2 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          ) : exportedBlobUrl ? (
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleStartExport}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md shadow-indigo-600/30 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Start Export</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
