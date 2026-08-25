/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProxyState = 'original' | 'generating' | 'ready' | 'missing' | 'offline' | 'disabled';

export type ProxyResolution = '1080p' | '720p' | '540p' | 'custom';
export type ProxyCodec = 'H.264' | 'WebM' | 'ProRes Proxy';
export type ProxyQuality = 'low' | 'medium' | 'high';
export type ProxyPolicyMode = 'auto' | 'always' | 'never';

export interface ProxySettings {
  enabled: boolean;
  policyMode: ProxyPolicyMode;
  targetResolution: ProxyResolution;
  codec: ProxyCodec;
  quality: ProxyQuality;
  storageDirectory: string;
  autoGenerate4KThreshold: number; // e.g. 1920 width
}

export interface MediaProxyInfo {
  assetId: string;
  state: ProxyState;
  proxyUri?: string;
  proxyWidth?: number;
  proxyHeight?: number;
  fileSizeBytes?: number;
  generationProgress?: number; // 0.0 to 1.0
  generatedAt?: string;
  originalWidth: number;
  originalHeight: number;
}
