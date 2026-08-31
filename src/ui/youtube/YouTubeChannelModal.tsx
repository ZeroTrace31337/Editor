/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Youtube,
  Users,
  Film,
  Eye,
  Globe,
  ExternalLink,
  Calendar,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { YouTubeChannelItem } from '../../domain/youtube/YouTubeTypes';
import { YouTubeClientService } from '../../domain/youtube/youtubeService';

interface YouTubeChannelModalProps {
  channelId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const YouTubeChannelModal: React.FC<YouTubeChannelModalProps> = ({
  channelId,
  isOpen,
  onClose,
}) => {
  const [channel, setChannel] = useState<YouTubeChannelItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !channelId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchChannel = async () => {
      try {
        const ytService = YouTubeClientService.getInstance();
        const data = await ytService.getChannel(channelId);
        if (isMounted) {
          setChannel(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Could not fetch channel details');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchChannel();

    return () => {
      isMounted = false;
    };
  }, [channelId, isOpen]);

  if (!isOpen) return null;

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '—';
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="youtube_channel_modal"
        className="relative w-full max-w-lg bg-[#11131c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / Banner */}
        <div className="relative h-28 bg-gradient-to-r from-rose-950/60 via-zinc-900 to-rose-900/40 border-b border-white/10">
          {channel?.bannerUrl && (
            <img
              src={channel.bannerUrl}
              alt="Channel Banner"
              className="w-full h-full object-cover opacity-60"
            />
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/50 hover:bg-black/75 text-zinc-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 pt-0 relative">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
              <p className="text-xs text-zinc-400">Loading channel information...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-white">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-zinc-200"
              >
                Close
              </button>
            </div>
          ) : channel ? (
            <>
              {/* Avatar + Title Header */}
              <div className="flex items-end justify-between -mt-10 mb-4">
                {channel.avatarUrl ? (
                  <img
                    src={channel.avatarUrl}
                    alt={channel.title}
                    className="w-20 h-20 rounded-full object-cover border-4 border-[#11131c] shadow-lg"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-rose-600 border-4 border-[#11131c] flex items-center justify-center font-bold text-2xl text-white">
                    {channel.title.slice(0, 1).toUpperCase()}
                  </div>
                )}

                <a
                  href={`https://www.youtube.com/channel/${channel.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/25 transition-all"
                >
                  <span>Visit Channel</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{channel.title}</span>
                </h3>
                {channel.customUrl && (
                  <p className="text-xs text-rose-400 font-medium">{channel.customUrl}</p>
                )}
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-2.5 my-4">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-zinc-400 mb-1">
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                    <span>Subscribers</span>
                  </div>
                  <span className="text-sm font-bold text-white">
                    {formatNumber(channel.subscriberCount)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-zinc-400 mb-1">
                    <Film className="w-3.5 h-3.5 text-amber-400" />
                    <span>Videos</span>
                  </div>
                  <span className="text-sm font-bold text-white">
                    {formatNumber(channel.videoCount)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-zinc-400 mb-1">
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Total Views</span>
                  </div>
                  <span className="text-sm font-bold text-white">
                    {formatNumber(channel.viewCount)}
                  </span>
                </div>
              </div>

              {/* Description */}
              {channel.description && (
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-xs text-zinc-300 max-h-36 overflow-y-auto leading-relaxed">
                  <p className="whitespace-pre-wrap">{channel.description}</p>
                </div>
              )}

              {/* Additional Meta */}
              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
                {channel.publishedAt && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Joined {formatDate(channel.publishedAt)}</span>
                  </div>
                )}
                {channel.country && (
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Country: {channel.country}</span>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
