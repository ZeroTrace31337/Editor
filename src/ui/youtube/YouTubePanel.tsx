/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Youtube,
  Play,
  Plus,
  Clock,
  Eye,
  SlidersHorizontal,
  RefreshCw,
  AlertCircle,
  KeyRound,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Film,
  Sparkles,
  Check,
  TrendingUp,
  Flame,
  Info,
} from 'lucide-react';
import { YouTubeVideoItem, YouTubeSearchResponse } from '../../domain/youtube/YouTubeTypes';
import { YouTubeClientService } from '../../domain/youtube/youtubeService';
import { useEditor } from '../context/EditorContext';
import { YouTubePlayerModal } from './YouTubePlayerModal';
import { YouTubeChannelModal } from './YouTubeChannelModal';

const QUICK_TOPICS = [
  'Cinematic 4K',
  'Lo-Fi Chill Beats',
  'Shorts Hooks',
  'Cyberpunk VFX',
  'Gaming Clutch',
  'Tokyo 4K Vlog',
  'Tech Reviews',
  'Drone Nature',
  'Sound Effects',
];

export const YouTubePanel: React.FC = () => {
  const { addMediaAssetAndClip, currentTime } = useEditor();
  const ytService = YouTubeClientService.getInstance();

  // Search state
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('Cinematic 4K');
  const [selectedDuration, setSelectedDuration] = useState<'any' | 'short' | 'medium' | 'long'>('any');
  const [selectedOrder, setSelectedOrder] = useState<'relevance' | 'viewCount' | 'date' | 'rating'>('relevance');
  const [showFilters, setShowFilters] = useState(false);

  // Results state
  const [results, setResults] = useState<YouTubeVideoItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [prevPageToken, setPrevPageToken] = useState<string | undefined>(undefined);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; isKeyMissing?: boolean; isQuotaExceeded?: boolean } | null>(null);

  // Modals state
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideoItem | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [isChannelOpen, setIsChannelOpen] = useState(false);

  // Quick insertion feedback
  const [insertingId, setInsertingId] = useState<string | null>(null);
  const [insertedId, setInsertedId] = useState<string | null>(null);

  const performSearch = useCallback(
    async (searchQuery: string, pageToken?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await ytService.search({
          q: searchQuery,
          videoDuration: selectedDuration,
          order: selectedOrder,
          pageToken,
          maxResults: 16,
        });

        setResults(data.items || []);
        setNextPageToken(data.nextPageToken);
        setPrevPageToken(data.prevPageToken);
        setTotalResults(data.totalResults || 0);
        setSubmittedQuery(searchQuery);
      } catch (err: any) {
        console.error('YouTube search failed:', err);
        setError({
          message: err.message || 'Failed to search YouTube videos.',
          isKeyMissing: err.isApiKeyMissing,
          isQuotaExceeded: err.isQuotaExceeded,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [selectedDuration, selectedOrder, ytService]
  );

  // Initial search
  useEffect(() => {
    performSearch('Cinematic 4K');
  }, [performSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      performSearch(query.trim());
    }
  };

  const handleQuickTopicClick = (topic: string) => {
    setQuery(topic);
    performSearch(topic);
  };

  const handleInsertTimeline = async (e: React.MouseEvent, video: YouTubeVideoItem) => {
    e.stopPropagation();
    setInsertingId(video.id);
    try {
      const asset = ytService.createMediaAssetFromYouTube(video);
      await addMediaAssetAndClip(asset, undefined, currentTime);
      setInsertedId(video.id);
      setTimeout(() => setInsertedId(null), 2500);
    } catch (err) {
      console.error('Failed to insert YouTube clip:', err);
    } finally {
      setInsertingId(null);
    }
  };

  const handleAddToPool = async (e: React.MouseEvent, video: YouTubeVideoItem) => {
    e.stopPropagation();
    setInsertingId(video.id);
    try {
      const asset = ytService.createMediaAssetFromYouTube(video);
      await addMediaAssetAndClip(asset);
      setInsertedId(video.id);
      setTimeout(() => setInsertedId(null), 2500);
    } catch (err) {
      console.error('Failed to add YouTube asset to pool:', err);
    } finally {
      setInsertingId(null);
    }
  };

  const formatViews = (num?: number) => {
    if (num === undefined || num === null) return null;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M views`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K views`;
    return `${num} views`;
  };

  const formatTimeAgo = (isoString: string) => {
    try {
      const diff = Date.now() - new Date(isoString).getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours < 24) return `${Math.max(1, hours)}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 30) return `${days}d ago`;
      const months = Math.floor(days / 30);
      if (months < 12) return `${months}mo ago`;
      return `${Math.floor(months / 12)}y ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-100 overflow-hidden font-sans">
      {/* 1. Header & Search Input */}
      <div className="p-3 border-b border-zinc-800 bg-zinc-950/60 shrink-0 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-500 border border-rose-500/30">
              <Youtube className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white tracking-wide uppercase">YouTube Search</h3>
              <p className="text-[10px] text-zinc-400">Discover and import live YouTube videos</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-md text-xs border transition-colors flex items-center gap-1 ${
                showFilters || selectedDuration !== 'any' || selectedOrder !== 'relevance'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
              }`}
              title="Toggle filters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => performSearch(submittedQuery)}
              disabled={isLoading}
              className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700 transition-colors"
              title="Refresh search"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-rose-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <Search className="absolute left-3 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            id="input_yt_search_query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keywords, topics, or creators..."
            className="w-full pl-8 pr-16 py-1.5 bg-zinc-900 border border-zinc-750 focus:border-rose-500 rounded-lg text-xs text-white placeholder-zinc-500 outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="absolute right-1.5 px-2 py-0.5 text-[11px] font-medium rounded bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-40 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Filter Drawer */}
        {showFilters && (
          <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-2 text-[11px] animate-in fade-in slide-in-from-top-1 duration-150">
            <div>
              <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block mb-1">
                Duration
              </span>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { id: 'any', label: 'All' },
                  { id: 'short', label: 'Shorts (<4m)' },
                  { id: 'medium', label: 'Medium (4-20m)' },
                  { id: 'long', label: 'Long (>20m)' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDuration(d.id as any)}
                    className={`px-1.5 py-1 rounded text-center truncate transition-colors ${
                      selectedDuration === d.id
                        ? 'bg-rose-600 text-white font-medium'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block mb-1">
                Sort By
              </span>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { id: 'relevance', label: 'Relevance' },
                  { id: 'viewCount', label: 'Views' },
                  { id: 'date', label: 'Upload date' },
                  { id: 'rating', label: 'Rating' },
                ].map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setSelectedOrder(o.id as any)}
                    className={`px-1.5 py-1 rounded text-center truncate transition-colors ${
                      selectedOrder === o.id
                        ? 'bg-rose-600 text-white font-medium'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Topic Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {QUICK_TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => handleQuickTopicClick(topic)}
              className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
                submittedQuery.toLowerCase() === topic.toLowerCase()
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-medium'
                  : 'bg-zinc-800/80 text-zinc-400 border-zinc-750 hover:border-zinc-600 hover:text-zinc-200'
              }`}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Results List / Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {/* Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-rose-500/30 text-xs space-y-2 shadow-lg">
            <div className="flex items-start gap-2 text-rose-400 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error.isKeyMissing ? 'YouTube API Key Required' : error.isQuotaExceeded ? 'YouTube Quota Limit' : 'YouTube Search Error'}</span>
            </div>
            <p className="text-zinc-300 text-[11px] leading-relaxed">{error.message}</p>
            
            {error.isKeyMissing && (
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>How to connect YouTube Data API:</span>
                </div>
                <p>1. Open Google AI Studio <strong>Settings &gt; Secrets</strong></p>
                <p>2. Add secret variable named: <code className="text-rose-400 font-mono">YOUTUBE_API_KEY</code></p>
                <p>3. Set your Google Cloud YouTube Data API v3 key</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => performSearch(submittedQuery)}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg text-[11px] transition-colors"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="p-2.5 rounded-xl bg-zinc-850/60 border border-zinc-800/80 animate-pulse space-y-2">
                <div className="aspect-video w-full rounded-lg bg-zinc-800" />
                <div className="h-3.5 bg-zinc-800 rounded w-3/4" />
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-zinc-800" />
                  <div className="h-3 bg-zinc-800 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!isLoading && !error && results.length === 0 && (
          <div className="py-12 text-center space-y-2">
            <Youtube className="w-10 h-10 text-zinc-600 mx-auto" />
            <h4 className="text-xs font-semibold text-zinc-300">No YouTube videos found</h4>
            <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
              Try adjusting your search terms, removing filters, or searching for broader topics.
            </p>
          </div>
        )}

        {/* Video Results List */}
        {!isLoading && results.length > 0 && (
          <div className="space-y-3">
            {results.map((video) => {
              const isInserted = insertedId === video.id;
              const isInserting = insertingId === video.id;

              return (
                <div
                  key={video.id}
                  id={`yt_card_${video.id}`}
                  onClick={() => {
                    setSelectedVideo(video);
                    setIsPlayerOpen(true);
                  }}
                  className="group relative flex flex-col bg-zinc-950/70 hover:bg-zinc-850/90 border border-zinc-800 hover:border-zinc-700 rounded-xl overflow-hidden cursor-pointer transition-all duration-150 shadow-sm"
                >
                  {/* Thumbnail Container */}
                  <div className="relative aspect-video w-full bg-black overflow-hidden">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* Duration Badge */}
                    {video.durationFormatted && (
                      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-semibold text-white backdrop-blur-xs font-mono">
                        {video.durationFormatted}
                      </span>
                    )}

                    {/* Short Badge */}
                    {video.isShort && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-rose-600 text-[9px] font-bold text-white uppercase tracking-wider shadow">
                        Shorts
                      </span>
                    )}

                    {/* Play Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Video Meta Info */}
                  <div className="p-3 space-y-2">
                    <h4
                      className="text-xs font-medium text-white line-clamp-2 leading-snug group-hover:text-rose-400 transition-colors"
                      title={video.title}
                    >
                      {video.title}
                    </h4>

                    {/* Channel info & date */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <div
                        className="flex items-center gap-1.5 min-w-0 hover:text-zinc-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (video.channelId) {
                            setSelectedChannelId(video.channelId);
                            setIsChannelOpen(true);
                          }
                        }}
                      >
                        {video.channelAvatarUrl ? (
                          <img
                            src={video.channelAvatarUrl}
                            alt=""
                            className="w-4 h-4 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-rose-600/30 text-rose-400 flex items-center justify-center text-[9px] font-bold shrink-0">
                            {video.channelTitle.slice(0, 1)}
                          </div>
                        )}
                        <span className="truncate max-w-[140px]">{video.channelTitle}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 text-zinc-500 text-[10px]">
                        {video.viewCount !== undefined && <span>{formatViews(video.viewCount)}</span>}
                        {video.viewCount !== undefined && <span>•</span>}
                        <span>{formatTimeAgo(video.publishedAt)}</span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-1.5 border-t border-zinc-800/80 flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleAddToPool(e, video)}
                        disabled={isInserting}
                        className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-medium transition-colors border border-zinc-750"
                        title="Add to Media Pool"
                      >
                        <Film className="w-3 h-3 text-zinc-400" />
                        <span>Pool</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleInsertTimeline(e, video)}
                        disabled={isInserting}
                        className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-[11px] font-semibold transition-colors shadow-sm"
                        title="Insert into Timeline at playhead"
                      >
                        {isInserted ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-300" />
                            <span>Inserted!</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            <span>Timeline</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Pagination Footer */}
      {(prevPageToken || nextPageToken) && (
        <div className="p-2.5 border-t border-zinc-800 bg-zinc-950/80 shrink-0 flex items-center justify-between text-xs text-zinc-400">
          <button
            type="button"
            onClick={() => performSearch(submittedQuery, prevPageToken)}
            disabled={!prevPageToken || isLoading}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-850 hover:bg-zinc-750 text-zinc-300 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          <span className="text-[11px] text-zinc-500">
            {totalResults > 0 ? `~${totalResults.toLocaleString()} results` : 'YouTube Results'}
          </span>

          <button
            type="button"
            onClick={() => performSearch(submittedQuery, nextPageToken)}
            disabled={!nextPageToken || isLoading}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-850 hover:bg-zinc-750 text-zinc-300 disabled:opacity-40 transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Modals */}
      <YouTubePlayerModal
        video={selectedVideo}
        isOpen={isPlayerOpen}
        onClose={() => {
          setIsPlayerOpen(false);
          setSelectedVideo(null);
        }}
        onViewChannel={(chId) => {
          setSelectedChannelId(chId);
          setIsChannelOpen(true);
        }}
      />

      <YouTubeChannelModal
        channelId={selectedChannelId}
        isOpen={isChannelOpen}
        onClose={() => {
          setIsChannelOpen(false);
          setSelectedChannelId(null);
        }}
      />
    </div>
  );
};
