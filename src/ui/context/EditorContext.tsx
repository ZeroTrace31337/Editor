/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { ProjectService } from '../../engine/project/ProjectService';
import { MediaRegistry } from '../../engine/media/MediaRegistry';
import { TimelineEngine } from '../../engine/timeline/TimelineEngine';
import { CommandManager } from '../../engine/command/CommandManager';
import { BrowserMediaProcessor } from '../../media-services/browser/BrowserMediaProcessor';
import { CanvasCompositor } from '../../rendering/compositor/CanvasCompositor';
import { PlaybackEngine } from '../../rendering/playback/PlaybackEngine';
import { CanvasVideoExporter } from '../../rendering/export/CanvasVideoExporter';
import { createCinematicThumbnail } from '../../rendering/assets/ProceduralThumbnails';
import { createTrack } from '../../domain/timeline/Track';
import { createBaseClip, TimelineClip } from '../../domain/timeline/Clip';
import { Project } from '../../domain/project/Project';
import { MediaAsset } from '../../domain/media/MediaAsset';
import {
  RationalTime,
  createRationalTime,
  rationalTimeToSeconds,
  formatTimecode,
} from '../../core/time/RationalTime';
import { KeyframeTrack, cloneKeyframeTrack } from '../../domain/keyframe/Keyframe';
import { KeyframeEvaluator } from '../../domain/keyframe/KeyframeEvaluator';
import { PasteKeyframesCommand } from '../../engine/command/implementations/PasteKeyframesCommand';
import { addRationalTime, subtractRationalTime } from '../../core/time/RationalTime';

export type WorkspaceMode = 'edit' | 'adjust' | 'effects' | 'color' | 'audio' | 'export' | 'deliver';

export interface UploadState {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'processing' | 'generating_thumbnail' | 'ready' | 'failed';
  error?: string;
}

export interface EditorContextValue {
  projectService: ProjectService;
  mediaRegistry: MediaRegistry;
  timelineEngine: TimelineEngine;
  commandManager: CommandManager;
  compositor: CanvasCompositor;
  playbackEngine: PlaybackEngine;
  exporter: CanvasVideoExporter;
  
  // Reactive UI State
  project: Project;
  currentTime: RationalTime;
  currentTimeSeconds: number;
  formattedTimecode: string;
  isPlaying: boolean;
  selectedClipId: string | null;
  selectedClip: TimelineClip | null;
  snappingEnabled: boolean;
  timelineZoom: number; // Pixels per second
  activeSnapGuideline: RationalTime | null;
  canUndo: boolean;
  canRedo: boolean;
  workspaceMode: WorkspaceMode;
  isBeforeAfterActive: boolean;

  // Upload Management State
  uploadStates: UploadState[];
  isUploading: boolean;

  // Keyframe System State
  autoKeyframeEnabled: boolean;
  selectedKeyframeId: string | null;
  selectedKeyframePropertyPath: string | null;
  isKeyframeLaneOpen: boolean;
  copiedKeyframes: { clipId: string; tracks: Record<string, KeyframeTrack<any>> } | null;
  
  // State Setters & Actions
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  setSelectedClipId: (id: string | null) => void;
  setSnappingEnabled: (enabled: boolean) => void;
  setTimelineZoom: (zoom: number) => void;
  setActiveSnapGuideline: (time: RationalTime | null) => void;
  toggleBeforeAfter: () => void;
  setBeforeAfterActive: (active: boolean) => void;
  setAutoKeyframeEnabled: (enabled: boolean) => void;
  setSelectedKeyframe: (propertyPath: string | null, keyframeId: string | null) => void;
  setKeyframeLaneOpen: (open: boolean) => void;
  copyClipKeyframes: (clipId?: string, propertyPath?: string) => void;
  pasteClipKeyframes: (targetClipId?: string, atPlayhead?: boolean) => void;
  jumpToPrevKeyframe: (propertyPath?: string) => void;
  jumpToNextKeyframe: (propertyPath?: string) => void;
  seek: (time: RationalTime) => void;
  seekSeconds: (seconds: number) => void;
  togglePlay: () => void;
  undo: () => void;
  redo: () => void;
  importFile: (file: File) => Promise<MediaAsset | null>;
  importFiles: (files: FileList | File[]) => Promise<MediaAsset[]>;
  removeMediaAsset: (assetId: string) => void;
  addSampleMedia: () => Promise<void>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mediaProcessor = useMemo(() => new BrowserMediaProcessor(), []);
  const mediaRegistry = useMemo(() => new MediaRegistry(mediaProcessor), [mediaProcessor]);
  const projectService = useMemo(() => new ProjectService(), []);
  const [project, setProject] = useState<Project>(projectService.getProject());
  
