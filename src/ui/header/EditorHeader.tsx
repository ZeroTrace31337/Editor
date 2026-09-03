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
  Globe,
  Package,
  ShieldAlert,
  Search,
  Grid,
  Wand2,
} from 'lucide-react';
import { ProxyManagerModal } from '../proxy/ProxyManagerModal';
import { PerformanceMonitorModal } from '../preview/PerformanceMonitorModal';
import { SettingsModal } from './SettingsModal';
import { ShortcutsModal } from './ShortcutsModal';
import { CommandPalette } from '../command/CommandPalette';
import { RelinkModal } from '../media-pool/RelinkModal';
import { PluginsModal } from '../plugins/PluginsModal';
import { VideoReconstructionModal } from '../templates/VideoReconstructionModal';
import { useLocale } from '../i18n/LocaleContext';
import { ShortcutManager } from '../../core/shortcuts/ShortcutManager';
import { Smartphone } from 'lucide-react';

export const EditorHeader: React.FC<{
  onOpenExport: () => void;
  onReturnHome?: () => void;
  onToggleMobileMode?: () => void;
}> = ({ onOpenExport, onReturnHome, onToggleMobileMode }) => {
  const {
    project,
    projectService,
    timelineEngine,
    commandManager,
    mediaRegistry,
    playbackEngine,
    currentTime,
    selectedClipId,
    selectedClip,
    snappingEnabled,
    timelineZoom,
    seek,
    seekSeconds,
    togglePlay,
    setSnappingEnabled,
    setTimelineZoom,
    setSelectedClipId,
    setWorkspaceMode,
  } = useEditor();

  const { locale, setLocale, supportedLocales, t } = useLocale();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.metadata.name || '0825');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isRelinkModalOpen, setIsRelinkModalOpen] = useState(false);
  const [isPluginsModalOpen, setIsPluginsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProxyModalOpen, setIsProxyModalOpen] = useState(false);
  const [isPerfModalOpen, setIsPerfModalOpen] = useState(false);
  const [isReconstructOpen, setIsReconstructOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shortcutManager = ShortcutManager.getInstance();

  const editorContextForCommands = {
    project,
    projectService,
    timelineEngine,
    commandManager,
    mediaRegistry,
    playbackEngine,
    currentTime,
    selectedClipId,
    selectedClip,
    snappingEnabled,
    timelineZoom,
    seek,
    seekSeconds,
    togglePlay,
    setSnappingEnabled,
    setTimelineZoom,
    setSelectedClipId,
    openModal: (modalId: string) => {
      if (modalId === 'command_palette') setIsCommandPaletteOpen(true);
      if (modalId === 'shortcuts') setIsShortcutsOpen(true);
      if (modalId === 'settings') setIsSettingsModalOpen(true);
      if (modalId === 'plugins') setIsPluginsModalOpen(true);
      if (modalId === 'relink') setIsRelinkModalOpen(true);
    },
    setWorkspaceMode,
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Global shortcut for Command Palette (Mod+K)
      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isMod = isMac ? e.metaKey : e.ctrlKey;
      if (isMod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      shortcutManager.handleKeyDown(e, editorContextForCommands);
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [editorContextForCommands]);

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
      {/* 1. Left: VeeCut Logo + Menu Dropdown + Auto saved status */}
      <div className="flex items-center gap-2.5">
        {/* VeeCut Logo */}
        <div 
          onClick={onReturnHome}
          className="flex items-center gap-1.5 cursor-pointer group"
          title="Return to VeeCut Home Dashboard"
        >
          <div className="w-5.5 h-5.5 rounded-md bg-gradient-to-tr from-cyan-400 to-cyan-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <Play className="w-3 h-3 text-black fill-black translate-x-0.5" />
          </div>
          <span className="text-[13px] font-black tracking-tight text-white group-hover:text-cyan-400 transition-colors">
            {t('app.title', 'VeeCut')}
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
              className="absolute left-0 top-full mt-1 w-52 bg-[#12141c] border border-zinc-700/80 rounded-lg shadow-2xl py-1 z-50 text-xs text-zinc-200"
              onClick={() => setIsMenuOpen(false)}
            >
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-left px-3 py-1.5 hover:bg-cyan-500/20 hover:text-cyan-300 flex items-center justify-between"
              >
                <span>Import Project...</span>
                <span className="text-[10px] text-zinc-500 font-mono">Mod+O</span>
              </button>
              <button
                onClick={() => projectService.exportProjectFile()}
                className="w-full text-left px-3 py-1.5 hover:bg-cyan-500/20 hover:text-cyan-300 flex items-center justify-between"
              >
                <span>Save Project File</span>
                <span className="text-[10px] text-zinc-500 font-mono">Mod+S</span>
              </button>
              <div className="my-1 border-t border-zinc-800" />
              <button
                onClick={() => setIsCommandPaletteOpen(true)}
                className="w-full text-left px-3 py-1.5 hover:bg-cyan-500/20 hover:text-cyan-300 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3 h-3 text-cyan-400" />
                  <span>Command Palette</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">Mod+K</span>
              </button>
              <button
                onClick={() => setIsRelinkModalOpen(true)}
                className="w-full text-left px-3 py-1.5 hover:bg-cyan-500/20 hover:text-cyan-300 flex items-center gap-2"
              >
                <ShieldAlert className="w-3 h-3 text-amber-400" />
                <span>Relink Offline Media</span>
              </button>
              <button
                onClick={() => setIsReconstructOpen(true)}
                className="w-full text-left px-3 py-1.5 hover:bg-cyan-500/20 hover:text-cyan-300 flex items-center gap-2"
              >
                <Wand2 className="w-3 h-3 text-cyan-400" />
                <span>Video Reconstruction (AI)...</span>
              </button>
              <button
                onClick={() => setIsPluginsModalOpen(true)}
                className="w-full text-left px-3 py-1.5 hover:bg-cyan-500/20 hover:text-cyan-300 flex items-center gap-2"
              >
                <Package className="w-3 h-3 text-indigo-400" />
                <span>Plugin Ecosystem</span>
              </button>
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

        {/* Quick Command Palette Button */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-cyan-300 border border-zinc-800 text-[11px] transition"
          title="Search actions (Mod+K)"
        >
          <Search className="w-3 h-3" />
          <span className="hidden md:inline font-mono text-[10px]">⌘K</span>
        </button>

        {/* Auto saved status */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-zinc-400 pl-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
          <span>{t('header.saved', 'Auto-saved')}</span>
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

      {/* 3. Right: Language, Shortcut, Pro, Share, Prominent Export, Window Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Language Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-[11px] font-medium transition"
            title="Switch Language (i18n)"
          >
            <Globe className="w-3 h-3 text-cyan-400" />
            <span className="uppercase text-[10px] font-mono">{locale}</span>
          </button>

          {isLangMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-36 bg-[#12141c] border border-zinc-700/80 rounded-lg shadow-2xl py-1 z-50 text-xs text-zinc-200"
              onClick={() => setIsLangMenuOpen(false)}
            >
              {supportedLocales.map((loc) => (
                <button
                  key={loc.code}
                  onClick={() => setLocale(loc.code)}
                  className={`w-full text-left px-3 py-1.5 hover:bg-cyan-500/20 hover:text-cyan-300 flex items-center justify-between ${
                    locale === loc.code ? 'text-cyan-400 font-bold bg-cyan-500/10' : ''
                  }`}
                >
                  <span>{loc.nativeName}</span>
                  <span className="text-[10px] text-zinc-500 uppercase">{loc.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

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

        {/* Shortcut Button */}
        <button
          onClick={() => setIsShortcutsOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-[11px] font-medium transition"
          title="Keyboard Shortcuts Guide & Customizer"
        >
          <Keyboard className="w-3 h-3 text-zinc-400" />
          <span className="hidden sm:inline">Hotkeys</span>
        </button>

        {/* Share Button */}
        <button
          onClick={() => {
            navigator.clipboard?.writeText(window.location.href);
          }}
          className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-[11px] font-medium transition"
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
          <span>{t('header.export', 'Export')}</span>
        </button>

        {/* Window Controls (Minimize, Maximize, Close) */}
        <div className="flex items-center gap-0.5 pl-1.5 text-zinc-400">
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
              } else {
                document.exitFullscreen();
              }
            }}
            className="p-1 hover:text-white hover:bg-zinc-800 rounded transition"
            title="Toggle Fullscreen"
          >
            <Square className="w-2.5 h-2.5" />
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
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        context={editorContextForCommands}
      />
      <RelinkModal isOpen={isRelinkModalOpen} onClose={() => setIsRelinkModalOpen(false)} />
      <PluginsModal isOpen={isPluginsModalOpen} onClose={() => setIsPluginsModalOpen(false)} />
      <VideoReconstructionModal isOpen={isReconstructOpen} onClose={() => setIsReconstructOpen(false)} />
    </header>
  );
};
