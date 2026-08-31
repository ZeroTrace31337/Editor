/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HomeTopNav } from './HomeTopNav';
import { HeroSection } from './HeroSection';
import { ContinueEditingBanner } from './ContinueEditingBanner';
import { QuickActionsRow } from './QuickActionsRow';
import { CanvasPresetsSection } from './CanvasPresetsSection';
import { RecentProjectsSection } from './RecentProjectsSection';
import { AIToolsSection } from './AIToolsSection';
import { TemplatesSection } from './TemplatesSection';
import { TemplatesPage } from '../templates/TemplatesPage';
import { AssetsSection } from './AssetsSection';
import { HomeFooter } from './HomeFooter';

import { NewProjectModal } from './NewProjectModal';
import { AIToolModal } from './AIToolModal';
import { RecordStudioModal } from './RecordStudioModal';
import { AllProjectsModal } from './AllProjectsModal';
import { TutorialsModal } from './TutorialsModal';
import { SettingsModal } from '../header/SettingsModal';
import { useEditor } from '../context/EditorContext';

import {
  INITIAL_RECENT_PROJECTS,
  RecentProjectItem,
  CanvasPreset,
  AIToolItem,
  TemplateItem,
  AssetItem,
  generateDashboardThumbnail,
} from './homeData';

interface HomePageProps {
  onOpenEditor: (config?: {
    projectName?: string;
    aspectRatio?: string;
    width?: number;
    height?: number;
    fps?: number;
    templateId?: string;
    initialAsset?: any;
  }) => void;
  hasActiveSession?: boolean;
  currentProjectName?: string;
}

