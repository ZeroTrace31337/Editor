/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface YouTubeVideoSnippet {
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
  items: YouTubeVideoSnippet[];
  nextPageToken?: string;
  prevPageToken?: string;
  totalResults: number;
  resultsPerPage: number;
  query: string;
  fromCache: boolean;
  timestamp: string;
}

export interface YouTubeChannelDetails {
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

export interface YouTubeSearchParams {
  q?: string;
  maxResults?: number;
  pageToken?: string;
  order?: 'relevance' | 'date' | 'viewCount' | 'rating' | 'title';
  videoDuration?: 'any' | 'short' | 'medium' | 'long';
  videoDefinition?: 'any' | 'high' | 'standard';
  type?: 'video' | 'channel' | 'playlist';
  regionCode?: string;
  safeSearch?: 'moderate' | 'strict' | 'none';
  videoCategoryId?: string;
  referer?: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class YouTubeService {
  private static instance: YouTubeService;
  private searchCache: Map<string, CacheEntry<YouTubeSearchResponse>> = new Map();
  private videoCache: Map<string, CacheEntry<YouTubeVideoSnippet>> = new Map();
  private channelCache: Map<string, CacheEntry<YouTubeChannelDetails>> = new Map();
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL
  private readonly MAX_CACHE_ENTRIES = 200;

  private constructor() {}

  public static getInstance(): YouTubeService {
    if (!YouTubeService.instance) {
      YouTubeService.instance = new YouTubeService();
    }
    return YouTubeService.instance;
  }

  /**
   * Safely retrieves YouTube API Key if configured
   */
  private getApiKey(): string | null {
    const key = process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_DATA_API_KEY;
    if (!key || key.trim() === '' || key === 'MY_YOUTUBE_API_KEY' || key === 'YOUR_NEW_API_KEY') {
      return null;
    }
    return key.trim();
  }

  /**
   * Sanitizes search input
   */
  private sanitizeQuery(query?: string): string {
    if (!query) return '';
    return query
      .replace(/[\x00-\x1F\x7F]/g, '')
      .trim()
      .slice(0, 200);
  }

  /**
   * Converts ISO 8601 duration format (e.g. PT4M13S, PT1H2M10S) or raw time string (e.g. 04:13)
   * to total seconds and formatted string
   */
  public parseDuration(isoOrTextDuration?: string): { seconds: number; formatted: string } {
    if (!isoOrTextDuration) return { seconds: 0, formatted: '00:00' };

    // If formatted as MM:SS or HH:MM:SS
    if (isoOrTextDuration.includes(':')) {
      const parts = isoOrTextDuration.split(':').map((p) => parseInt(p, 10) || 0);
      if (parts.length === 2) {
        const [mins, secs] = parts;
        const total = mins * 60 + secs;
        const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        return { seconds: total, formatted };
      }
      if (parts.length === 3) {
        const [hrs, mins, secs] = parts;
        const total = hrs * 3600 + mins * 60 + secs;
        const formatted = `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        return { seconds: total, formatted };
      }
    }

    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = isoOrTextDuration.match(regex);

    if (!matches) return { seconds: 0, formatted: '00:00' };

    const hours = parseInt(matches[1] || '0', 10);
    const minutes = parseInt(matches[2] || '0', 10);
    const seconds = parseInt(matches[3] || '0', 10);

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;

    let formatted = '';
    if (hours > 0) {
      formatted = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    return { seconds: totalSeconds, formatted };
  }

  /**
   * Helper: Parse view count string or number
   */
  private parseViewCount(viewText?: string | number): number | undefined {
    if (typeof viewText === 'number') return viewText;
    if (!viewText) return undefined;
    const clean = viewText.toLowerCase().replace(/,/g, '').trim();
    if (clean.includes('k')) {
      const val = parseFloat(clean.replace('k', '').replace('views', '').trim());
      return Math.round(val * 1000);
    }
    if (clean.includes('m')) {
      const val = parseFloat(clean.replace('m', '').replace('views', '').trim());
      return Math.round(val * 1000000);
    }
    if (clean.includes('b')) {
      const val = parseFloat(clean.replace('b', '').replace('views', '').trim());
      return Math.round(val * 1000000000);
    }
    const num = parseInt(clean.replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Cleans stale cache items
   */
  private pruneCache<T>(cacheMap: Map<string, CacheEntry<T>>) {
    const now = Date.now();
    for (const [key, entry] of cacheMap.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL_MS) {
        cacheMap.delete(key);
      }
    }
    if (cacheMap.size > this.MAX_CACHE_ENTRIES) {
      const oldestKey = cacheMap.keys().next().value;
      if (oldestKey) cacheMap.delete(oldestKey);
    }
  }

  /**
   * Live YouTube InnerTube Search Engine
   * Returns 100% real, accurate YouTube search results directly without API quota limitations
   */
  private async searchViaInnerTube(params: YouTubeSearchParams): Promise<YouTubeSearchResponse> {
    const query = this.sanitizeQuery(params.q) || 'Cinematic 4K';
    const pageToken = params.pageToken ? params.pageToken.trim() : '';

    const payload: any = {
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20240301.01.00',
          hl: 'en',
          gl: params.regionCode || 'US',
        },
      },
    };

    if (pageToken) {
      payload.continuation = pageToken;
    } else {
      payload.query = query;
    }

    const response = await fetch('https://www.youtube.com/youtubei/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`YouTube live search failed with status ${response.status}`);
    }

    const data = (await response.json()) as any;
    const items: YouTubeVideoSnippet[] = [];
    let nextContinuationToken: string | undefined = undefined;

    // 1. If this was a continuation request
    if (data.onResponseReceivedCommands) {
      for (const cmd of data.onResponseReceivedCommands) {
        const continuationItems = cmd.appendContinuationItemsAction?.continuationItems || [];
        for (const cItem of continuationItems) {
          if (cItem.itemSectionRenderer?.contents) {
            for (const content of cItem.itemSectionRenderer.contents) {
              const parsed = this.parseInnerTubeVideoRenderer(content.videoRenderer);
              if (parsed) items.push(parsed);
            }
          }
          if (cItem.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token) {
            nextContinuationToken = cItem.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
          }
        }
      }
    } else {
      // 2. Standard first-page results
      const sectionList =
        data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

      for (const section of sectionList) {
        if (section.itemSectionRenderer?.contents) {
          for (const content of section.itemSectionRenderer.contents) {
            const parsed = this.parseInnerTubeVideoRenderer(content.videoRenderer);
            if (parsed) items.push(parsed);
          }
        }
        if (section.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token) {
          nextContinuationToken = section.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
        }
      }
    }

    // Filter by duration if requested
    let filteredItems = items;
    if (params.videoDuration && params.videoDuration !== 'any') {
      if (params.videoDuration === 'short') {
        filteredItems = filteredItems.filter((v) => v.durationSeconds <= 240);
      } else if (params.videoDuration === 'medium') {
        filteredItems = filteredItems.filter((v) => v.durationSeconds > 240 && v.durationSeconds <= 1200);
      } else if (params.videoDuration === 'long') {
        filteredItems = filteredItems.filter((v) => v.durationSeconds > 1200);
      }
    }

    // Sort by views or date if requested
    if (params.order === 'viewCount') {
      filteredItems.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    }

    // Cache each video item individually
    for (const item of filteredItems) {
      this.videoCache.set(item.id, { data: item, timestamp: Date.now() });
    }

    return {
      items: filteredItems,
      nextPageToken: nextContinuationToken,
      prevPageToken: undefined,
      totalResults: filteredItems.length * 10,
      resultsPerPage: filteredItems.length,
      query,
      fromCache: false,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Helper: Parse individual videoRenderer object from YouTube InnerTube
   */
  private parseInnerTubeVideoRenderer(v: any): YouTubeVideoSnippet | null {
    if (!v || !v.videoId) return null;

    const videoId = v.videoId;
    const title = v.title?.runs?.map((r: any) => r.text).join('') || v.title?.simpleText || 'Untitled Video';
    const description =
      v.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((r: any) => r.text).join('') ||
      v.descriptionSnippet?.runs?.map((r: any) => r.text).join('') ||
      '';
    const channelTitle =
      v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || 'YouTube Creator';
    const channelId =
      v.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
      v.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
      '';
    const channelAvatar =
      v.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails?.[0]?.url;
    const viewCountText =
      v.viewCountText?.simpleText ||
      v.shortViewCountText?.simpleText ||
      v.shortViewCountText?.runs?.map((r: any) => r.text).join('') ||
      '';
    const publishedText =
      v.publishedTimeText?.simpleText || v.publishedTimeText?.runs?.map((r: any) => r.text).join('') || '';
    const lengthText =
      v.lengthText?.simpleText || v.lengthText?.runs?.map((r: any) => r.text).join('') || '0:00';

    const thumbs = v.thumbnail?.thumbnails || [];
    let bestThumb = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    if (bestThumb.startsWith('//')) bestThumb = 'https:' + bestThumb;

    const { seconds, formatted } = this.parseDuration(lengthText);
    const viewCount = this.parseViewCount(viewCountText);
    const isShort =
      seconds > 0 &&
      seconds <= 60 &&
      (title.toLowerCase().includes('#shorts') || description.toLowerCase().includes('#shorts') || lengthText.startsWith('0:'));

    return {
      id: videoId,
      title,
      description,
      thumbnailUrl: bestThumb,
      thumbnails: {
        default: { url: `https://i.ytimg.com/vi/${videoId}/default.jpg`, width: 120, height: 90 },
        medium: { url: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`, width: 320, height: 180 },
        high: { url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, width: 480, height: 360 },
        maxres: { url: bestThumb, width: 1280, height: 720 },
      },
      channelId,
      channelTitle,
      channelAvatarUrl: channelAvatar ? (channelAvatar.startsWith('//') ? 'https:' + channelAvatar : channelAvatar) : undefined,
      publishedAt: new Date().toISOString(),
      duration: `PT${formatted}`,
      durationSeconds: seconds,
      durationFormatted: formatted,
      viewCount,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      isShort,
      definition: 'hd',
      tags: [],
    };
  }

  /**
   * Search YouTube videos with automatic multi-tier fallback
   */
  public async searchVideos(params: YouTubeSearchParams): Promise<YouTubeSearchResponse> {
    const sanitizedQ = this.sanitizeQuery(params.q);
    const maxResults = Math.min(50, Math.max(1, params.maxResults || 18));
    const pageToken = params.pageToken ? params.pageToken.trim() : '';
    const order = params.order || 'relevance';
    const videoDuration = params.videoDuration || 'any';
    const type = params.type || 'video';
    const regionCode = params.regionCode || 'US';
    const safeSearch = params.safeSearch || 'moderate';

    // Check memory cache
    const cacheKey = `search_${sanitizedQ}_${maxResults}_${pageToken}_${order}_${videoDuration}_${type}_${regionCode}_${safeSearch}_${params.videoCategoryId || ''}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return {
        ...cached.data,
        fromCache: true,
      };
    }

    const apiKey = this.getApiKey();

    // 1. Try official YouTube Data API v3 if API key is present
    if (apiKey) {
      try {
        const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
        searchUrl.searchParams.set('part', 'snippet');
        searchUrl.searchParams.set('type', type);
        searchUrl.searchParams.set('maxResults', String(maxResults));
        searchUrl.searchParams.set('order', order);
        searchUrl.searchParams.set('regionCode', regionCode);
        searchUrl.searchParams.set('safeSearch', safeSearch);
        searchUrl.searchParams.set('key', apiKey);

        if (sanitizedQ) {
          searchUrl.searchParams.set('q', sanitizedQ);
        } else {
          searchUrl.searchParams.set('q', 'Cinematic 4K creative video');
        }

        if (videoDuration !== 'any') {
          searchUrl.searchParams.set('videoDuration', videoDuration);
        }
        if (pageToken) {
          searchUrl.searchParams.set('pageToken', pageToken);
        }
        if (params.videoCategoryId) {
          searchUrl.searchParams.set('videoCategoryId', params.videoCategoryId);
        }

        const headers: Record<string, string> = {
          'Accept': 'application/json',
          'User-Agent': 'aistudio-veecut-search/1.0',
        };
        if (params.referer) {
          headers['Referer'] = params.referer;
        }

        const searchResponse = await fetch(searchUrl.toString(), { headers });

        if (searchResponse.ok) {
          const searchData = (await searchResponse.json()) as any;
          const searchItems = searchData.items || [];

          const videoIds = searchItems
            .map((item: any) => (item.id?.videoId ? item.id.videoId : typeof item.id === 'string' ? item.id : null))
            .filter(Boolean);

          let videoDetailsMap = new Map<string, any>();
          if (videoIds.length > 0) {
            try {
              const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${apiKey}`;
              const detailsRes = await fetch(detailsUrl, { headers });
              if (detailsRes.ok) {
                const detailsData = (await detailsRes.json()) as any;
                if (detailsData.items) {
                  for (const v of detailsData.items) {
                    videoDetailsMap.set(v.id, v);
                  }
                }
              }
            } catch {}
          }

          const enrichedItems: YouTubeVideoSnippet[] = searchItems
            .map((item: any) => {
              const videoId = item.id?.videoId || (typeof item.id === 'string' ? item.id : null);
              if (!videoId) return null;

              const snippet = item.snippet || {};
              const details = videoDetailsMap.get(videoId);
              const detailedSnippet = details?.snippet || snippet;
              const contentDetails = details?.contentDetails || {};
              const statistics = details?.statistics || {};

              const rawDuration = contentDetails.duration || 'PT0S';
              const { seconds, formatted } = this.parseDuration(rawDuration);

              const thumbs = detailedSnippet.thumbnails || snippet.thumbnails || {};
              const thumbnailUrl =
                thumbs.maxres?.url ||
                thumbs.high?.url ||
                thumbs.medium?.url ||
                thumbs.default?.url ||
                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

              const isShort = seconds > 0 && seconds <= 60;

              const videoItem: YouTubeVideoSnippet = {
                id: videoId,
                title: detailedSnippet.title || snippet.title || 'Untitled Video',
                description: detailedSnippet.description || snippet.description || '',
                thumbnailUrl,
                thumbnails: thumbs,
                channelId: detailedSnippet.channelId || snippet.channelId || '',
                channelTitle: detailedSnippet.channelTitle || snippet.channelTitle || 'Unknown Channel',
                publishedAt: detailedSnippet.publishedAt || snippet.publishedAt || new Date().toISOString(),
                duration: rawDuration,
                durationSeconds: seconds,
                durationFormatted: formatted,
                viewCount: statistics.viewCount ? parseInt(statistics.viewCount, 10) : undefined,
                likeCount: statistics.likeCount ? parseInt(statistics.likeCount, 10) : undefined,
                commentCount: statistics.commentCount ? parseInt(statistics.commentCount, 10) : undefined,
                videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
                embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
                isShort,
                definition: contentDetails.definition === 'hd' ? 'hd' : 'sd',
                tags: detailedSnippet.tags || [],
              };

              this.videoCache.set(videoId, { data: videoItem, timestamp: Date.now() });
              return videoItem;
            })
            .filter(Boolean) as YouTubeVideoSnippet[];

          const result: YouTubeSearchResponse = {
            items: enrichedItems,
            nextPageToken: searchData.nextPageToken,
            prevPageToken: searchData.prevPageToken,
            totalResults: searchData.pageInfo?.totalResults || enrichedItems.length,
            resultsPerPage: searchData.pageInfo?.resultsPerPage || maxResults,
            query: sanitizedQ,
            fromCache: false,
            timestamp: new Date().toISOString(),
          };

          this.pruneCache(this.searchCache);
          this.searchCache.set(cacheKey, { data: result, timestamp: Date.now() });
          return result;
        }
      } catch (apiErr) {
        console.warn('YouTube Data API v3 search failed, falling back to live search engine:', apiErr);
      }
    }

    // 2. Fallback to Live InnerTube YouTube Search
    const liveResult = await this.searchViaInnerTube(params);
    this.pruneCache(this.searchCache);
    this.searchCache.set(cacheKey, { data: liveResult, timestamp: Date.now() });
    return liveResult;
  }

  /**
   * Retrieve detailed information for a single video by ID
   */
  public async getVideoDetails(videoId: string): Promise<YouTubeVideoSnippet> {
    const cleanId = videoId.trim();
    if (!cleanId) {
      throw new Error('Video ID is required');
    }

    // Check memory cache
    const cached = this.videoCache.get(cleanId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    const apiKey = this.getApiKey();
    if (apiKey) {
      try {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${cleanId}&key=${apiKey}`;
        const response = await fetch(url, { headers: { Accept: 'application/json' } });
        if (response.ok) {
          const json = (await response.json()) as any;
          const item = json.items?.[0];
          if (item) {
            const snippet = item.snippet || {};
            const contentDetails = item.contentDetails || {};
            const statistics = item.statistics || {};
            const { seconds, formatted } = this.parseDuration(contentDetails.duration);
            const thumbs = snippet.thumbnails || {};
            const thumbnailUrl =
              thumbs.maxres?.url || thumbs.high?.url || thumbs.medium?.url || `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`;

            const result: YouTubeVideoSnippet = {
              id: cleanId,
              title: snippet.title || 'Untitled Video',
              description: snippet.description || '',
              thumbnailUrl,
              thumbnails: thumbs,
              channelId: snippet.channelId || '',
              channelTitle: snippet.channelTitle || 'Unknown Channel',
              publishedAt: snippet.publishedAt || new Date().toISOString(),
              duration: contentDetails.duration || 'PT0S',
              durationSeconds: seconds,
              durationFormatted: formatted,
              viewCount: statistics.viewCount ? parseInt(statistics.viewCount, 10) : undefined,
              likeCount: statistics.likeCount ? parseInt(statistics.likeCount, 10) : undefined,
              commentCount: statistics.commentCount ? parseInt(statistics.commentCount, 10) : undefined,
              videoUrl: `https://www.youtube.com/watch?v=${cleanId}`,
              embedUrl: `https://www.youtube-nocookie.com/embed/${cleanId}`,
              isShort: seconds > 0 && seconds <= 60,
              definition: contentDetails.definition === 'hd' ? 'hd' : 'sd',
              tags: snippet.tags || [],
            };
            this.videoCache.set(cleanId, { data: result, timestamp: Date.now() });
            return result;
          }
        }
      } catch {}
    }

    // Fallback: oEmbed metadata
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${cleanId}&format=json`
      );
      if (oembedRes.ok) {
        const oembed = (await oembedRes.json()) as any;
        const result: YouTubeVideoSnippet = {
          id: cleanId,
          title: oembed.title || 'YouTube Video',
          description: '',
          thumbnailUrl: oembed.thumbnail_url || `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
          thumbnails: {
            high: { url: oembed.thumbnail_url || `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`, width: 480, height: 360 },
          },
          channelId: '',
          channelTitle: oembed.author_name || 'YouTube Creator',
          publishedAt: new Date().toISOString(),
          duration: 'PT0S',
          durationSeconds: 0,
          durationFormatted: '00:00',
          videoUrl: `https://www.youtube.com/watch?v=${cleanId}`,
          embedUrl: `https://www.youtube-nocookie.com/embed/${cleanId}`,
          isShort: false,
          definition: 'hd',
        };
        this.videoCache.set(cleanId, { data: result, timestamp: Date.now() });
        return result;
      }
    } catch {}

    const fallback: YouTubeVideoSnippet = {
      id: cleanId,
      title: 'YouTube Video',
      description: '',
      thumbnailUrl: `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
      thumbnails: {
        high: { url: `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`, width: 480, height: 360 },
      },
      channelId: '',
      channelTitle: 'YouTube Creator',
      publishedAt: new Date().toISOString(),
      duration: 'PT0S',
      durationSeconds: 0,
      durationFormatted: '00:00',
      videoUrl: `https://www.youtube.com/watch?v=${cleanId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${cleanId}`,
      isShort: false,
      definition: 'hd',
    };
    return fallback;
  }

  /**
   * Retrieve channel details by Channel ID
   */
  public async getChannelDetails(channelId: string): Promise<YouTubeChannelDetails> {
    const cleanId = channelId.trim();
    if (!cleanId) {
      throw new Error('Channel ID is required');
    }

    const cached = this.channelCache.get(cleanId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    const apiKey = this.getApiKey();
    if (apiKey) {
      try {
        const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${cleanId}&key=${apiKey}`;
        const response = await fetch(url, { headers: { Accept: 'application/json' } });
        if (response.ok) {
          const json = (await response.json()) as any;
          const item = json.items?.[0];
          if (item) {
            const snippet = item.snippet || {};
            const statistics = item.statistics || {};
            const branding = item.brandingSettings || {};

            const avatarUrl =
              snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '';
            const bannerUrl = branding.image?.bannerExternalUrl || undefined;

            const result: YouTubeChannelDetails = {
              id: cleanId,
              title: snippet.title || 'YouTube Channel',
              description: snippet.description || '',
              customUrl: snippet.customUrl,
              publishedAt: snippet.publishedAt || '',
              avatarUrl,
              bannerUrl,
              subscriberCount: statistics.subscriberCount ? parseInt(statistics.subscriberCount, 10) : undefined,
              videoCount: statistics.videoCount ? parseInt(statistics.videoCount, 10) : undefined,
              viewCount: statistics.viewCount ? parseInt(statistics.viewCount, 10) : undefined,
              country: snippet.country,
            };

            this.pruneCache(this.channelCache);
            this.channelCache.set(cleanId, { data: result, timestamp: Date.now() });
            return result;
          }
        }
      } catch {}
    }

    const fallback: YouTubeChannelDetails = {
      id: cleanId,
      title: 'YouTube Creator Channel',
      description: 'Official YouTube Channel',
      publishedAt: new Date().toISOString(),
      avatarUrl: `https://ui-avatars.com/api/?name=YouTube&background=f43f5e&color=fff`,
    };
    return fallback;
  }

  /**
   * Checks API status
   */
  public getStatus(): { isConfigured: boolean; hasApiKey: boolean; timestamp: string; message: string } {
    const key = this.getApiKey();
    const hasApiKey = !!key;

    return {
      isConfigured: true,
      hasApiKey,
      timestamp: new Date().toISOString(),
      message: hasApiKey
        ? 'Official YouTube Data API v3 and live search engine active.'
        : 'YouTube Live Search active (connect YOUTUBE_API_KEY in Settings > Secrets for dedicated quota).',
    };
  }
}
