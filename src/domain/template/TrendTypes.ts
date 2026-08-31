/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TrendPlatform = 'all' | 'youtube' | 'tiktok' | 'instagram' | 'shorts' | 'reels';

export type TrendDataStatus = 'live' | 'recent' | 'cached' | 'veecut_curated';

export type TrendVelocity = 'Exploding' | 'High Growth' | 'Viral Surge' | 'Steady Trend';

export interface TrendMetrics {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  engagementRate?: number;
}

export interface TrendItem {
  id: string;
  title: string;
  description?: string;
  platform: 'youtube' | 'tiktok' | 'instagram';
  category: string;
  region: string;
  channelOrCreator: string;
  creatorAvatar?: string;
  thumbnailUrl: string;
  videoUrl?: string;
  embedUrl?: string;
  externalUrl: string;
  publishedAt: string;
  metrics: TrendMetrics;
  trendScore: number; // 0 - 100 normalized score
  trendVelocity: TrendVelocity;
  status: TrendDataStatus;
  source: string; // e.g. "YouTube Data API v3", "TikTok Developer Insights", "Meta Graph API", "VeeCut Curated"
  lastUpdated: string;
  recommendedTemplateIds: string[];
  tags: string[];
  soundTitle?: string;
  soundArtist?: string;
  aspectRatio?: '9:16' | '16:9' | '1:1';
}

export interface TrendSourceStatus {
  id: string;
  name: string;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'supabase';
  status: 'live' | 'cached' | 'configured' | 'unconfigured' | 'rate_limited' | 'error';
  message: string;
  itemCount: number;
  lastRefreshed: string;
  isOfficialApi: boolean;
}

export interface TrendEngineResponse {
  trends: TrendItem[];
  sources: TrendSourceStatus[];
  totalCount: number;
  timestamp: string;
  isCached: boolean;
  cacheExpiresInSeconds: number;
  region: string;
  category: string;
}

export interface TrendFilterOptions {
  platform: TrendPlatform;
  region: string; // e.g. 'US', 'GLOBAL', 'GB', 'JP', 'KR', 'IN', 'DE', 'FR', 'BR'
  category: string; // e.g. 'all', 'Gaming', 'Music', 'Education', 'Entertainment', 'Tech', 'Fashion'
  searchQuery?: string;
  sortBy: 'score' | 'views' | 'freshness' | 'growth';
}
