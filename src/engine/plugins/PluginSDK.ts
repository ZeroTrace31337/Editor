/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PluginCapability = 'video_filter' | 'audio_effect' | 'transition' | 'generator' | 'panel';

export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly author: string;
  readonly description: string;
  readonly capability: PluginCapability;
  readonly permissions: string[]; // e.g. ["render:canvas", "audio:webaudio"]
  readonly icon?: string;
}

export interface PluginRenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  timeSeconds: number;
  params: Record<string, any>;
}

export interface PluginAudioContext {
  audioCtx: AudioContext;
  inputNode: AudioNode;
  outputNode: AudioNode;
  params: Record<string, any>;
}

export interface PluginInstance {
  readonly manifest: PluginManifest;
  enabled: boolean;
  onInit?: () => void;
  onDestroy?: () => void;
  applyVideoFilter?: (ctx: PluginRenderContext) => void;
  applyAudioEffect?: (ctx: PluginAudioContext) => void;
}
