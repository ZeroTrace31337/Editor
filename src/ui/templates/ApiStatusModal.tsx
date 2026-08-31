/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Youtube,
  Instagram,
  Smartphone,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { TrendService } from '../../domain/template/trendService';
import { TrendSourceStatus } from '../../domain/template/TrendTypes';

interface ApiStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiStatusModal: React.FC<ApiStatusModalProps> = ({ isOpen, onClose }) => {
  const trendService = TrendService.getInstance();
  const [sources, setSources] = useState<TrendSourceStatus[]>([]);
  const [overallStatus, setOverallStatus] = useState('checking');
  const [features, setFeatures] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const data = await trendService.getStatus();
      setSources(data.sources || []);
      setOverallStatus(data.status || 'active');
      setFeatures(data.features || {});
    } catch (err) {
      console.error('Failed to get status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getSourceIcon = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="w-5 h-5 text-rose-500" />;
      case 'tiktok':
        return <Smartphone className="w-5 h-5 text-sky-400" />;
      case 'instagram':
        return <Instagram className="w-5 h-5 text-pink-500" />;
      default:
        return <Database className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="api_status_modal"
        className="relative w-full max-w-2xl bg-[#0f121d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#141824]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Trend Engine & API Connections</h3>
              <p className="text-xs text-slate-400">Official API integration and live data pipeline status</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchStatus}
              disabled={isLoading}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
              title="Refresh connection status"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Security Banner */}
          <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-500/30 flex items-start gap-3">
            <Lock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-white">Zero Frontend Key Exposure Protocol</p>
              <p className="text-slate-300 leading-relaxed">
                All platform API secrets and tokens are securely isolated in server-side environment variables and proxy endpoints. Client UI communicates exclusively via authenticated backend routes.
              </p>
            </div>
          </div>

          {/* Sources List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Aggregated API Sources
            </h4>

            <div className="space-y-2.5">
              {sources.map((src) => (
                <div
                  key={src.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-black/40 border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                      {getSourceIcon(src.platform)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-xs font-bold text-white">{src.name}</h5>
                        {src.isOfficialApi ? (
                          <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Official API Key Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Curated Trend Signal Engine
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{src.message}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-3">
                    <span className="text-xs font-mono font-semibold text-sky-400">
                      {src.itemCount} items
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      {new Date(src.lastRefreshed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Configuration Guide */}
          <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-200 font-bold">
              <span>Environment Configuration Guide</span>
              <span className="font-mono text-[10px] text-slate-400">/.env.example</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              To activate official live streaming quotas from YouTube Data API v3, TikTok Commercial Content API, or Meta Graph API, configure:
            </p>
            <div className="p-2.5 rounded-lg bg-[#07090e] font-mono text-[11px] text-sky-300 space-y-1 overflow-x-auto">
              <div>YOUTUBE_API_KEY=your_key_here</div>
              <div>TIKTOK_API_KEY=your_client_key_here</div>
              <div>META_ACCESS_TOKEN=your_meta_token_here</div>
              <div>SUPABASE_URL=optional_cloud_url</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-white/10 bg-[#141824]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
