/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory } from './EffectTypes';
import { BlurEffect } from './implementations/BlurEffect';
import { MotionBlurEffect } from './implementations/MotionBlurEffect';
import { GlowEffect } from './implementations/GlowEffect';
import { BloomEffect } from './implementations/BloomEffect';
import { VignetteEffect } from './implementations/VignetteEffect';
import { SharpenEffect } from './implementations/SharpenEffect';
import { InvertEffect } from './implementations/InvertEffect';
import { ChromaticAberrationEffect } from './implementations/ChromaticAberrationEffect';
import { FilmGrainEffect } from './implementations/FilmGrainEffect';
import { DropShadowEffect } from './implementations/DropShadowEffect';
import { EdgeDetectEffect } from './implementations/EdgeDetectEffect';
import { FisheyeEffect } from './implementations/FisheyeEffect';
import { GlitchEffect } from './implementations/GlitchEffect';
import { PixelateEffect } from './implementations/PixelateEffect';
import { ChromaKeyEffect } from './implementations/ChromaKeyEffect';
import { LumaKeyEffect } from './implementations/LumaKeyEffect';

export class EffectRegistry {
  private static instance: EffectRegistry;
  private effects: Map<string, IEffect> = new Map();

  private constructor() {
    this.registerDefaults();
  }

  public static getInstance(): EffectRegistry {
    if (!EffectRegistry.instance) {
      EffectRegistry.instance = new EffectRegistry();
    }
    return EffectRegistry.instance;
  }

  private registerDefaults(): void {
    // Blur
    this.register(new BlurEffect());
    this.register(new MotionBlurEffect());

    // Lighting & Glow
    this.register(new GlowEffect());
    this.register(new BloomEffect());
    this.register(new VignetteEffect());

    // Stylize & Image
    this.register(new SharpenEffect());
    this.register(new InvertEffect());
    this.register(new ChromaticAberrationEffect());
    this.register(new FilmGrainEffect());
    this.register(new DropShadowEffect());
    this.register(new EdgeDetectEffect());
    this.register(new PixelateEffect());

    // Distortion
    this.register(new FisheyeEffect());
    this.register(new GlitchEffect());

    // Keying
    this.register(new ChromaKeyEffect());
    this.register(new LumaKeyEffect());
  }

  public register(effect: IEffect): void {
    this.effects.set(effect.id, effect);
  }

  public getEffect(effectId: string): IEffect | undefined {
    return this.effects.get(effectId);
  }

  public getAllEffects(): IEffect[] {
    return Array.from(this.effects.values());
  }

  public getEffectsByCategory(category: EffectCategory): IEffect[] {
    return this.getAllEffects().filter((e) => e.category === category);
  }
}
