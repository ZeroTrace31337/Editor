/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { category: 'Playback & Navigation', items: [
      { key: 'Space', desc: 'Play / Pause' },
      { key: 'J / K / L', desc: 'Shuttle Playback (Rev / Pause / Fwd)' },
      { key: 'Left / Right', desc: 'Step 1 Frame' },
      { key: 'Shift + Left / Right', desc: 'Step 1 Second' },
      { key: 'Home / End', desc: 'Jump to Start / End' },
    ]},
    { category: 'Editing Tools', items: [
      { key: 'V', desc: 'Selection Tool' },
      { key: 'C / Ctrl+B', desc: 'Split Clip at Playhead' },
      { key: 'Delete / Backspace', desc: 'Delete Selected Clip' },
      { key: 'Shift + Delete', desc: 'Ripple Delete' },
      { key: 'Ctrl + Z', desc: 'Undo' },
      { key: 'Ctrl + Y / Ctrl+Shift+Z', desc: 'Redo' },
      { key: 'M', desc: 'Add Marker' },
      { key: 'N', desc: 'Toggle Snapping' },
      { key: '+ / -', desc: 'Zoom In / Out Timeline' },
    ]},
    { category: 'Export & Management', items: [
      { key: 'Ctrl + E', desc: 'Open Export Dialog' },
      { key: 'F', desc: 'Toggle Fullscreen' },
      { key: 'Ctrl + S', desc: 'Save Project' },
    ]}
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#10121e] border border-zinc-700/80 rounded-xl max-w-xl w-full p-5 shadow-2xl text-zinc-100 flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold tracking-wide">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto py-3 space-y-4 pr-1 text-xs">
          {shortcuts.map((cat) => (
            <div key={cat.category} className="space-y-1.5">
              <h3 className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
                {cat.category}
              </h3>
              <div className="grid grid-cols-1 gap-1">
                {cat.items.map((sc) => (
                  <div
                    key={sc.desc}
                    className="flex items-center justify-between py-1 px-2 rounded bg-zinc-900/60 border border-zinc-800/60"
                  >
                    <span className="text-zinc-300">{sc.desc}</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-cyan-300 font-mono text-[11px] border border-zinc-700 shadow-xs">
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
