/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Play,
  Search,
  Bell,
  Settings,
  Sparkles,
  ChevronDown,
  User,
  Crown,
  LayoutGrid,
  Film,
  Layers,
  Wand2,
  BookOpen,
  FolderOpen,
  ArrowUpRight,
  Check,
  Zap,
} from 'lucide-react';

interface HomeTopNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenNewProject: () => void;
  onOpenSettings: () => void;
  onOpenTutorials: () => void;
  onOpenEditor: () => void;
  hasActiveProject: boolean;
  activeProjectName?: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const HomeTopNav: React.FC<HomeTopNavProps> = ({
  activeTab,
  onTabChange,
  onOpenNewProject,
  onOpenSettings,
  onOpenTutorials,
  onOpenEditor,
  hasActiveProject,
  activeProjectName,
  searchQuery,
  onSearchChange,
}) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const navTabs = [
    { id: 'home', label: 'Home', icon: LayoutGrid },
    { id: 'projects', label: 'Projects', icon: FolderOpen },
    { id: 'templates', label: 'Templates', icon: Layers },
    { id: 'ai-tools', label: 'AI Tools', icon: Wand2, badge: 'New' },
    { id: 'assets', label: 'Assets', icon: Film },
    { id: 'tutorials', label: 'Tutorials', icon: BookOpen },
  ];

  return (
    <header className="h-14 bg-[#0a0c10]/95 backdrop-blur-md border-b border-zinc-800/80 px-4 md:px-6 flex items-center justify-between select-none shrink-0 sticky top-0 z-40">
      {/* 1. Left: Logo & Main Navigation Tabs */}
      <div className="flex items-center gap-6 lg:gap-8">
        {/* Brand Logo */}
        <div 
          onClick={() => onTabChange('home')}
          className="flex items-center gap-2.5 cursor-pointer group"
          id="home-brand-logo"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-200">
            <Play className="w-4 h-4 text-black fill-black translate-x-0.5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black tracking-tight text-white font-sans">
                CineFlow
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                PRO
              </span>
            </div>
            <span className="text-[9px] text-zinc-400 font-medium -mt-0.5 tracking-wide hidden sm:inline">
              Desktop Studio
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-zinc-900/60 p-1 rounded-lg border border-zinc-800/60">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all relative ${
                  isActive
                    ? 'bg-zinc-800 text-white shadow-xs font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-zinc-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[9px] font-bold px-1.2 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 ml-0.5">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 2. Center: Global Search Bar */}
      <div className="hidden lg:flex flex-1 max-w-md mx-6">
        <div className={`relative w-full flex items-center transition-all ${
          isSearchFocused ? 'ring-1 ring-cyan-500' : ''
        }`}>
          <Search className="w-3.5 h-3.5 absolute left-3 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            id="global-search-input"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Search projects, templates, AI tools, assets (Ctrl+K)..."
            className="w-full bg-zinc-900/80 hover:bg-zinc-900 text-xs text-zinc-200 placeholder-zinc-500 rounded-lg pl-9 pr-8 py-2 border border-zinc-800 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 text-zinc-400 hover:text-zinc-200 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 3. Right: Current Editor Session Quick Jump + Actions + Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Quick jump to active editor if project exists */}
        {hasActiveProject && (
          <button
            onClick={onOpenEditor}
            id="btn-return-editor"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 text-xs font-semibold shadow-xs transition active:scale-95 group"
            title="Return to the active video editor timeline"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="truncate max-w-[120px]">{activeProjectName || 'Current Project'}</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        )}

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            id="btn-notifications"
            className="p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs transition relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-400 rounded-full ring-2 ring-[#0a0c10]" />
          </button>

          {isNotificationsOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-80 bg-[#12141c] border border-zinc-700/80 rounded-xl shadow-2xl p-3 z-50 text-xs"
              onClick={() => setIsNotificationsOpen(false)}
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <span className="font-semibold text-white">Notifications</span>
                <span className="text-[10px] text-cyan-400 font-medium cursor-pointer">Mark all as read</span>
              </div>
              <div className="divide-y divide-zinc-800/60 mt-1">
                <div className="py-2.5 flex gap-2.5 items-start">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-zinc-200 font-medium text-[11px]">AI 4K Super-Resolution Upscaling v2.0 is live!</p>
                    <span className="text-[10px] text-zinc-500">10 minutes ago</span>
                  </div>
                </div>
                <div className="py-2.5 flex gap-2.5 items-start">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-zinc-200 font-medium text-[11px]">Cloud backup completed for "Cinematic Iceland 4K"</p>
                    <span className="text-[10px] text-zinc-500">1 hour ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          id="btn-settings"
          className="p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs transition"
          title="Studio Preferences"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* User Profile Avatar with dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            id="btn-user-profile"
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 transition"
          >
            <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold shadow-xs">
              U
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[11px] font-semibold text-zinc-200 leading-none">Studio User</span>
              <span className="text-[9px] text-cyan-400 font-bold leading-none mt-0.5">PRO LICENSE</span>
            </div>
            <ChevronDown className="w-3 h-3 text-zinc-400 ml-0.5" />
          </button>

          {isUserMenuOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-56 bg-[#12141c] border border-zinc-700/80 rounded-xl shadow-2xl py-2 z-50 text-xs"
              onClick={() => setIsUserMenuOpen(false)}
            >
              <div className="px-3.5 py-2 border-b border-zinc-800">
                <p className="font-semibold text-white">Studio User</p>
                <p className="text-[10px] text-zinc-400 font-mono">user@cineflow.studio</p>
                <div className="mt-1.5 flex items-center gap-1.5 px-2 py-0.5 rounded bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-semibold">
                  <Crown className="w-3 h-3 text-cyan-400" />
                  <span>CineFlow Pro Active (Unlimited)</span>
                </div>
              </div>
              <div className="py-1">
                <button
                  onClick={() => onTabChange('projects')}
                  className="w-full text-left px-3.5 py-1.5 text-zinc-300 hover:bg-cyan-500/15 hover:text-white flex items-center gap-2"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
                  <span>My Cloud Projects</span>
                </button>
                <button
                  onClick={onOpenSettings}
                  className="w-full text-left px-3.5 py-1.5 text-zinc-300 hover:bg-cyan-500/15 hover:text-white flex items-center gap-2"
                >
                  <Settings className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Hardware & GPU Settings</span>
                </button>
                <button
                  onClick={onOpenTutorials}
                  className="w-full text-left px-3.5 py-1.5 text-zinc-300 hover:bg-cyan-500/15 hover:text-white flex items-center gap-2"
                >
                  <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Documentation & Guide</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
