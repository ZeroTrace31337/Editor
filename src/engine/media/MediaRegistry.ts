/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MediaAsset } from '../../domain/media/MediaAsset';
import { IMediaProcessor } from '../../media-services/contracts/IMediaProcessor';
import { logger } from '../../core/logging/Logger';

export class MediaRegistry {
  private assets: Map<string, MediaAsset> = new Map();
  private mediaProcessor: IMediaProcessor;
  private listeners: Set<() => void> = new Set();

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

  public async importFile(file: File): Promise<MediaAsset> {
    const id = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    logger.info('MediaRegistry', `Starting import for file: ${file.name}`, { size: file.size, type: file.type });

    const probeResult = await this.mediaProcessor.probeMedia(file, file.name);

    const asset: MediaAsset = {
      id,
      name: file.name,
      uri: URL.createObjectURL(file),
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
    logger.info('MediaRegistry', `Successfully imported asset "${asset.name}" (${asset.type})`, { id });
    return asset;
  }

  public registerAsset(asset: MediaAsset): void {
    this.assets.set(asset.id, asset);
    this.notify();
  }

  public removeAsset(id: string): boolean {
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
