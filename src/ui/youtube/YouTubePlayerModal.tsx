/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Youtube,
  ExternalLink,
  Plus,
  Play,
  Clock,
  Eye,
  ThumbsUp,
  MessageSquare,
  Calendar,
  Share2,
  Check,
  Film,
  Sparkles,
} from 'lucide-react';
import { YouTubeVideoItem } from '../../domain/youtube/YouTubeTypes';
import { useEditor } from '../context/EditorContext';
import { YouTubeClientService } from '../../domain/youtube/youtubeService';

interface YouTubePlayerModalProps {
  video: YouTubeVideoItem | null;
  isOpen: boolean;
  onClose: () => void;
  onViewChannel?: (channelId: string) => void;
}

export const YouTubePlayerModal: React.FC<YouTubePlayerModalProps> = ({
  video,
  isOpen,
  onClose,
  onViewChannel,
}) => {
  const { addMediaAssetAndClip, currentTime } = useEditor();
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState<'timeline' | 'pool' | null>(null);
  const [showFullDesc, setShowFullDesc] = useState(false);

  if (!isOpen || !video) return null;

  const handleAddToTimeline = async () => {
    setIsAdding(true);
    try {
      const ytService = YouTubeClientService.getInstance();
      const asset = ytService.createMediaAssetFromYouTube(video);
      await addMediaAssetAndClip(asset, undefined, currentTime);
      setAddedSuccess('timeline');
      setTimeout(() => setAddedSuccess(null), 2500);
    } catch (err) {
      console.error('Failed to add YouTube video to timeline:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddToMediaPool = async () => {
    setIsAdding(true);
    try {
      const ytService = YouTubeClientService.getInstance();
      const asset = ytService.createMediaAssetFromYouTube(video);
      await addMediaAssetAndClip(asset);
      setAddedSuccess('pool');
      setTimeout(() => setAddedSuccess(null), 2500);
    } catch (err) {
      console.error('Failed to add YouTube video to media pool:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return isoString;
    }
  };

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '—';
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="youtube_player_modal"
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#11131c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#161926] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
              <Youtube className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white truncate max-w-lg">
              {video.title}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={video.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-lg border border-white/10 transition-colors"
              title="Open on YouTube"
            >
              <span>Watch on YouTube</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-white/5">
          {/* 1. Embed Player Section */}
          <div className="relative w-full aspect-video bg-black flex items-center justify-center">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`}
              title={video.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          {/* 2. Action Toolbar */}
          <div className="px-6 py-4 bg-[#141724] flex flex-wrap items-center justify-between gap-3">
            {/* Left stats pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/5">
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span>{formatNumber(video.viewCount)} views</span>
              </div>
              {video.likeCount !== undefined && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/5">
                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{formatNumber(video.likeCount)} likes</span>
                </div>
              )}
              {video.durationFormatted && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{video.durationFormatted}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/5">
                <Calendar className="w-3.5 h-3.5 text-violet-400" />
                <span>{formatDate(video.publishedAt)}</span>
              </div>
            </div>

            {/* Right Editor Import Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn_yt_add_media_pool"
                onClick={handleAddToMediaPool}
                disabled={isAdding}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-white/10 hover:border-white/20 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                {addedSuccess === 'pool' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Added to Pool!</span>
                  </>
                ) : (
                  <>
                    <Film className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Add to Media Pool</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="btn_yt_add_timeline"
                onClick={handleAddToTimeline}
                disabled={isAdding}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 transition-all active:scale-95 disabled:opacity-50"
              >
                {addedSuccess === 'timeline' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Inserted on Timeline!</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Insert into Timeline</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. Channel & Metadata Section */}
          <div className="p-6 space-y-4">
            {/* Channel info bar */}
            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => onViewChannel && video.channelId && onViewChannel(video.channelId)}
              >
                {video.channelAvatarUrl ? (
                  <img
                    src={video.channelAvatarUrl}
                    alt={video.channelTitle}
                    className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:border-rose-500/50 transition-all"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-sm">
                    {video.channelTitle.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-rose-400 transition-colors flex items-center gap-1.5">
                    <span>{video.channelTitle}</span>
                    {onViewChannel && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 group-hover:bg-rose-500/20 group-hover:text-rose-300">
                        View Info
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-zinc-400">YouTube Creator</p>
                </div>
              </div>
            </div>

            {/* Video Description */}
            {video.description && (
              <div className="bg-[#141724] border border-white/5 rounded-xl p-4 text-xs text-zinc-300 leading-relaxed">
                <p className={showFullDesc ? 'whitespace-pre-wrap' : 'line-clamp-3 whitespace-pre-wrap'}>
                  {video.description}
                </p>
                {video.description.length > 180 && (
                  <button
                    type="button"
                    onClick={() => setShowFullDesc(!showFullDesc)}
                    className="mt-2 text-rose-400 hover:text-rose-300 font-medium transition-colors"
                  >
                    {showFullDesc ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            )}

            {/* Video Tags */}
            {video.tags && video.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {video.tags.slice(0, 10).map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/5"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
