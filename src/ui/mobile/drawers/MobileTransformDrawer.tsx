/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useEditor } from '../../context/EditorContext';
import {
  Crop,
  X,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Maximize2,
  Move,
  RotateCcw,
} from 'lucide-react';
import { Transform2D, createDefaultTransform } from '../../../core/math/Transform2D';
import { UpdateTransformCommand } from '../../../engine/command/implementations/UpdateTransformCommand';

interface MobileTransformDrawerProps {
  onClose: () => void;
}

export const MobileTransformDrawer: React.FC<MobileTransformDrawerProps> = ({ onClose }) => {
  const {
    timelineEngine,
    commandManager,
    selectedClipId,
    selectedClip,
  } = useEditor();

  const [transform, setTransform] = useState<Transform2D>(() => {
    return selectedClip?.transform ? { ...selectedClip.transform } : createDefaultTransform();
  });

  useEffect(() => {
    if (selectedClip?.transform) {
      setTransform({ ...selectedClip.transform });
    }
  }, [selectedClip]);

  const applyTransform = (newT: Transform2D) => {
    setTransform(newT);
    if (!selectedClipId) return;
    try {
      const cmd = new UpdateTransformCommand(timelineEngine, selectedClipId, newT);
      commandManager.execute(cmd);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleReset = () => {
    applyTransform(createDefaultTransform());
  };

  const handleRotate90 = () => {
    const newRot = (transform.rotation + 90) % 360;
    applyTransform({ ...transform, rotation: newRot });
  };

  const handleFlipH = () => {
    applyTransform({ ...transform, flipH: !transform.flipH });
  };

  const handleFlipV = () => {
    applyTransform({ ...transform, flipV: !transform.flipV });
  };

  const currentScale = transform.scale?.x ?? 1.0;
  const currentPosX = transform.position?.x ?? 0;
  const currentPosY = transform.position?.y ?? 0;

  return (
    <div className="flex flex-col h-full bg-[#0c0d17] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Crop className="w-4 h-4 text-teal-400" />
          <h3 className="font-bold text-sm">Crop, Transform & Position</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Target status */}
      <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-850 text-xs text-zinc-400 shrink-0">
        {selectedClip ? `Transforming: ${selectedClip.name}` : 'Select a clip to transform'}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Quick Flip / Rotate Buttons */}
        <div className="flex items-center justify-around gap-2 p-2 bg-zinc-900 rounded-xl border border-zinc-800">
          <button
            onClick={handleRotate90}
            className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition"
          >
            <RotateCw className="w-4 h-4 text-teal-400" />
            <span>Rotate 90°</span>
          </button>
          <button
            onClick={handleFlipH}
            className={`flex-1 py-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition ${
              transform.flipH
                ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                : 'bg-zinc-800 border-zinc-750 text-zinc-200 hover:bg-zinc-700'
            }`}
          >
            <FlipHorizontal className="w-4 h-4 text-cyan-400" />
            <span>Flip H</span>
          </button>
          <button
            onClick={handleFlipV}
            className={`flex-1 py-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition ${
              transform.flipV
                ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                : 'bg-zinc-800 border-zinc-750 text-zinc-200 hover:bg-zinc-700'
            }`}
          >
            <FlipVertical className="w-4 h-4 text-purple-400" />
            <span>Flip V</span>
          </button>
        </div>

        {/* Scale (Zoom) */}
        <div>
          <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
            <span>Scale / Zoom</span>
            <span className="font-mono text-teal-400">{(currentScale * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={3.0}
            step={0.05}
            value={currentScale}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              applyTransform({ ...transform, scale: { x: val, y: val } });
            }}
            className="w-full accent-teal-400"
          />
        </div>

        {/* Rotation */}
        <div>
          <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
            <span>Rotation Angle</span>
            <span className="font-mono text-teal-400">{transform.rotation?.toFixed(0)}°</span>
          </div>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={transform.rotation || 0}
            onChange={(e) => applyTransform({ ...transform, rotation: parseInt(e.target.value, 10) })}
            className="w-full accent-teal-400"
          />
        </div>

        {/* Position X */}
        <div>
          <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
            <span>Position X Offset</span>
            <span className="font-mono text-teal-400">{currentPosX.toFixed(0)} px</span>
          </div>
          <input
            type="range"
            min={-500}
            max={500}
            step={5}
            value={currentPosX}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              applyTransform({ ...transform, position: { x: val, y: currentPosY } });
            }}
            className="w-full accent-teal-400"
          />
        </div>

        {/* Position Y */}
        <div>
          <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
            <span>Position Y Offset</span>
            <span className="font-mono text-teal-400">{currentPosY.toFixed(0)} px</span>
          </div>
          <input
            type="range"
            min={-500}
            max={500}
            step={5}
            value={currentPosY}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              applyTransform({ ...transform, position: { x: currentPosX, y: val } });
            }}
            className="w-full accent-teal-400"
          />
        </div>
      </div>
    </div>
  );
};
