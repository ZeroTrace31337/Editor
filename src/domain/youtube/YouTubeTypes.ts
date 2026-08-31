/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface YouTubeVideoItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  thumbnails: {
    default?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    high?: { url: string; width: number; height: number };
    maxres?: { url: string; width: number; height: number };
  };
  channelId: string;
  channelTitle: string;
  channelAvatarUrl?: string;
  publishedAt: string;
  duration: string;
  durationSeconds: number;
  durationFormatted: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  videoUrl: string;
  embedUrl: string;
  isShort: boolean;
  definition?: 'hd' | 'sd';
  tags?: string[];
}

export interface YouTubeSearchResponse {
  items: YouTubeVideoItem[];
  nextPageToken?: string;
  prevPageToken?: string;
  totalResults: number;
  resultsPerPage: number;
  query: string;
  fromCache: boolean;
  timestamp: string;
}

export interface YouTubeChannelItem {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  publishedAt: string;
  avatarUrl: string;
  bannerUrl?: string;
  subscriberCount?: number;
  videoCount?: number;
  viewCount?: number;
  country?: string;
}

export interface YouTubeApiStatus {
  isConfigured: boolean;
  hasApiKey: boolean;
  timestamp: string;
  message: string;
}

export interface YouTubeClientSearchParams {
  q?: string;
  maxResults?: number;
  pageToken?: string;
  order?: 'relevance' | 'date' | 'viewCount' | 'rating' | 'title';
  videoDuration?: 'any' | 'short' | 'medium' | 'long';
  videoDefinition?: 'any' | 'high' | 'standard';
  regionCode?: string;
  safeSearch?: 'moderate' | 'strict' | 'none';
  videoCategoryId?: string;
}
