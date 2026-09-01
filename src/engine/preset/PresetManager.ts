/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FilterPreset, PresetCategory, ActiveFilterConfig } from '../../domain/preset/Preset';
import { BUILT_IN_FILTER_PRESETS, FILTER_CATEGORIES_METADATA } from '../../domain/preset/filterPresetsData';
import { ColorGrade, createDefaultColorGrade, HslBand } from '../../domain/color/ColorGrade';
import { EffectInstance } from '../../rendering/effects/EffectTypes';
import { BaseClip } from '../../domain/timeline/Clip';

const CUSTOM_PRESETS_STORAGE_KEY = 'veecut_user_custom_presets_v2';
const FAVORITES_STORAGE_KEY = 'veecut_filter_favorites_v2';
const USER_SIGNALS_STORAGE_KEY = 'veecut_user_filter_signals_v1';

export interface FilterFilterOptions {
  category?: string;
  searchQuery?: string;
  sortBy?: 'popular' | 'trending' | 'newest' | 'name' | 'rating';
  favoritesOnly?: boolean;
}

interface UserSignals {
  appliedCategories: Record<string, number>;
  appliedPresetIds: string[];
  lastSearchTerms: string[];
  favoriteCategories: Record<string, number>;
}

export class PresetManager {
  private static instance: PresetManager;
  private presets: FilterPreset[] = [];
  private favorites: Set<string> = new Set();
  private userSignals: UserSignals = {
    appliedCategories: {},
    appliedPresetIds: [],
    lastSearchTerms: [],
    favoriteCategories: {},
  };
  private isSyncing = false;

  private constructor() {
    this.loadFavorites();
    this.loadUserSignals();
    this.loadPresets();
    this.syncWithServer();
  }

