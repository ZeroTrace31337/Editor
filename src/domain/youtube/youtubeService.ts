/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  YouTubeVideoItem,
  YouTubeSearchResponse,
  YouTubeChannelItem,
  YouTubeApiStatus,
  YouTubeClientSearchParams,
} from './YouTubeTypes';
import { MediaAsset } from '../media/MediaAsset';
import { secondsToRationalTime } from '../../core/time/RationalTime';

export class YouTubeClientService {
  private static instance: YouTubeClientService;
  private memoryCache: Map<string, { data: YouTubeSearchResponse; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes client cache

  private constructor() {}

  public static getInstance(): YouTubeClientService {
    if (!YouTubeClientService.instance) {
      YouTubeClientService.instance = new YouTubeClientService();
    }
    return YouTubeClientService.instance;
  }

  /**
   * Safely parses response, ensuring it is valid JSON before parsing
   */
  private async safeParseJson(response: Response, endpointDesc: string): Promise<any> {
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!isJson) {
      const text = await response.text().catch(() => '');
      const cleanSnippet = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
      const message = cleanSnippet
        ? `Server returned non-JSON response (${cleanSnippet})`
        : `Server returned unexpected format (${contentType || 'non-JSON'}, HTTP ${response.status})`;
      
      const error: any = new Error(`${endpointDesc}: ${message}`);
      error.statusCode = response.status;
      throw error;
    }

    try {
      return await response.json();
    } catch (parseErr: any) {
      const error: any = new Error(`${endpointDesc}: Malformed JSON received from server (HTTP ${response.status})`);
      error.statusCode = response.status;
      throw error;
    }
  }

  /**
   * Search YouTube videos via secure backend proxy
   */
  public async search(params: YouTubeClientSearchParams): Promise<YouTubeSearchResponse> {
    const query = (params.q || '').trim();
    const maxResults = params.maxResults || 18;
    const pageToken = params.pageToken || '';
    const order = params.order || 'relevance';
    const videoDuration = params.videoDuration || 'any';
    const regionCode = params.regionCode || 'US';

    const cacheKey = `${query}_${maxResults}_${pageToken}_${order}_${videoDuration}_${regionCode}`;
    const cached = this.memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    const searchParams = new URLSearchParams();
    if (query) searchParams.set('q', query);
    searchParams.set('maxResults', String(maxResults));
    if (pageToken) searchParams.set('pageToken', pageToken);
    if (order) searchParams.set('order', order);
    if (videoDuration !== 'any') searchParams.set('videoDuration', videoDuration);
    if (regionCode) searchParams.set('regionCode', regionCode);
    if (params.videoDefinition && params.videoDefinition !== 'any') {
      searchParams.set('videoDefinition', params.videoDefinition);
    }
    if (params.videoCategoryId) {
      searchParams.set('videoCategoryId', params.videoCategoryId);
    }

    let response: Response;
    try {
      response = await fetch(`/api/youtube/search?${searchParams.toString()}`);
    } catch (networkErr: any) {
      const err: any = new Error('Network connection error: Unable to reach YouTube proxy server. Please check your connection.');
      err.statusCode = 0;
      throw err;
    }

    const json = await this.safeParseJson(response, 'YouTube Search');

    if (!response.ok) {
      const err: any = new Error(json.error || `Search failed with status ${response.status}`);
      err.statusCode = response.status;
      err.isApiKeyMissing = json.isApiKeyMissing;
      err.isQuotaExceeded = json.isQuotaExceeded;
      err.isInvalidKey = json.isInvalidKey;
      throw err;
    }

    const result: YouTubeSearchResponse = json;
    this.memoryCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  }

  /**
   * Get single video info
   */
  public async getVideo(videoId: string): Promise<YouTubeVideoItem> {
    let response: Response;
    try {
      response = await fetch(`/api/youtube/video/${encodeURIComponent(videoId)}`);
    } catch (networkErr: any) {
      const err: any = new Error('Network connection error: Unable to fetch video details.');
      err.statusCode = 0;
      throw err;
    }

    const json = await this.safeParseJson(response, 'Video Details');

    if (!response.ok) {
      const err: any = new Error(json.error || `Failed to fetch video details`);
      err.statusCode = response.status;
      err.isApiKeyMissing = json.isApiKeyMissing;
      err.isQuotaExceeded = json.isQuotaExceeded;
      throw err;
    }

    return json;
  }

  /**
   * Get channel info
   */
  public async getChannel(channelId: string): Promise<YouTubeChannelItem> {
    let response: Response;
    try {
      response = await fetch(`/api/youtube/channel/${encodeURIComponent(channelId)}`);
    } catch (networkErr: any) {
      const err: any = new Error('Network connection error: Unable to fetch channel details.');
      err.statusCode = 0;
      throw err;
    }

    const json = await this.safeParseJson(response, 'Channel Details');

    if (!response.ok) {
      const err: any = new Error(json.error || `Failed to fetch channel details`);
      err.statusCode = response.status;
      err.isApiKeyMissing = json.isApiKeyMissing;
      err.isQuotaExceeded = json.isQuotaExceeded;
      throw err;
    }

    return json;
  }

  /**
   * Get API connection status
   */
  public async getStatus(): Promise<YouTubeApiStatus> {
    try {
      const response = await fetch('/api/youtube/status');
      if (!response.ok) throw new Error('Status request failed');
      return await this.safeParseJson(response, 'YouTube Status');
    } catch {
      return {
        isConfigured: false,
        hasApiKey: false,
        timestamp: new Date().toISOString(),
        message: 'Could not connect to YouTube API proxy server.',
      };
    }
  }

  /**
   * Convert a YouTube video into a VeeCut MediaAsset ready to be used in Timeline and Media Pool
   */
  public createMediaAssetFromYouTube(item: YouTubeVideoItem): MediaAsset {
    const durationSeconds = Math.max(1, item.durationSeconds || 15);
    const duration = secondsToRationalTime(durationSeconds);
    const isShort = item.isShort;
    const width = isShort ? 1080 : 1920;
    const height = isShort ? 1920 : 1080;

    return {
      id: `yt_asset_${item.id}_${Date.now()}`,
      name: `[YouTube] ${item.title.slice(0, 50)}`,
      uri: item.thumbnailUrl, // Use high-res thumbnail proxy
      type: 'video',
      fileSize: 15000000,
      duration,
      videoMetadata: {
        width,
        height,
        fps: 30,
        codec: 'h264',
      },
      thumbnailUrl: item.thumbnailUrl,
      isOffline: false,
      importedAt: new Date().toISOString(),
    };
  }
}
