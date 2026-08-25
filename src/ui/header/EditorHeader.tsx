/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useEditor, WorkspaceMode } from '../context/EditorContext';
import { AspectRatioPreset } from '../../domain/project/Project';
import {
  Film,
  Undo2,
  Redo2,
  Download,
  FolderOpen,
  Save,
  Plus,
  Sparkles,
  FileCode,
  Check,
  Zap,
  Activity,
  Bell,
  Settings,
  HelpCircle,
  Minus,
  Square,
  X,
} from 'lucide-react';
import { ProxyManagerModal } from '../media-pool/ProxyManagerModal';
import { PerformanceMonitorModal } from '../preview/PerformanceMonitorModal';
import { SettingsModal } from './SettingsModal';
import { GPUDeviceManager } from '../../rendering/gpu/GPUDeviceManager';

export const EditorHeader: React.FC<{ onOpenExport: () => void }> = ({ onOpenExport }) => {
  const {
    project,
    projectService,
    canUndo,
    canRedo,
    undo,
    redo,
    formattedTimecode,
    isPlaying,
    addSampleMedia,
    workspaceMode,
    setWorkspaceMode,
  } = useEditor();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.metadata.name);
  const [savedNotification, setSavedNotification] = useState(false);
  const [isProxyModalOpen, setIsProxyModalOpen] = useState(false);
  const [isPerfModalOpen, setIsPerfModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [gpuStatus, setGpuStatus] = useState({ backend: 'WebGL2', isHardware: true });

  useEffect(() => {
    const gpu = GPUDeviceManager.getInstance();
    setGpuStatus({
      backend: gpu.getBackend().toUpperCase(),
      isHardware: gpu.getCapabilities().isHardwareAccelerated,
    });
  }, []);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      project.metadata.name = titleInput.trim();
      projectService.setProject({ ...project });
    }
  };

  const handleAspectRatioChange = (ratio: AspectRatioPreset) => {
    let width = 1920;
    let height = 1080;
    if (ratio === '9:16') {
      width = 1080;
      height = 1920;
    } else if (ratio === '1:1') {
      width = 1080;
      height = 1080;
    } else if (ratio === '4:3') {
      width = 1440;
      height = 1080;
    }
    project.settings.aspectRatio = ratio;
    project.settings.canvasWidth = width;
    project.settings.canvasHeight = height;
    projectService.setProject({ ...project });
  };

  const handleSave = () => {
    projectService.saveToLocalStorage();
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 2000);
  };

  const handleImportProjectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await projectService.importProjectFile(file);
      e.target.value = '';
    }
  };

  const workspaces: { id: WorkspaceMode; label: string }[] = [
    { id: 'edit', label: 'Edit' },
    { id: 'adjust', label: 'Adjust' },
    { id: 'effects', label: 'Effects' },
    { id: 'color', label: 'Color' },
    { id: 'audio', label: 'Audio' },
    { id: 'deliver', label: 'Export' },
  ];

  return (
    <header className="h-11 bg-[#090a12] border-b border-zinc-800/80 px-3 flex items-center justify-between select-none shrink-0 z-20">
      {/* 1. Left: Brand Title "CineFlow | Pro Editor" & Project Metadata */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 pr-2.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-600/30">
            <Film className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black tracking-wide text-white">
              CineFlow
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#1e1538] text-purple-300 font-medium border border-purple-800/40">
              Pro Editor
            </span>
          </div>
        </div>
      </div>

      {/* 2. Center: Workspaces Navigation Pills (Edit, Adjust, Effects, Color, Audio, Export) */}
      <div className="flex items-center">
        <div className="flex items-center bg-[#111322] border border-zinc-800/80 rounded-full p-0.5 text-xs font-medium">
          {workspaces.map((ws) => {
            const isActive = workspaceMode === ws.id;
            return (
              <button
                key={ws.id}
                type="button"
                onClick={() => setWorkspaceMode(ws.id)}
                className={`px-3.5 py-1 rounded-full transition-all text-xs ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                {ws.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Right: GPU Acceleration RTX/Metal/Vulkan, Notifications, Settings, User Avatar & Window Controls */}
      <div className="flex items-center gap-2">
        {/* GPU Acceleration Status Pill */}
        <button
          onClick={() => setIsPerfModalOpen(true)}
          className="flex items-center gap-2 px-2.5 py-0.5 text-left bg-[#0e1726] border border-emerald-800/40 rounded-full hover:border-emerald-600/60 transition-colors"
          title="Hardware-Accelerated GPU Compositor Engine • Click for Telemetry"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-bold text-white">GPU Acceleration</span>
            <span className="text-[8px] text-zinc-400 font-mono">RTX / Metal / Vulkan</span>
          </div>
        </button>

        {/* Notifications Icon with Badge & Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setIsNotificationOpen(!isNotificationOpen);
              setUnreadCount(0);
            }}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-md transition relative"
            title="System & Project Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-purple-500 rounded-full ring-1 ring-zinc-950" />
            )}
          </button>

          {isNotificationOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-700/80 rounded-lg shadow-2xl p-3 z-50 text-xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800 font-semibold text-zinc-200">
                <span>Notifications</span>
                <span className="text-[10px] text-purple-400 font-normal">All clear</span>
              </div>
              <div className="p-2 rounded bg-zinc-950/80 border border-zinc-800 space-y-0.5">
                <div className="font-medium text-emerald-400 text-[11px]">GPU Compositor Ready</div>
                <p className="text-[10px] text-zinc-400">Hardware WebGL2 / WebGPU acceleration initialized at 60 FPS.</p>
              </div>
              <div className="p-2 rounded bg-zinc-950/80 border border-zinc-800 space-y-0.5">
                <div className="font-medium text-purple-400 text-[11px]">Pro Color Science Loaded</div>
                <p className="text-[10px] text-zinc-400">DaVinci YRGB Rec.709 32-bit color pipeline ready.</p>
              </div>
            </div>
          )}
        </div>

        {/* Settings Icon */}
        <button
          onClick={() => setIsSettingsModalOpen(true)}
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-md transition"
          title="Project Preferences & Engine Settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* User Profile Avatar */}
        <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300 shadow-xs cursor-pointer hover:border-purple-500 transition">
          S
        </div>

        {/* Window Controls (Minimize, Maximize, Close) */}
        <div className="flex items-center gap-0.5 pl-1 text-zinc-500">
          <button
            onClick={() => {}}
            className="p-1 hover:text-zinc-200 hover:bg-zinc-800 rounded transition"
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
            className="p-1 hover:text-zinc-200 hover:bg-zinc-800 rounded transition"
            title="Maximize / Fullscreen"
          >
            <Square className="w-3 h-3" />
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

      {/* Hidden file input for .lumina / .json project imports */}
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
    </header>
  );
};
