/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Template,
  TemplateCategoryInfo,
  TemplateFilterOptions,
  TemplateSortOption,
  CreateTemplatePayload,
  UserMediaSlotAssignment,
  UserTextSlotAssignment,
  TemplatePlatform,
} from './Template';
import { TEMPLATE_CATEGORIES } from './templateCategories';
import { SEED_TEMPLATES } from './templateData';
import { Project, createNewProject } from '../project/Project';
import { createTrack } from '../timeline/Track';
import {
  VideoClip,
  ImageClip,
  TextClip,
  AudioClip,
  createBaseClip,
} from '../timeline/Clip';
import {
  secondsToRationalTime,
  createRationalTime,
  rationalTimeToSeconds,
  COMMON_FRAME_RATES,
} from '../../core/time/RationalTime';
import { MediaAsset } from '../media/MediaAsset';
import { createCinematicThumbnail } from '../../rendering/assets/ProceduralThumbnails';

const FAVORITES_STORAGE_KEY = 'veecut_template_favorites';
const CUSTOM_TEMPLATES_STORAGE_KEY = 'veecut_custom_templates';

export class TemplateService {
  private static instance: TemplateService;
  private customTemplates: Template[] = [];
  private serverTemplates: Template[] = [];
  private favorites: Set<string> = new Set();
  private isSyncing = false;

  private constructor() {
    this.loadFavorites();
    this.loadCustomTemplates();
    this.syncWithServer();
  }

  public static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  private loadFavorites(): void {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.favorites = new Set(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not load template favorites from localStorage', e);
    }
  }

