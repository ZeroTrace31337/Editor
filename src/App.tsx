/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { EditorProvider, useEditor } from './ui/context/EditorContext';
import { EditorHeader } from './ui/header/EditorHeader';
import { TopEditingToolbar } from './ui/header/TopEditingToolbar';
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

const StudioWorkspace: React.FC = () => {
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
      {/* 1. Main Studio Header */}
      <EditorHeader onOpenExport={() => setIsExportOpen(true)} />

      {/* 2. Secondary Editing Toolbar */}
      <TopEditingToolbar />

      {/* 3. WORKSPACE VIEWS */}
      
      {/* WORKSPACE MODE: EDIT / ADJUST / EFFECTS */}
      {(workspaceMode === 'edit' || workspaceMode === 'adjust' || workspaceMode === 'effects') && (
        <>
          {/* Top 3-Pane View (Left Nav + Stage Monitor with Mobile Preview + Right Inspector) */}
          <div className="flex-1 flex min-h-0">
            {/* Left: Sidebar Navigation + Library + Performance Panel */}
            <div className="w-80 lg:w-88 shrink-0 h-full">
              <LeftSidebarNav />
            </div>

            {/* Center: Stage Preview Monitor with Docked Mobile Preview */}
            <div className="flex-1 h-full min-w-0 relative flex">
              <div className="flex-1 h-full min-w-0">
                <PreviewMonitor />
              </div>

              {/* Live Mobile 9:16 Preview (Docked at bottom-right of preview area) */}
              {showMobilePreview && (
                <div className="absolute right-4 bottom-16 z-20">
                  <MobilePreview />
                </div>
              )}
            </div>

            {/* Right: Inspector & Grading Controls (Transform, Adjust, Color, Effects, Presets) */}
            <div className="w-80 lg:w-88 shrink-0 h-full">
              <InspectorPanel />
            </div>
          </div>

          {/* Quick Action Bar directly above Timeline */}
          <QuickActionBar />

          {/* Bottom: Multi-Track Timeline */}
          <div className="h-72 lg:h-80 shrink-0 w-full">
            <TimelinePanel />
          </div>
        </>
      )}

      {/* WORKSPACE MODE: COLOR GRADING STUDIO */}
      {workspaceMode === 'color' && (
        <>
          {/* Top Split: Stage Preview & Video Scopes */}
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 h-full min-w-0">
              <PreviewMonitor />
            </div>
            <div className="w-88 lg:w-96 shrink-0 h-full p-2 bg-zinc-950/80 border-l border-zinc-800">
              <VideoScopesPanel />
            </div>
          </div>

          <QuickActionBar />

          {/* Bottom Split: Colorist Grading Deck & Timeline */}
          <div className="h-88 lg:h-96 shrink-0 w-full flex border-t border-zinc-800">
            <div className="flex-1 h-full min-w-0">
              <TimelinePanel />
            </div>
            <div className="w-96 lg:w-[450px] shrink-0 h-full">
              <InspectorPanel />
            </div>
          </div>
        </>
      )}

      {/* WORKSPACE MODE: AUDIO FAIRLIGHT STUDIO */}
      {workspaceMode === 'audio' && (
        <>
          {/* Top Split: Left Nav, Stage Preview & Clip Inspector */}
          <div className="flex-1 flex min-h-0">
            <div className="w-72 shrink-0 h-full">
              <LeftSidebarNav />
            </div>
            <div className="flex-1 h-full min-w-0">
              <PreviewMonitor />
            </div>
            <div className="w-80 shrink-0 h-full">
              <InspectorPanel />
            </div>
          </div>

          {/* Bottom Split: Multi-Track Mixer */}
          <div className="h-80 lg:h-88 shrink-0 w-full border-t border-zinc-800">
            <AudioMixerPanel />
          </div>
        </>
      )}

      {/* WORKSPACE MODE: DELIVER & RENDER QUEUE STUDIO */}
      {workspaceMode === 'deliver' && (
        <div className="flex-1 flex min-h-0">
          <DeliverWorkspaceView />
        </div>
      )}

      {/* Export Modal */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
};

export function App() {
  return (
    <EditorProvider>
      <StudioWorkspace />
    </EditorProvider>
  );
}

export default App;
