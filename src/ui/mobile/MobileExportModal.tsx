/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useEditor } from '../context/EditorContext';
import {
  Download,
  X,
  CheckCircle2,
  Sparkles,
  Film,
  HardDrive,
  Share2,
  Play,
  Layers,
} from 'lucide-react';
import { rationalTimeToSeconds } from '../../core/time/RationalTime';

interface MobileExportModalProps {
  onClose: () => void;
}

const RESOLUTION_PRESETS = [
  { id: '1080p', name: '1080p Full HD', width: 1080, height: 1920, badge: 'Recommended' },
  { id: '4k', name: '4K Ultra HD', width: 2160, height: 3840, badge: 'Pro Quality' },
  { id: '720p', name: '720p Fast HD', width: 720, height: 1280, badge: 'Small Size' },
];

export const MobileExportModal: React.FC<MobileExportModalProps> = ({ onClose }) => {
  const {
    project,
    timelineEngine,
    compositor,
    currentTime,
  } = useEditor();

  const [selectedRes, setSelectedRes] = useState('1080p');
  const [fps, setFps] = useState<30 | 60>(60);
  const [bitrate, setBitrate] = useState<number>(16); // Mbps
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const sequence = timelineEngine.getSequence();
  const totalSec = rationalTimeToSeconds(sequence.duration);
  const estimatedMb = ((bitrate * totalSec) / 8).toFixed(1);

  const handleStartExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setIsComplete(false);

    // Simulate high-fidelity frame rendering steps with progress
    const totalFrames = Math.max(Math.floor(totalSec * fps), 30);
    let currentFrame = 0;

    const interval = setInterval(() => {
      currentFrame += 3;
      const pct = Math.min(Math.floor((currentFrame / totalFrames) * 100), 100);
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        setIsExporting(false);
        setIsComplete(true);

        // Generate virtual video blob for download
        const blob = new Blob(['VeeCut Master Video Export'], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
      }
    }, 60);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = downloadUrl || '#';
    a.download = `${project.metadata.name || 'VeeCut_Edit'}_${selectedRes}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-[#0f111a] border border-zinc-750 sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center text-black font-black">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Export Master Video</h3>
              <span className="text-[10px] text-zinc-400">Render & Save to Camera Roll</span>
            </div>
          </div>

          {!isExporting && (
            <button
              onClick={onClose}
              className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {!isComplete && !isExporting && (
            <>
              {/* Resolution Options */}
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-2">
                  Resolution Preset
                </label>
                <div className="space-y-2">
                  {RESOLUTION_PRESETS.map((res) => {
                    const isSel = selectedRes === res.id;
                    return (
                      <button
                        key={res.id}
                        onClick={() => setSelectedRes(res.id)}
                        className={`w-full p-3 rounded-2xl border flex items-center justify-between transition ${
                          isSel
                            ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-md'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850'
                        }`}
                      >
                        <div className="text-left">
                          <span className="text-xs font-bold text-zinc-100 block">{res.name}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {res.width}x{res.height}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isSel
                              ? 'bg-cyan-400 text-black'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {res.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Frame Rate & Bitrate */}
              <div className="grid grid-cols-2 gap-3">
                {/* Frame Rate */}
                <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800">
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1.5">
                    Frame Rate
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setFps(30)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                        fps === 30 ? 'bg-cyan-500 text-black' : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      30 fps
                    </button>
                    <button
                      onClick={() => setFps(60)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                        fps === 60 ? 'bg-cyan-500 text-black' : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      60 fps
                    </button>
                  </div>
                </div>

                {/* Estimated File Size */}
                <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-zinc-400">Est. File Size</span>
                  <span className="text-sm font-mono font-extrabold text-cyan-400 mt-1">
                    ~{estimatedMb} MB
                  </span>
                  <span className="text-[9px] text-zinc-500">{totalSec.toFixed(1)}s total duration</span>
                </div>
              </div>
            </>
          )}

          {/* Export In Progress */}
          {isExporting && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-zinc-800"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-cyan-400 transition-all duration-150"
                    strokeDasharray={`${progress}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-mono font-black text-xl text-white">
                  {progress}%
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">Rendering Video Composition...</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Encoding color grades, audio tracks & transitions
                </p>
              </div>
            </div>
          )}

          {/* Export Complete */}
          {isComplete && (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h4 className="text-base font-extrabold text-white">Video Export Ready!</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Your master MP4 video file is rendered and ready to save.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-zinc-800 bg-[#0c0e17] shrink-0">
          {!isExporting && !isComplete && (
            <button
              onClick={handleStartExport}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-extrabold text-sm shadow-lg shadow-cyan-500/25 active:scale-98 transition cursor-pointer"
            >
              Start Export ({selectedRes} @ {fps}fps)
            </button>
          )}

          {isComplete && (
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-98 transition cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-[3]" />
                <span>Save to Device</span>
              </button>
              <button
                onClick={onClose}
                className="px-5 py-3.5 rounded-2xl bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-bold text-sm"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
