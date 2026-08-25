/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CacheKeyEntry {
  sourceHash: string;
  transformHash: string;
  effectsHash: string;
  colorGradeHash: string;
  canvas: HTMLCanvasElement;
  lastUsed: number;
}

export class SmartDependencyCache {
  private static instance: SmartDependencyCache;
  private entries: Map<string, CacheKeyEntry> = new Map();
  private maxEntries = 48;
  private hitCount = 0;
  private missCount = 0;

  private constructor() {}

  public static getInstance(): SmartDependencyCache {
    if (!SmartDependencyCache.instance) {
      SmartDependencyCache.instance = new SmartDependencyCache();
    }
    return SmartDependencyCache.instance;
  }

  public get(
    clipId: string,
    sourceHash: string,
    transformHash: string,
    effectsHash: string,
    colorGradeHash: string
  ): HTMLCanvasElement | null {
    const entry = this.entries.get(clipId);
    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check if hashes match
    if (
      entry.sourceHash === sourceHash &&
      entry.transformHash === transformHash &&
      entry.effectsHash === effectsHash &&
      entry.colorGradeHash === colorGradeHash
    ) {
      entry.lastUsed = Date.now();
      this.hitCount++;
      return entry.canvas;
    }

    this.missCount++;
    return null;
  }

  public set(
    clipId: string,
    sourceHash: string,
    transformHash: string,
    effectsHash: string,
    colorGradeHash: string,
    canvas: HTMLCanvasElement
  ): void {
    this.evictOldestIfNeeded();

    this.entries.set(clipId, {
      sourceHash,
      transformHash,
      effectsHash,
      colorGradeHash,
      canvas,
      lastUsed: Date.now(),
    });
  }

  public invalidate(clipId?: string): void {
    if (clipId) {
      this.entries.delete(clipId);
    } else {
      this.entries.clear();
    }
  }

  public getStats(): { hits: number; misses: number; cachedFrames: number; hitRatio: number } {
    const total = this.hitCount + this.missCount;
    return {
      hits: this.hitCount,
      misses: this.missCount,
      cachedFrames: this.entries.size,
      hitRatio: total > 0 ? this.hitCount / total : 1.0,
    };
  }

  private evictOldestIfNeeded(): void {
    if (this.entries.size < this.maxEntries) return;

    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, val] of this.entries.entries()) {
      if (val.lastUsed < oldestTime) {
        oldestTime = val.lastUsed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.entries.delete(oldestKey);
    }
  }
}
