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
  COMMON_FRAME_RATES,
} from '../../core/time/RationalTime';
import { MediaAsset } from '../media/MediaAsset';
import { createCinematicThumbnail } from '../../rendering/assets/ProceduralThumbnails';

const FAVORITES_STORAGE_KEY = 'veecut_template_favorites';
const CUSTOM_TEMPLATES_STORAGE_KEY = 'veecut_custom_templates';

export class TemplateService {
  private static instance: TemplateService;
  private customTemplates: Template[] = [];
  private favorites: Set<string> = new Set();

  private constructor() {
    this.loadFavorites();
    this.loadCustomTemplates();
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

  public getCategories(): TemplateCategoryInfo[] {
    return TEMPLATE_CATEGORIES;
  }

  public getAllTemplates(): Template[] {
    return [...this.customTemplates, ...SEED_TEMPLATES];
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
    return !isFav;
  }

  public getFavoritesList(): string[] {
    return Array.from(this.favorites);
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

  public saveCustomTemplate(payload: CreateTemplatePayload): Template {
    const id = `tmpl_custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const minutes = Math.floor(payload.durationSeconds / 60).toString().padStart(2, '0');
    const seconds = Math.floor(payload.durationSeconds % 60).toString().padStart(2, '0');

    const newTemplate: Template = {
      id,
      name: payload.name,
      category: payload.category,
      description: payload.description || 'Custom user created template.',
      thumbnail: payload.thumbnail || createCinematicThumbnail('man_bokeh'),
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
      createdAt: new Date().toISOString(),
      style: payload.style,
    };

    this.customTemplates.unshift(newTemplate);
    this.saveCustomTemplatesToStorage();
    return newTemplate;
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

    // Define 4 Tracks: Video 1 (Main Media), Video 2 (Overlays / Titles), Audio 1 (Music), Audio 2 (SFX / VO)
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
