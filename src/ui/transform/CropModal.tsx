/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Crop,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Check,
  RotateCcw,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { useEditor } from '../context/EditorContext';
import { UpdateTransformCommand } from '../../engine/command/implementations/UpdateTransformCommand';
import { CropRect, Transform2D } from '../../core/math/Transform2D';

interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ASPECT_PRESETS: { id: string; label: string; ratio?: number }[] = [
  { id: 'free', label: 'Free' },
  { id: '16:9', label: '16:9 (Landscape)', ratio: 16 / 9 },
  { id: '9:16', label: '9:16 (TikTok/Reels)', ratio: 9 / 16 },
  { id: '1:1', label: '1:1 (Square)', ratio: 1.0 },
  { id: '4:5', label: '4:5 (Instagram)', ratio: 4 / 5 },
  { id: '4:3', label: '4:3 (Standard)', ratio: 4 / 3 },
  { id: '21:9', label: '21:9 (Cinematic)', ratio: 21 / 9 },
];

export const CropModal: React.FC<CropModalProps> = ({ isOpen, onClose }) => {
  const { selectedClip, timelineEngine, commandManager, project, projectService } = useEditor();

  const [activePreset, setActivePreset] = useState<string>('free');
  const [crop, setCrop] = useState<CropRect>({ left: 0, top: 0, right: 0, bottom: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (selectedClip && isOpen) {
      const tr = (selectedClip.transform || {}) as Transform2D;
      setCrop(tr.crop || { left: 0, top: 0, right: 0, bottom: 0 });
      setRotation(tr.rotation || 0);
      setFlipH(tr.flipH || false);
      setFlipV(tr.flipV || false);
    }
  }, [selectedClip, isOpen]);

  // Real-time mini canvas renderer for crop preview
  useEffect(() => {
    if (!isOpen || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background checkerboard
    ctx.fillStyle = '#181824';
    ctx.fillRect(0, 0, w, h);

    // Draw frame simulation
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    const pad = 24;
    const boxW = w - pad * 2;
    const boxH = h - pad * 2;

    // Outer media rect
    ctx.fillStyle = '#2e1065';
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
    ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

    // Active cropped area inside
    const cropX = -boxW / 2 + boxW * crop.left;
    const cropY = -boxH / 2 + boxH * crop.top;
    const cropW = Math.max(4, boxW * (1 - crop.left - crop.right));
    const cropH = Math.max(4, boxH * (1 - crop.top - crop.bottom));

    ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2.5;
    ctx.fillRect(cropX, cropY, cropW, cropH);
    ctx.strokeRect(cropX, cropY, cropW, cropH);

    // Grid rule-of-thirds lines inside cropped area
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(cropX + cropW / 3, cropY);
    ctx.lineTo(cropX + cropW / 3, cropY + cropH);
    ctx.moveTo(cropX + (cropW * 2) / 3, cropY);
    ctx.lineTo(cropX + (cropW * 2) / 3, cropY + cropH);

    ctx.moveTo(cropX, cropY + cropH / 3);
    ctx.lineTo(cropX + cropW, cropY + cropH / 3);
    ctx.moveTo(cropX, cropY + (cropH * 2) / 3);
    ctx.lineTo(cropX + cropW, cropY + (cropH * 2) / 3);
    ctx.stroke();

    ctx.restore();
  }, [isOpen, crop, rotation, flipH, flipV]);

  if (!isOpen || !selectedClip) return null;

  const handleApplyPreset = (presetId: string) => {
    setActivePreset(presetId);
    const preset = ASPECT_PRESETS.find((p) => p.id === presetId);
    if (!preset || !preset.ratio) {
      setCrop({ left: 0, top: 0, right: 0, bottom: 0 });
      return;
    }

    const currentAspect = 16 / 9;
    const targetAspect = preset.ratio;

    if (targetAspect < currentAspect) {
      // Taller (e.g. 9:16 or 1:1) -> Crop sides
      const visibleWFraction = targetAspect / currentAspect;
      const sideCrop = Math.max(0, (1 - visibleWFraction) / 2);
      setCrop({ left: sideCrop, top: 0, right: sideCrop, bottom: 0 });
    } else {
      // Wider (e.g. 21:9) -> Crop top/bottom
      const visibleHFraction = currentAspect / targetAspect;
      const topCrop = Math.max(0, (1 - visibleHFraction) / 2);
      setCrop({ left: 0, top: topCrop, right: 0, bottom: topCrop });
    }
  };

  const handleSave = () => {
    const newTrans: Transform2D = {
      ...(selectedClip.transform || {
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        anchor: { x: 0.5, y: 0.5 },
      }),
      crop,
      rotation,
      flipH,
      flipV,
    };

    const cmd = new UpdateTransformCommand(timelineEngine, selectedClip.id, newTrans);
    commandManager.execute(cmd).then(() => {
      projectService.setProject({ ...project });
      onClose();
    });
  };

  const handleReset = () => {
    setCrop({ left: 0, top: 0, right: 0, bottom: 0 });
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setActivePreset('free');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-[#0e101c] border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col text-xs text-zinc-300">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-[#111324]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Crop & Resize Clip</h3>
              <p className="text-[11px] text-zinc-400 truncate max-w-xs">{selectedClip.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Preset Buttons */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Aspect Ratio Presets
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {ASPECT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleApplyPreset(p.id)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition ${
                    activePreset === p.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  {p.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Preview Canvas */}
          <div className="flex justify-center">
            <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-black/60 shadow-inner">
              <canvas
                ref={previewCanvasRef}
                width={480}
                height={270}
                className="max-w-full h-auto block"
              />
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-cyan-400 border border-white/10">
                {Math.round((1 - crop.left - crop.right) * 100)}% ×{' '}
                {Math.round((1 - crop.top - crop.bottom) * 100)}%
              </div>
            </div>
          </div>

          {/* 4-Way Crop Sliders */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-900/80 rounded-xl border border-zinc-800/80">
            {/* Left */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Crop Left</span>
                <span className="font-mono text-cyan-400">{Math.round(crop.left * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.45"
                step="0.01"
                value={crop.left}
                onChange={(e) => {
                  setActivePreset('free');
                  setCrop({ ...crop, left: parseFloat(e.target.value) });
                }}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Top */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Crop Top</span>
                <span className="font-mono text-cyan-400">{Math.round(crop.top * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.45"
                step="0.01"
                value={crop.top}
                onChange={(e) => {
                  setActivePreset('free');
                  setCrop({ ...crop, top: parseFloat(e.target.value) });
                }}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Right */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Crop Right</span>
                <span className="font-mono text-cyan-400">{Math.round(crop.right * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.45"
                step="0.01"
                value={crop.right}
                onChange={(e) => {
                  setActivePreset('free');
                  setCrop({ ...crop, right: parseFloat(e.target.value) });
                }}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Bottom */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Crop Bottom</span>
                <span className="font-mono text-cyan-400">{Math.round(crop.bottom * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.45"
                step="0.01"
                value={crop.bottom}
                onChange={(e) => {
                  setActivePreset('free');
                  setCrop({ ...crop, bottom: parseFloat(e.target.value) });
                }}
                className="w-full accent-cyan-400"
              />
            </div>
          </div>

          {/* Rotate & Flip Quick Actions */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-cyan-500 text-zinc-200 text-xs flex items-center gap-1.5 transition"
              >
                <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Rotate 90° ({rotation}°)</span>
              </button>

              <button
                onClick={() => setFlipH(!flipH)}
                className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition ${
                  flipH
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : 'bg-zinc-900 border-zinc-800 hover:border-cyan-500 text-zinc-200'
                }`}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>Flip H</span>
              </button>

              <button
                onClick={() => setFlipV(!flipV)}
                className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition ${
                  flipV
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : 'bg-zinc-900 border-zinc-800 hover:border-cyan-500 text-zinc-200'
                }`}
              >
                <FlipVertical className="w-3.5 h-3.5" />
                <span>Flip V</span>
              </button>
            </div>

            <button
              onClick={handleReset}
              className="px-2.5 py-1.5 text-zinc-400 hover:text-white flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="px-5 py-3 border-t border-zinc-800 flex items-center justify-end gap-2 bg-[#111324]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition"
          >
            <Check className="w-4 h-4" />
            <span>Apply Crop & Transform</span>
          </button>
        </div>
      </div>
    </div>
  );
};
