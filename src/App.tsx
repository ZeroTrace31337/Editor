/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { EditorProvider, useEditor } from './ui/context/EditorContext';
import { EditorHeader } from './ui/header/EditorHeader';
import { LeftSidebarNav } from './ui/sidebar/LeftSidebarNav';
import { PreviewMonitor } from './ui/preview/PreviewMonitor';
import { MobilePreview } from './ui/preview/MobilePreview';
import { TimelinePanel } from './ui/timeline/TimelinePanel';
import { QuickActionBar } from './ui/timeline/QuickActionBar';
import { InspectorPanel } from './ui/inspector/InspectorPanel';
import { VideoScopesPanel } from './ui/color/VideoScopesPanel';
import { AudioMixerPanel } from './ui/audio/AudioMixerPanel';
import { ExportModal } from './ui/export/ExportModal';
import { DeliverWorkspaceView } from './ui/export/DeliverWorkspaceView';
import { SplitClipCommand } from './engine/command/implementations/SplitClipCommand';
import { DeleteClipCommand } from './engine/command/implementations/DeleteClipCommand';
import { secondsToRationalTime, addRationalTime, subtractRationalTime } from './core/time/RationalTime';
import { HomePage } from './ui/home/HomePage';
import { MobileEditorWorkspace } from './ui/mobile/MobileEditorWorkspace';
import { useDeviceDetection } from './ui/hooks/useDeviceDetection';

interface StudioWorkspaceProps {
  onReturnHome: () => void;
  onToggleMobileMode?: () => void;
}

const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({ onReturnHome, onToggleMobileMode }) => {
  const {
    togglePlay,
    undo,
    redo,
    selectedClipId,
    setSelectedClipId,
    timelineEngine,
    commandManager,
    currentTime,
    seek,
    project,
    snappingEnabled,
    setSnappingEnabled,
    workspaceMode,
  } = useEditor();

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(true);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in text input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Space -> Toggle Play/Pause
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
      // Ctrl+Z -> Undo
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl+Y or Ctrl+Shift+Z -> Redo
      else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        redo();
      }
      // Ctrl+B -> Split Clip
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (selectedClipId) {
          try {
            const cmd = new SplitClipCommand(timelineEngine, selectedClipId, currentTime);
            commandManager.execute(cmd);
          } catch {}
        }
      }
      // Delete / Backspace -> Delete Selected Clip
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId) {
          e.preventDefault();
          try {
            const cmd = new DeleteClipCommand(timelineEngine, selectedClipId);
            commandManager.execute(cmd);
            setSelectedClipId(null);
          } catch {}
        }
      }
      // S -> Toggle Snapping
      else if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setSnappingEnabled(!snappingEnabled);
      }
      // Left Arrow -> Frame Back
      else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const fps = project.settings.frameRate.numerator / project.settings.frameRate.denominator;
        const delta = secondsToRationalTime(1 / fps);
        seek(subtractRationalTime(currentTime, delta));
      }
      // Right Arrow -> Frame Forward
      else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const fps = project.settings.frameRate.numerator / project.settings.frameRate.denominator;
        const delta = secondsToRationalTime(1 / fps);
        seek(addRationalTime(currentTime, delta));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay,
    undo,
    redo,
    selectedClipId,
    timelineEngine,
    commandManager,
    currentTime,
    seek,
    project,
    snappingEnabled,
    setSnappingEnabled,
    setSelectedClipId,
  ]);

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans select-none antialiased">
      {/* 1. Main Studio Header with Home return button */}
      <EditorHeader
        onOpenExport={() => setIsExportOpen(true)}
        onReturnHome={onReturnHome}
        onToggleMobileMode={onToggleMobileMode}
      />

      {/* 2. WORKSPACE VIEWS */}
      {/* Unified Professional VeeCut Pro Desktop Layout */}
      {workspaceMode === 'deliver' ? (
        <div className="flex-1 flex min-h-0">
          <DeliverWorkspaceView />
        </div>
      ) : (
        <>
          {/* Main 3-Pane View (Left Media Pool + Center Video Viewer + Right Inspector) */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Left: Sidebar Navigation + Media Pool + Assets Library */}
            <div className="w-[380px] xl:w-[440px] shrink-0 h-full border-r border-zinc-850">
              <LeftSidebarNav />
            </div>

            {/* Center: Professional Video Viewer / Preview Monitor */}
            <div className="flex-1 h-full min-w-0 relative flex flex-col bg-black">
              <PreviewMonitor />
            </div>

            {/* Right: Inspector & Color Grading Panel */}
            <div className="w-80 xl:w-[360px] shrink-0 h-full border-l border-zinc-850">
              <InspectorPanel />
            </div>
          </div>

          {/* Quick Action Bar directly above Timeline */}
          <QuickActionBar />

          {/* Bottom: Full-Width Multi-Track Timeline */}
          <div className="h-64 xl:h-72 shrink-0 w-full border-t border-zinc-850">
            <TimelinePanel />
          </div>
        </>
      )}

      {/* Export Modal */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
};

const RootApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<'home' | 'editor'>('home');
  const { project, projectService } = useEditor();
  const { isMobileLayout, isTablet, setDeviceMode } = useDeviceDetection();

  const handleOpenEditor = (config?: {
    projectName?: string;
    aspectRatio?: string;
    width?: number;
    height?: number;
    fps?: number;
    templateId?: string;
  }) => {
    if (config?.projectName) {
      project.metadata.name = config.projectName;
    }
    if (config?.width && config?.height) {
      project.settings.canvasWidth = config.width;
      project.settings.canvasHeight = config.height;
    }
    if (config?.aspectRatio) {
      project.settings.aspectRatio = config.aspectRatio as any;
    }
    if (config?.fps) {
      project.settings.frameRate = { numerator: config.fps, denominator: 1 };
    }
    projectService.setProject({ ...project });
    setCurrentView('editor');
  };

  if (currentView === 'home') {
    return (
      <HomePage
        onOpenEditor={handleOpenEditor}
        hasActiveSession={true}
        currentProjectName={project.metadata.name || 'Iceland 4K Master'}
      />
    );
  }

  // Purpose-built mobile / tablet touch interface
  if (isMobileLayout) {
    return (
      <MobileEditorWorkspace
        onReturnHome={() => setCurrentView('home')}
        onToggleDesktopMode={() => setDeviceMode('desktop')}
        isTablet={isTablet}
      />
    );
  }

  // Desktop / PC interface (kept exactly as it is)
  return (
    <StudioWorkspace
      onReturnHome={() => setCurrentView('home')}
      onToggleMobileMode={() => setDeviceMode('mobile')}
    />
  );
};

export function App() {
  return (
    <EditorProvider>
      <RootApp />
    </EditorProvider>
  );
}

export default App;
