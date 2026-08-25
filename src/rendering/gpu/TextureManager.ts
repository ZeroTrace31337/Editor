/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GPUDeviceManager } from './GPUDeviceManager';

export interface CachedTexture {
  texture: WebGLTexture;
  width: number;
  height: number;
  lastUsed: number;
  sourceKey: string;
}

export class TextureManager {
  private static instance: TextureManager;
  private textures: Map<string, CachedTexture> = new Map();
  private maxCachedTextures = 32;

  private constructor() {}

  public static getInstance(): TextureManager {
    if (!TextureManager.instance) {
      TextureManager.instance = new TextureManager();
    }
    return TextureManager.instance;
  }

  public getOrCreateTexture(
    key: string,
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageData,
    width: number,
    height: number
  ): WebGLTexture | null {
    const gl = GPUDeviceManager.getInstance().getGLContext();
    if (!gl) return null;

    const existing = this.textures.get(key);
    if (existing) {
      existing.lastUsed = Date.now();
      // If source is a video, re-upload frame contents
      if (source instanceof HTMLVideoElement || source instanceof HTMLCanvasElement) {
        gl.bindTexture(gl.TEXTURE_2D, existing.texture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
      }
      return existing.texture;
    }

    // Evict oldest if limit reached
    this.evictIfNeeded(gl);

    const texture = gl.createTexture();
    if (!texture) return null;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    if (source instanceof ImageData) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, source.data);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    }

    this.textures.set(key, {
      texture,
      width,
      height,
      lastUsed: Date.now(),
      sourceKey: key,
    });

    return texture;
  }

  public createEmptyTexture(width: number, height: number): WebGLTexture | null {
    const gl = GPUDeviceManager.getInstance().getGLContext();
    if (!gl) return null;

    const texture = gl.createTexture();
    if (!texture) return null;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    return texture;
  }

  private evictIfNeeded(gl: WebGL2RenderingContext): void {
    if (this.textures.size < this.maxCachedTextures) return;

    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, item] of this.textures.entries()) {
      if (item.lastUsed < oldestTime) {
        oldestTime = item.lastUsed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.textures.get(oldestKey);
      if (entry) {
        gl.deleteTexture(entry.texture);
        this.textures.delete(oldestKey);
      }
    }
  }

  public clear(): void {
    const gl = GPUDeviceManager.getInstance().getGLContext();
    if (gl) {
      for (const entry of this.textures.values()) {
        gl.deleteTexture(entry.texture);
      }
    }
    this.textures.clear();
  }
}
