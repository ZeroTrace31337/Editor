/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FilterPreset, PresetCategory, PresetScope } from '../../domain/preset/Preset';
import { ColorGrade, createDefaultColorGrade } from '../../domain/color/ColorGrade';

const LOCAL_STORAGE_KEY = 'lumina_custom_presets_v2';

export class PresetRegistry {
  private static instance: PresetRegistry;
  private presets: Map<string, FilterPreset> = new Map();
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.initDefaultPresets();
    this.loadCustomPresets();
  }

  public static getInstance(): PresetRegistry {
    if (!this.instance) {
      this.instance = new PresetRegistry();
    }
    return this.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  public getAllPresets(): FilterPreset[] {
    return Array.from(this.presets.values());
  }

  public getPresetsByCategory(category: PresetCategory | 'all'): FilterPreset[] {
    if (category === 'all') return this.getAllPresets();
    if (category === 'favorites') return this.getAllPresets().filter((p) => p.isFavorite);
    if (category === 'my_filters') return this.getAllPresets().filter((p) => p.isCustom);
    return this.getAllPresets().filter((p) => p.category === category);
  }

  public getPreset(id: string): FilterPreset | undefined {
    return this.presets.get(id);
  }

  public savePreset(preset: FilterPreset): void {
    this.presets.set(preset.id, preset);
    this.persistCustomPresets();
    this.notify();
  }

  public deletePreset(id: string): boolean {
    const preset = this.presets.get(id);
    if (!preset || !preset.isCustom) return false;
    this.presets.delete(id);
    this.persistCustomPresets();
    this.notify();
    return true;
  }

  public toggleFavorite(id: string): void {
    const preset = this.presets.get(id);
    if (preset) {
      preset.isFavorite = !preset.isFavorite;
      this.persistCustomPresets();
      this.notify();
    }
  }

  /**
   * Safe JSON preset import with structural schema validation
   */
  public importPresetFromJson(jsonString: string): FilterPreset {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      throw new Error('Invalid JSON format');
    }

    if (!parsed || typeof parsed !== 'object' || !parsed.name) {
      throw new Error('Preset missing required name property');
    }

    const newId = `custom_filter_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const imported: FilterPreset = {
      id: newId,
      name: String(parsed.name).slice(0, 50),
      category: 'custom',
      description: String(parsed.description || 'Imported filter preset').slice(0, 200),
      author: String(parsed.author || 'User').slice(0, 40),
      version: '2.0',
      scope: (['color', 'effects', 'transform_color_effects', 'full_clip'].includes(parsed.scope) ? parsed.scope : 'color') as PresetScope,
      intensity: typeof parsed.intensity === 'number' ? Math.max(0, Math.min(1, parsed.intensity)) : 1.0,
      colorGrade: parsed.colorGrade ? parsed.colorGrade : createDefaultColorGrade(),
      effects: Array.isArray(parsed.effects) ? parsed.effects : [],
      masks: Array.isArray(parsed.masks) ? parsed.masks : [],
      transform: parsed.transform,
      isCustom: true,
      isFavorite: false,
      createdAt: new Date().toISOString(),
    };

    this.savePreset(imported);
    return imported;
  }

  public exportPresetToJson(id: string): string {
    const preset = this.presets.get(id);
    if (!preset) throw new Error('Preset not found');
    return JSON.stringify(preset, null, 2);
  }

  private persistCustomPresets(): void {
    try {
      const customList = this.getAllPresets().filter((p) => p.isCustom);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customList));
    } catch (e) {
      console.warn('Failed to persist presets to localStorage', e);
    }
  }

  private loadCustomPresets(): void {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const list: FilterPreset[] = JSON.parse(raw);
        for (const p of list) {
          this.presets.set(p.id, { ...p, isCustom: true });
        }
      }
    } catch (e) {
      console.warn('Failed to load custom presets from localStorage', e);
    }
  }

  private initDefaultPresets(): void {
    const defaults: FilterPreset[] = [
      {
        id: 'preset_teal_orange',
        name: 'Blockbuster Teal & Orange',
        category: 'cinematic',
        description: 'Hollywood action grade with rich teal shadows and vibrant warm skin tones',
        author: 'Lumina Color Studio',
        version: '2.0',
        scope: 'color',
        intensity: 1.0,
        colorGrade: {
          ...createDefaultColorGrade(),
          contrast: 1.22,
          saturation: 1.15,
          temperature: 8,
          tint: -4,
          vignette: 0.18,
          wheels: {
            lift: { r: -0.15, g: 0.05, b: 0.22, y: -0.05 }, // Teal shadows
            gamma: { r: 0.04, g: -0.02, b: -0.04, y: 0.02 },
            gain: { r: 0.25, g: 0.08, b: -0.18, y: 0.05 },  // Warm orange highlights
            offset: { r: 0, g: 0, b: 0, y: 0 },
          },
        },
        createdAt: '2026-01-01',
      },
      {
        id: 'preset_vintage_35mm',
        name: 'Kodak 35mm Film Grain',
        category: 'film',
        description: 'Warm organic grain, compressed dynamic range, and soft lifted blacks',
        author: 'Analog Archive',
        version: '2.0',
        scope: 'transform_color_effects',
        intensity: 1.0,
        colorGrade: {
          ...createDefaultColorGrade(),
          contrast: 1.1,
          saturation: 0.92,
          temperature: 14,
          tint: 6,
          vignette: 0.25,
          wheels: {
            lift: { r: 0.08, g: 0.04, b: -0.02, y: 0.08 },
            gamma: { r: 0.05, g: 0.02, b: -0.02, y: 0 },
            gain: { r: 0.12, g: 0.08, b: 0.02, y: -0.04 },
            offset: { r: 0, g: 0, b: 0, y: 0 },
          },
        },
        effects: [
          {
            id: 'fx_grain_1',
            effectId: 'film_grain',
            name: 'Film Grain',
            enabled: true,
            opacity: 1.0,
            params: { intensity: 0.45, size: 1.2 },
          },
        ],
        createdAt: '2026-01-01',
      },
      {
        id: 'preset_noir_bw',
        name: 'Classic Hollywood Noir B&W',
        category: 'black_white',
        description: 'Ultra high-contrast monochrome with deep inky shadows and sharp punch',
        author: 'Lumina Color Studio',
        version: '2.0',
        scope: 'color',
        intensity: 1.0,
        colorGrade: {
          ...createDefaultColorGrade(),
          saturation: 0.0,
          contrast: 1.45,
          exposure: 0.1,
          vignette: 0.35,
          wheels: {
            lift: { r: 0, g: 0, b: 0, y: -0.12 },
            gamma: { r: 0, g: 0, b: 0, y: 0.05 },
            gain: { r: 0, g: 0, b: 0, y: 0.15 },
            offset: { r: 0, g: 0, b: 0, y: 0 },
          },
        },
        createdAt: '2026-01-01',
      },
      {
        id: 'preset_cyberpunk_neon',
        name: 'Cyberpunk Neon Nights',
        category: 'creative',
        description: 'Vivid magenta highlights, deep electric cyan shadows, and hyper contrast',
        author: 'Neo Tokyo FX',
        version: '2.0',
        scope: 'color',
        intensity: 1.0,
        colorGrade: {
          ...createDefaultColorGrade(),
          contrast: 1.35,
          saturation: 1.4,
          vibrance: 25,
          vignette: 0.22,
          wheels: {
            lift: { r: -0.2, g: 0.1, b: 0.3, y: -0.04 },
            gamma: { r: 0.15, g: -0.1, b: 0.2, y: 0 },
            gain: { r: 0.35, g: -0.15, b: 0.3, y: 0.08 },
            offset: { r: 0, g: 0, b: 0, y: 0 },
          },
        },
        createdAt: '2026-01-01',
      },
      {
        id: 'preset_golden_sunset',
        name: 'Golden Hour Sunset Glow',
        category: 'warm',
        description: 'Lush golden midtones, warm radiant highlights, and soft dreamy tones',
        author: 'Landscape Pro',
        version: '2.0',
        scope: 'color',
        intensity: 1.0,
        colorGrade: {
          ...createDefaultColorGrade(),
          contrast: 1.12,
          saturation: 1.18,
          temperature: 28,
          tint: 10,
          vignette: 0.15,
          wheels: {
            lift: { r: 0.05, g: -0.02, b: -0.08, y: 0.02 },
            gamma: { r: 0.18, g: 0.08, b: -0.12, y: 0.04 },
            gain: { r: 0.28, g: 0.15, b: -0.1, y: 0.06 },
            offset: { r: 0, g: 0, b: 0, y: 0 },
          },
        },
        createdAt: '2026-01-01',
      },
      {
        id: 'preset_cool_nordic',
        name: 'Nordic Chill Atmosphere',
        category: 'cool',
        description: 'Subtle desaturated palette with crisp clean cyan-blue atmosphere',
        author: 'Scandi Film',
        version: '2.0',
        scope: 'color',
        intensity: 1.0,
        colorGrade: {
          ...createDefaultColorGrade(),
          contrast: 1.15,
          saturation: 0.85,
          temperature: -24,
          tint: -8,
          vignette: 0.12,
          wheels: {
            lift: { r: -0.08, g: 0.02, b: 0.12, y: 0 },
            gamma: { r: -0.04, g: 0.01, b: 0.06, y: 0 },
            gain: { r: -0.05, g: 0.05, b: 0.15, y: 0.02 },
            offset: { r: 0, g: 0, b: 0, y: 0 },
          },
        },
        createdAt: '2026-01-01',
      },
      {
        id: 'preset_clean_portrait',
        name: 'Clean Studio Portrait',
        category: 'portrait',
        description: 'Soft flattering roll-off, natural healthy skin tones, and gentle contrast',
        author: 'Studio Lighting Lab',
        version: '2.0',
        scope: 'color',
        intensity: 1.0,
        colorGrade: {
          ...createDefaultColorGrade(),
          contrast: 1.06,
          saturation: 1.05,
          brightness: 0.04,
          temperature: 4,
          tint: 2,
          vignette: 0.08,
          wheels: {
            lift: { r: 0.02, g: 0.01, b: -0.01, y: 0.02 },
            gamma: { r: 0.04, g: 0.01, b: -0.02, y: 0.02 },
            gain: { r: 0.06, g: 0.04, b: 0.01, y: 0.02 },
            offset: { r: 0, g: 0, b: 0, y: 0 },
          },
        },
        createdAt: '2026-01-01',
      },
    ];

    for (const p of defaults) {
      this.presets.set(p.id, p);
    }
  }
}
