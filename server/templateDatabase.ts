/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { Template, CreateTemplatePayload, TemplateFilterOptions } from '../src/domain/template/Template';
import { SEED_TEMPLATES } from '../src/domain/template/templateData';

const DATA_DIR = path.join(process.cwd(), 'data');
const TEMPLATES_DB_FILE = path.join(DATA_DIR, 'templates_db.json');

// Relational-like schema tables stored for persistent server database
export interface DatabaseSchema {
  templates: Template[];
  template_versions: {
    id: string;
    templateId: string;
    version: number;
    snapshot: Template;
    createdAt: string;
  }[];
  template_usage: {
    id: string;
    templateId: string;
    usedAt: string;
    userId?: string;
  }[];
  favorites: {
    templateId: string;
    favoritedAt: string;
  }[];
  trend_snapshots: {
    id: string;
    platform: string;
    data: any;
    capturedAt: string;
  }[];
}

export class TemplateDatabase {
  private static instance: TemplateDatabase;
  private db: DatabaseSchema = {
    templates: [],
    template_versions: [],
    template_usage: [],
    favorites: [],
    trend_snapshots: [],
  };

  private constructor() {
    this.initializeDatabase();
  }

  public static getInstance(): TemplateDatabase {
    if (!TemplateDatabase.instance) {
      TemplateDatabase.instance = new TemplateDatabase();
    }
    return TemplateDatabase.instance;
  }

  private initializeDatabase() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (err) {
        console.warn('Could not create data directory:', err);
      }
    }

    try {
      if (fs.existsSync(TEMPLATES_DB_FILE)) {
        const raw = fs.readFileSync(TEMPLATES_DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.templates)) {
          this.db = parsed;
          // Merge any newly introduced seed templates if missing
          const existingIds = new Set(this.db.templates.map((t) => t.id));
          let hasNewSeeds = false;
          for (const seed of SEED_TEMPLATES) {
            if (!existingIds.has(seed.id)) {
              this.db.templates.push(seed);
              hasNewSeeds = true;
            }
          }
          if (hasNewSeeds) {
            this.saveToDisk();
          }
          return;
        }
      }
    } catch (err) {
      console.warn('Could not read existing templates DB file, initializing fresh:', err);
    }

    // Default seed initialization
    this.db.templates = [...SEED_TEMPLATES];
    this.saveToDisk();
  }

  private saveToDisk() {
    try {
      fs.writeFileSync(TEMPLATES_DB_FILE, JSON.stringify(this.db, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not save templates DB to disk:', err);
    }
  }

  public getAllTemplates(): Template[] {
    return this.db.templates;
  }

  public getTemplateById(id: string): Template | undefined {
    return this.db.templates.find((t) => t.id === id);
  }

  public createTemplate(payload: CreateTemplatePayload): Template {
    const id = `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const minutes = Math.floor(payload.durationSeconds / 60).toString().padStart(2, '0');
    const seconds = Math.floor(payload.durationSeconds % 60).toString().padStart(2, '0');

    const newTemplate: Template = {
      id,
      name: payload.name,
      category: payload.category,
      primaryPlatform: payload.primaryPlatform || 'general',
      platforms: payload.platforms || ['general'],
      description: payload.description || 'Custom template created in VeeCut Studio.',
      thumbnail: payload.thumbnail,
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
        name: payload.creatorName || 'VeeCut Creator',
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

    this.db.templates.unshift(newTemplate);

    // Save version record
    this.db.template_versions.push({
      id: `ver_${Date.now()}`,
      templateId: id,
      version: 1,
      snapshot: newTemplate,
      createdAt: new Date().toISOString(),
    });

    this.saveToDisk();
    return newTemplate;
  }

  public updateTemplate(id: string, updates: Partial<Template>): Template | null {
    const index = this.db.templates.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const current = this.db.templates[index];
    const newVersion = (current.version || 1) + 1;
    const updated: Template = {
      ...current,
      ...updates,
      version: newVersion,
    };

    this.db.templates[index] = updated;

    this.db.template_versions.push({
      id: `ver_${Date.now()}`,
      templateId: id,
      version: newVersion,
      snapshot: updated,
      createdAt: new Date().toISOString(),
    });

    this.saveToDisk();
    return updated;
  }

  public deleteTemplate(id: string): boolean {
    const prevLen = this.db.templates.length;
    this.db.templates = this.db.templates.filter((t) => t.id !== id);
    if (this.db.templates.length !== prevLen) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  public recordUsage(templateId: string) {
    const template = this.db.templates.find((t) => t.id === templateId);
    if (template) {
      template.usageCount = (template.usageCount || 0) + 1;
    }
    this.db.template_usage.push({
      id: `use_${Date.now()}`,
      templateId,
      usedAt: new Date().toISOString(),
    });
    this.saveToDisk();
  }

  public toggleFavorite(templateId: string): boolean {
    const existingIndex = this.db.favorites.findIndex((f) => f.templateId === templateId);
    let isFav = false;
    if (existingIndex >= 0) {
      this.db.favorites.splice(existingIndex, 1);
      isFav = false;
    } else {
      this.db.favorites.push({
        templateId,
        favoritedAt: new Date().toISOString(),
      });
      isFav = true;
    }
    this.saveToDisk();
    return isFav;
  }

  public queryTemplates(filter: Partial<TemplateFilterOptions> = {}): { items: Template[]; total: number } {
    let list = [...this.db.templates];

    // Category filter
    if (filter.category && filter.category !== 'all') {
      if (filter.category === 'trending') {
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
        const inCreator = t.creator.name.toLowerCase().includes(q);
        const inCategory = t.category.toLowerCase().includes(q);
        const inStyle = t.style.toLowerCase().includes(q);
        return inName || inDesc || inTags || inCreator || inCategory || inStyle;
      });
    }

    // Aspect ratio filter
    if (filter.aspectRatio && filter.aspectRatio !== 'all') {
      list = list.filter((t) => t.aspectRatio === filter.aspectRatio);
    }

    // Duration filter
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

    // AI Only
    if (filter.aiOnly) {
      list = list.filter((t) => t.isAIPowered || t.category === 'ai_templates');
    }

    // Sorting
    const sort = filter.sortBy || 'recommended';
    list.sort((a, b) => {
      if (sort === 'popular' || sort === 'recommended') {
        const aScore = a.usageCount + (a.likesCount || 0) * 5 + (a.isTrending ? 50000 : 0);
        const bScore = b.usageCount + (b.likesCount || 0) * 5 + (b.isTrending ? 50000 : 0);
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

    return {
      items: list,
      total: list.length,
    };
  }
}
