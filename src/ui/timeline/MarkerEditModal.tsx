/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Bookmark, Trash2, Check } from 'lucide-react';
import { TimelineMarker } from '../../domain/timeline/Sequence';
import { rationalTimeToSeconds } from '../../core/time/RationalTime';

interface MarkerEditModalProps {
  marker: TimelineMarker | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedMarker: TimelineMarker) => void;
  onDelete: (markerId: string) => void;
}

const COLOR_PALETTE = [
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
];

export const MarkerEditModal: React.FC<MarkerEditModalProps> = ({
  marker,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#06b6d4');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (marker) {
      setName(marker.name || '');
      setColor(marker.color || '#06b6d4');
      setComment(marker.comment || '');
    }
  }, [marker]);

  if (!isOpen || !marker) return null;

  const timeSec = rationalTimeToSeconds(marker.time);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...marker,
      name: name.trim() || 'Marker',
      color,
      comment: comment.trim(),
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4" style={{ color }} />
            <span className="text-sm font-semibold text-white">Edit Marker</span>
            <span className="text-[11px] font-mono text-zinc-400">@{timeSec.toFixed(2)}s</span>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs text-zinc-200">
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Marker Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Beat Drop, Scene Cut"
              className="w-full bg-zinc-900 border border-zinc-750 rounded px-2.5 py-1.5 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[11px] text-zinc-400 mb-1.5">Color Tag</label>
            <div className="flex items-center gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center ${
                    color === c ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {color === c && <Check className="w-3 h-3 text-black stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Notes / Comment</label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional notes for this timecode..."
              className="w-full bg-zinc-900 border border-zinc-750 rounded px-2.5 py-1.5 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={() => {
                onDelete(marker.id);
                onClose();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold transition"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