  // Stable Engine Singletons
  const initialProject = useMemo(() => projectService.getProject(), [projectService]);
  const initialSequence = useMemo(() => {
    return initialProject.sequences.find((s) => s.id === initialProject.activeSequenceId) || initialProject.sequences[0];
  }, [initialProject]);

  const timelineEngine = useMemo(() => new TimelineEngine(initialSequence), [initialSequence]);
  const commandManager = useMemo(() => new CommandManager(60), []);
  const compositor = useMemo(() => new CanvasCompositor(mediaRegistry), [mediaRegistry]);
  const playbackEngine = useMemo(() => new PlaybackEngine(initialSequence), [initialSequence]);
  const exporter = useMemo(() => new CanvasVideoExporter(timelineEngine, compositor), [timelineEngine, compositor]);

  const [currentTime, setCurrentTime] = useState<RationalTime>(createRationalTime(0));
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [snappingEnabled, setSnappingEnabled] = useState<boolean>(true);
  const [timelineZoom, setTimelineZoom] = useState<number>(60); // 60px = 1 second
  const [activeSnapGuideline, setActiveSnapGuideline] = useState<RationalTime | null>(null);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('edit');
  const [isBeforeAfterActive, setBeforeAfterActive] = useState<boolean>(false);

  // Upload States
  const [uploadStates, setUploadStates] = useState<UploadState[]>([]);