export const HomePage: React.FC<HomePageProps> = ({
  onOpenEditor,
  hasActiveSession = true,
  currentProjectName = 'Iceland 4K Master',
}) => {
  const { applyAIResultToTimeline } = useEditor();
  const [activeTab, setActiveTab] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recentProjects, setRecentProjects] = useState<RecentProjectItem[]>(INITIAL_RECENT_PROJECTS);

  // Modal visibility states
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [selectedCanvasPreset, setSelectedCanvasPreset] = useState<CanvasPreset | null>(null);
  const [selectedAITool, setSelectedAITool] = useState<AIToolItem | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isAllProjectsModalOpen, setIsAllProjectsModalOpen] = useState(false);
  const [isTutorialsModalOpen, setIsTutorialsModalOpen] = useState(false);
  const [tutorialsInitialTab, setTutorialsInitialTab] = useState<'tutorials' | 'shortcuts' | 'about'>('tutorials');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Actions
  const handleCreateNewProject = (config: {
    name: string;
    width: number;
    height: number;
    fps: number;
    aspectRatio: string;
    colorSpace: string;
  }) => {
    // Add new project to recent projects list
    const newProj: RecentProjectItem = {
      id: `proj_${Date.now()}`,
      name: config.name,
      thumbnail: generateDashboardThumbnail(config.name, 'cyan', (config.aspectRatio as any) || '16:9'),
      lastEdited: 'Just now',
      lastEditedTimestamp: Date.now(),
      duration: '00:00:00',
      resolution: `${config.width} x ${config.height}`,
      aspectRatio: (config.aspectRatio as any) || '16:9',
      fps: config.fps,
      size: '12 MB',
      tags: ['New', config.aspectRatio, `${config.fps}fps`],
      isStarred: false,
    };
    setRecentProjects([newProj, ...recentProjects]);

    // Launch editor with configured settings
    onOpenEditor({
      projectName: config.name,
      aspectRatio: config.aspectRatio,
      width: config.width,
      height: config.height,
      fps: config.fps,
    });
  };

  const handleOpenExistingProject = (proj: RecentProjectItem) => {
    onOpenEditor({
      projectName: proj.name,
      aspectRatio: proj.aspectRatio,
      fps: proj.fps,
    });
  };

  const handleSelectPreset = (preset: CanvasPreset) => {
    handleCreateNewProject({
      name: `${preset.label} Project`,
      width: preset.width,
      height: preset.height,
      fps: 60,
      aspectRatio: preset.aspectRatio,
      colorSpace: 'Rec.709',
    });
  };

  const handleUseTemplate = (template: TemplateItem) => {
    const newProj: RecentProjectItem = {
      id: `proj_template_${Date.now()}`,
      name: `${template.name} - Edit`,
      thumbnail: template.thumbnail,
      lastEdited: 'Just now',
      lastEditedTimestamp: Date.now(),
      duration: template.duration,
      resolution: template.resolution,
      aspectRatio: template.aspectRatio,
      fps: 60,
      size: '240 MB',
      tags: [template.category, 'Template', template.aspectRatio],
      isStarred: false,
    };
    setRecentProjects([newProj, ...recentProjects]);

    onOpenEditor({
      projectName: `${template.name} - Edit`,
      aspectRatio: template.aspectRatio,
      templateId: template.id,
    });
  };

  const handleImportMediaFiles = (files: FileList) => {
    const fileNames = Array.from(files).map((f) => f.name).join(', ');
    const newProj: RecentProjectItem = {
      id: `proj_import_${Date.now()}`,
      name: `Import: ${files[0].name}`,
      thumbnail: generateDashboardThumbnail(files[0].name, 'cyan', '16:9'),
      lastEdited: 'Just now',
      lastEditedTimestamp: Date.now(),
      duration: '00:30:00',
      resolution: '1920 x 1080 (FHD)',
      aspectRatio: '16:9',
      fps: 60,
      size: '450 MB',
      tags: ['Imported Media'],
    };
    setRecentProjects([newProj, ...recentProjects]);

    onOpenEditor({
      projectName: `Import: ${files[0].name}`,
      aspectRatio: '16:9',
    });
  };

  const handleSaveRecording = (recordingName: string) => {
    const newProj: RecentProjectItem = {
      id: `proj_rec_${Date.now()}`,
      name: recordingName,
      thumbnail: generateDashboardThumbnail(recordingName, 'rose', '16:9'),
      lastEdited: 'Just now',
      lastEditedTimestamp: Date.now(),
      duration: '00:02:15',
      resolution: '1920 x 1080 (FHD)',
      aspectRatio: '16:9',
      fps: 60,
      size: '120 MB',
      tags: ['Screen Recording'],
    };
    setRecentProjects([newProj, ...recentProjects]);

    onOpenEditor({
      projectName: recordingName,
      aspectRatio: '16:9',
    });
  };

  const handleToggleStar = (id: string) => {
    setRecentProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isStarred: !p.isStarred } : p))
    );
  };

  const handleDeleteProject = (id: string) => {
    setRecentProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAddAsset = (asset: AssetItem) => {
    onOpenEditor({
      projectName: `Project with ${asset.name}`,
    });
  };

  const handleApplyAIResult = async (info: any) => {
    try {
      await applyAIResultToTimeline(info);
    } catch (e) {
      console.error('Error adding AI media to timeline:', e);
    }
    onOpenEditor({
      projectName: info.title || 'AI Project',
    });
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col font-sans select-none antialiased overflow-y-auto">
      {/* 1. TOP NAVIGATION BAR */}
      <HomeTopNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenNewProject={() => {
          setSelectedCanvasPreset(null);
          setIsNewProjectModalOpen(true);
        }}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenTutorials={() => {
          setTutorialsInitialTab('tutorials');
          setIsTutorialsModalOpen(true);
        }}
        onOpenEditor={() => onOpenEditor()}
        hasActiveProject={hasActiveSession}
        activeProjectName={currentProjectName}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* 2. MAIN CONTENT WRAPPER */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex flex-col gap-8 md:gap-10">
        {activeTab === 'home' && (
          <>
            {/* 2. HERO / WELCOME AREA */}
            <HeroSection
              onNewProject={() => {
                setSelectedCanvasPreset(null);
                setIsNewProjectModalOpen(true);
              }}
              onOpenProject={() => setIsAllProjectsModalOpen(true)}
              onImportMedia={handleImportMediaFiles}
            />

            {/* 9. CONTINUE EDITING BANNER (Most recently active project) */}
            {recentProjects.length > 0 && (
              <ContinueEditingBanner
                recentProject={recentProjects[0]}
                onContinueEditing={handleOpenExistingProject}
              />
            )}

            {/* 3. QUICK ACTIONS ROW */}
            <QuickActionsRow
              onNewProject={() => {
                setSelectedCanvasPreset(null);
                setIsNewProjectModalOpen(true);
              }}
              onImportVideo={handleImportMediaFiles}
              onOpenRecord={() => setIsRecordModalOpen(true)}
              onOpenAIVideo={() => {
                setSelectedAITool({
                  id: 'ai_video_gen',
                  name: 'AI Video Generator',
                  category: 'Generation',
                  description: 'Transform detailed text prompts into high-framerate 4K video clips.',
                  badge: 'Pro 2.0',
                  iconName: 'Video',
                  accentGradient: 'from-cyan-500 to-blue-600',
                  features: ['Text to Video', 'Image to Motion', 'Camera Control'],
                });
              }}
              onOpenAutoCaptions={() => {
                setSelectedAITool({
                  id: 'ai_captions',
                  name: 'AI Auto Captions',
                  category: 'Transcription',
                  description: 'Generate 99.4% accurate animated subtitles with auto-highlighted keywords.',
                  badge: '120+ Languages',
                  iconName: 'Subtitles',
                  accentGradient: 'from-violet-500 to-purple-600',
                  features: ['Word-level Karaoke', 'Multilingual Translation', 'Viral Typography'],
                });
              }}
              onOpenRemoveBg={() => {
                setSelectedAITool({
                  id: 'ai_bg_removal',
                  name: 'AI Background Removal',
                  category: 'VFX & Rotoscoping',
                  description: 'Instant zero-latency subject rotoscoping and hair-level edge isolation.',
                  badge: 'Realtime',
                  iconName: 'Scissors',
                  accentGradient: 'from-emerald-500 to-teal-600',
                  features: ['Hair Detail Isolation', 'Depth Map Generator', 'Custom Backdrops'],
                });
              }}
              onOpenTemplates={() => setActiveTab('templates')}
            />

            {/* 5. CREATE NEW PROJECT / CANVAS FORMAT PRESETS */}
            <CanvasPresetsSection
              onSelectPreset={handleSelectPreset}
              onOpenCustomCanvasModal={() => {
                setSelectedCanvasPreset(null);
                setIsNewProjectModalOpen(true);
              }}
            />

            {/* 4. RECENT PROJECTS SECTION */}
            <RecentProjectsSection
              projects={recentProjects}
              onOpenProject={handleOpenExistingProject}
              onViewAllProjects={() => setIsAllProjectsModalOpen(true)}
              onDeleteProject={handleDeleteProject}
              onToggleStar={handleToggleStar}
            />

            {/* 6. AI TOOLS SECTION */}
            <AIToolsSection
              onOpenAITool={(tool) => setSelectedAITool(tool)}
            />

            {/* 7. TRENDING TEMPLATES SECTION */}
            <TemplatesSection
              onUseTemplate={handleUseTemplate}
              onOpenTemplatesTab={() => setActiveTab('templates')}
              onOpenEditor={() => onOpenEditor()}
            />

            {/* 8. ASSETS & STOCK MEDIA SECTION */}
            <AssetsSection
              onAddAssetToProject={handleAddAsset}
              onPreviewAsset={(asset) => {
                alert(`Asset Preview: ${asset.name} (${asset.category})`);
              }}
            />
          </>
        )}

        {/* Dedicated "Projects" Tab */}
        {activeTab === 'projects' && (
          <RecentProjectsSection
            projects={recentProjects}
            onOpenProject={handleOpenExistingProject}
            onViewAllProjects={() => setIsAllProjectsModalOpen(true)}
            onDeleteProject={handleDeleteProject}
            onToggleStar={handleToggleStar}
          />
        )}

        {/* Dedicated "Templates" Tab */}
        {activeTab === 'templates' && (
          <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-6 md:-my-8">
            <TemplatesPage
              onOpenEditor={() => onOpenEditor()}
            />
          </div>
        )}

        {/* Dedicated "AI Tools" Tab */}
        {activeTab === 'ai-tools' && (
          <AIToolsSection
            onOpenAITool={(tool) => setSelectedAITool(tool)}
          />
        )}

        {/* Dedicated "Assets" Tab */}
        {activeTab === 'assets' && (
          <AssetsSection
            onAddAssetToProject={handleAddAsset}
            onPreviewAsset={(asset) => {
              alert(`Asset Preview: ${asset.name} (${asset.category})`);
            }}
          />
        )}

        {/* Dedicated "Tutorials" Tab */}
        {activeTab === 'tutorials' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">VeeCut Video Editing Academy</h2>
            <p className="text-sm text-zinc-400">Step-by-step masterclasses and keyboard shortcuts</p>
            <div className="p-6 rounded-2xl bg-[#11131c] border border-zinc-800">
              <button
                onClick={() => {
                  setTutorialsInitialTab('tutorials');
                  setIsTutorialsModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-400 text-black font-bold text-xs"
              >
                Launch Interactive Guide
              </button>
            </div>
          </div>
        )}

        {/* 10. BOTTOM INFORMATION AREA / FOOTER */}
        <HomeFooter
          onOpenShortcuts={() => {
            setTutorialsInitialTab('shortcuts');
            setIsTutorialsModalOpen(true);
          }}
          onOpenTutorials={() => {
            setTutorialsInitialTab('tutorials');
            setIsTutorialsModalOpen(true);
          }}
          onOpenAbout={() => {
            setTutorialsInitialTab('about');
            setIsTutorialsModalOpen(true);
          }}
        />
      </main>

      {/* MODALS */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onCreateProject={handleCreateNewProject}
        initialPreset={selectedCanvasPreset}
      />

      <AIToolModal
        isOpen={!!selectedAITool}
        onClose={() => setSelectedAITool(null)}
        tool={selectedAITool}
        onApplyToTimeline={handleApplyAIResult}
      />

      <RecordStudioModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSaveRecording={handleSaveRecording}
      />

      <AllProjectsModal
        isOpen={isAllProjectsModalOpen}
        onClose={() => setIsAllProjectsModalOpen(false)}
        projects={recentProjects}
        onOpenProject={handleOpenExistingProject}
        onNewProject={() => {
          setIsAllProjectsModalOpen(false);
          setIsNewProjectModalOpen(true);
        }}
        onDeleteProject={handleDeleteProject}
        onToggleStar={handleToggleStar}
      />

      <TutorialsModal
        isOpen={isTutorialsModalOpen}
        onClose={() => setIsTutorialsModalOpen(false)}
        initialTab={tutorialsInitialTab}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
};
