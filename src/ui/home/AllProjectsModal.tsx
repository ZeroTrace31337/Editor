/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  FolderOpen,
  Search,
  Star,
  Play,
  Clock,
  Trash2,
  Download,
  Plus,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { RecentProjectItem } from './homeData';

interface AllProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: RecentProjectItem[];
  onOpenProject: (project: RecentProjectItem) => void;
  onNewProject: () => void;
  onDeleteProject?: (id: string) => void;
  onToggleStar?: (id: string) => void;
}

export const AllProjectsModal: React.FC<AllProjectsModalProps> = ({
  isOpen,
  onClose,
  projects,
  onOpenProject,
  onNewProject,
  onDeleteProject,
  onToggleStar,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'starred'>('all');

  if (!isOpen) return null;

  const filtered = projects.filter((p) => {
    const matchFilter = filter === 'all' || (filter === 'starred' && p.isStarred);
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-[#11131c] border border-zinc-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">All VeeCut Projects ({projects.length})</h2>
              <p className="text-xs text-zinc-400">Manage, organize, and open your studio timelines</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 bg-zinc-900/60 border-b border-zinc-800/80 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full bg-zinc-950 text-xs text-zinc-200 placeholder-zinc-500 rounded-lg pl-9 pr-3 py-1.5 border border-zinc-800 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                filter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('starred')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 ${
                filter === 'starred' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              <span>Starred</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onNewProject();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold transition ml-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* Grid List */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((proj) => (
            <div
              key={proj.id}
              onClick={() => {
                onOpenProject(proj);
                onClose();
              }}
              className="group relative flex flex-col rounded-xl bg-[#151722] hover:bg-[#191c2c] border border-zinc-800 hover:border-cyan-500/40 overflow-hidden shadow-sm transition-all cursor-pointer"
            >
              <div className="relative aspect-video w-full bg-black/60 overflow-hidden">
                <img
                  src={proj.thumbnail}
                  alt={proj.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-xl">
                    <Play className="w-4 h-4 fill-black translate-x-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                  {proj.duration}
                </div>
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-cyan-300">
                  {proj.aspectRatio}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStar?.(proj.id);
                  }}
                  className={`absolute top-2 right-2 p-1.5 rounded bg-black/60 ${
                    proj.isStarred ? 'text-amber-400' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${proj.isStarred ? 'fill-amber-400' : ''}`} />
                </button>
              </div>

              <div className="p-3.5 flex flex-col justify-between flex-1">
                <div>
                  <h3 className="text-xs font-bold text-zinc-200 group-hover:text-white truncate">
                    {proj.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    <span>{proj.lastEdited}</span>
                    <span>•</span>
                    <span>{proj.resolution}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 font-mono">{proj.size}</span>
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Open Timeline <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
