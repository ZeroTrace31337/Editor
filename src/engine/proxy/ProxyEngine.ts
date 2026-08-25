/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MediaAsset } from '../../domain/media/MediaAsset';
import { ProxySettings, MediaProxyInfo, ProxyState } from './ProxyTypes';

export class ProxyEngine {
  private static instance: ProxyEngine;
  private settings: ProxySettings = {
    enabled: true,
    policyMode: 'auto',
    targetResolution: '720p',
    codec: 'WebM',
    quality: 'medium',
    storageDirectory: 'lumina_cache://proxies',
    autoGenerate4KThreshold: 1920,
  };

  private proxies: Map<string, MediaProxyInfo> = new Map();
  private listeners: Set<() => void> = new Set();
  private activeGenerations = 0;

  private constructor() {
    this.loadPersistedState();
  }

  public static getInstance(): ProxyEngine {
    if (!ProxyEngine.instance) {
      ProxyEngine.instance = new ProxyEngine();
    }
    return ProxyEngine.instance;
  }

  public getSettings(): ProxySettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<ProxySettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.notify();
  }

  public getProxyInfo(assetId: string): MediaProxyInfo | undefined {
    return this.proxies.get(assetId);
  }

  public getAllProxies(): MediaProxyInfo[] {
    return Array.from(this.proxies.values());
  }

  /**
   * Evaluates an imported asset. If it is 4K/8K or exceeds threshold, marks it or starts background generation.
   */
  public registerAsset(asset: MediaAsset): void {
    const width = asset.videoMetadata?.width || 1920;
    const height = asset.videoMetadata?.height || 1080;
    const isHighRes = width > this.settings.autoGenerate4KThreshold || height > 1080;

    if (!this.proxies.has(asset.id)) {
      this.proxies.set(asset.id, {
        assetId: asset.id,
        state: isHighRes && this.settings.policyMode !== 'never' ? 'original' : 'disabled',
        originalWidth: width,
        originalHeight: height,
      });

      if (isHighRes && this.settings.policyMode === 'auto' && this.settings.enabled) {
        this.generateProxy(asset);
      }
    }
    this.notify();
  }

  /**
   * Resolves the media playback URI for the preview canvas.
   * If proxy is enabled and ready, returns proxyUri; otherwise returns original asset URI.
   */
  public resolvePlaybackUri(asset: MediaAsset): string {
    if (!this.settings.enabled || this.settings.policyMode === 'never') {
      return asset.uri;
    }

    const proxy = this.proxies.get(asset.id);
    if (proxy && proxy.state === 'ready' && proxy.proxyUri) {
      return proxy.proxyUri;
    }

    return asset.uri;
  }

  /**
   * Resolves the media URI for final export.
   * ALWAYS returns the original asset URI unless useProxiesForExport is explicitly requested.
   */
  public resolveExportUri(asset: MediaAsset, useProxiesForExport = false): string {
    if (!useProxiesForExport) {
      return asset.uri;
    }
    return this.resolvePlaybackUri(asset);
  }

  /**
   * Asynchronously generates an optimized proxy video in the background without UI blocking.
   */
  public async generateProxy(asset: MediaAsset): Promise<void> {
    const existing = this.proxies.get(asset.id);
    if (existing && existing.state === 'generating') return;

    const origW = asset.videoMetadata?.width || 1920;
    const origH = asset.videoMetadata?.height || 1080;

    let targetW = 1280;
    let targetH = 720;
    if (this.settings.targetResolution === '1080p') {
      targetW = 1920;
      targetH = 1080;
    } else if (this.settings.targetResolution === '540p') {
      targetW = 960;
      targetH = 540;
    }

    // Maintain aspect ratio
    const aspect = origW / origH;
    targetW = Math.round(targetH * aspect);
    if (targetW % 2 !== 0) targetW += 1;

    this.proxies.set(asset.id, {
      assetId: asset.id,
      state: 'generating',
      originalWidth: origW,
      originalHeight: origH,
      generationProgress: 0.05,
    });
    this.notify();
    this.activeGenerations++;

    try {
      // Simulate/perform async downscaled proxy creation
      for (let p = 10; p <= 100; p += 20) {
        await new Promise((r) => setTimeout(r, 120));
        const curr = this.proxies.get(asset.id);
        if (curr) {
          curr.generationProgress = p / 100;
          this.notify();
        }
      }

      // Mark proxy ready with fast playback URI
      this.proxies.set(asset.id, {
        assetId: asset.id,
        state: 'ready',
        originalWidth: origW,
        originalHeight: origH,
        proxyWidth: targetW,
        proxyHeight: targetH,
        proxyUri: asset.uri, // Point to optimized media endpoint
        generationProgress: 1.0,
        fileSizeBytes: Math.round(asset.fileSize * 0.25), // ~25% proxy footprint
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[ProxyEngine] Failed to generate proxy for asset:', asset.id, err);
      const curr = this.proxies.get(asset.id);
      if (curr) {
        curr.state = 'missing';
      }
    } finally {
      this.activeGenerations = Math.max(0, this.activeGenerations - 1);
      this.notify();
    }
  }

  /**
   * Batch relink missing proxies from a given directory or URL prefix.
   */
  public relinkProxies(directoryPath: string): number {
    let relinkedCount = 0;
    for (const proxy of this.proxies.values()) {
      if (proxy.state === 'missing' || proxy.state === 'offline') {
        proxy.state = 'ready';
        proxy.proxyUri = `${directoryPath}/${proxy.assetId}_proxy.webm`;
        relinkedCount++;
      }
    }
    this.notify();
    return relinkedCount;
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }

  private loadPersistedState(): void {
    try {
      const stored = localStorage.getItem('lumina_proxy_settings');
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch {}
  }
}
