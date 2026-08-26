/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ChromaMatteMode = 'original' | 'keyed' | 'matte' | 'alpha_grid';

export type ChromaBackgroundType = 'transparent' | 'color' | 'image' | 'video' | 'ai_background';

export interface SingleChromaKey {
  id: string;
  enabled: boolean;
  keyColor: string;     // hex e.g. #00ff00
  similarity: number;   // 0 to 100% (tolerance)
  smoothness: number;   // 0 to 50px (feather)
  shadows: number;      // 0 to 100%
  spillReduction: number; // 0 to 100%
  edgeShift: number;    // -50 to +50px
  refineEdge: number;   // 0 to 100%
}

export interface ChromaKeySettings {
  enabled: boolean;
  matteMode: ChromaMatteMode;
  keys: SingleChromaKey[];
  backgroundType: ChromaBackgroundType;
  backgroundColor: string;
  backgroundImageUri?: string;
  backgroundVideoUri?: string;
  aiBackgroundPreset?: string;
}

export const AI_BACKGROUND_PRESETS: { id: string; name: string; thumbnailUri: string; category: string }[] = [
  {
    id: 'cyberpunk_neon',
    name: 'Cyberpunk Tokyo',
    category: 'Sci-Fi',
    thumbnailUri: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1280&q=80',
  },
  {
    id: 'modern_studio',
    name: 'Modern Studio Loft',
    category: 'Studio',
    thumbnailUri: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1280&q=80',
  },
  {
    id: 'sunset_beach',
    name: 'Golden Sunset Coast',
    category: 'Nature',
    thumbnailUri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1280&q=80',
  },
  {
    id: 'minimal_office',
    name: 'Executive Boardroom',
    category: 'Corporate',
    thumbnailUri: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1280&q=80',
  },
  {
    id: 'cozy_cafe',
    name: 'Warm Espresso Cafe',
    category: 'Lifestyle',
    thumbnailUri: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1280&q=80',
  },
  {
    id: 'scifi_holodeck',
    name: 'Deep Space Holodeck',
    category: 'Sci-Fi',
    thumbnailUri: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1280&q=80',
  },
];

export function createDefaultSingleChromaKey(color = '#00ff00'): SingleChromaKey {
  return {
    id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    enabled: true,
    keyColor: color,
    similarity: 42,
    smoothness: 12,
    shadows: 18,
    spillReduction: 35,
    edgeShift: 0,
    refineEdge: 25,
  };
}

export function createDefaultChromaKeySettings(): ChromaKeySettings {
  return {
    enabled: false,
    matteMode: 'keyed',
    keys: [createDefaultSingleChromaKey('#00ff00')],
    backgroundType: 'transparent',
    backgroundColor: '#111320',
  };
}
