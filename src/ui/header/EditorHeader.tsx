/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useEditor, WorkspaceMode } from '../context/EditorContext';
import {
  Play,
  Film,
  Sparkles,
  ChevronDown,
  Upload,
  Share2,
  Download,
  Keyboard,
  Diamond,
  Layout,
  Minus,
  Square,
  X,
  CheckCircle2,
  Bell,
  Settings,
  Home,
} from 'lucide-react';
import { ProxyManagerModal } from '../proxy/ProxyManagerModal';
import { PerformanceMonitorModal } from '../preview/PerformanceMonitorModal';
import { SettingsModal } from './SettingsModal';
import { ShortcutsModal } from './ShortcutsModal';
import { Smartphone } from 'lucide-react';

export const EditorHeader: React.FC<{
  onOpenExport: () => void;
  onReturnHome?: () => void;
  onToggleMobileMode?: () => void;
}> = ({ onOpenExport, onReturnHome, onToggleMobileMode }) => {
  const {
    project,
    projectService,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditor();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('0825');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProxyModalOpen, setIsProxyModalOpen] = useState(false);
  const [isPerfModalOpen, setIsPerfModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      project.metadata.name = titleInput.trim();
      projectService.setProject({ ...project });
    }
  };

  const handleImportProjectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await projectService.importProjectFile(file);
      e.target.value = '';
    }
  };

  return (
    <header className="h-10.5 bg-[#0b0d13] border-b border-zinc-800/80 px-3 flex items-center justify-between select-none shrink-0 z-30">
      {/* 1. Left: CineFlow Logo + Menu Dropdown + Auto saved status */}
      <div className="flex items-center gap-3">
        {/* CineFlow Logo */}
        <div 
          onClick={onReturnHome}
          className="flex items-center gap-1.5 cursor-pointer group"
          title="Return to CineFlow Home Dashboard"
        >
          <div className="w-5.5 h-5.5 rounded-md bg-gradient-to-tr from-cyan-400 to-cyan-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <Play className="w-3 h-3 text-black fill-black translate-x-0.5" />
          </div>
          <span className="text-[13px] font-black tracking-tight text-white group-hover:text-cyan-400 transition-colors">
            CineFlow
          </span>
        </div>

        {/* Home Dashboard quick button */}
        {onReturnHome && (
          <button
            onClick={onReturnHome}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-[11px] font-medium transition"
            title="Home Dashboard"
          >
            <Home className="w-3 h-3 text-cyan-400" />
            <span>Home</span>
          </button>
        )}

        {/* Menu Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-[11px] font-medium transition"
          >
            <span>Menu</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {isMenuOpen && (
            <div
              className="absolute left-0 top-full mt-1 w-48 bg-[#12141c] border border-zinc-700/80 rounded-lg shadow-2xl py-1 z-50 text-xs text-zinc-200"
              onClick={() => setIsMenuOpen(false)}
            >
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-left px-3 py-1.5 hover:bg-cyan-500/20 hover:text-cyan-300 flex items-center justify-between"
              >
                <span>Import Project...</span>
                <span className="text-[10px] text-zinc-500 font-mono">Ctrl+O</span>
              </button>
              <button
                onClick={() => projectService.exportProjectFile()}
                className="w-full text-left px-3 py-1.5 hover:bg-cyan-500/20 hover:text-cyan-300 flex items-center justify-between"
              >
                <span>Save Project File</span>
                <span className="text-[10px] text-zinc-500 font-mono">Ctrl+S</span>
              </button>
              <div className="my-1 border-t border-zinc-800" />
              <button
                onClick={() => setIsProxyModalOpen(true)}
                className="w-full text-left px-3 py-1.5 hover:bg-cyan-500/20 hover:text-cyan-300"
              >
                Proxy Manager
              </button>
              <button
                onClick={() => setIsPerfModalOpen(true)}
                className="w-full text-left px-3 py-1.5 hover:bg-cyan-500/20 hover:text-cyan-300"
              >
                GPU & Telemetry
              </button>
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="w-full text-left px-3 py-1.5 hover:bg-cyan-500/20 hover:text-cyan-300"
              >
                Preferences
              </button>
            </div>
          )}
        </div>

        {/* Auto saved status */}
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 pl-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
          <span>Auto saved: 11:50:56</span>
        </div>
      </div>

      {/* 2. Center: Project Name */}
      <div className="flex items-center justify-center">
        {isEditingTitle ? (
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
            autoFocus
            className="bg-zinc-900 border border-cyan-500 rounded px-2 py-0.5 text-xs text-white font-semibold text-center focus:outline-none"
          />
        ) : (
          <span
            onClick={() => setIsEditingTitle(true)}
            className="text-xs font-bold text-zinc-200 hover:text-cyan-400 cursor-pointer tracking-wider px-2 py-0.5 rounded hover:bg-zinc-850 transition"
            title="Click to rename project"
          >
            {project.metadata.name || '0825'}
          </span>
        )}
      </div>

      {/* 3. Right: Shortcut, Join Pro, Share, Prominent Export, Window Controls */}
      <div className="flex items-center gap-2">
        {/* Toggle to Touch Mobile/Tablet Interface */}
        {onToggleMobileMode && (
          <button
            onClick={onToggleMobileMode}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-cyan-400 border border-zinc-800 text-[11px] font-medium transition"
            title="Switch to Mobile / Tablet Touch Interface"
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Mobile UI</span>
          </button>
        )}

        {/* Layout Mode Icon */}
        <button
          onClick={() => {}}
          className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-850 transition"
          title="Workspace Layout"
        >
          <Layout className="w-3.5 h-3.5" />
        </button>

        {/* Shortcut Button */}
        <button
          onClick={() => setIsShortcutsOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-[11px] font-medium transition"
        >
          <Keyboard className="w-3 h-3 text-zinc-400" />
          <span>Shortcut</span>
        </button>

        {/* Join Pro Pill */}
        <button
          onClick={() => {}}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[11px] font-semibold shadow-xs shadow-purple-600/30 transition active:scale-95"
        >
          <Diamond className="w-3 h-3 fill-white text-white" />
          <span>Join Pro</span>
        </button>

        {/* Share Button */}
        <button
          onClick={() => {
            navigator.clipboard?.writeText(window.location.href);
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-[11px] font-medium transition"
        >
          <Share2 className="w-3 h-3 text-zinc-400" />
          <span>Share</span>
        </button>

        {/* Prominent Teal Export Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1 rounded-md bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-[11px] shadow-sm shadow-cyan-400/40 transition active:scale-95"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Export</span>
        </button>

        {/* Window Controls (Minimize, Maximize, Close) */}
        <div className="flex items-center gap-0.5 pl-1.5 text-zinc-400">
          <button
            onClick={() => {}}
            className="p-1 hover:text-white hover:bg-zinc-800 rounded transition"
            title="Minimize"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
              } else {
                document.exitFullscreen();
              }
            }}
            className="p-1 hover:text-white hover:bg-zinc-800 rounded transition"
            title="Maximize"
          >
            <Square className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={() => {}}
            className="p-1 hover:text-red-400 hover:bg-zinc-800 rounded transition"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportProjectFile}
        accept=".json,.lumina"
        className="hidden"
      />

      {/* Modals */}
      <ProxyManagerModal isOpen={isProxyModalOpen} onClose={() => setIsProxyModalOpen(false)} />
      <PerformanceMonitorModal isOpen={isPerfModalOpen} onClose={() => setIsPerfModalOpen(false)} />
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
    </header>
  );
};