  // Keyframe State
  const [autoKeyframeEnabled, setAutoKeyframeEnabled] = useState<boolean>(false);
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null);
  const [selectedKeyframePropertyPath, setSelectedKeyframePropertyPath] = useState<string | null>(null);
  const [isKeyframeLaneOpen, setKeyframeLaneOpen] = useState<boolean>(false);
  const [copiedKeyframes, setCopiedKeyframes] = useState<{ clipId: string; tracks: Record<string, KeyframeTrack<any>> } | null>(null);

  const toggleBeforeAfter = () => {
    setBeforeAfterActive((prev) => !prev);
  };

  const setSelectedKeyframe = (propertyPath: string | null, keyframeId: string | null) => {
    setSelectedKeyframePropertyPath(propertyPath);
    setSelectedKeyframeId(keyframeId);
  };

  // Find currently selected clip object
  const selectedClip: TimelineClip | null = useMemo(() => {
    if (!selectedClipId) return null;
    const res = timelineEngine.findClip(selectedClipId);
    return res ? res.clip : null;
  }, [selectedClipId, timelineEngine, project]);

  const copyClipKeyframes = (clipId?: string, propertyPath?: string) => {
    const targetId = clipId || selectedClipId;
    if (!targetId) return;
    const found = timelineEngine.findClip(targetId);
    if (!found || !found.clip.keyframeTracks) return;

    const tracksToCopy: Record<string, KeyframeTrack<any>> = {};
    if (propertyPath) {
      if (found.clip.keyframeTracks[propertyPath]) {
        tracksToCopy[propertyPath] = cloneKeyframeTrack(found.clip.keyframeTracks[propertyPath] as KeyframeTrack<any>);
      }
    } else {
      for (const [path, track] of Object.entries(found.clip.keyframeTracks)) {
        if (track) {
          tracksToCopy[path] = cloneKeyframeTrack(track as KeyframeTrack<any>);
        }
      }
    }

    if (Object.keys(tracksToCopy).length > 0) {
      setCopiedKeyframes({ clipId: targetId, tracks: tracksToCopy });
    }
  };

  const pasteClipKeyframes = (targetClipId?: string, atPlayhead = true) => {
    const targetId = targetClipId || selectedClipId;
    if (!targetId || !copiedKeyframes) return;
    const found = timelineEngine.findClip(targetId);
    if (!found) return;

    let offset: RationalTime | undefined = undefined;
    if (atPlayhead) {
      const clipStart = found.clip.timelineRange.start;
      offset = subtractRationalTime(currentTime, clipStart);
      if (rationalTimeToSeconds(offset) < 0) {
        offset = createRationalTime(0);
      }
    }

    const cmd = new PasteKeyframesCommand(timelineEngine, targetId, copiedKeyframes.tracks, offset);
    commandManager.execute(cmd);
  };

  const jumpToPrevKeyframe = (propertyPath?: string) => {
    if (!selectedClip) return;
    const clipTime = subtractRationalTime(currentTime, selectedClip.timelineRange.start);
    if (propertyPath && selectedClip.keyframeTracks?.[propertyPath]) {
      const { prev } = KeyframeEvaluator.getNeighborKeyframes(selectedClip.keyframeTracks[propertyPath], clipTime);
      if (prev) {
        const globalTime = addRationalTime(selectedClip.timelineRange.start, prev.time);
        seek(globalTime);
        setSelectedKeyframe(propertyPath, prev.id);
        return;
      }
    }
    const { prev } = KeyframeEvaluator.getNeighborKeyframesAcrossClip(selectedClip, clipTime);
    if (prev) {
      const globalTime = addRationalTime(selectedClip.timelineRange.start, prev.time);
      seek(globalTime);
      setSelectedKeyframe(prev.propertyPath, prev.id);
    }
  };

  const jumpToNextKeyframe = (propertyPath?: string) => {
    if (!selectedClip) return;
    const clipTime = subtractRationalTime(currentTime, selectedClip.timelineRange.start);
    if (propertyPath && selectedClip.keyframeTracks?.[propertyPath]) {
      const { next } = KeyframeEvaluator.getNeighborKeyframes(selectedClip.keyframeTracks[propertyPath], clipTime);
      if (next) {
        const globalTime = addRationalTime(selectedClip.timelineRange.start, next.time);
        seek(globalTime);
        setSelectedKeyframe(propertyPath, next.id);
        return;
      }
    }
    const { next } = KeyframeEvaluator.getNeighborKeyframesAcrossClip(selectedClip, clipTime);
    if (next) {
      const globalTime = addRationalTime(selectedClip.timelineRange.start, next.time);
      seek(globalTime);
      setSelectedKeyframe(next.propertyPath, next.id);
    }
  };

  // Keyboard shortcut listener for Before/After toggle ('\')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === '\\') {
        e.preventDefault();
        toggleBeforeAfter();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Restore persistent media object URLs upon startup or project change
  useEffect(() => {
    const restoreAllAssets = async () => {
      const currProject = projectService.getProject();
      if (currProject && currProject.mediaPool) {
        for (const asset of currProject.mediaPool) {
          mediaRegistry.registerAsset(asset);
          await mediaRegistry.restoreAssetUri(asset);
        }
      }
    };
    restoreAllAssets();
  }, [projectService, mediaRegistry]);

  // Sync Project updates from projectService without recursive looping
  useEffect(() => {
    return projectService.subscribe(() => {
      const p = projectService.getProject();
      setProject(p);
      const seq = p.sequences.find((s) => s.id === p.activeSequenceId) || p.sequences[0];
      if (timelineEngine.getSequence() !== seq) {
        timelineEngine.setSequence(seq, false);
      }
      playbackEngine.setSequence(seq);
    });
  }, [projectService, timelineEngine, playbackEngine]);

  // Sync Timeline updates into state safely
  useEffect(() => {
    return timelineEngine.subscribe(() => {
      const updatedSeq = timelineEngine.getSequence();
      const currentProj = projectService.getProject();
      const seqIdx = currentProj.sequences.findIndex((s) => s.id === updatedSeq.id);
      if (seqIdx !== -1) {
        currentProj.sequences[seqIdx] = updatedSeq;
      }
      setProject({ ...currentProj });
      projectService.triggerAutosave();
    });
  }, [timelineEngine, projectService]);

  // Sync Playback Engine updates
  useEffect(() => {
    return playbackEngine.subscribe((time, playing) => {
      setCurrentTime(time);
      setIsPlaying(playing);
    });
  }, [playbackEngine]);

  // Sync Command Manager history state
  useEffect(() => {
    return commandManager.subscribe(() => {
      setCanUndo(commandManager.canUndo());
      setCanRedo(commandManager.canRedo());
    });
  }, [commandManager]);

  const seek = (time: RationalTime) => {
    playbackEngine.seek(time);
  };

  const seekSeconds = (seconds: number) => {
    playbackEngine.seekSeconds(seconds);
  };

  const togglePlay = () => {
    playbackEngine.togglePlay();
  };

  const undo = () => {
    commandManager.undo();
  };

  const redo = () => {
    commandManager.redo();
  };

  // Real User File Importer with validation, live progress states, and storage persistence
  const importFile = async (file: File): Promise<MediaAsset | null> => {
    const uploadId = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    // File validation
    const maxSizeBytes = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > maxSizeBytes) {
      setUploadStates((prev) => [
        {
          id: uploadId,
          name: file.name,
          size: file.size,
          progress: 0,
          status: 'failed',
          error: 'File size exceeds maximum supported limit (2GB)',
        },
        ...prev,
      ]);
      return null;
    }

    const stateItem: UploadState = {
      id: uploadId,
      name: file.name,
      size: file.size,
      progress: 10,
      status: 'uploading',
    };

    setUploadStates((prev) => [stateItem, ...prev]);

    try {
      // Step 1: Uploading
      setUploadStates((prev) =>
        prev.map((s) => (s.id === uploadId ? { ...s, progress: 40, status: 'processing' } : s))
      );

      // Step 2: Processing & thumbnail generation via MediaRegistry
      setUploadStates((prev) =>
        prev.map((s) => (s.id === uploadId ? { ...s, progress: 75, status: 'generating_thumbnail' } : s))
      );

      const asset = await mediaRegistry.importFile(file);

      // Step 3: Add to project media pool
      const currentProj = projectService.getProject();
      const existingIdx = currentProj.mediaPool.findIndex((m) => m.id === asset.id);
      if (existingIdx >= 0) {
        currentProj.mediaPool[existingIdx] = asset;
      } else {
        currentProj.mediaPool.unshift(asset);
      }

      projectService.setProject({ ...currentProj });
      projectService.saveToLocalStorage();

      // Step 4: Ready
      setUploadStates((prev) =>
        prev.map((s) => (s.id === uploadId ? { ...s, progress: 100, status: 'ready' } : s))
      );

      // Auto-clear ready items after 4 seconds
      setTimeout(() => {
        setUploadStates((prev) => prev.filter((s) => s.id !== uploadId));
      }, 4000);

      return asset;
    } catch (err: any) {
      console.error('Import error:', err);
      setUploadStates((prev) =>
        prev.map((s) =>
          s.id === uploadId
            ? {
                ...s,
                status: 'failed',
                error: err.message || 'Unsupported codec or corrupted file',
              }
            : s
        )
      );
      return null;
    }
  };

  const importFiles = async (files: FileList | File[]): Promise<MediaAsset[]> => {
    const list = Array.from(files);
    const results: MediaAsset[] = [];
    for (const f of list) {
      const res = await importFile(f);
      if (res) results.push(res);
    }
    return results;
  };

  const removeMediaAsset = (assetId: string) => {
    mediaRegistry.removeAsset(assetId);
    const currentProj = projectService.getProject();
    currentProj.mediaPool = currentProj.mediaPool.filter((a) => a.id !== assetId);
    projectService.setProject({ ...currentProj });
    projectService.saveToLocalStorage();
  };

  const addSampleMedia = async () => {
    // Kept separate: Sample/demo loader strictly when explicitly requested
    const thumbCinematic = createCinematicThumbnail('man_bokeh');
    const thumbCity = createCinematicThumbnail('city_night');
    const thumbForest = createCinematicThumbnail('forest');
    const thumbDrone = createCinematicThumbnail('drone');
    const thumbAudio = createCinematicThumbnail('waveform');
    const thumbLogo = createCinematicThumbnail('logo');

    const assetCinematic: MediaAsset = {
      id: 'sample_asset_cinematic_01',
      name: '[Sample] Cinematic_01.mp4',
      type: 'video',
      uri: '',
      fileSize: 15400000,
      duration: createRationalTime(24 * 120000, 120000),
      videoMetadata: { width: 1920, height: 1080, fps: 60, codec: 'h264' },
      thumbnailUrl: thumbCinematic,
      isOffline: false,
      importedAt: new Date().toISOString(),
    };

    const assetCity: MediaAsset = {
      id: 'sample_asset_city_night',
      name: '[Sample] City_Night.mp4',
      type: 'video',
      uri: '',
      fileSize: 12800000,
      duration: createRationalTime(18 * 120000, 120000),
      videoMetadata: { width: 1920, height: 1080, fps: 60, codec: 'h264' },
      thumbnailUrl: thumbCity,
      isOffline: false,
      importedAt: new Date().toISOString(),
    };

    const assetForest: MediaAsset = {
      id: 'sample_asset_forest_walk',
      name: '[Sample] Forest_Walk.mp4',
      type: 'video',
      uri: '',
      fileSize: 22000000,
      duration: createRationalTime(32 * 120000, 120000),
      videoMetadata: { width: 1920, height: 1080, fps: 60, codec: 'h264' },
      thumbnailUrl: thumbForest,
      isOffline: false,
      importedAt: new Date().toISOString(),
    };

    const assetDrone: MediaAsset = {
      id: 'sample_asset_drone_shot',
      name: '[Sample] Drone_Shot.mp4',
      type: 'video',
      uri: '',
      fileSize: 18500000,
      duration: createRationalTime(26 * 120000, 120000),
      videoMetadata: { width: 1920, height: 1080, fps: 60, codec: 'h264' },
      thumbnailUrl: thumbDrone,
      isOffline: false,
      importedAt: new Date().toISOString(),
    };

    const assetMusic: MediaAsset = {
      id: 'sample_asset_music_track',
      name: '[Sample] Music_Track.mp3',
      type: 'audio',
      uri: '',
      fileSize: 5600000,
      duration: createRationalTime(222 * 120000, 120000),
      thumbnailUrl: thumbAudio,
      isOffline: false,
      importedAt: new Date().toISOString(),
    };

    const sampleList = [assetCinematic, assetCity, assetForest, assetDrone, assetMusic];
    sampleList.forEach((a) => mediaRegistry.registerAsset(a));

    const currentProj = projectService.getProject();
    currentProj.mediaPool = [...currentProj.mediaPool, ...sampleList];
    projectService.setProject({ ...currentProj });
  };

  const currentTimeSeconds = rationalTimeToSeconds(currentTime);
  const formattedTimecode = formatTimecode(currentTime, project.settings.frameRate);
  const isUploading = uploadStates.some((u) => u.status === 'uploading' || u.status === 'processing' || u.status === 'generating_thumbnail');

  const value: EditorContextValue = {
    projectService,
    mediaRegistry,
    timelineEngine,
    commandManager,
    compositor,
    playbackEngine,
    exporter,
    project,
    currentTime,
    currentTimeSeconds,
    formattedTimecode,
    isPlaying,
    selectedClipId,
    selectedClip,
    snappingEnabled,
    timelineZoom,
    activeSnapGuideline,
    canUndo,
    canRedo,
    workspaceMode,
    isBeforeAfterActive,
    uploadStates,
    isUploading,
    autoKeyframeEnabled,
    selectedKeyframeId,
    selectedKeyframePropertyPath,
    copiedKeyframes,
    isKeyframeLaneOpen,
    setAutoKeyframeEnabled,
    setSelectedKeyframe,
    copyClipKeyframes,
    pasteClipKeyframes,
    jumpToPrevKeyframe,
    jumpToNextKeyframe,
    setKeyframeLaneOpen,
    setWorkspaceMode,
    setSelectedClipId,
    setSnappingEnabled,
    setTimelineZoom,
    setActiveSnapGuideline,
    toggleBeforeAfter,
    setBeforeAfterActive,
    seek,
    seekSeconds,
    togglePlay,
    undo,
    redo,
    importFile,
    importFiles,
    removeMediaAsset,
    addSampleMedia,
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
};

export const useEditor = (): EditorContextValue => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};
