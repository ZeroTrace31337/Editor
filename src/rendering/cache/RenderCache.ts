/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CacheEntry {
  canvas: HTMLCanvasElement;
  lastUsed: number;
}

export class RenderCache {
  private static instance: RenderCache;
  private cache: Map<string, CacheEntry> = new Map();
  private maxEntries = 40;

  private constructor() {}

  public static getInstance(): RenderCache {
    if (!RenderCache.instance) {
      RenderCache.instance = new RenderCache();
    }
    return RenderCache.instance;
  }

  public get(key: string): HTMLCanvasElement | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastUsed = Date.now();
      return entry.canvas;
    }
    return undefined;
  }

  public set(key: string, canvas: HTMLCanvasElement): void {
    if (this.cache.size >= this.maxEntries) {
      // LRU Eviction
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [k, v] of this.cache.entries()) {
        if (v.lastUsed < oldestTime) {
          oldestTime = v.lastUsed;
          oldestKey = k;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      canvas,
      lastUsed: Date.now(),
    });
  }

  public clear(): void {
    this.cache.clear();
  }
}
