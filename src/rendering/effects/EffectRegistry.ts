/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEffect, EffectCategory } from './EffectTypes';
import { BlurEffect } from './implementations/BlurEffect';
import { MotionBlurEffect } from './implementations/MotionBlurEffect';
import { RadialBlurEffect } from './implementations/RadialBlurEffect';
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
import { WaveDistortionEffect } from './implementations/WaveDistortionEffect';
import { ScanlinesEffect } from './implementations/ScanlinesEffect';
import { LightLeakEffect } from './implementations/LightLeakEffect';
import { VHSRetroEffect } from './implementations/VHSRetroEffect';
import { LetterboxCinematicEffect } from './implementations/LetterboxCinematicEffect';
import { BodyOutlineGlowEffect } from './implementations/BodyOutlineGlowEffect';
import { AISceneRelightEffect } from './implementations/AISceneRelightEffect';
import { RetouchEffect } from './implementations/RetouchEffect';

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
    this.register(new RadialBlurEffect());

    // Lighting & Glow
    this.register(new GlowEffect());
    this.register(new BloomEffect());
    this.register(new VignetteEffect());
    this.register(new LightLeakEffect());

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
    this.register(new WaveDistortionEffect());

    // Retro & Glitch
    this.register(new ScanlinesEffect());
    this.register(new VHSRetroEffect());

    // Cinematic
    this.register(new LetterboxCinematicEffect());

    // Body & AI & Beauty Retouch
    this.register(new BodyOutlineGlowEffect());
    this.register(new AISceneRelightEffect());
    this.register(new RetouchEffect());

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
