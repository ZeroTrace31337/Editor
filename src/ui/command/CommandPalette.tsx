/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, Play, Scissors, Layers, Sliders, Eye, Sparkles, X, CornerDownLeft, Clock } from 'lucide-react';
import { CommandRegistry } from '../../engine/command/CommandRegistry';
import { ShortcutManager } from '../../core/shortcuts/ShortcutManager';
import { EditorCommandDefinition, CommandCategory, EditorExecutionContext } from '../../engine/command/CommandTypes';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  context: EditorExecutionContext;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, context }) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commandRegistry = CommandRegistry.getInstance();
  const shortcutManager = ShortcutManager.getInstance();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allCommands = commandRegistry.getAllCommands();
  const recentCommands = commandRegistry.getRecentCommands();

  const filteredCommands = allCommands.filter((cmd) => {
    const matchesCat = activeCategory === 'all' || cmd.category === activeCategory;
    const matchesQuery =
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase()) ||
      cmd.category.toLowerCase().includes(query.toLowerCase());
    return matchesCat && (query.trim() === '' ? true : matchesQuery);
  });

  const displayList = query.trim() === '' && activeCategory === 'all' && recentCommands.length > 0
    ? [...recentCommands, ...filteredCommands.filter((c) => !recentCommands.some((r) => r.id === c.id))]
    : filteredCommands;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, displayList.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + displayList.length) % Math.max(1, displayList.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (displayList[selectedIndex]) {
        executeAndClose(displayList[selectedIndex]);
      }
    }
  };

  const executeAndClose = (cmd: EditorCommandDefinition) => {
    commandRegistry.executeCommand(cmd.id, context);
    onClose();
  };

  const categories: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', icon: <Command className="w-3 h-3" /> },
    { id: 'editing', label: 'Editing', icon: <Scissors className="w-3 h-3" /> },
    { id: 'playback', label: 'Playback', icon: <Play className="w-3 h-3" /> },
    { id: 'timeline', label: 'Timeline', icon: <Layers className="w-3 h-3" /> },
    { id: 'project', label: 'Project', icon: <Sliders className="w-3 h-3" /> },
    { id: 'view', label: 'View', icon: <Eye className="w-3 h-3" /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/60 gap-3">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search actions (e.g. Split, Ripple Delete, Marker)..."
            className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-zinc-800/40 bg-zinc-950/80 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setSelectedIndex(0);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition ${
                activeCategory === cat.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
          {displayList.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              No matching commands found for "{query}"
            </div>
          ) : (
            displayList.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              const shortcut = shortcutManager.getBinding(cmd.id) || cmd.defaultShortcut;
              const isRecent = query.trim() === '' && recentCommands.some((r) => r.id === cmd.id);

              return (
                <div
                  key={cmd.id}
                  onClick={() => executeAndClose(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition ${
                    isSelected ? 'bg-zinc-800/90 text-white' : 'text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-md ${
                        isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      {isRecent ? <Clock className="w-3.5 h-3.5 text-amber-400" /> : <Sparkles className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium truncate">{cmd.title}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-500 uppercase tracking-wider font-mono">
                          {cmd.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate">{cmd.description}</p>
                    </div>
                  </div>

                  {shortcut && (
                    <div className="flex items-center gap-1 shrink-0 ml-3">
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-zinc-900 border border-zinc-800 text-zinc-300 shadow-xs">
                        {shortcut}
                      </kbd>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 bg-zinc-900/40 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-2">
            <span>Navigation:</span>
            <kbd className="px-1 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px]">↑</kbd>
            <kbd className="px-1 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px]">↓</kbd>
            <span>Execute:</span>
            <kbd className="px-1 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] flex items-center gap-0.5">
              <CornerDownLeft className="w-2.5 h-2.5" /> Enter
            </kbd>
          </div>
          <span>Esc to Close</span>
        </div>
      </div>
    </div>
  );
};
