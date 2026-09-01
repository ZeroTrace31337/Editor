/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Keyboard, Search, Download, Upload, RotateCcw, AlertTriangle } from 'lucide-react';
import { ShortcutManager, ShortcutPresetName } from '../../core/shortcuts/ShortcutManager';
import { CommandRegistry } from '../../engine/command/CommandRegistry';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [editingCommandId, setEditingCommandId] = useState<string | null>(null);
  const [, setRefreshKey] = useState(0);

  const shortcutManager = ShortcutManager.getInstance();
  const commandRegistry = CommandRegistry.getInstance();
  const activePreset = shortcutManager.getActivePreset();

  if (!isOpen) return null;

  const allCommands = commandRegistry.getAllCommands();
  const filteredCommands = allCommands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePresetChange = (preset: ShortcutPresetName) => {
    shortcutManager.setPreset(preset);
    setConflictWarning(null);
    setRefreshKey((k) => k + 1);
  };

  const handleReset = () => {
    shortcutManager.resetToDefault();
    setConflictWarning(null);
    setRefreshKey((k) => k + 1);
  };

  const handleExport = () => {
    const json = shortcutManager.exportConfig();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veecut-shortcuts-${activePreset.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (shortcutManager.importConfig(text)) {
        setConflictWarning(null);
        setRefreshKey((k) => k + 1);
      }
    };
    reader.readAsText(file);
  };

  const handleRecordKey = (e: React.KeyboardEvent, commandId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      setEditingCommandId(null);
      return;
    }

    const parts: string[] = [];
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const isMod = isMac ? e.metaKey : e.ctrlKey;

    if (isMod) parts.push('Mod');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');

    let key = e.key;
    if (key === ' ') key = 'Space';
    else if (key === 'ArrowRight') key = 'Right';
    else if (key === 'ArrowLeft') key = 'Left';
    else if (key === 'ArrowUp') key = 'Up';
    else if (key === 'ArrowDown') key = 'Down';

    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      parts.push(key.length === 1 ? key.toUpperCase() : key);
    }

    if (parts.length > 0) {
      const combo = parts.join('+');
      const { conflictWith } = shortcutManager.setBinding(commandId, combo);
      if (conflictWith) {
        const otherCmd = commandRegistry.getCommand(conflictWith);
        setConflictWarning(`Shortcut "${combo}" re-assigned from "${otherCmd?.title || conflictWith}"`);
      } else {
        setConflictWarning(null);
      }
      setEditingCommandId(null);
      setRefreshKey((k) => k + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl max-w-2xl w-full shadow-2xl text-zinc-100 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-cyan-500/20 text-cyan-400">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide text-white">Keyboard Shortcuts & Command Engine</h2>
              <p className="text-[11px] text-zinc-400">Customizable hotkeys and industry layout presets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Selector & Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-zinc-900/40 border-b border-zinc-800/60 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 text-[11px]">Preset:</span>
            {(['VeeCut', 'DaVinci Resolve', 'Premiere Pro', 'Final Cut Pro'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetChange(preset)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  activePreset === preset
                    ? 'bg-cyan-500 text-black font-bold'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition"
              title="Export shortcuts as JSON"
            >
              <Download className="w-3 h-3" />
              <span>Export</span>
            </button>
            <label className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] cursor-pointer transition">
              <Upload className="w-3 h-3" />
              <span>Import</span>
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition"
              title="Reset shortcuts to preset default"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Conflict Notice */}
        <div className="p-3 border-b border-zinc-800/60 bg-zinc-950">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcut by action title, category, or hotkey..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {conflictWarning && (
            <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{conflictWarning}</span>
            </div>
          )}
        </div>

        {/* Command List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 text-xs">
          {filteredCommands.map((cmd) => {
            const currentShortcut = shortcutManager.getBinding(cmd.id) || cmd.defaultShortcut;
            const isEditing = editingCommandId === cmd.id;

            return (
              <div
                key={cmd.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60 hover:bg-zinc-900 transition"
              >
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-200">{cmd.title}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono uppercase">
                      {cmd.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate">{cmd.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isEditing ? (
                    <div
                      onKeyDown={(e) => handleRecordKey(e, cmd.id)}
                      tabIndex={0}
                      className="px-3 py-1 rounded bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs font-mono animate-pulse focus:outline-none cursor-pointer"
                    >
                      Press key combination... (Esc to cancel)
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingCommandId(cmd.id)}
                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-300 font-mono text-[11px] border border-zinc-700 shadow-xs transition"
                      title="Click to customize this hotkey"
                    >
                      {currentShortcut || '+ Assign Key'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs">
          <span className="text-zinc-500">Active Layout: {activePreset} • Click any hotkey badge to customize</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
