/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MobileEditorHeader } from './MobileEditorHeader';
import { MobilePlayer } from './MobilePlayer';
import { MobileTouchTimeline } from './MobileTouchTimeline';
import { MobileToolBar, MobileDrawerType } from './MobileToolBar';
import { MobileMediaDrawer } from './drawers/MobileMediaDrawer';
import { MobileAudioDrawer } from './drawers/MobileAudioDrawer';
import { MobileTextDrawer } from './drawers/MobileTextDrawer';
import { MobileTransitionsDrawer } from './drawers/MobileTransitionsDrawer';
import { MobileColorFiltersDrawer } from './drawers/MobileColorFiltersDrawer';
import { MobileEffectsDrawer } from './drawers/MobileEffectsDrawer';
import { MobileSpeedDrawer } from './drawers/MobileSpeedDrawer';
import { MobileTransformDrawer } from './drawers/MobileTransformDrawer';
import { MobileVolumeDrawer } from './drawers/MobileVolumeDrawer';
import { MobileExportModal } from './MobileExportModal';
import { useEditor } from '../context/EditorContext';

interface MobileEditorWorkspaceProps {
  onReturnHome: () => void;
  onToggleDesktopMode: () => void;
  isTablet?: boolean;
}

export const MobileEditorWorkspace: React.FC<MobileEditorWorkspaceProps> = ({
  onReturnHome,
  onToggleDesktopMode,
  isTablet = false,
}) => {
  const [activeDrawer, setActiveDrawer] = useState<MobileDrawerType>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const handleCloseDrawer = () => {
    setActiveDrawer(null);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#05060a] text-zinc-100 overflow-hidden font-sans select-none relative">
      {/* 1. Mobile Header */}
      <MobileEditorHeader
        onReturnHome={onReturnHome}
        onOpenExport={() => setIsExportModalOpen(true)}
        onToggleDesktopMode={onToggleDesktopMode}
        isTablet={isTablet}
      />

      {/* 2. Main Studio Area (Adaptive Phone / Tablet Layout) */}
      <div className={`flex-1 flex ${isTablet ? 'flex-row' : 'flex-col'} overflow-hidden min-h-0 relative`}>
        {/* Left / Top: Interactive Player */}
        <div className={`${isTablet ? 'w-1/2 border-r border-zinc-800' : 'w-full shrink-0'} flex flex-col`}>
          <MobilePlayer isTablet={isTablet} />
        </div>

        {/* Right / Bottom: Touch Timeline & Action Controls */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#090b12] relative overflow-hidden">
          <MobileTouchTimeline
            onOpenMediaDrawer={() => setActiveDrawer('media')}
            onOpenTransitionsDrawer={() => setActiveDrawer('transitions')}
          />
        </div>
      </div>

      {/* 3. Ergonomic Bottom Tool Shelf */}
      <MobileToolBar
        activeDrawer={activeDrawer}
        onOpenDrawer={(drawer) => setActiveDrawer(drawer)}
      />

      {/* 4. Sliding Bottom Sheet Drawer */}
      {activeDrawer && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
          {/* Backdrop Tap to Close */}
          <div className="flex-1" onClick={handleCloseDrawer} />

          {/* Drawer Container */}
          <div className="w-full max-h-[60vh] h-[50vh] min-h-[320px] bg-[#0c0d17] border-t border-zinc-700/90 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-200">
            {/* Top Drag Handle */}
            <div className="w-full flex items-center justify-center pt-2 pb-1 shrink-0">
              <div className="w-10 h-1 bg-zinc-700 rounded-full" />
            </div>

            {/* Active Drawer View */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {activeDrawer === 'media' && <MobileMediaDrawer onClose={handleCloseDrawer} />}
              {activeDrawer === 'audio' && <MobileAudioDrawer onClose={handleCloseDrawer} />}
              {activeDrawer === 'text' && <MobileTextDrawer onClose={handleCloseDrawer} />}
              {activeDrawer === 'transitions' && (
                <MobileTransitionsDrawer onClose={handleCloseDrawer} />
              )}
              {activeDrawer === 'filters' && (
                <MobileColorFiltersDrawer onClose={handleCloseDrawer} />
              )}
              {activeDrawer === 'effects' && <MobileEffectsDrawer onClose={handleCloseDrawer} />}
              {activeDrawer === 'speed' && <MobileSpeedDrawer onClose={handleCloseDrawer} />}
              {activeDrawer === 'transform' && (
                <MobileTransformDrawer onClose={handleCloseDrawer} />
              )}
              {activeDrawer === 'volume' && <MobileVolumeDrawer onClose={handleCloseDrawer} />}
            </div>
          </div>
        </div>
      )}

      {/* 5. Mobile Export Master Video Modal */}
      {isExportModalOpen && (
        <MobileExportModal onClose={() => setIsExportModalOpen(false)} />
      )}
    </div>
  );
};