  public static getInstance(): PresetManager {
    if (!PresetManager.instance) {
      PresetManager.instance = new PresetManager();
    }
    return PresetManager.instance;
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
      console.warn('Could not load filter favorites from storage:', e);
    }
  }

  private saveFavorites(): void {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(this.favorites)));
    } catch (e) {
      console.warn('Could not save filter favorites to storage:', e);
    }
  }

  private loadUserSignals(): void {
    try {
      const stored = localStorage.getItem(USER_SIGNALS_STORAGE_KEY);
      if (stored) {
        this.userSignals = { ...this.userSignals, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Could not load user filter signals:', e);
    }
  }

  private saveUserSignals(): void {
    try {
      localStorage.setItem(USER_SIGNALS_STORAGE_KEY, JSON.stringify(this.userSignals));
    } catch (e) {
      console.warn('Could not save user filter signals:', e);
    }
  }

  public recordInteraction(presetId: string, action: 'apply' | 'favorite' | 'search', query?: string): void {
    const preset = this.getPresetById(presetId);
    if (preset) {
      const cat = preset.category;
      if (action === 'apply') {
        this.userSignals.appliedCategories[cat] = (this.userSignals.appliedCategories[cat] || 0) + 1;
        this.userSignals.appliedPresetIds.unshift(presetId);
        if (this.userSignals.appliedPresetIds.length > 50) {
          this.userSignals.appliedPresetIds.pop();
        }
      } else if (action === 'favorite') {
        this.userSignals.favoriteCategories[cat] = (this.userSignals.favoriteCategories[cat] || 0) + 1;
      }
    }
    if (action === 'search' && query) {
      this.userSignals.lastSearchTerms.unshift(query.toLowerCase().trim());
      if (this.userSignals.lastSearchTerms.length > 20) {
        this.userSignals.lastSearchTerms.pop();
      }
    }
    this.saveUserSignals();
  }

  private loadPresets(): void {
    // 1. Built-in professional presets
    const builtIn: FilterPreset[] = BUILT_IN_FILTER_PRESETS.map((p) => ({
      ...p,
      isFavorite: this.favorites.has(p.id),
    }));

    // 2. Load custom user presets from localStorage
    let userCustom: FilterPreset[] = [];
    try {
      const stored = localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          userCustom = parsed.map((p) => ({
            ...p,
            isCustom: true,
            isFavorite: this.favorites.has(p.id),
          }));
        }
      }
    } catch (e) {
      console.warn('Could not load custom presets from storage:', e);
    }

    this.presets = [...builtIn, ...userCustom];
  }

  private async syncWithServer(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;
    try {
      const res = await fetch('/api/presets');
      if (res.ok) {
        const serverData = await res.json();
        if (serverData && Array.isArray(serverData.presets)) {
          const serverPresets: FilterPreset[] = serverData.presets;
          const currentIds = new Set(this.presets.map((p) => p.id));
          for (const sp of serverPresets) {
            if (!currentIds.has(sp.id)) {
              this.presets.push({
                ...sp,
                isFavorite: this.favorites.has(sp.id),
              });
            }
          }
        }
      }
    } catch {
      // Backend not running or offline, keep local presets
    } finally {
      this.isSyncing = false;
    }
  }

  public getCategories() {
    return FILTER_CATEGORIES_METADATA;
  }

  public getAllPresets(): FilterPreset[] {
    return this.presets.map((p) => ({
      ...p,
      isFavorite: this.favorites.has(p.id),
    }));
  }

  public getPresetById(id: string): FilterPreset | undefined {
    const p = this.presets.find((item) => item.id === id);
    if (!p) return undefined;
    return {
      ...p,
      isFavorite: this.favorites.has(p.id),
    };
  }

  public getVeeCutOriginals(): FilterPreset[] {
    return this.getAllPresets().filter((p) => p.category === 'veecut_originals' || p.isOriginal);
  }

  public getNewPresets(limit = 12): FilterPreset[] {
    return this.getAllPresets()
      .filter((p) => p.isNew || p.category === 'new')
      .slice(0, limit);
  }

  public getPresetsByCategory(category: string): FilterPreset[] {
    if (category === 'all') {
      return this.getAllPresets();
    }
    if (category === 'for_you') {
      return this.getForYouRecommendations();
    }
    if (category === 'trending') {
      return this.getTrendingPresets();
    }
    if (category === 'new') {
      return this.getNewPresets();
    }
    if (category === 'veecut_originals') {
      return this.getVeeCutOriginals();
    }
    if (category === 'favorites') {
      return this.getAllPresets().filter((p) => this.favorites.has(p.id));
    }
    if (category === 'my_filters') {
      return this.getAllPresets().filter((p) => p.isCustom);
    }
    return this.getAllPresets().filter((p) => p.category === category);
  }

  public queryPresets(options: FilterFilterOptions): FilterPreset[] {
    let result = this.getAllPresets();

    // Category filter
    if (options.category && options.category !== 'all') {
      if (options.category === 'for_you') {
        result = this.getForYouRecommendations();
      } else if (options.category === 'trending') {
        result = this.getTrendingPresets();
      } else if (options.category === 'new') {
        result = this.getNewPresets();
      } else if (options.category === 'veecut_originals') {
        result = this.getVeeCutOriginals();
      } else if (options.category === 'favorites') {
        result = result.filter((p) => this.favorites.has(p.id));
      } else if (options.category === 'my_filters') {
        result = result.filter((p) => p.isCustom);
      } else {
        result = result.filter((p) => p.category === options.category);
      }
    }

    // Favorites only
    if (options.favoritesOnly) {
      result = result.filter((p) => this.favorites.has(p.id));
    }

    // Search query
    if (options.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase().trim();
      this.recordInteraction('', 'search', q);
      result = result.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q);
        const descMatch = p.description.toLowerCase().includes(q);
        const tagMatch = p.tags && p.tags.some((t) => t.toLowerCase().includes(q));
        const authorMatch = p.author && p.author.toLowerCase().includes(q);
        const catMatch = p.category.toLowerCase().includes(q);
        return nameMatch || descMatch || tagMatch || authorMatch || catMatch;
      });
    }

    // Sorting
    const sortBy = options.sortBy || 'popular';
    result = [...result].sort((a, b) => {
      if (sortBy === 'popular') {
        return (b.popularityScore || 50) - (a.popularityScore || 50);
      }
      if (sortBy === 'trending') {
        return (b.usageCount || 0) - (a.usageCount || 0);
      }
      if (sortBy === 'rating') {
        return (b.rating || 4.5) - (a.rating || 4.5);
      }
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return result;
  }

  public getTrendingPresets(limit = 12): FilterPreset[] {
    return this.getAllPresets()
      .filter((p) => p.isTrending || (p.popularityScore || 0) >= 90)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, limit);
  }

  public getForYouRecommendations(limit = 12): FilterPreset[] {
    const all = this.getAllPresets();
    return [...all]
      .sort((a, b) => {
        let scoreA = (a.rating || 4.5) * 1000 + (a.isTrending ? 2000 : 0) + (a.isOriginal ? 3000 : 0);
        let scoreB = (b.rating || 4.5) * 1000 + (b.isTrending ? 2000 : 0) + (b.isOriginal ? 3000 : 0);

        // Boost favorited presets and categories
        if (this.favorites.has(a.id)) scoreA += 6000;
        if (this.favorites.has(b.id)) scoreB += 6000;

        const catAffinityA = this.userSignals.appliedCategories[a.category] || 0;
        const catAffinityB = this.userSignals.appliedCategories[b.category] || 0;
        scoreA += catAffinityA * 500;
        scoreB += catAffinityB * 500;

        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  public toggleFavorite(id: string): boolean {
    if (this.favorites.has(id)) {
      this.favorites.delete(id);
      this.saveFavorites();
      return false;
    } else {
      this.favorites.add(id);
      this.saveFavorites();
      this.recordInteraction(id, 'favorite');
      return true;
    }
  }

  public isFavorite(id: string): boolean {
    return this.favorites.has(id);
  }

  /**
   * Applies a filter preset non-destructively to a clip
   */
  public applyPresetToClip(clip: BaseClip, preset: FilterPreset, intensity = 1.0): void {
    // Preserve base color grade and base effects if this is the first filter applied
    if (!clip.baseColorGrade) {
      clip.baseColorGrade = JSON.parse(JSON.stringify(clip.colorGrade));
    }
    if (!clip.baseEffects) {
      clip.baseEffects = JSON.parse(JSON.stringify(clip.effects || []));
    }

    const clampedIntensity = Math.max(0, Math.min(1, intensity));

    clip.activeFilter = {
      presetId: preset.id,
      presetName: preset.name,
      intensity: clampedIntensity,
      category: preset.category,
      appliedAt: new Date().toISOString(),
      presetData: preset,
    };

    if (preset.colorGrade) {
      clip.colorGrade = this.blendColorGradeWithPreset(
        clip.baseColorGrade,
        preset.colorGrade,
        clampedIntensity
      );
    }

    if (preset.effects && preset.effects.length > 0) {
      clip.effects = this.blendEffectsWithPreset(
        clip.baseEffects || [],
        preset.effects,
        clampedIntensity
      );
    } else {
      clip.effects = JSON.parse(JSON.stringify(clip.baseEffects || []));
    }

    this.recordInteraction(preset.id, 'apply');
  }

  /**
   * Modifies filter intensity non-destructively for an active clip filter
   */
  public setClipFilterIntensity(clip: BaseClip, intensity: number): void {
    if (!clip.activeFilter) return;

    const clampedIntensity = Math.max(0, Math.min(1, intensity));
    clip.activeFilter.intensity = clampedIntensity;

    const preset = clip.activeFilter.presetData || this.getPresetById(clip.activeFilter.presetId);
    if (!preset) return;

    const baseGrade = clip.baseColorGrade || createDefaultColorGrade();
    if (preset.colorGrade) {
      clip.colorGrade = this.blendColorGradeWithPreset(baseGrade, preset.colorGrade, clampedIntensity);
    }

    const baseFx = clip.baseEffects || [];
    if (preset.effects && preset.effects.length > 0) {
      clip.effects = this.blendEffectsWithPreset(baseFx, preset.effects, clampedIntensity);
    } else {
      clip.effects = JSON.parse(JSON.stringify(baseFx));
    }
  }

  /**
   * Removes active filter and cleanly restores original base media adjustments
   */
  public removeFilterFromClip(clip: BaseClip): void {
    if (clip.baseColorGrade) {
      clip.colorGrade = JSON.parse(JSON.stringify(clip.baseColorGrade));
    }
    if (clip.baseEffects) {
      clip.effects = JSON.parse(JSON.stringify(clip.baseEffects));
    }
    clip.activeFilter = undefined;
    clip.baseColorGrade = undefined;
    clip.baseEffects = undefined;
  }

  public saveCustomPreset(payload: {
    name: string;
    category?: PresetCategory;
    description?: string;
    colorGrade?: ColorGrade;
    effects?: EffectInstance[];
    scope?: FilterPreset['scope'];
    author?: string;
    tags?: string[];
  }): FilterPreset {
    const id = `preset_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newPreset: FilterPreset = {
      id,
      name: payload.name,
      category: payload.category || 'my_filters',
      description: payload.description || 'Custom filter preset saved in VeeCut Studio.',
      author: payload.author || 'You (Creator)',
      version: '1.0',
      scope: payload.scope || 'color',
      intensity: 1.0,
      colorGrade: payload.colorGrade ? JSON.parse(JSON.stringify(payload.colorGrade)) : undefined,
      effects: payload.effects ? JSON.parse(JSON.stringify(payload.effects)) : undefined,
      tags: payload.tags || ['Custom', 'Look'],
      rating: 5.0,
      popularityScore: 70,
      usageCount: 1,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    this.presets.unshift(newPreset);
    this.persistCustomPresets();

    // Async sync with server
    fetch('/api/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPreset),
    }).catch(() => {});

    return newPreset;
  }

  public updateCustomPreset(id: string, updates: Partial<FilterPreset>): FilterPreset | null {
    const target = this.presets.find((p) => p.id === id);
    if (!target) return null;

    Object.assign(target, updates, { updatedAt: new Date().toISOString() });
    this.persistCustomPresets();
    return target;
  }

  public duplicatePreset(id: string): FilterPreset | null {
    const source = this.getPresetById(id);
    if (!source) return null;

    const dupId = `preset_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const duplicate: FilterPreset = {
      ...JSON.parse(JSON.stringify(source)),
      id: dupId,
      name: `${source.name} (Copy)`,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    this.presets.unshift(duplicate);
    this.persistCustomPresets();
    return duplicate;
  }

  public deleteCustomPreset(id: string): boolean {
    const index = this.presets.findIndex((p) => p.id === id && p.isCustom);
    if (index !== -1) {
      this.presets.splice(index, 1);
      this.favorites.delete(id);
      this.saveFavorites();
      this.persistCustomPresets();
      return true;
    }
    return false;
  }

  private persistCustomPresets(): void {
    try {
      const customOnly = this.presets.filter((p) => p.isCustom);
      localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(customOnly));
    } catch (e) {
      console.warn('Could not persist custom presets:', e);
    }
  }

  public exportPresetsJson(): string {
    return JSON.stringify(this.presets, null, 2);
  }

  public importPresetsJson(jsonStr: string): number {
    try {
      const imported: FilterPreset[] = JSON.parse(jsonStr);
      let count = 0;
      if (Array.isArray(imported)) {
        for (const p of imported) {
          if (p && p.name && !this.presets.some((existing) => existing.id === p.id)) {
            this.presets.unshift({
              ...p,
              id: p.id || `preset_imp_${Date.now()}_${count}`,
              isCustom: true,
            });
            count++;
          }
        }
        if (count > 0) {
          this.persistCustomPresets();
        }
      }
      return count;
    } catch (e) {
      throw new Error('Invalid preset JSON file format');
    }
  }

  /**
   * Blends a base ColorGrade with a target Preset's ColorGrade according to an intensity factor [0.0 - 1.0].
   */
  public blendColorGradeWithPreset(
    base: ColorGrade,
    presetGrade: ColorGrade,
    intensity: number
  ): ColorGrade {
    const t = Math.max(0, Math.min(1, intensity));
    const neutral = createDefaultColorGrade();
    const lerp = (a: number, b: number) => a + (b - a) * t;

    // Deep clone base
    const blended: ColorGrade = JSON.parse(JSON.stringify(base));

    // Basic controls
    blended.exposure = lerp(base.exposure ?? neutral.exposure, presetGrade.exposure ?? neutral.exposure);
    blended.contrast = lerp(base.contrast ?? neutral.contrast, presetGrade.contrast ?? neutral.contrast);
    blended.brightness = lerp(base.brightness ?? neutral.brightness, presetGrade.brightness ?? neutral.brightness);
    blended.brilliance = lerp(base.brilliance ?? neutral.brilliance ?? 0, presetGrade.brilliance ?? 0);
    blended.saturation = lerp(base.saturation ?? neutral.saturation, presetGrade.saturation ?? neutral.saturation);
    blended.vibrance = lerp(base.vibrance ?? neutral.vibrance, presetGrade.vibrance ?? neutral.vibrance);
    blended.temperature = lerp(base.temperature ?? neutral.temperature, presetGrade.temperature ?? neutral.temperature);
    blended.tint = lerp(base.tint ?? neutral.tint, presetGrade.tint ?? neutral.tint);
    blended.highlights = lerp(base.highlights ?? neutral.highlights, presetGrade.highlights ?? neutral.highlights);
    blended.shadows = lerp(base.shadows ?? neutral.shadows, presetGrade.shadows ?? neutral.shadows);
    blended.whites = lerp(base.whites ?? neutral.whites, presetGrade.whites ?? neutral.whites);
    blended.blacks = lerp(base.blacks ?? neutral.blacks, presetGrade.blacks ?? neutral.blacks);
    blended.clarity = lerp(base.clarity ?? neutral.clarity, presetGrade.clarity ?? neutral.clarity);
    blended.sharpen = lerp(base.sharpen ?? neutral.sharpen, presetGrade.sharpen ?? neutral.sharpen);
    blended.fade = lerp(base.fade ?? neutral.fade, presetGrade.fade ?? neutral.fade);
    blended.grain = lerp(base.grain ?? neutral.grain, presetGrade.grain ?? neutral.grain);
    blended.vignette = lerp(base.vignette ?? neutral.vignette, presetGrade.vignette ?? neutral.vignette);

    // LUT
    if (presetGrade.lutId) {
      blended.lutId = presetGrade.lutId;
      blended.lutIntensity = (presetGrade.lutIntensity ?? 1.0) * t;
    }

    // Wheels blending
    if (presetGrade.wheels) {
      const blendWheel = (wKey: 'lift' | 'gamma' | 'gain' | 'offset') => {
        const pw = presetGrade.wheels?.[wKey];
        const bw = base.wheels?.[wKey] || { r: 0, g: 0, b: 0, y: 0 };
        if (pw) {
          return {
            r: bw.r + pw.r * t,
            g: bw.g + pw.g * t,
            b: bw.b + pw.b * t,
            y: bw.y + pw.y * t,
          };
        }
        return bw;
      };

      blended.wheels = {
        lift: blendWheel('lift'),
        gamma: blendWheel('gamma'),
        gain: blendWheel('gain'),
        offset: blendWheel('offset'),
      };
    }

    // 8-Band HSL blending
    if (presetGrade.hsl) {
      const blendHslBand = (bandKey: keyof NonNullable<ColorGrade['hsl']>): HslBand => {
        const bBand = base.hsl?.[bandKey];
        const pBand = presetGrade.hsl?.[bandKey];
        const rangeCenter = pBand?.rangeCenter ?? bBand?.rangeCenter ?? 0;
        const rangeWidth = pBand?.rangeWidth ?? bBand?.rangeWidth ?? 45;
        const softness = pBand?.softness ?? bBand?.softness ?? 20;

        const bHue = bBand?.hue ?? 0;
        const pHue = pBand?.hue ?? 0;
        const bSat = bBand?.saturation ?? 0;
        const pSat = pBand?.saturation ?? 0;
        const bLum = bBand?.luminance ?? 0;
        const pLum = pBand?.luminance ?? 0;

        return {
          hue: lerp(bHue, pHue),
          saturation: lerp(bSat, pSat),
          luminance: lerp(bLum, pLum),
          rangeCenter,
          rangeWidth,
          softness,
        };
      };

      blended.hsl = {
        red: blendHslBand('red'),
        orange: blendHslBand('orange'),
        yellow: blendHslBand('yellow'),
        green: blendHslBand('green'),
        cyan: blendHslBand('cyan'),
        blue: blendHslBand('blue'),
        purple: blendHslBand('purple'),
        magenta: blendHslBand('magenta'),
      };
    }

    // Tone curves blending
    if (presetGrade.curves) {
      const blendCurve = (channel: 'master' | 'red' | 'green' | 'blue') => {
        const pCurve = presetGrade.curves?.[channel];
        const bCurve = base.curves?.[channel];
        if (!pCurve) return bCurve || [];
        return pCurve.map((pt, idx) => {
          const bPt = bCurve?.[idx] || { x: pt.x, y: pt.x };
          return {
            x: pt.x,
            y: lerp(bPt.y, pt.y),
          };
        });
      };

      blended.curves = {
        master: blendCurve('master'),
        red: blendCurve('red'),
        green: blendCurve('green'),
        blue: blendCurve('blue'),
      };
    }

    return blended;
  }

  /**
   * Applies preset effects scaled by intensity
   */
  public blendEffectsWithPreset(
    baseEffects: EffectInstance[],
    presetEffects: EffectInstance[],
    intensity: number
  ): EffectInstance[] {
    const t = Math.max(0, Math.min(1, intensity));
    const result = [...baseEffects];

    for (const pe of presetEffects) {
      const scaledEffect: EffectInstance = {
        ...pe,
        id: `fx_${pe.effectId}_${Date.now()}`,
        opacity: (pe.opacity ?? 1.0) * t,
        enabled: t > 0.05,
      };
      result.push(scaledEffect);
    }

    return result;
  }
}