  private saveFavorites(): void {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(this.favorites)));
    } catch (e) {
      console.warn('Could not save template favorites to localStorage', e);
    }
  }

  private loadCustomTemplates(): void {
    try {
      const stored = localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.customTemplates = parsed;
        }
      }
    } catch (e) {
      console.warn('Could not load custom templates from localStorage', e);
    }
  }

  private saveCustomTemplatesToStorage(): void {
    try {
      localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(this.customTemplates));
    } catch (e) {
      console.warn('Could not save custom templates to localStorage', e);
    }
  }

  public async syncWithServer(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.items)) {
          this.serverTemplates = json.items;
        }
      }
    } catch (err) {
      console.warn('Could not sync templates with server backend, using local dataset:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  public getCategories(): TemplateCategoryInfo[] {
    return TEMPLATE_CATEGORIES;
  }

  public getAllTemplates(): Template[] {
    // Merge server templates with local custom templates and seed templates
    const map = new Map<string, Template>();
    for (const seed of SEED_TEMPLATES) {
      map.set(seed.id, seed);
    }
    for (const server of this.serverTemplates) {
      map.set(server.id, server);
    }
    for (const custom of this.customTemplates) {
      map.set(custom.id, custom);
    }
    return Array.from(map.values());
  }

  public getTemplateById(id: string): Template | undefined {
    return this.getAllTemplates().find((t) => t.id === id);
  }

  public isFavorite(templateId: string): boolean {
    return this.favorites.has(templateId);
  }

  public toggleFavorite(templateId: string): boolean {
    const isFav = this.favorites.has(templateId);
    if (isFav) {
      this.favorites.delete(templateId);
    } else {
      this.favorites.add(templateId);
    }
    this.saveFavorites();

    // Async notify backend
    fetch(`/api/templates/${templateId}/favorite`, { method: 'POST' }).catch(() => {});

    return !isFav;
  }

  public getFavoritesList(): string[] {
    return Array.from(this.favorites);
  }

  public recordTemplateUsage(templateId: string): void {
    const tmpl = this.getTemplateById(templateId);
    if (tmpl) {
      tmpl.usageCount = (tmpl.usageCount || 0) + 1;
    }
    fetch(`/api/templates/${templateId}/usage`, { method: 'POST' }).catch(() => {});
  }

  public getTemplates(filter?: Partial<TemplateFilterOptions>): Template[] {
    let list = this.getAllTemplates();

    if (!filter) return list;

    // Category filter
    if (filter.category && filter.category !== 'all') {
      if (filter.category === 'for_you') {
        return this.getForYouRecommendations();
      } else if (filter.category === 'trending') {
        list = list.filter((t) => t.isTrending || t.usageCount > 100000);
      } else if (filter.category === 'new') {
        list = list.filter((t) => t.isNew || new Date(t.createdAt).getTime() > Date.now() - 30 * 86400000);
      } else {
        list = list.filter((t) => t.category === filter.category);
      }
    }

    // Platform filter
    if (filter.platform && filter.platform !== 'all') {
      list = list.filter((t) => {
        if (t.primaryPlatform === filter.platform) return true;
        if (t.platforms && t.platforms.includes(filter.platform as any)) return true;
        return false;
      });
    }

    // Search query
    if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
      const q = filter.searchQuery.toLowerCase().trim();
      list = list.filter((t) => {
        const inName = t.name.toLowerCase().includes(q);
        const inDesc = t.description.toLowerCase().includes(q);
        const inTags = t.tags.some((tag) => tag.toLowerCase().includes(q));
        const inCreator = t.creator.name.toLowerCase().includes(q) || (t.creator.handle && t.creator.handle.toLowerCase().includes(q));
        const inCategory = t.category.toLowerCase().includes(q);
        const inStyle = t.style.toLowerCase().includes(q);
        return inName || inDesc || inTags || inCreator || inCategory || inStyle;
      });
    }

    // Aspect ratio filter
    if (filter.aspectRatio && filter.aspectRatio !== 'all') {
      list = list.filter((t) => t.aspectRatio === filter.aspectRatio);
    }

    // Duration bucket filter
    if (filter.durationBucket && filter.durationBucket !== 'all') {
      list = list.filter((t) => {
        const sec = t.durationSeconds;
        switch (filter.durationBucket) {
          case 'under_10':
            return sec < 10;
          case '10_30':
            return sec >= 10 && sec <= 30;
          case '30_60':
            return sec > 30 && sec <= 60;
          case '60_plus':
            return sec > 60;
          default:
            return true;
        }
      });
    }

    // Style filter
    if (filter.style && filter.style !== 'all') {
      list = list.filter((t) => t.style === filter.style);
    }

    // Region filter
    if (filter.region && filter.region !== 'all') {
      list = list.filter((t) => !t.region || t.region === 'GLOBAL' || t.region === filter.region);
    }

    // Language filter
    if (filter.language && filter.language !== 'all') {
      list = list.filter((t) => !t.language || t.language === filter.language);
    }

    // Favorites only
    if (filter.favoritesOnly) {
      list = list.filter((t) => this.favorites.has(t.id));
    }

    // AI Only
    if (filter.aiOnly) {
      list = list.filter((t) => t.isAIPowered || t.category === 'ai_templates');
    }

    // Sorting
    const sort = filter.sortBy || 'recommended';
    list = [...list].sort((a, b) => {
      if (sort === 'popular' || sort === 'recommended') {
        const aScore = a.usageCount + (a.likesCount || 0) * 5 + (this.favorites.has(a.id) ? 50000 : 0);
        const bScore = b.usageCount + (b.likesCount || 0) * 5 + (this.favorites.has(b.id) ? 50000 : 0);
        return bScore - aScore;
      }
      if (sort === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sort === 'most_used') {
        return b.usageCount - a.usageCount;
      }
      if (sort === 'trending_score') {
        return (b.isTrending ? 100 : 0) + (b.rating || 4.5) * 10 - ((a.isTrending ? 100 : 0) + (a.rating || 4.5) * 10);
      }
      return 0;
    });

    return list;
  }

  public getForYouRecommendations(limit = 12): Template[] {
    const all = this.getAllTemplates();
    const favs = this.favorites;

    // Score based on favorites category similarity, trending factor, and rating
    return [...all]
      .sort((a, b) => {
        let scoreA = (a.rating || 4.5) * 1000 + (a.isTrending ? 3000 : 0) + (a.isStaffPick ? 2000 : 0);
        let scoreB = (b.rating || 4.5) * 1000 + (b.isTrending ? 3000 : 0) + (b.isStaffPick ? 2000 : 0);

        if (favs.has(a.id)) scoreA += 10000;
        if (favs.has(b.id)) scoreB += 10000;

        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  public getTrendingTemplates(limit = 8): Template[] {
    return this.getAllTemplates()
      .filter((t) => t.isTrending || t.usageCount > 100000)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  public async saveCustomTemplate(payload: CreateTemplatePayload): Promise<Template> {
    const id = `tmpl_custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const minutes = Math.floor(payload.durationSeconds / 60).toString().padStart(2, '0');
    const seconds = Math.floor(payload.durationSeconds % 60).toString().padStart(2, '0');

    const newTemplate: Template = {
      id,
      name: payload.name,
      category: payload.category,
      primaryPlatform: payload.primaryPlatform || 'general',
      platforms: payload.platforms || ['general'],
      description: payload.description || 'Custom template created in VeeCut Studio.',
      thumbnail: payload.thumbnail || createCinematicThumbnail('man_bokeh'),
      previewVideoUrl: payload.previewVideoUrl,
      duration: `${minutes}:${seconds}`,
      durationSeconds: payload.durationSeconds,
      aspectRatio: payload.aspectRatio,
      width: payload.width,
      height: payload.height,
      fps: payload.fps,
      mediaSlots: payload.mediaSlots,
      textSlots: payload.textSlots,
      audioTrack: payload.audioTrack,
      transitions: payload.transitions || [],
      effects: payload.effects || [],
      filters: payload.filters || [],
      tags: payload.tags || ['Custom', 'User Created'],
      creator: {
        name: payload.creatorName || 'You (Creator)',
        handle: '@creator',
        verified: true,
      },
      usageCount: 1,
      likesCount: 1,
      rating: 5.0,
      isNew: true,
      isPublished: payload.isPublished !== undefined ? payload.isPublished : true,
      createdAt: new Date().toISOString(),
      style: payload.style,
      region: payload.region || 'GLOBAL',
      language: payload.language || 'en',
      version: 1,
      sourceType: 'community',
    };

    this.customTemplates.unshift(newTemplate);
    this.saveCustomTemplatesToStorage();

    // Async sync with backend server
    try {
      await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn('Could not persist template to backend server:', err);
    }

    return newTemplate;
  }

  public exportTemplateToJson(template: Template): string {
    return JSON.stringify(template, null, 2);
  }

  public importTemplateFromJson(jsonString: string): Template | null {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.name && parsed.aspectRatio && Array.isArray(parsed.mediaSlots)) {
        const imported: Template = {
          ...parsed,
          id: `tmpl_imported_${Date.now()}`,
          isNew: true,
          createdAt: new Date().toISOString(),
        };
        this.customTemplates.unshift(imported);
        this.saveCustomTemplatesToStorage();
        return imported;
      }
    } catch (err) {
      console.error('Failed to parse imported template JSON:', err);
    }
    return null;
  }

  /**
   * Generates a template payload from an active VeeCut Project
   */
  public createTemplateFromProject(
    project: Project,
    meta: {
      name: string;
      category: string;
      description?: string;
      thumbnail?: string;
    }
  ): CreateTemplatePayload {
    const seq = project.sequences[0];
    const durationSeconds = seq ? rationalTimeToSeconds(seq.duration) : 15;

    const mediaSlots = [];
    const textSlots = [];
    let audioTrack = undefined;

    let slotIdx = 0;
    let textIdx = 0;

    for (const track of seq.tracks) {
      if (track.kind === 'video') {
        for (const clip of track.clips) {
          if (clip.type === 'video' || clip.type === 'image') {
            const startSec = rationalTimeToSeconds(clip.timelineRange.start);
            const durSec = rationalTimeToSeconds(clip.timelineRange.duration);
            mediaSlots.push({
              id: `slot_${slotIdx + 1}`,
              slotIndex: slotIdx,
              name: clip.name || `Clip ${slotIdx + 1}`,
              type: (clip.type as any) || 'video',
              startTimeSeconds: startSec,
              durationSeconds: durSec,
              label: `Media Slot ${slotIdx + 1}`,
              defaultUrl: clip.type === 'image' ? 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800' : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800',
              thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400',
              cropBehavior: 'cover' as const,
              colorGrade: clip.colorGrade,
              transitionIn: clip.transitionIn,
              transitionOut: clip.transitionOut,
              effects: clip.effects,
            });
            slotIdx++;
          } else if (clip.type === 'text') {
            const textClip = clip as TextClip;
            const startSec = rationalTimeToSeconds(clip.timelineRange.start);
            const durSec = rationalTimeToSeconds(clip.timelineRange.duration);
            textSlots.push({
              id: `text_${textIdx + 1}`,
              slotIndex: textIdx,
              name: textClip.name || `Title ${textIdx + 1}`,
              defaultText: textClip.text || 'YOUR TEXT HERE',
              startTimeSeconds: startSec,
              durationSeconds: durSec,
              fontFamily: textClip.fontFamily || 'Montserrat',
              fontSize: textClip.fontSize || 48,
              fontWeight: textClip.fontWeight || '700',
              color: textClip.textColor || '#ffffff',
              alignment: textClip.alignment || 'center',
            });
            textIdx++;
          }
        }
      } else if (track.kind === 'audio' && !audioTrack && track.clips.length > 0) {
        const audioClip = track.clips[0] as AudioClip;
        const durSec = rationalTimeToSeconds(audioClip.timelineRange.duration);
        audioTrack = {
          id: `mus_${Date.now()}`,
          title: audioClip.name || 'Project Soundtrack',
          artist: 'VeeCut Audio',
          durationSeconds: durSec,
          bpm: 128,
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        };
      }
    }

    return {
      name: meta.name,
      category: meta.category as any,
      description: meta.description || 'Template created from VeeCut project timeline.',
      aspectRatio: project.settings.aspectRatio,
      width: project.settings.canvasWidth,
      height: project.settings.canvasHeight,
      fps: project.settings.frameRate.numerator / project.settings.frameRate.denominator,
      durationSeconds: Math.max(5, durationSeconds),
      thumbnail: meta.thumbnail || createCinematicThumbnail('man_bokeh'),
      style: 'Professional',
      tags: ['Project Template', 'Custom Edit'],
      mediaSlots,
      textSlots,
      audioTrack,
      transitions: ['Smooth Cut'],
      effects: [],
      filters: [],
    };
  }

  /**
   * Generates a fully populated, ready-to-edit Project from a Template and user assignments.
   */
  public generateProjectFromTemplate(
    template: Template,
    userMediaAssignments: UserMediaSlotAssignment[],
    userTextAssignments: UserTextSlotAssignment[],
    options?: {
      audioChoice?: 'template' | 'custom' | 'none';
      projectName?: string;
    }
  ): { project: Project; assetsToRegister: MediaAsset[] } {
    const projectName = options?.projectName || `${template.name} Edit`;
    const project = createNewProject(projectName);

    // Record usage metrics
    this.recordTemplateUsage(template.id);

    // Set canvas settings from template
    project.settings.canvasWidth = template.width;
    project.settings.canvasHeight = template.height;
    project.settings.aspectRatio = template.aspectRatio;
    project.settings.frameRate =
      template.fps === 60
        ? COMMON_FRAME_RATES.FPS_60
        : template.fps === 24
        ? COMMON_FRAME_RATES.FPS_24
        : COMMON_FRAME_RATES.FPS_30;

    const assetsToRegister: MediaAsset[] = [];
    const seq = project.sequences[0];

    // Define 4 Tracks: Video 1 (Main Media), Video 2 (Titles & Overlays), Audio 1 (Music), Audio 2 (Voice / SFX)
    const trackV1 = createTrack('track_v1', 'Media Base', 'video', true);
    const trackV2 = createTrack('track_v2', 'Titles & Overlays', 'video', false);
    const trackA1 = createTrack('track_a1', 'Soundtrack / Music', 'audio', false);
    const trackA2 = createTrack('track_a2', 'Voice / SFX', 'audio', false);

    // 1. POPULATE MEDIA SLOTS ONTO TRACK V1
    template.mediaSlots.forEach((slot, idx) => {
      const userAssignment = userMediaAssignments.find((a) => a.slotId === slot.id) || {
        slotId: slot.id,
        previewUrl: slot.defaultUrl,
        type: slot.type === 'image' ? 'image' : 'video',
        name: `${slot.label || `Media ${idx + 1}`}`,
      };

      const assetId = userAssignment.mediaAssetId || `asset_tmpl_${slot.id}_${Date.now()}_${idx}`;
      const startRational = secondsToRationalTime(slot.startTimeSeconds);
      const durationRational = secondsToRationalTime(slot.durationSeconds);
      const sourceStart = createRationalTime(0);

      // Create Media Asset
      const mediaAsset: MediaAsset = {
        id: assetId,
        name: userAssignment.name || `Clip ${idx + 1}`,
        type: userAssignment.type === 'image' ? 'image' : 'video',
        uri: userAssignment.previewUrl || slot.defaultUrl,
        fileSize: 15000000,
        duration: durationRational,
        thumbnailUrl: userAssignment.previewUrl || slot.thumbnailUrl,
        isOffline: false,
        importedAt: new Date().toISOString(),
        videoMetadata:
          userAssignment.type !== 'image'
            ? {
                width: template.width,
                height: template.height,
                fps: template.fps,
                codec: 'h264',
              }
            : undefined,
      };

      assetsToRegister.push(mediaAsset);

      // Create Timeline Clip
      const clipId = `clip_media_${slot.id}_${idx}`;
      const baseClip = createBaseClip(
        clipId,
        userAssignment.type === 'image' ? 'image' : 'video',
        userAssignment.name || slot.name,
        trackV1.id,
        { start: startRational, duration: durationRational },
        { start: sourceStart, duration: durationRational }
      );

      if (slot.colorGrade) {
        baseClip.colorGrade = { ...baseClip.colorGrade, ...slot.colorGrade };
      }
      if (slot.transitionIn) {
        baseClip.transitionIn = slot.transitionIn;
      }
      if (slot.transitionOut) {
        baseClip.transitionOut = slot.transitionOut;
      }
      if (slot.effects) {
        baseClip.effects = [...slot.effects];
      }
      if (slot.keyframeTracks) {
        baseClip.keyframeTracks = { ...slot.keyframeTracks };
      }

      if (userAssignment.type === 'image') {
        const imgClip: ImageClip = {
          ...baseClip,
          type: 'image',
          mediaAssetId: assetId,
        };
        trackV1.clips.push(imgClip);
      } else {
        const vidClip: VideoClip = {
          ...baseClip,
          type: 'video',
          mediaAssetId: assetId,
        };
        trackV1.clips.push(vidClip);
      }
    });

    // 2. POPULATE TEXT SLOTS ONTO TRACK V2
    template.textSlots.forEach((textSlot, idx) => {
      const userAssignment = userTextAssignments.find((a) => a.slotId === textSlot.id);
      const textToUse = userAssignment?.text ?? textSlot.defaultText;
      const startRational = secondsToRationalTime(textSlot.startTimeSeconds);
      const durationRational = secondsToRationalTime(textSlot.durationSeconds);
      const clipId = `clip_text_${textSlot.id}_${idx}`;

      const baseClip = createBaseClip(
        clipId,
        'text',
        textSlot.name,
        trackV2.id,
        { start: startRational, duration: durationRational },
        { start: createRationalTime(0), duration: durationRational }
      );

      const textClip: TextClip = {
        ...baseClip,
        type: 'text',
        text: textToUse,
        fontFamily: userAssignment?.fontFamily || textSlot.fontFamily || 'Montserrat',
        fontSize: userAssignment?.fontSize || textSlot.fontSize || 48,
        fontWeight: userAssignment?.fontWeight || textSlot.fontWeight || '700',
        textColor: userAssignment?.color || textSlot.color || '#ffffff',
        alignment: userAssignment?.alignment || textSlot.alignment || 'center',
        letterSpacing: userAssignment?.letterSpacing ?? textSlot.letterSpacing ?? 2,
        backgroundColor: textSlot.backgroundColor,
        backgroundOpacity: textSlot.backgroundOpacity,
        strokeColor: textSlot.strokeColor,
        strokeWidth: textSlot.strokeWidth,
        glowColor: textSlot.glowColor,
        glowIntensity: textSlot.glowIntensity,
        animation: (textSlot.animation as any) || 'fade',
      };

      trackV2.clips.push(textClip);
    });

    // 3. POPULATE AUDIO TRACK ONTO TRACK A1
    const audioChoice = options?.audioChoice ?? 'template';
    if (audioChoice === 'template' && template.audioTrack) {
      const audio = template.audioTrack;
      const audioAssetId = `asset_audio_${audio.id}_${Date.now()}`;
      const audioDurationRational = secondsToRationalTime(audio.durationSeconds || template.durationSeconds);

      const audioAsset: MediaAsset = {
        id: audioAssetId,
        name: `${audio.title} - ${audio.artist}`,
        type: 'audio',
        uri: audio.url || '',
        fileSize: 6000000,
        duration: audioDurationRational,
        thumbnailUrl: createCinematicThumbnail('waveform'),
        isOffline: false,
        importedAt: new Date().toISOString(),
        audioMetadata: {
          sampleRate: 48000,
          channels: 2,
          codec: 'aac',
        },
      };

      assetsToRegister.push(audioAsset);

      const audioClipId = `clip_audio_${audio.id}`;
      const baseClip = createBaseClip(
        audioClipId,
        'audio',
        audio.title,
        trackA1.id,
        { start: createRationalTime(0), duration: audioDurationRational },
        { start: createRationalTime(0), duration: audioDurationRational }
      );

      const audioClip: AudioClip = {
        ...baseClip,
        type: 'audio',
        mediaAssetId: audioAssetId,
        volume: audio.volume || 1.0,
        pan: 0,
        fadeInDuration: createRationalTime(0),
        fadeOutDuration: createRationalTime(0),
      };

      trackA1.clips.push(audioClip);
    }

    // Set sequence tracks and media pool
    seq.tracks = [trackV2, trackV1, trackA1, trackA2];
    seq.duration = secondsToRationalTime(template.durationSeconds);
    project.mediaPool = [...assetsToRegister];

    return { project, assetsToRegister };
  }
}
