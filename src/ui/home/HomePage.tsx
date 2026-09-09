/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Sparkles,
  FolderOpen,
  Video,
  Music,
  ArrowRight,
  Play,
  Wand2,
  Copy,
} from 'lucide-react';
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
import { AuthModal } from '../auth/AuthModal';
import { useEditor } from '../context/EditorContext';
import { notifyToast } from '../toast/ToastContext';

import {
  INITIAL_RECENT_PROJECTS,
  RecentProjectItem,
  CanvasPreset,
  AIToolItem,
  TemplateItem,
  AssetItem,
  AI_TOOLS_LIST,
  TRENDING_TEMPLATES,
  ASSETS_LIBRARY,
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
  const { applyAIResultToTimeline, projectService } = useEditor();
  const [activeTab, setActiveTab] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recentProjects, setRecentProjects] = useState<RecentProjectItem[]>(() => {
    // Attempt fast initial read from localStorage
    try {
      const savedList = projectService?.getSavedProjectsList() || [];
      if (savedList.length > 0) {
        // Map stored projects to recent projects item structure
        const mapped: RecentProjectItem[] = savedList.map((item) => {
          let projectData: any = null;
          try {
            const raw = localStorage.getItem(`lumina_project_${item.id}`);
            if (raw) projectData = JSON.parse(raw);
          } catch {}
          return {
            id: item.id,
            name: item.name,
            thumbnail: generateDashboardThumbnail(item.name, 'cyan', projectData?.settings?.aspectRatio || '16:9'),
            lastEdited: new Date(item.modifiedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            }),
            lastEditedTimestamp: new Date(item.modifiedAt).getTime(),
            duration: projectData?.duration ? `${projectData.duration}s` : '00:01:30',
            resolution: `${projectData?.settings?.canvasWidth || 1920} x ${projectData?.settings?.canvasHeight || 1080}`,
            aspectRatio: (projectData?.settings?.aspectRatio as any) || '16:9',
            fps: projectData?.settings?.frameRate?.numerator || 60,
            size: '24 MB',
            tags: ['VeeCut Project', projectData?.settings?.aspectRatio || '16:9'],
            isStarred: false,
          };
        });
        return mapped;
      }
    } catch {}
    return INITIAL_RECENT_PROJECTS;
  });

  // Modal visibility states
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [selectedCanvasPreset, setSelectedCanvasPreset] = useState<CanvasPreset | null>(null);
  const [selectedAITool, setSelectedAITool] = useState<AIToolItem | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isAllProjectsModalOpen, setIsAllProjectsModalOpen] = useState(false);
  const [isTutorialsModalOpen, setIsTutorialsModalOpen] = useState(false);
  const [tutorialsInitialTab, setTutorialsInitialTab] = useState<'tutorials' | 'shortcuts' | 'about'>('tutorials');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<AssetItem | null>(null);

  // Hidden file input for project JSON import
  const projectFileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync with backend on mount
  useEffect(() => {
    let isMounted = true;
    const fetchBackendProjects = async () => {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.projects) && data.projects.length > 0 && isMounted) {
            setRecentProjects((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const newItems: RecentProjectItem[] = data.projects
                .filter((p: any) => !existingIds.has(p.id))
                .map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  thumbnail: generateDashboardThumbnail(p.name, 'indigo', p.aspectRatio || '16:9'),
                  lastEdited: new Date(p.lastModified || Date.now()).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  }),
                  lastEditedTimestamp: p.lastModified || Date.now(),
                  duration: '00:01:00',
                  resolution: `${p.canvasWidth || 1920} x ${p.canvasHeight || 1080}`,
                  aspectRatio: (p.aspectRatio as any) || '16:9',
                  fps: p.fps || 60,
                  size: '18 MB',
                  tags: ['Cloud Saved', p.aspectRatio || '16:9'],
                  isStarred: false,
                }));
              return [...newItems, ...prev];
            });
          }
        }
      } catch (err) {
        console.warn('Backend projects sync notice:', err);
      }
    };
    fetchBackendProjects();
    return () => {
      isMounted = false;
    };
  }, []);

  // Actions
  const handleCreateNewProject = async (config: {
    name: string;
    width: number;
    height: number;
    fps: number;
    aspectRatio: string;
    colorSpace: string;
  }) => {
    const projId = `proj_${Date.now()}`;
    const newProjItem: RecentProjectItem = {
      id: projId,
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

    // Save to ProjectService
    if (projectService) {
      const proj = projectService.createProject(config.name);
      proj.metadata.id = projId;
      proj.settings.canvasWidth = config.width;
      proj.settings.canvasHeight = config.height;
      proj.settings.aspectRatio = (config.aspectRatio as any) || '16:9';
      proj.settings.frameRate = { numerator: config.fps, denominator: 1 };
      projectService.setProject(proj);
      projectService.saveToLocalStorage();
    }

    setRecentProjects((prev) => [newProjItem, ...prev]);

    // Launch editor with configured settings
    onOpenEditor({
      projectName: config.name,
      aspectRatio: config.aspectRatio,
      width: config.width,
      height: config.height,
      fps: config.fps,
    });
  };

  const handleOpenExistingProject = async (proj: RecentProjectItem) => {
    if (projectService) {
      try {
        const loaded = await projectService.loadFromLocalStorage(proj.id);
        if (!loaded) {
          // If this project doesn't exist in local storage (e.g. demo project), initialize it in the service
          const newModel = projectService.createProject(proj.name);
          newModel.metadata.id = proj.id;
          newModel.settings.aspectRatio = proj.aspectRatio;
          newModel.settings.frameRate = { numerator: proj.fps || 60, denominator: 1 };
          projectService.setProject(newModel);
          projectService.saveToLocalStorage();
        }
      } catch (err) {
        console.warn('Could not load project directly:', err);
      }
    }

    onOpenEditor({
      projectName: proj.name,
      aspectRatio: proj.aspectRatio,
      fps: proj.fps,
    });
  };

  const handleRenameProject = async (id: string, newName: string) => {
    if (projectService) {
      await projectService.renameProject(id, newName);
    }
    setRecentProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: newName, lastEdited: 'Just now' } : p))
    );
  };

  const handleDuplicateProject = async (proj: RecentProjectItem) => {
    let duplicatedId = `proj_copy_${Date.now()}`;
    if (projectService) {
      const cloned = await projectService.duplicateProject(proj.id);
      if (cloned) duplicatedId = cloned.metadata.id;
    }
    const duplicatedItem: RecentProjectItem = {
      ...proj,
      id: duplicatedId,
      name: `${proj.name} (Copy)`,
      lastEdited: 'Just now',
      lastEditedTimestamp: Date.now(),
      isStarred: false,
    };
    setRecentProjects((prev) => [duplicatedItem, ...prev]);
  };

  const handleDeleteProject = async (id: string) => {
    if (projectService) {
      await projectService.deleteProject(id);
    }
    setRecentProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const handleExportProject = (proj: RecentProjectItem) => {
    try {
      const raw = localStorage.getItem(`lumina_project_${proj.id}`);
      let jsonContent = raw;
      if (!jsonContent) {
        jsonContent = JSON.stringify(
          {
            id: proj.id,
            name: proj.name,
            aspectRatio: proj.aspectRatio,
            fps: proj.fps,
            resolution: proj.resolution,
            duration: proj.duration,
            exportedAt: new Date().toISOString(),
            schemaVersion: 1,
          },
          null,
          2
        );
      }
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${proj.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_project.veecut.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export project:', err);
    }
  };

  const handleImportProjectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const importedId = parsed.id || `proj_imported_${Date.now()}`;
        const importedName = parsed.name || file.name.replace(/\.[^/.]+$/, '');
        localStorage.setItem(`lumina_project_${importedId}`, text);

        if (projectService) {
          await projectService.loadFromLocalStorage(importedId);
        }

        const newProj: RecentProjectItem = {
          id: importedId,
          name: importedName,
          thumbnail: generateDashboardThumbnail(importedName, 'cyan', parsed.settings?.aspectRatio || '16:9'),
          lastEdited: 'Just now',
          lastEditedTimestamp: Date.now(),
          duration: parsed.duration ? `${parsed.duration}s` : '00:01:00',
          resolution: `${parsed.settings?.canvasWidth || 1920} x ${parsed.settings?.canvasHeight || 1080}`,
          aspectRatio: (parsed.settings?.aspectRatio as any) || '16:9',
          fps: parsed.settings?.frameRate?.numerator || 60,
          size: `${Math.round(file.size / 1024)} KB`,
          tags: ['Imported JSON', parsed.settings?.aspectRatio || '16:9'],
          isStarred: false,
        };
        setRecentProjects((prev) => [newProj, ...prev]);

        onOpenEditor({
          projectName: importedName,
          aspectRatio: parsed.settings?.aspectRatio || '16:9',
          fps: parsed.settings?.frameRate?.numerator || 60,
        });
      } catch (err) {
        console.error('Failed to parse project file:', err);
        notifyToast('Invalid VeeCut project JSON file format.', 'error');
      }
    };
    reader.readAsText(file);
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
    setRecentProjects((prev) => [newProj, ...prev]);

    onOpenEditor({
      projectName: `${template.name} - Edit`,
      aspectRatio: template.aspectRatio,
      templateId: template.id,
    });
  };

  const handleImportMediaFiles = (files: FileList) => {
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
    setRecentProjects((prev) => [newProj, ...prev]);

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
    setRecentProjects((prev) => [newProj, ...prev]);

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

  const handleDeleteProjectDirect = (id: string) => {
    handleDeleteProject(id);
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

  // Search filter calculations
  const queryLower = searchQuery.toLowerCase().trim();
  const matchedProjects = queryLower
    ? recentProjects.filter(
        (p) =>
          p.name.toLowerCase().includes(queryLower) ||
          p.tags.some((t) => t.toLowerCase().includes(queryLower))
      )
    : [];
  const matchedTemplates = queryLower
    ? TRENDING_TEMPLATES.filter(
        (t) =>
          t.name.toLowerCase().includes(queryLower) ||
          t.category.toLowerCase().includes(queryLower)
      )
    : [];
  const matchedAITools = queryLower
    ? AI_TOOLS_LIST.filter(
        (a) =>
          a.name.toLowerCase().includes(queryLower) ||
          a.description.toLowerCase().includes(queryLower) ||
          a.features.some((f) => f.toLowerCase().includes(queryLower))
      )
    : [];
  const matchedAssets = queryLower
    ? ASSETS_LIBRARY.filter(
        (s) =>
          s.name.toLowerCase().includes(queryLower) ||
          s.category.toLowerCase().includes(queryLower) ||
          s.tags.some((t) => t.toLowerCase().includes(queryLower))
      )
    : [];
  const totalResultsCount =
    matchedProjects.length + matchedTemplates.length + matchedAITools.length + matchedAssets.length;

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
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* 2. MAIN CONTENT WRAPPER */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex flex-col gap-8 md:gap-10">
        {searchQuery.trim().length > 0 ? (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Search Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-white tracking-tight">Search Results</h1>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold">
                    {totalResultsCount} found
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Showing matches for <span className="text-white font-semibold">"{searchQuery}"</span> across projects, templates, AI tools, and stock media
                </p>
              </div>
              <button
                onClick={() => setSearchQuery('')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear Search</span>
              </button>
            </div>

            {totalResultsCount === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-4">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-zinc-200">No results found</h3>
                <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-6">
                  We couldn't find any projects, templates, or AI tools matching "{searchQuery}". Try different keywords.
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 rounded-xl bg-cyan-400 text-black font-bold text-xs hover:bg-cyan-300 transition cursor-pointer"
                >
                  Clear Search & View All
                </button>
              </div>
            ) : (
              <div className="space-y-10">
                {/* Matched Projects */}
                {matchedProjects.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-cyan-400" />
                      <span>Projects ({matchedProjects.length})</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {matchedProjects.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleOpenExistingProject(p)}
                          className="p-3.5 rounded-xl bg-[#12141f] border border-zinc-800 hover:border-cyan-500/50 cursor-pointer flex items-center gap-3 transition"
                        >
                          <img src={p.thumbnail} alt={p.name} className="w-16 h-10 object-cover rounded-md" />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xs font-bold text-zinc-200 truncate">{p.name}</h3>
                            <p className="text-[10px] text-zinc-500">{p.resolution} • {p.duration}</p>
                          </div>
                          <Play className="w-4 h-4 text-cyan-400 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matched AI Tools */}
                {matchedAITools.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>AI Tools ({matchedAITools.length})</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {matchedAITools.map((tool) => (
                        <div
                          key={tool.id}
                          onClick={() => setSelectedAITool(tool)}
                          className="p-3.5 rounded-xl bg-[#12141f] border border-zinc-800 hover:border-amber-500/50 cursor-pointer flex items-start gap-3 transition"
                        >
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                            <Wand2 className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xs font-bold text-zinc-200 truncate">{tool.name}</h3>
                            <p className="text-[10px] text-zinc-500 line-clamp-2 mt-0.5">{tool.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matched Templates */}
                {matchedTemplates.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                      <Video className="w-4 h-4 text-purple-400" />
                      <span>Templates ({matchedTemplates.length})</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {matchedTemplates.map((tpl) => (
                        <div
                          key={tpl.id}
                          onClick={() => handleUseTemplate(tpl)}
                          className="p-3 rounded-xl bg-[#12141f] border border-zinc-800 hover:border-purple-500/50 cursor-pointer flex flex-col gap-2 transition"
                        >
                          <div className="aspect-video w-full rounded-lg overflow-hidden bg-zinc-900">
                            <img src={tpl.thumbnail} alt={tpl.name} className="w-full h-full object-cover" />
                          </div>
                          <h3 className="text-xs font-bold text-zinc-200 truncate">{tpl.name}</h3>
                          <span className="text-[10px] text-purple-400 font-mono">{tpl.category}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matched Assets */}
                {matchedAssets.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                      <Music className="w-4 h-4 text-emerald-400" />
                      <span>Stock Media & Audio ({matchedAssets.length})</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {matchedAssets.map((asset) => (
                        <div
                          key={asset.id}
                          onClick={() => handleAddAsset(asset)}
                          className="p-3.5 rounded-xl bg-[#12141f] border border-zinc-800 hover:border-emerald-500/50 cursor-pointer flex items-center gap-3 transition"
                        >
                          <img src={asset.thumbnail} alt={asset.name} className="w-12 h-12 object-cover rounded-lg" />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xs font-bold text-zinc-200 truncate">{asset.name}</h3>
                            <p className="text-[10px] text-zinc-500">{asset.category} • {asset.duration || asset.format || asset.type}</p>
                          </div>
                          <span className="text-xs text-emerald-400 font-semibold shrink-0">Use</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
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
              onDuplicateProject={handleDuplicateProject}
              onRenameProject={handleRenameProject}
              onExportProject={handleExportProject}
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
              onPreviewAsset={(asset) => setPreviewAsset(asset)}
            />
          </>
        )}

        {/* Dedicated "Projects" Tab */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Studio Projects</h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Manage all local and cloud-persisted VeeCut editing sessions ({recentProjects.length} total)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  ref={projectFileInputRef}
                  type="file"
                  accept=".json,.veecut.json"
                  onChange={handleImportProjectFile}
                  className="hidden"
                />
                <button
                  onClick={() => projectFileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700/80 transition shadow-sm cursor-pointer"
                >
                  <span>Import Project JSON</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedCanvasPreset(null);
                    setIsNewProjectModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold transition shadow-lg shadow-cyan-950/30 cursor-pointer"
                >
                  <span>New Project</span>
                </button>
              </div>
            </div>

            <RecentProjectsSection
              projects={recentProjects}
              onOpenProject={handleOpenExistingProject}
              onViewAllProjects={() => setIsAllProjectsModalOpen(true)}
              onDeleteProject={handleDeleteProject}
              onToggleStar={handleToggleStar}
              onDuplicateProject={handleDuplicateProject}
              onRenameProject={handleRenameProject}
              onExportProject={handleExportProject}
            />
          </div>
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
            onPreviewAsset={(asset) => setPreviewAsset(asset)}
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
        </>
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
        onDuplicateProject={handleDuplicateProject}
        onRenameProject={handleRenameProject}
        onExportProject={handleExportProject}
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

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Asset Preview Modal */}
      {previewAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  {previewAsset.category}
                </span>
                <span className="text-sm font-semibold text-zinc-100 truncate">{previewAsset.name}</span>
              </div>
              <button
                onClick={() => setPreviewAsset(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                {previewAsset.previewUrl ? (
                  <img src={previewAsset.previewUrl} alt={previewAsset.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <Video className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                    <span className="text-xs text-zinc-400">{previewAsset.name}</span>
                  </div>
                )}
                {previewAsset.duration && (
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-zinc-300 backdrop-blur-xs">
                    {previewAsset.duration}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">Resolution / Quality</span>
                  <span className="font-semibold text-zinc-200">{previewAsset.resolution || '4K UHD / 60fps'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">Format & License</span>
                  <span className="font-semibold text-zinc-200">Broadcast Master • Royalty-Free</span>
                </div>
              </div>

              {previewAsset.tags && previewAsset.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {previewAsset.tags.map((t, idx) => (
                    <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-end gap-2">
              <button
                onClick={() => setPreviewAsset(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleAddAsset(previewAsset);
                  setPreviewAsset(null);
                }}
                className="px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold transition shadow-md shadow-cyan-950/30 cursor-pointer flex items-center gap-1.5"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Add to Project</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
