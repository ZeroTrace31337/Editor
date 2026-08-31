/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrendEngineResponse, TrendFilterOptions, TrendItem, TrendSourceStatus } from './TrendTypes';

export class TrendService {
  private static instance: TrendService;

  private constructor() {}

  public static getInstance(): TrendService {
    if (!TrendService.instance) {
      TrendService.instance = new TrendService();
    }
    return TrendService.instance;
  }

  /**
   * Fetches aggregated live & curated trends across YouTube, TikTok, and Instagram
   */
  public async getTrends(options: TrendFilterOptions, forceRefresh = false): Promise<TrendEngineResponse> {
    try {
      const params = new URLSearchParams({
        platform: options.platform,
        region: options.region,
        category: options.category,
        search: options.searchQuery || '',
        sortBy: options.sortBy,
        refresh: forceRefresh ? 'true' : 'false',
      });

      const response = await fetch(`/api/trends/all?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err: any) {
      console.warn('TrendService failed to reach backend, returning client fallback snapshot:', err);
      return this.getClientFallbackTrends(options);
    }
  }

  /**
   * Fetches API connection status for YouTube, TikTok, and Meta
   */
  public async getStatus(): Promise<{ status: string; sources: TrendSourceStatus[]; features: any }> {
    try {
      const response = await fetch('/api/trends/status');
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('Could not reach trend status endpoint:', err);
    }
    return {
      status: 'offline',
      sources: [],
      features: {},
    };
  }

  /**
   * Triggers a manual refresh of live trends on backend
   */
  public async refreshTrends(region = 'US', category = 'all'): Promise<TrendEngineResponse> {
    try {
      const response = await fetch('/api/trends/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region, category }),
      });
      if (response.ok) {
        const json = await response.json();
        return json.result;
      }
    } catch (err) {
      console.warn('Error refreshing trends:', err);
    }
    return this.getTrends({ platform: 'all', region, category, sortBy: 'score' }, true);
  }

  /**
   * Matches VeeCut templates by trend topic / keywords
   */
  public async getRecommendedTemplates(topic: string, aspectRatio = '9:16'): Promise<any[]> {
    try {
      const params = new URLSearchParams({ topic, aspectRatio });
      const response = await fetch(`/api/templates/recommendations?${params.toString()}`);
      if (response.ok) {
        const json = await response.json();
        return json.templates || [];
      }
    } catch (err) {
      console.warn('Error fetching recommended templates:', err);
    }
    return [];
  }

  private getClientFallbackTrends(options: TrendFilterOptions): TrendEngineResponse {
    return {
      trends: [],
      sources: [
        {
          id: 'source_fallback',
          name: 'VeeCut Trend Cache',
          platform: 'youtube',
          status: 'cached',
          message: 'Connecting to local VeeCut Trend Engine cache.',
          itemCount: 0,
          lastRefreshed: new Date().toISOString(),
          isOfficialApi: false,
        },
      ],
      totalCount: 0,
      timestamp: new Date().toISOString(),
      isCached: true,
      cacheExpiresInSeconds: 60,
      region: options.region,
      category: options.category,
    };
  }
}
