/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FilterPreset } from '../../domain/preset/Preset';
import { createDefaultColorGrade } from '../../domain/color/ColorGrade';

const LOCAL_STORAGE_KEY = 'lumina_user_presets_v1';

export class PresetManager {
  private static instance: PresetManager;
  private presets: FilterPreset[] = [];

  private constructor() {
    this.loadPresets();
  }

  public static getInstance(): PresetManager {
    if (!PresetManager.instance) {
      PresetManager.instance = new PresetManager();
    }
    return PresetManager.instance;
  }

  private loadPresets(): void {
    // 1. Built-in professional cinematic presets
    const builtIn: FilterPreset[] = [
      {
        id: 'preset_teal_orange',
        name: 'Blockbuster Teal & Orange',
        category: 'cinematic',
        description: 'Iconic Hollywood action color separation with teal shadows and warm amber skin tones.',
        version: '1.0',
        scope: 'color',
        intensity: 1.0,
        colorGrade: {
          ...createDefaultColorGrade(),
          temperature: 20,
          tint: -15,
          contrast: 1.25,
          saturation: 1.3,
          vignette: 0.3,
          lutId: 'teal-orange',
          lutIntensity: 0.85,
        },
        effects: [
          {
            id: 'fx_vignette_to',
            effectId: 'lumina.vignette',
            name: 'Cinematic Vignette',
            enabled: true,
            opacity: 0.6,
            params: { amount: 0.4, radius: 0.8, softness: 0.7, color: '#000000' },
          },
        ],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'preset_moody_noir',
        name: 'Moody Noir Classic',
        category: 'film',
        description: 'Monochromatic high-contrast Silver Gelatin film print with atmospheric silver haze.',
        version: '1.0',
        scope: 'color',
        intensity: 1.0,
        colorGrade: {
          ...createDefaultColorGrade(),
          saturation: 0,
          contrast: 1.45,
          brightness: -0.05,
          vignette: 0.5,
          lutId: 'noir-bnw',
          lutIntensity: 1.0,
        },
        effects: [
          {
            id: 'fx_grain_noir',
            effectId: 'lumina.film_grain',
            name: '35mm Film Grain',
            enabled: true,
            opacity: 0.5,
            params: { intensity: 0.35, grainSize: 1, animated: true },
          },
          {
            id: 'fx_vignette_noir',
            effectId: 'lumina.vignette',
            name: 'Cinematic Vignette',
            enabled: true,
            opacity: 0.7,
            params: { amount: 0.6, radius: 0.75, softness: 0.6, color: '#000000' },
          },
        ],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'preset_vintage_70s',
        name: 'Warm 1970s Kodachrome',
        category: 'vintage',
        description: 'Retro nostalgic golden warmth with soft rolled highlights and gentle film grain.',
        version: '1.0',
        scope: 'color',
        intensity: 1.0,
        colorGrade: {
          ...createDefaultColorGrade(),
          temperature: 35,
          tint: 12,
          contrast: 0.95,
          saturation: 0.88,
          brightness: 0.05,
          lutId: 'vintage-gold',
          lutIntensity: 0.9,
        },
        effects: [
          {
            id: 'fx_grain_vintage',
            effectId: 'lumina.film_grain',
            name: '35mm Film Grain',
            enabled: true,
            opacity: 0.4,
            params: { intensity: 0.3, grainSize: 2, animated: true },
          },
        ],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'preset_cyberpunk_neon',
        name: 'Cyberpunk Neon Matrix',
        category: 'creative',
        description: 'Acid neon magenta & cyan highlights with aggressive chromatic aberration.',
        version: '1.0',
        scope: 'transform_color_effects',
        intensity: 1.0,
        colorGrade: {
          ...createDefaultColorGrade(),
          tint: 40,
          temperature: -25,
          contrast: 1.35,
          saturation: 1.45,
          lutId: 'cyberpunk',
          lutIntensity: 1.0,
        },
        effects: [
          {
            id: 'fx_chroma_cyber',
            effectId: 'lumina.chromatic_aberration',
            name: 'Chromatic Aberration',
            enabled: true,
            opacity: 0.8,
            params: { offset: 12, angle: 45 },
          },
          {
            id: 'fx_glow_cyber',
            effectId: 'lumina.glow',
            name: 'Luma Glow / Bloom',
            enabled: true,
            opacity: 0.7,
            params: { intensity: 1.4, radius: 28, threshold: 0.3, colorTint: '#00f0ff' },
          },
        ],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'preset_crisp_vivid',
        name: 'Crisp HDR Commercial',
        category: 'creative',
        description: 'Punchy saturated colors, clean exposure lift, and edge enhancement.',
        version: '1.0',
        scope: 'color',
        intensity: 1.0,
        colorGrade: {
          ...createDefaultColorGrade(),
          exposure: 0.2,
          contrast: 1.18,
          saturation: 1.35,
          brightness: 0.02,
        },
        effects: [
          {
            id: 'fx_sharpen_vivid',
            effectId: 'lumina.sharpen',
            name: 'Edge Sharpen',
            enabled: true,
            opacity: 0.7,
            params: { amount: 1.0 },
          },
        ],
        createdAt: new Date().toISOString(),
      },
    ];

    // 2. Load user presets from localStorage
    let userPresets: FilterPreset[] = [];
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        userPresets = JSON.parse(stored);
      }
    } catch {}

    this.presets = [...builtIn, ...userPresets];
  }

  public getAllPresets(): FilterPreset[] {
    return this.presets;
  }

  public getPresetsByCategory(cat: string): FilterPreset[] {
    return this.presets.filter((p) => p.category === cat);
  }

  public saveCustomPreset(preset: FilterPreset): void {
    const custom = { ...preset, isCustom: true };
    this.presets.push(custom);
    this.persistCustomPresets();
  }

  public deleteCustomPreset(id: string): void {
    this.presets = this.presets.filter((p) => p.id !== id);
    this.persistCustomPresets();
  }

  private persistCustomPresets(): void {
    try {
      const customOnly = this.presets.filter((p) => p.isCustom);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customOnly));
    } catch {}
  }

  public exportPresetsJson(): string {
    return JSON.stringify(this.presets, null, 2);
  }

  public importPresetsJson(jsonStr: string): void {
    try {
      const imported: FilterPreset[] = JSON.parse(jsonStr);
      if (Array.isArray(imported)) {
        for (const p of imported) {
          if (!this.presets.some((existing) => existing.id === p.id)) {
            this.presets.push({ ...p, isCustom: true });
          }
        }
        this.persistCustomPresets();
      }
    } catch (e) {
      throw new Error('Invalid preset JSON file format');
    }
  }
}
