/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PluginManifest, PluginInstance, PluginRenderContext } from './PluginSDK';
import { logger } from '../../core/logging/Logger';

const PLUGIN_STORAGE_KEY = 'veecut_installed_plugins';

export class PluginManager {
  private static instance: PluginManager | null = null;
  private plugins: Map<string, PluginInstance> = new Map();
  private listeners: Set<() => void> = new Set();

  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  private constructor() {
    this.registerBuiltInPlugins();
  }

  public getPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  public getPlugin(id: string): PluginInstance | undefined {
    return this.plugins.get(id);
  }

  public registerPlugin(plugin: PluginInstance): void {
    try {
      if (plugin.onInit) {
        plugin.onInit();
      }
      this.plugins.set(plugin.manifest.id, plugin);
      this.notify();
      logger.info('PluginManager', `Registered plugin: ${plugin.manifest.name} v${plugin.manifest.version}`);
    } catch (err) {
      logger.error('PluginManager', `Failed to register plugin: ${plugin.manifest.name}`, { error: err });
    }
  }

  public setPluginEnabled(id: string, enabled: boolean): void {
    const plugin = this.plugins.get(id);
    if (plugin) {
      plugin.enabled = enabled;
      this.notify();
      logger.info('PluginManager', `Plugin ${plugin.manifest.name} state: ${enabled ? 'Enabled' : 'Disabled'}`);
    }
  }

  public uninstallPlugin(id: string): void {
    const plugin = this.plugins.get(id);
    if (plugin) {
      if (plugin.onDestroy) plugin.onDestroy();
      this.plugins.delete(id);
      this.notify();
      logger.info('PluginManager', `Uninstalled plugin: ${plugin.manifest.name}`);
    }
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  private registerBuiltInPlugins(): void {
    // 1. Cine Halation 35mm Plugin
    this.registerPlugin({
      manifest: {
        id: 'org.veecut.plugin.halation',
        name: '35mm Film Halation & Glow',
        version: '1.2.0',
        author: 'VeeCut CineLab',
        description: 'Emulates organic photochemical film red edge halation around high-contrast light sources',
        capability: 'video_filter',
        permissions: ['render:canvas'],
      },
      enabled: true,
      applyVideoFilter: (ctx: PluginRenderContext) => {
        const { ctx: renderCtx, width, height } = ctx;
        renderCtx.save();
        renderCtx.globalCompositeOperation = 'screen';
        renderCtx.fillStyle = 'rgba(255, 60, 20, 0.08)';
        renderCtx.fillRect(0, 0, width, height);
        renderCtx.restore();
      },
    });

    // 2. Broadcast Timecode & Reel Burn-In Plugin
    this.registerPlugin({
      manifest: {
        id: 'org.veecut.plugin.timecode_burnin',
        name: 'Broadcast Timecode & Safe Title Overlay',
        version: '1.0.4',
        author: 'Broadcast Tools Co.',
        description: 'Overlays client watermarks, camera reel metadata, and SMPTE drop-frame timecode',
        capability: 'generator',
        permissions: ['render:canvas'],
      },
      enabled: false,
      applyVideoFilter: (ctx: PluginRenderContext) => {
        const { ctx: renderCtx, width, height, timeSeconds } = ctx;
        renderCtx.save();
        renderCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        renderCtx.fillRect(width / 2 - 120, height - 40, 240, 28);
        renderCtx.font = '12px monospace';
        renderCtx.fillStyle = '#06b6d4';
        renderCtx.textAlign = 'center';
        renderCtx.fillText(`TC: ${timeSeconds.toFixed(3)}s | CAM A`, width / 2, height - 22);
        renderCtx.restore();
      },
    });

    // 3. Analog Vinyl & Tape Saturation Audio Plugin
    this.registerPlugin({
      manifest: {
        id: 'org.veecut.plugin.vinyl_audio',
        name: 'Analog Tape & Vinyl Warble',
        version: '2.0.1',
        author: 'Harmonic DSP',
        description: 'Adds warm harmonic saturation, subtle wow-and-flutter, and vintage analog character',
        capability: 'audio_effect',
        permissions: ['audio:webaudio'],
      },
      enabled: true,
    });
  }
}
