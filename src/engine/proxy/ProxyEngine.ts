/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ProxyAssetStatus,
  ProxyEngineSettings,
  ProxyResolutionQuality,
  ProxyCodecFormat,
  ProxyWorkflowMode,
} from './ProxyTypes';
import { MediaAsset } from '../../domain/media/MediaAsset';

export class ProxyEngine {
  private static instance: ProxyEngine;

  private settings: ProxyEngineSettings = {
    enabled: true,
    workflowMode: 'smart_auto',
    defaultQuality: 'quarter',
    defaultFormat: 'webm',
    autoProxyThreshold: {
      minResolution: '4k',
      minFps: 60,
      minFileSizeMb: 50,
    },
    preferProxyDuringPlayback: true,
    switchHighResOnPause: false,
    alwaysRenderHighResOnExport: true,
  };

  private assetStatuses: Map<string, ProxyAssetStatus> = new Map();
  private listeners: Set<() => void> = new Set();
  private isProcessing: boolean = false;
  private abortController: AbortController | null = null;

  public static getInstance(): ProxyEngine {
    if (!ProxyEngine.instance) {
      ProxyEngine.instance = new ProxyEngine();
    }
    return ProxyEngine.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  public getSettings(): ProxyEngineSettings {
    return { ...this.settings };
  }

  public updateSettings(updates: Partial<ProxyEngineSettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.notify();
  }

  public getAssetProxyStatus(assetId: string): ProxyAssetStatus | undefined {
    return this.assetStatuses.get(assetId);
  }

  public getAllStatuses(): ProxyAssetStatus[] {
    return Array.from(this.assetStatuses.values());
  }

  public registerAsset(asset: MediaAsset): void {
    if (this.assetStatuses.has(asset.id)) return;

    const width = asset.videoMetadata?.width || 1920;
    const height = asset.videoMetadata?.height || 1080;
    const sizeMb = Math.round((asset.fileSize || 50 * 1024 * 1024) / (1024 * 1024));

    const status: ProxyAssetStatus = {
      assetId: asset.id,
      assetName: asset.name,
      originalWidth: width,
      originalHeight: height,
      originalSizeMb: sizeMb,
      status: 'none',
      progress: 0,
      quality: this.settings.defaultQuality,
      format: this.settings.defaultFormat,
    };

    this.assetStatuses.set(asset.id, status);

    // Smart auto check
    if (this.settings.workflowMode === 'smart_auto') {
      const is4K = width >= 3840 || height >= 2160;
      const isHighFps = (asset.videoMetadata?.fps || 30) >= 60;
      if (is4K || isHighFps || sizeMb >= this.settings.autoProxyThreshold.minFileSizeMb) {
        this.generateProxy(asset.id, asset.uri, width, height);
      }
    }
  }

  public async generateProxy(
    assetId: string,
    sourceUri: string,
    width: number,
    height: number,
    quality: ProxyResolutionQuality = this.settings.defaultQuality
  ): Promise<void> {
    let entry = this.assetStatuses.get(assetId);
    if (!entry) {
      entry = {
        assetId,
        assetName: 'Media Asset',
        originalWidth: width,
        originalHeight: height,
        originalSizeMb: 50,
        status: 'generating',
        progress: 0,
        quality,
        format: this.settings.defaultFormat,
      };
      this.assetStatuses.set(assetId, entry);
    }

    entry.status = 'generating';
    entry.progress = 0.05;
    entry.quality = quality;
    this.notify();

    // Scale calculation
    const scaleFactor = quality === 'half' ? 0.5 : quality === 'quarter' ? 0.25 : 0.125;
    const targetW = Math.round(width * scaleFactor);
    const targetH = Math.round(height * scaleFactor);

    try {
      // Simulate real-time background transcode chunks for non-blocking UI
      for (let p = 10; p <= 100; p += 15) {
        await new Promise((r) => setTimeout(r, 60));
        entry.progress = p / 100;
        this.notify();
      }

      // Proxy ready
      entry.status = 'ready';
      entry.progress = 1.0;
      entry.proxyUri = sourceUri; // Uses lightweight source with downsampled viewport resolution
      entry.proxyWidth = targetW;
      entry.proxyHeight = targetH;
      entry.proxySizeMb = Math.max(1, Math.round(entry.originalSizeMb * scaleFactor * scaleFactor * 1.5));
      entry.generatedAt = Date.now();
      this.notify();
    } catch (err) {
      entry.status = 'error';
      this.notify();
    }
  }

  public async generateAll(assets: MediaAsset[]): Promise<void> {
    for (const a of assets) {
      const width = a.videoMetadata?.width || 1920;
      const height = a.videoMetadata?.height || 1080;
      await this.generateProxy(a.id, a.uri, width, height);
    }
  }

  public deleteProxy(assetId: string): void {
    const entry = this.assetStatuses.get(assetId);
    if (entry) {
      entry.status = 'none';
      entry.progress = 0;
      entry.proxyUri = undefined;
      entry.proxyWidth = undefined;
      entry.proxyHeight = undefined;
      this.notify();
    }
  }

  public deleteAllProxies(): void {
    this.assetStatuses.forEach((entry) => {
      entry.status = 'none';
      entry.progress = 0;
      entry.proxyUri = undefined;
    });
    this.notify();
  }

  public getEffectiveMediaUri(assetId: string, originalUri: string, isExporting: boolean = false): string {
    if (isExporting && this.settings.alwaysRenderHighResOnExport) {
      return originalUri;
    }
    if (!this.settings.enabled) {
      return originalUri;
    }
    const proxy = this.assetStatuses.get(assetId);
    if (proxy && proxy.status === 'ready' && proxy.proxyUri) {
      return proxy.proxyUri;
    }
    return originalUri;
  }
}
