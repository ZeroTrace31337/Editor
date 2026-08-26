/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Music,
  Volume2,
  Sticker,
  Type,
  Film,
  Image as ImageIcon,
  Sparkles,
  Sliders,
  Search,
  Download,
  Plus,
  Play,
  Check,
} from 'lucide-react';
import { ASSETS_LIBRARY, AssetItem } from './homeData';

interface AssetsSectionProps {
  onAddAssetToProject: (asset: AssetItem) => void;
  onPreviewAsset: (asset: AssetItem) => void;
}

export const AssetsSection: React.FC<AssetsSectionProps> = ({
  onAddAssetToProject,
  onPreviewAsset,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('Music');
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [playingAssetId, setPlayingAssetId] = useState<string | null>(null);

  const categories = [
    { label: 'Music', icon: Music },
    { label: 'Sound Effects', icon: Volume2 },
    { label: 'Stock Videos', icon: Film },
    { label: 'LUTs', icon: Sliders },
    { label: 'Transitions', icon: Sparkles },
    { label: 'Fonts', icon: Type },
    { label: 'Stickers', icon: Sticker },
    { label: 'Stock Images', icon: ImageIcon },
  ];

  const filteredAssets = ASSETS_LIBRARY.filter((a) => {
    const matchCat = a.category.toLowerCase() === activeCategory.toLowerCase();
    const matchSearch =
      assetSearchQuery === '' ||
      a.name.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
      a.tags.some((t) => t.toLowerCase().includes(assetSearchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <section className="flex flex-col gap-4" id="assets-library-section">
      {/* Header with Search and Categories */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Film className="w-4 h-4 text-cyan-400" />
          <h2 className="text-base font-bold text-white">Stock Assets & VFX</h2>
          <span className="text-xs text-zinc-400">Royalty-free media & color LUTs</span>
        </div>

        {/* Search within assets */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={assetSearchQuery}
            onChange={(e) => setAssetSearchQuery(e.target.value)}
            placeholder={`Search ${activeCategory}...`}
            className="w-full bg-zinc-900/90 text-xs text-zinc-200 placeholder-zinc-500 rounded-lg pl-8 pr-3 py-1.5 border border-zinc-800 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.label;
          return (
            <button
              key={cat.label}
              onClick={() => setActiveCategory(cat.label)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-zinc-800 text-cyan-400 border border-cyan-500/40 shadow-xs'
                  : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredAssets.length > 0 ? (
          filteredAssets.map((asset) => {
            const isPlaying = playingAssetId === asset.id;
            return (
              <div
                key={asset.id}
                id={`asset-card-${asset.id}`}
                className="flex flex-col justify-between p-3.5 rounded-xl bg-[#11131b] hover:bg-[#151824] border border-zinc-800/80 hover:border-zinc-700 transition-all duration-200 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-zinc-850 flex items-center justify-center text-cyan-400 border border-zinc-750">
                        {asset.type === 'audio' ? (
                          <Music className="w-4 h-4" />
                        ) : asset.type === 'font' ? (
                          <Type className="w-4 h-4" />
                        ) : asset.type === 'fx' ? (
                          <Sliders className="w-4 h-4" />
                        ) : (
                          <Film className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-zinc-200 group-hover:text-white truncate" title={asset.name}>
                          {asset.name}
                        </h4>
                        <span className="text-[10px] text-zinc-400">
                          {asset.genre || asset.format || asset.author}
                        </span>
                      </div>
                    </div>

                    {asset.type === 'audio' && (
                      <button
                        onClick={() => setPlayingAssetId(isPlaying ? null : asset.id)}
                        className="p-1.5 rounded-full bg-cyan-500/20 text-cyan-300 hover:bg-cyan-400 hover:text-black transition"
                      >
                        <Play className={`w-3 h-3 ${isPlaying ? 'fill-current' : ''}`} />
                      </button>
                    )}
                  </div>

                  {/* Audio Waveform simulation or tags */}
                  {asset.type === 'audio' && (
                    <div className="h-6 flex items-center gap-0.5 my-2 px-2 bg-zinc-900 rounded border border-zinc-800/60">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-all ${
                            isPlaying ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-700'
                          }`}
                          style={{
                            height: `${Math.max(20, Math.sin(i * 0.4) * 80 + 20)}%`,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {asset.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-850 text-zinc-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-400">
                    {asset.duration || asset.size || asset.format}
                  </span>

                  <button
                    onClick={() => onAddAssetToProject(asset)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-850 hover:bg-cyan-400 text-zinc-300 hover:text-black text-xs font-semibold transition active:scale-95"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-8 text-center text-zinc-400 text-xs bg-[#11131b] rounded-xl border border-zinc-800">
            No assets found matching your criteria in {activeCategory}.
          </div>
        )}
      </div>
    </section>
  );
};
