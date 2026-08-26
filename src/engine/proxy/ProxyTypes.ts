/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProxyResolutionQuality = 'half' | 'quarter' | 'eighth'; // 50%, 25%, 12.5%
export type ProxyCodecFormat = 'h264' | 'webm' | 'prores_proxy';
export type ProxyWorkflowMode = 'all' | 'smart_auto' | 'off';

export interface ProxyAssetStatus {
  assetId: string;
  assetName: string;
  originalWidth: number;
  originalHeight: number;
  originalSizeMb: number;
  status: 'none' | 'generating' | 'ready' | 'error' | 'missing';
  progress: number; // 0.0 to 1.0
  proxyUri?: string;
  proxyWidth?: number;
  proxyHeight?: number;
  proxySizeMb?: number;
  quality: ProxyResolutionQuality;
  format: ProxyCodecFormat;
  generatedAt?: number;
}

export interface ProxyEngineSettings {
  enabled: boolean; // Master toggle
  workflowMode: ProxyWorkflowMode;
  defaultQuality: ProxyResolutionQuality;
  defaultFormat: ProxyCodecFormat;
  autoProxyThreshold: {
    minResolution: '1080p' | '4k' | '8k';
    minFps: number; // e.g. 60fps
    minFileSizeMb: number; // e.g. 100MB
  };
  preferProxyDuringPlayback: boolean;
  switchHighResOnPause: boolean;
  alwaysRenderHighResOnExport: boolean;
}
