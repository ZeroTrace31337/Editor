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
import {
  RationalTime,
  createRationalTime,
  rationalTimeToSeconds,
  formatTimecode,
} from '../../core/time/RationalTime';
import { ColorGrade, createDefaultColorGrade } from '../../domain/color/ColorGrade';

export type WorkspaceMode = 'edit' | 'adjust' | 'effects' | 'color' | 'audio' | 'export' | 'deliver';

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
  
  // State Setters & Actions
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  setSelectedClipId: (id: string | null) => void;
  setSnappingEnabled: (enabled: boolean) => void;
  setTimelineZoom: (zoom: number) => void;
  setActiveSnapGuideline: (time: RationalTime | null) => void;
  toggleBeforeAfter: () => void;
  setBeforeAfterActive: (active: boolean) => void;
  seek: (time: RationalTime) => void;
  seekSeconds: (seconds: number) => void;
  togglePlay: () => void;
  undo: () => void;
  redo: () => void;
  importFile: (file: File) => Promise<void>;
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

  const toggleBeforeAfter = () => {
    setBeforeAfterActive((prev) => !prev);
  };

  // Keyboard shortcut listener for Before/After toggle ('\') and Space for Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input, textarea, etc.
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

  // Find currently selected clip object
  const selectedClip: TimelineClip | null = useMemo(() => {
    if (!selectedClipId) return null;
    const res = timelineEngine.findClip(selectedClipId);
    return res ? res.clip : null;
  }, [selectedClipId, timelineEngine, project]);

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

  const importFile = async (file: File) => {
    const asset = await mediaRegistry.registerFile(file);
    project.mediaPool.push(asset);
    projectService.setProject({ ...project });
  };

  const addSampleMedia = async () => {
    // Generate Procedural High-Fidelity Thumbnails
    const thumbCinematic = createCinematicThumbnail('man_bokeh');
    const thumbCity = createCinematicThumbnail('city_night');
    const thumbForest = createCinematicThumbnail('forest');
    const thumbDrone = createCinematicThumbnail('drone');
    const thumbAudio = createCinematicThumbnail('waveform');
    const thumbLogo = createCinematicThumbnail('logo');

    // 1. Media Assets
    const assetCinematic = {
      id: 'asset_cinematic_01',
      name: 'Cinematic_01.mp4',
      type: 'video' as const,
      duration: createRationalTime(24 * 120000, 120000), // 00:24
      width: 1920,
      height: 1080,
      frameRate: { numerator: 60, denominator: 1 },
      thumbnailUrl: thumbCinematic,
      isProxy: false,
    };

    const assetCity = {
      id: 'asset_city_night',
      name: 'City_Night.mp4',
      type: 'video' as const,
      duration: createRationalTime(18 * 120000, 120000), // 00:18
      width: 1920,
      height: 1080,
      frameRate: { numerator: 60, denominator: 1 },
      thumbnailUrl: thumbCity,
      isProxy: false,
    };

    const assetForest = {
      id: 'asset_forest_walk',
      name: 'Forest_Walk.mp4',
      type: 'video' as const,
      duration: createRationalTime(32 * 120000, 120000), // 00:32
      width: 1920,
      height: 1080,
      frameRate: { numerator: 60, denominator: 1 },
      thumbnailUrl: thumbForest,
      isProxy: false,
    };

    const assetDrone = {
      id: 'asset_drone_shot',
      name: 'Drone_Shot.mp4',
      type: 'video' as const,
      duration: createRationalTime(26 * 120000, 120000), // 00:26
      width: 1920,
      height: 1080,
      frameRate: { numerator: 60, denominator: 1 },
      thumbnailUrl: thumbDrone,
      isProxy: false,
    };

    const assetMusic = {
      id: 'asset_music_track',
      name: 'Music_Track.mp3',
      type: 'audio' as const,
      duration: createRationalTime(222 * 120000, 120000), // 03:42
      thumbnailUrl: thumbAudio,
      isProxy: false,
    };

    const assetLogo = {
      id: 'asset_logo_png',
      name: 'Logo.png',
      type: 'image' as const,
      duration: createRationalTime(6 * 120000, 120000), // 00:06
      width: 512,
      height: 512,
      thumbnailUrl: thumbLogo,
      isProxy: false,
    };

    project.mediaPool = [assetCinematic, assetCity, assetForest, assetDrone, assetMusic, assetLogo];

    // 2. Multi-track arrangement
    const trackV3 = createTrack('track_v3', 'Video 3', 'video');
    const trackV2 = createTrack('track_v2', 'Video 2', 'video');
    const trackV1 = createTrack('track_v1', 'Video 1', 'video');
    const trackA1 = createTrack('track_a1', 'Audio 1', 'audio');
    const trackA2 = createTrack('track_a2', 'Music', 'audio');

    // Clip 1 on V3: Forest_Walk.mp4
    const clipForest = createBaseClip(
      'clip_forest_walk',
      'video',
      'Forest_Walk.mp4',
      trackV3.id,
      { start: createRationalTime(7 * 120000, 120000), duration: createRationalTime(18 * 120000, 120000) },
      { start: createRationalTime(0), duration: createRationalTime(18 * 120000, 120000) }
    );
    (clipForest as any).mediaAssetId = assetForest.id;
    (clipForest as any).thumbnailUrl = thumbForest;
    clipForest.effects = [
      {
        id: 'fx_forest_glow',
        effectId: 'glow',
        name: 'Glow',
        enabled: true,
        params: { radius: 15, intensity: 0.8 },
        opacity: 1.0,
      },
    ];

    // Clip 2 on V2: City_Night.mp4
    const clipCity = createBaseClip(
      'clip_city_night',
      'video',
      'City_Night.mp4',
      trackV2.id,
      { start: createRationalTime(12 * 120000, 120000), duration: createRationalTime(20 * 120000, 120000) },
      { start: createRationalTime(0), duration: createRationalTime(20 * 120000, 120000) }
    );
    (clipCity as any).mediaAssetId = assetCity.id;
    (clipCity as any).thumbnailUrl = thumbCity;
    clipCity.effects = [
      {
        id: 'fx_city_sharpen',
        effectId: 'sharpen',
        name: 'Sharpen',
        enabled: true,
        params: { amount: 0.6 },
        opacity: 1.0,
      },
    ];

    // Clip 3 on V2: Drone_Shot.mp4
    const clipDrone = createBaseClip(
      'clip_drone_shot',
      'video',
      'Drone_Shot.mp4',
      trackV2.id,
      { start: createRationalTime(65 * 120000, 120000), duration: createRationalTime(20 * 120000, 120000) },
      { start: createRationalTime(0), duration: createRationalTime(20 * 120000, 120000) }
    );
    (clipDrone as any).mediaAssetId = assetDrone.id;
    (clipDrone as any).thumbnailUrl = thumbDrone;

    // Clip 4 on V1: Cinematic_01.mp4 (Selected Hero clip)
    const clipCinematic = createBaseClip(
      'clip_cinematic_01',
      'video',
      'Cinematic_01.mp4',
      trackV1.id,
      { start: createRationalTime(0), duration: createRationalTime(48 * 120000, 120000) },
      { start: createRationalTime(0), duration: createRationalTime(48 * 120000, 120000) }
    );
    (clipCinematic as any).mediaAssetId = assetCinematic.id;
    (clipCinematic as any).thumbnailUrl = thumbCinematic;

    const defaultGrade = createDefaultColorGrade();
    clipCinematic.colorGrade = {
      ...defaultGrade,
      exposure: 3.10,
      contrast: 1.20,
      highlights: -0.30,
      shadows: 0.40,
      whites: 0.15,
      blacks: -0.20,
      saturation: 1.10,
      vibrance: 0.60,
      temperature: 4,
      tint: 0,
      hue: 0.00,
      sharpen: 0.40,
      clarity: 0.25,
      noiseReduction: 0.30,
    };

    // Clip 5 on A1: Music_Track.mp3
    const clipMusic = createBaseClip(
      'clip_music_track',
      'audio',
      'Music_Track.mp3',
      trackA1.id,
      { start: createRationalTime(8 * 120000, 120000), duration: createRationalTime(77 * 120000, 120000) },
      { start: createRationalTime(0), duration: createRationalTime(77 * 120000, 120000) }
    );
    (clipMusic as any).mediaAssetId = assetMusic.id;
    (clipMusic as any).volume = 1.0;
    (clipMusic as any).pan = 0.0;

    trackV3.clips = [clipForest as TimelineClip];
    trackV2.clips = [clipCity as TimelineClip, clipDrone as TimelineClip];
    trackV1.clips = [clipCinematic as TimelineClip];
    trackA1.clips = [clipMusic as TimelineClip];
    trackA2.clips = [];

    const seq = project.sequences[0];
    seq.tracks = [trackV3, trackV2, trackV1, trackA1, trackA2];
    seq.duration = createRationalTime(86 * 120000, 120000); // 01:26:08

    projectService.setProject({ ...project });
    setSelectedClipId(clipCinematic.id);
    playbackEngine.seek(createRationalTime(12.5 * 120000, 120000)); // ~00:12:14
  };

  // Automatically initialize sample clips on first load if empty
  useEffect(() => {
    if (project.mediaPool.length === 0) {
      addSampleMedia();
    }
  }, []);

  const currentTimeSeconds = rationalTimeToSeconds(currentTime);
  const formattedTimecode = formatTimecode(currentTime, project.settings.frameRate);

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
