/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MediaAsset } from '../../domain/media/MediaAsset';
import { IMediaProcessor } from '../../media-services/contracts/IMediaProcessor';
import { logger } from '../../core/logging/Logger';
import { mediaStorage } from '../storage/MediaStorageService';

export class MediaRegistry {
  private assets: Map<string, MediaAsset> = new Map();
  private mediaProcessor: IMediaProcessor;
  private listeners: Set<() => void> = new Set();
  private blobObjectUrls: Map<string, string> = new Map();

  constructor(mediaProcessor: IMediaProcessor) {
    this.mediaProcessor = mediaProcessor;
  }

  public setAssets(assets: MediaAsset[]): void {
    this.assets.clear();
    assets.forEach((a) => this.assets.set(a.id, a));
    this.notify();
  }

  public getAssets(): MediaAsset[] {
    return Array.from(this.assets.values());
  }

  public getAsset(id: string): MediaAsset | undefined {
    return this.assets.get(id);
  }

  /**
   * Restores object URLs for persistent assets from IndexedDB upon project load or re-open
   */
  public async restoreAssetUri(asset: MediaAsset): Promise<string> {
    if (asset.uri && !asset.uri.startsWith('blob:') && !asset.isOffline) {
      return asset.uri;
    }

    if (this.blobObjectUrls.has(asset.id)) {
      const cached = this.blobObjectUrls.get(asset.id)!;
      asset.uri = cached;
      asset.isOffline = false;
      return cached;
    }

    const stored = await mediaStorage.getMediaBlob(asset.id);
    if (stored && stored.blob) {
      const newUrl = URL.createObjectURL(stored.blob);
      this.blobObjectUrls.set(asset.id, newUrl);
      asset.uri = newUrl;
      asset.isOffline = false;
      this.assets.set(asset.id, asset);
      this.notify();
      return newUrl;
    }

    return asset.uri;
  }

  public async registerFile(file: File): Promise<MediaAsset> {
    return this.importFile(file);
  }

  public async importFile(file: File): Promise<MediaAsset> {
    const id = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    logger.info('MediaRegistry', `Starting import for real user file: ${file.name}`, { size: file.size, type: file.type });

    // Persist full file binary into IndexedDB for persistent reload
    await mediaStorage.saveMediaBlob(id, file, file.name);

    const objectUrl = URL.createObjectURL(file);
    this.blobObjectUrls.set(id, objectUrl);

    const probeResult = await this.mediaProcessor.probeMedia(file, file.name);

    const asset: MediaAsset = {
      id,
      name: file.name,
      uri: objectUrl,
      type: probeResult.type,
      fileSize: file.size,
      duration: probeResult.duration,
      videoMetadata: probeResult.videoMetadata,
      audioMetadata: probeResult.audioMetadata,
      thumbnailUrl: probeResult.thumbnailUrl,
      waveformPeaks: probeResult.waveformPeaks,
      isOffline: false,
      importedAt: new Date().toISOString(),
    };

    this.assets.set(id, asset);
    this.notify();
    logger.info('MediaRegistry', `Successfully imported real user asset "${asset.name}" (${asset.type})`, { id });
    return asset;
  }

  public registerAsset(asset: MediaAsset): void {
    this.assets.set(asset.id, asset);
    this.notify();
  }

  public removeAsset(id: string): boolean {
    const asset = this.assets.get(id);
    if (asset) {
      if (this.blobObjectUrls.has(id)) {
        try {
          URL.revokeObjectURL(this.blobObjectUrls.get(id)!);
        } catch {}
        this.blobObjectUrls.delete(id);
      }
      mediaStorage.deleteMediaBlob(id);
    }
    const deleted = this.assets.delete(id);
    if (deleted) {
      this.notify();
    }
    return deleted;
  }

  public markOffline(id: string): void {
    const asset = this.assets.get(id);
    if (asset) {
      asset.isOffline = true;
      this.notify();
      logger.warn('MediaRegistry', `Asset marked offline: ${asset.name}`, { id });
    }
  }

  public relinkAsset(id: string, newFile: File): Promise<MediaAsset> {
    return this.importFile(newFile).then((newAsset) => {
      const old = this.assets.get(id);
      if (old) {
        newAsset.id = id; // Preserve original ID to maintain clip references
        this.assets.set(id, newAsset);
        this.notify();
      }
      return newAsset;
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}
