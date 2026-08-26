/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Disc,
  Video,
  Monitor,
  Mic,
  Settings,
  ArrowRight,
  StopCircle,
  Play,
  Sparkles,
} from 'lucide-react';

interface RecordStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRecording: (recordingName: string) => void;
}

export const RecordStudioModal: React.FC<RecordStudioModalProps> = ({
  isOpen,
  onClose,
  onSaveRecording,
}) => {
  const [recordMode, setRecordMode] = useState<'screen' | 'camera' | 'both'>('screen');
  const [isRecording, setIsRecording] = useState(false);
  const [secondsRecorded, setSecondsRecorded] = useState(0);
  const [micEnabled, setMicEnabled] = useState(true);

  if (!isOpen) return null;

  const handleToggleRecord = () => {
    if (!isRecording) {
      setIsRecording(true);
      setSecondsRecorded(0);
      const timer = setInterval(() => {
        setSecondsRecorded((prev) => prev + 1);
      }, 1000);
      (window as any).__recTimer = timer;
    } else {
      clearInterval((window as any).__recTimer);
      setIsRecording(false);
      onSaveRecording(`Studio_Recording_${new Date().toLocaleTimeString().replace(/:/g, '_')}.mp4`);
      onClose();
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#12141d] border border-zinc-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <Disc className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">CineFlow Record Studio</h2>
              <p className="text-xs text-zinc-400">Capture 4K 60fps screen, webcam & studio microphone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Mode Selector */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setRecordMode('screen')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                recordMode === 'screen'
                  ? 'bg-rose-500/10 border-rose-500/50 text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Monitor className="w-5 h-5 mb-1.5 text-cyan-400" />
              <span className="text-xs font-bold">Screen Only</span>
              <span className="text-[10px] text-zinc-400">4K Display</span>
            </button>

            <button
              onClick={() => setRecordMode('camera')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                recordMode === 'camera'
                  ? 'bg-rose-500/10 border-rose-500/50 text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Video className="w-5 h-5 mb-1.5 text-pink-400" />
              <span className="text-xs font-bold">Camera Only</span>
              <span className="text-[10px] text-zinc-400">HD Webcam</span>
            </button>

            <button
              onClick={() => setRecordMode('both')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                recordMode === 'both'
                  ? 'bg-rose-500/10 border-rose-500/50 text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-5 h-5 mb-1.5 text-purple-400" />
              <span className="text-xs font-bold">Screen + Cam</span>
              <span className="text-[10px] text-zinc-400">Picture in Picture</span>
            </button>
          </div>

          {/* Live Viewport Area */}
          <div className="relative aspect-video rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center">
            {isRecording ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-bold animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>RECORDING LIVE • {formatTime(secondsRecorded)}</span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono">1080p60 • Lossless WebM Stream</p>
              </div>
            ) : (
              <div className="text-center text-zinc-400">
                <Monitor className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
                <p className="text-xs font-medium">Ready to record display stream</p>
                <p className="text-[10px] text-zinc-400">Hardware accelerated encoder</p>
              </div>
            )}
          </div>

          {/* Audio Inputs */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <div className="flex items-center gap-2.5">
              <Mic className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="font-semibold text-zinc-200 block">Microphone Audio</span>
                <span className="text-[10px] text-zinc-400">Built-in Studio Microphone (Stereo 48kHz)</span>
              </div>
            </div>

            <button
              onClick={() => setMicEnabled(!micEnabled)}
              className={`px-3 py-1 rounded text-[11px] font-semibold transition ${
                micEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {micEnabled ? 'Enabled' : 'Muted'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-950/80 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition"
          >
            Cancel
          </button>

          <button
            onClick={handleToggleRecord}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-extrabold text-xs shadow-md transition active:scale-95 cursor-pointer ${
              isRecording
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30'
                : 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white shadow-rose-500/20'
            }`}
          >
            {isRecording ? (
              <>
                <StopCircle className="w-4 h-4" />
                <span>Stop Recording & Send to Timeline</span>
              </>
            ) : (
              <>
                <Disc className="w-4 h-4 animate-spin" />
                <span>Start Recording</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
