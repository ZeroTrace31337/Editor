/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FolderOpen,
  MoreVertical,
  Play,
  Clock,
  Trash2,
  Copy,
  Edit2,
  Download,
  Star,
  Grid,
  List,
  Search,
  Filter,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { RecentProjectItem } from './homeData';

interface RecentProjectsSectionProps {
  projects: RecentProjectItem[];
  onOpenProject: (project: RecentProjectItem) => void;
  onViewAllProjects: () => void;
  onDeleteProject?: (id: string) => void;
  onToggleStar?: (id: string) => void;
  onDuplicateProject?: (project: RecentProjectItem) => void;
  onRenameProject?: (id: string, newName: string) => void;
  onExportProject?: (project: RecentProjectItem) => void;
  onNewProject?: () => void;
}

export const RecentProjectsSection: React.FC<RecentProjectsSectionProps> = ({
  projects,
  onOpenProject,
  onViewAllProjects,
  onDeleteProject,
  onToggleStar,
  onDuplicateProject,
  onRenameProject,
  onExportProject,
  onNewProject,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'all' | 'starred'>('all');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const filteredProjects = projects.filter((p) => {
    const matchesTab = activeTab === 'all' || (activeTab === 'starred' && p.isStarred);
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesTab && matchesSearch;
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
    <section className="flex flex-col gap-4" id="recent-projects-section">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-cyan-400" />
            <span>Recent Projects</span>
          </h2>

          {/* Filter Tabs */}
          <div className="flex items-center bg-zinc-900/90 rounded-lg p-0.5 border border-zinc-800 text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-md transition ${
                activeTab === 'all' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All Projects ({projects.length})
            </button>
            <button
              onClick={() => setActiveTab('starred')}
              className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                activeTab === 'starred' ? 'bg-zinc-800 text-amber-300 font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>Starred</span>
            </button>
          </div>
        </div>

        {/* Search, View Mode & View All Action */}
        <div className="flex items-center gap-2">
          {/* Quick inline search */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter projects..."
              className="w-36 sm:w-44 bg-zinc-900/80 text-xs text-zinc-200 placeholder-zinc-500 rounded-lg pl-7 pr-3 py-1 border border-zinc-800 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Grid / List toggle */}
          <div className="flex items-center bg-zinc-900/90 rounded-lg p-0.5 border border-zinc-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition ${viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition ${viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* View All Projects Button */}
          <button
            onClick={onViewAllProjects}
            id="btn-view-all-projects"
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-cyan-400 hover:text-cyan-300 border border-zinc-800 text-xs font-semibold transition cursor-pointer"
          >
            <span>View All</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl bg-[#0e1018] border border-dashed border-zinc-800 text-center">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-500 mb-3">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-200">No Projects Found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4">
            {searchTerm
              ? `No projects matched "${searchTerm}". Try a different search term or clear the filter.`
              : activeTab === 'starred'
              ? 'You have not starred any projects yet. Click the star icon on any project to pin it here.'
              : 'Start your creative journey by creating your first timeline project or importing video footage.'}
          </p>
          {onNewProject && (
            <button
              onClick={onNewProject}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Project</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Projects Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {filteredProjects.map((proj) => {
            const isMenuOpen = activeMenuId === proj.id;
            const isEditing = renamingId === proj.id;
            return (
              <div
                key={proj.id}
                id={`project-card-${proj.id}`}
                className="group relative flex flex-col rounded-xl bg-[#11131b] hover:bg-[#141724] border border-zinc-800/80 hover:border-zinc-700/90 overflow-hidden shadow-sm transition-all duration-200"
              >
                {/* Thumbnail Area */}
                <div
                  onClick={() => onOpenProject(proj)}
                  className="relative aspect-video w-full bg-black/60 overflow-hidden cursor-pointer"
                >
                  <img
                    src={proj.thumbnail}
                    alt={proj.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                      <Play className="w-4 h-4 fill-black translate-x-0.5" />
                    </div>
                  </div>

                  {/* Badges on Thumbnail */}
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono font-medium text-white backdrop-blur-xs">
                    {proj.duration}
                  </div>
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono font-medium text-cyan-300 border border-cyan-500/30 backdrop-blur-xs">
                    {proj.aspectRatio}
                  </div>

                  {/* Star Icon Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar?.(proj.id);
                    }}
                    className={`absolute top-2 right-2 p-1 rounded-md backdrop-blur-xs transition ${
                      proj.isStarred
                        ? 'bg-black/80 text-amber-400'
                        : 'bg-black/60 text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-white'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${proj.isStarred ? 'fill-amber-400' : ''}`} />
                  </button>
                </div>

                {/* Project Metadata */}
                <div className="p-3 flex flex-col justify-between flex-1">
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
                          onClick={() => onOpenProject(proj)}
                          className="text-xs font-bold text-zinc-200 group-hover:text-white truncate cursor-pointer"
                          title={proj.name}
                        >
                          {proj.name}
                        </h3>
                      )}

                      {/* More Options Dropdown */}
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
                                setActiveMenuId(null);
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

                    <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        {proj.lastEdited}
                      </span>
                      <span>•</span>
                      <span className="font-mono">{proj.resolution.split(' ')[0]}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {proj.tags.slice(0, 2).map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800/80 text-zinc-400 font-medium"
                      >
                        {t}
                      </span>
                    ))}
                    {proj.tags.length > 2 && (
                      <span className="text-[9px] text-zinc-500">+{proj.tags.length - 2}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="flex flex-col bg-[#11131b] rounded-xl border border-zinc-800 divide-y divide-zinc-800/60 overflow-hidden">
          {filteredProjects.map((proj) => {
            const isMenuOpen = activeMenuId === `list_${proj.id}`;
            const isEditing = renamingId === proj.id;
            return (
              <div
                key={proj.id}
                onClick={() => onOpenProject(proj)}
                className="p-3 flex items-center justify-between hover:bg-zinc-850/50 cursor-pointer transition relative"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={proj.thumbnail}
                    alt={proj.name}
                    className="w-16 h-10 object-cover rounded border border-zinc-700/80 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
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
                          className="text-xs bg-zinc-950 border border-cyan-500 text-white rounded px-1.5 py-0.5 outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-xs font-bold text-zinc-200 truncate">{proj.name}</span>
                      )}
                      {proj.isStarred && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                      <span>{proj.lastEdited}</span>
                      <span>•</span>
                      <span>{proj.resolution}</span>
                      <span>•</span>
                      <span>{proj.fps} FPS</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-xs text-zinc-300">{proj.duration}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenProject(proj);
                    }}
                    className="px-3 py-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-400 hover:text-black text-xs font-semibold transition"
                  >
                    Edit
                  </button>

                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(isMenuOpen ? null : `list_${proj.id}`);
                      }}
                      className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {isMenuOpen && (
                      <div
                        className="absolute right-0 top-full mt-1 w-36 bg-[#161824] border border-zinc-700 rounded-lg shadow-xl py-1 z-30 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            handleStartRename(proj);
                          }}
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
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
