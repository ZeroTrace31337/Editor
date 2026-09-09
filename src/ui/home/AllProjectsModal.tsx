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
  Copy,
  Edit2,
  MoreVertical,
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
  onDuplicateProject?: (project: RecentProjectItem) => void;
  onRenameProject?: (id: string, newName: string) => void;
  onExportProject?: (project: RecentProjectItem) => void;
}

export const AllProjectsModal: React.FC<AllProjectsModalProps> = ({
  isOpen,
  onClose,
  projects,
  onOpenProject,
  onNewProject,
  onDeleteProject,
  onToggleStar,
  onDuplicateProject,
  onRenameProject,
  onExportProject,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'starred'>('all');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');

  if (!isOpen) return null;

  const filtered = projects.filter((p) => {
    const matchFilter = filter === 'all' || (filter === 'starred' && p.isStarred);
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  const handleStartRename = (proj: RecentProjectItem) => {
    setRenamingId(proj.id);
    setRenameInput(proj.name);
    setActiveMenuId(null);
  };

  const handleSaveRename = (id: string) => {
    if (renameInput.trim() && onRenameProject) {
      onRenameProject(id, renameInput.trim());
    }
    setRenamingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-[#11131c] border border-zinc-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
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
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
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
              className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                filter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              All ({projects.length})
            </button>
            <button
              onClick={() => setFilter('starred')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold transition ml-2 cursor-pointer shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* Grid List or Empty State */}
        {filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-3">
              <FolderOpen className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-zinc-200">No Projects Found</h3>
            <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-5">
              {search
                ? `No projects matched your search for "${search}". Try searching by another name or tag.`
                : 'No projects found in this view. Click below to create your next video project.'}
            </p>
            <button
              onClick={() => {
                onClose();
                onNewProject();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-400 text-black font-bold text-xs hover:bg-cyan-300 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Project</span>
            </button>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((proj) => {
              const isMenuOpen = activeMenuId === proj.id;
              const isEditing = renamingId === proj.id;
              return (
                <div
                  key={proj.id}
                  className="group relative flex flex-col rounded-xl bg-[#151722] hover:bg-[#191c2c] border border-zinc-800 hover:border-cyan-500/40 overflow-hidden shadow-sm transition-all"
                >
                  <div
                    onClick={() => {
                      onOpenProject(proj);
                      onClose();
                    }}
                    className="relative aspect-video w-full bg-black/60 overflow-hidden cursor-pointer"
                  >
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
                      <div className="flex items-start justify-between gap-1">
                        {isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            value={renameInput}
                            onChange={(e) => setRenameInput(e.target.value)}
                            onBlur={() => handleSaveRename(proj.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(proj.id);
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            className="text-xs bg-zinc-950 border border-cyan-500 text-white rounded px-1.5 py-0.5 w-full outline-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <h3
                            onClick={() => {
                              onOpenProject(proj);
                              onClose();
                            }}
                            className="text-xs font-bold text-zinc-200 group-hover:text-white truncate cursor-pointer"
                          >
                            {proj.name}
                          </h3>
                        )}

                        {/* More Menu Dropdown */}
                        <div className="relative shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(isMenuOpen ? null : proj.id);
                            }}
                            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {isMenuOpen && (
                            <div
                              className="absolute right-0 bottom-full mb-1 w-36 bg-[#161824] border border-zinc-700 rounded-lg shadow-xl py-1 z-30 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  onOpenProject(proj);
                                  onClose();
                                }}
                                className="w-full text-left px-3 py-1.5 text-zinc-200 hover:bg-cyan-500/20 hover:text-cyan-300 flex items-center gap-2"
                              >
                                <Play className="w-3 h-3" /> Open
                              </button>
                              <button
                                onClick={() => handleStartRename(proj)}
                                className="w-full text-left px-3 py-1.5 text-zinc-200 hover:bg-cyan-500/20 hover:text-cyan-300 flex items-center gap-2"
                              >
                                <Edit2 className="w-3 h-3" /> Rename
                              </button>
                              <button
                                onClick={() => {
                                  onDuplicateProject?.(proj);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-zinc-200 hover:bg-cyan-500/20 hover:text-cyan-300 flex items-center gap-2"
                              >
                                <Copy className="w-3 h-3" /> Duplicate
                              </button>
                              <button
                                onClick={() => {
                                  onExportProject?.(proj);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-zinc-200 hover:bg-cyan-500/20 hover:text-cyan-300 flex items-center gap-2"
                              >
                                <Download className="w-3 h-3" /> Export JSON
                              </button>
                              <div className="my-1 border-t border-zinc-800" />
                              <button
                                onClick={() => {
                                  onDeleteProject?.(proj.id);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-red-500/20 flex items-center gap-2"
                              >
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        <span>{proj.lastEdited}</span>
                        <span>•</span>
                        <span>{proj.resolution}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 font-mono">{proj.size}</span>
                      <button
                        onClick={() => {
                          onOpenProject(proj);
                          onClose();
                        }}
                        className="text-xs font-bold text-cyan-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                      >
                        Open Timeline <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
