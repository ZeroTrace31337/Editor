/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { VeeCutLogo } from '../common/VeeCutLogo';
import { useEditor } from '../context/EditorContext';
import {
  Settings,
  X,
  Cpu,
  Monitor,
  Sliders,
  Zap,
  Check,
  User,
  Crown,
  Palette,
  Film,
  Bell,
  Shield,
  LogOut,
  HardDrive,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { GPUDeviceManager } from '../../rendering/gpu/GPUDeviceManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { project, projectService } = useEditor();
  const [activeTab, setActiveTab] = useState<
    'profile' | 'account' | 'theme' | 'editor' | 'export' | 'performance' | 'rendering' | 'notifications' | 'security' | 'shortcuts'
  >('profile');

  // Profile Settings
  const [profileName, setProfileName] = useState('Studio Creator');
  const [profileEmail, setProfileEmail] = useState('creator@veecut.studio');
  const [profileRole, setProfileRole] = useState('Lead Video Editor');
  const [profileBio, setProfileBio] = useState('Creating cinematic stories, commercials, and digital content with VeeCut.');

  // Theme Settings
  const [themeMode, setThemeMode] = useState<'dark' | 'graphite' | 'midnight'>('graphite');
  const [accentColor, setAccentColor] = useState<'cyan' | 'purple' | 'emerald' | 'rose' | 'amber'>('cyan');
  const [uiScale, setUiScale] = useState('100%');

  // Editor Preferences
  const [fps, setFps] = useState(project.settings.frameRate.numerator / (project.settings.frameRate.denominator || 1));
  const [sampleRate, setSampleRate] = useState(project.settings.audioSampleRate || 48000);
  const [autoSaveInterval, setAutoSaveInterval] = useState(30);
  const [snappingTolerance, setSnappingTolerance] = useState(8);
  const [rippleEditing, setRippleEditing] = useState(true);
  const [defaultTransitionSec, setDefaultTransitionSec] = useState(1.0);
  const [waveformStyle, setWaveformStyle] = useState<'detailed' | 'minimal'>('detailed');

  // Export Preferences
  const [defaultFormat, setDefaultFormat] = useState('mp4');
  const [defaultResolution, setDefaultResolution] = useState('1920x1080');
  const [defaultFps, setDefaultFps] = useState(60);
  const [defaultBitrate, setDefaultBitrate] = useState(24);
  const [hardwareAcceleration, setHardwareAcceleration] = useState(true);

  // Performance & GPU
  const [isGPUChecked, setIsGPUChecked] = useState(true);
  const [isProxyAuto, setIsProxyAuto] = useState(true);

  // Notification Preferences
  const [notifyRenderComplete, setNotifyRenderComplete] = useState(true);
  const [notifyCloudSync, setNotifyCloudSync] = useState(true);
  const [notifyAudioCues, setNotifyAudioCues] = useState(false);
  const [notifyAITips, setNotifyAITips] = useState(true);

  // Security & Privacy
  const [optOutTelemetry, setOptOutTelemetry] = useState(true);
  const [localStorageOnly, setLocalStorageOnly] = useState(false);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load saved settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('veecut_user_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.profile) {
          setProfileName(parsed.profile.name || profileName);
          setProfileEmail(parsed.profile.email || profileEmail);
          setProfileRole(parsed.profile.role || profileRole);
          setProfileBio(parsed.profile.bio || profileBio);
        }
        if (parsed.theme) {
          setThemeMode(parsed.theme.mode || themeMode);
          setAccentColor(parsed.theme.accentColor || accentColor);
          setUiScale(parsed.theme.uiScale || uiScale);
        }
        if (parsed.editor) {
          setAutoSaveInterval(parsed.editor.autoSaveIntervalSec ?? 30);
          setSnappingTolerance(parsed.editor.snappingTolerancePx ?? 8);
          setRippleEditing(parsed.editor.rippleEditing ?? true);
          setDefaultTransitionSec(parsed.editor.defaultTransitionSec ?? 1.0);
          setWaveformStyle(parsed.editor.waveformStyle || 'detailed');
        }
        if (parsed.export) {
          setDefaultFormat(parsed.export.defaultFormat || 'mp4');
          setDefaultResolution(parsed.export.defaultResolution || '1920x1080');
          setDefaultFps(parsed.export.defaultFps ?? 60);
          setDefaultBitrate(parsed.export.defaultBitrateMbps ?? 24);
          setHardwareAcceleration(parsed.export.hardwareAcceleration ?? true);
        }
        if (parsed.notifications) {
          setNotifyRenderComplete(parsed.notifications.renderCompleteAlert ?? true);
          setNotifyCloudSync(parsed.notifications.cloudSyncAlert ?? true);
          setNotifyAudioCues(parsed.notifications.soundCues ?? false);
          setNotifyAITips(parsed.notifications.aiTips ?? true);
        }
        if (parsed.security) {
          setOptOutTelemetry(parsed.security.telemetry ?? true);
          setLocalStorageOnly(parsed.security.localCacheOnly ?? false);
        }
      }
    } catch {}
  }, []);

  if (!isOpen) return null;

  const gpuCaps = GPUDeviceManager.getInstance().getCapabilities();

  const handleSave = () => {
    // 1. Update project settings
    project.settings.frameRate = { numerator: fps, denominator: 1 };
    project.settings.audioSampleRate = sampleRate;
    projectService.setProject({ ...project });

    // 2. Save user preferences
    const settingsPayload = {
      profile: {
        name: profileName,
        email: profileEmail,
        role: profileRole,
        bio: profileBio,
        avatar: profileName.charAt(0).toUpperCase() || 'U',
      },
      theme: {
        mode: themeMode,
        accentColor,
        uiScale,
      },
      editor: {
        autoSaveIntervalSec: autoSaveInterval,
        snappingTolerancePx: snappingTolerance,
        defaultTransitionSec,
        rippleEditing,
        waveformStyle,
      },
      export: {
        defaultFormat,
        defaultResolution,
        defaultFps,
        defaultBitrateMbps: defaultBitrate,
        hardwareAcceleration,
      },
      notifications: {
        renderCompleteAlert: notifyRenderComplete,
        cloudSyncAlert: notifyCloudSync,
        soundCues: notifyAudioCues,
        aiTips: notifyAITips,
      },
      security: {
        telemetry: optOutTelemetry,
        localCacheOnly: localStorageOnly,
      },
    };

    try {
      localStorage.setItem('veecut_user_settings', JSON.stringify(settingsPayload));
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsPayload),
      }).catch(() => {});
    } catch {}

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to switch accounts or reset your session?')) {
      setProfileName('Guest Creator');
      setProfileEmail('guest@veecut.studio');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="bg-[#0f111a] border border-zinc-750 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 bg-[#0a0c12] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                VeeCut Studio Preferences & Engine Settings
              </h2>
              <span className="text-[10px] text-zinc-400">Desktop Workstation Configuration</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Tabs */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-48 bg-[#0a0c12]/90 border-r border-zinc-800/80 p-2.5 space-y-1 text-xs overflow-y-auto">
            {[
              { id: 'profile', label: 'User Profile', icon: User },
              { id: 'account', label: 'Account & Quota', icon: Crown },
              { id: 'theme', label: 'Theme & Accent', icon: Palette },
              { id: 'editor', label: 'Editor Preferences', icon: Monitor },
              { id: 'export', label: 'Export Defaults', icon: Film },
              { id: 'performance', label: 'GPU & Hardware', icon: Cpu },
              { id: 'rendering', label: 'Color Science', icon: Sliders },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'security', label: 'Security & Privacy', icon: Shield },
              { id: 'shortcuts', label: 'Key Bindings', icon: Zap },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-zinc-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-5 overflow-y-auto space-y-5 text-xs bg-[#0f111a]">
            {/* 1. USER PROFILE */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-lg">
                    {profileName.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{profileName}</h3>
                    <p className="text-zinc-400 text-[11px] font-mono">{profileEmail}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold text-[9px] border border-cyan-500/30">
                      PRO CREATOR TIER
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Display Name</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Email Address</label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Studio Role / Title</label>
                  <input
                    type="text"
                    value={profileRole}
                    onChange={(e) => setProfileRole(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Bio / Profile Notes</label>
                  <textarea
                    rows={2}
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>
              </div>
            )}

            {/* 2. ACCOUNT & QUOTA */}
            {activeTab === 'account' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-zinc-900 via-[#141724] to-zinc-900 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <VeeCutLogo size={28} rounded="lg" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-sm">VeeCut Pro Studio</span>
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono">Active Commercial License</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Unlimited 4K and 8K exports, full Gemini AI generation access, 60fps timeline rendering, and hardware acceleration.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="font-semibold flex items-center gap-1.5">
                      <HardDrive className="w-4 h-4 text-cyan-400" />
                      Cloud Project Storage
                    </span>
                    <span className="font-mono text-cyan-400 font-bold">14.8 GB / 100 GB (14.8%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-850 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 w-[15%]" />
                  </div>
                  <p className="text-[10px] text-zinc-500">85.2 GB available for cache proxies, generative media, and backups.</p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 font-medium transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Switch Creator Profile / Reset Local Session</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. THEME & ACCENT */}
            {activeTab === 'theme' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-2">Editor Canvas Theme</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'graphite', name: 'Graphite Studio', desc: 'Refined neutral dark' },
                      { id: 'dark', name: 'Dark Charcoal', desc: 'Classic deep charcoal' },
                      { id: 'midnight', name: 'Midnight Deep', desc: 'Deep blue obsidian' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setThemeMode(t.id as any)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          themeMode === t.id
                            ? 'border-cyan-400 bg-cyan-500/10 text-white font-bold'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <span className="block text-xs text-white">{t.name}</span>
                        <span className="block text-[10px] text-zinc-500 mt-0.5">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-2">Accent Lighting Color</label>
                  <div className="flex gap-3">
                    {[
                      { id: 'cyan', label: 'Cyan Electric', class: 'bg-cyan-400 text-cyan-400' },
                      { id: 'purple', label: 'Vee Purple', class: 'bg-purple-500 text-purple-400' },
                      { id: 'emerald', label: 'Emerald Mint', class: 'bg-emerald-400 text-emerald-400' },
                      { id: 'rose', label: 'Rose Cinema', class: 'bg-rose-400 text-rose-400' },
                      { id: 'amber', label: 'Amber Golden', class: 'bg-amber-400 text-amber-400' },
                    ].map((col) => (
                      <button
                        key={col.id}
                        onClick={() => setAccentColor(col.id as any)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition cursor-pointer ${
                          accentColor === col.id
                            ? 'border-white bg-zinc-900 text-white font-bold ring-1 ring-white/30'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full ${col.class.split(' ')[0]}`} />
                        <span>{col.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">UI Density & Scaling</label>
                  <select
                    value={uiScale}
                    onChange={(e) => setUiScale(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-100 focus:outline-none"
                  >
                    <option value="90%">Compact (90%) - Optimized for small laptops</option>
                    <option value="100%">Standard Default (100%) - Balanced layout</option>
                    <option value="110%">Large Display (110%) - 4K monitor readability</option>
                  </select>
                </div>
              </div>
            )}

            {/* 4. EDITOR PREFERENCES */}
            {activeTab === 'editor' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Auto-Save Frequency</label>
                    <select
                      value={autoSaveInterval}
                      onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-100 focus:outline-none"
                    >
                      <option value={15}>Every 15 Seconds</option>
                      <option value={30}>Every 30 Seconds (Default)</option>
                      <option value={60}>Every 1 Minute</option>
                      <option value={300}>Every 5 Minutes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Timeline Snapping Tolerance</label>
                    <select
                      value={snappingTolerance}
                      onChange={(e) => setSnappingTolerance(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-100 focus:outline-none"
                    >
                      <option value={4}>Strict (4px)</option>
                      <option value={8}>Balanced (8px Default)</option>
                      <option value={16}>Magnetic / Generous (16px)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Default Transition Duration</label>
                    <select
                      value={defaultTransitionSec}
                      onChange={(e) => setDefaultTransitionSec(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-100 focus:outline-none"
                    >
                      <option value={0.5}>0.5 Seconds (Fast)</option>
                      <option value={1.0}>1.0 Second (Smooth)</option>
                      <option value={1.5}>1.5 Seconds (Cinematic)</option>
                      <option value={2.0}>2.0 Seconds (Slow Dissolve)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Audio Waveform Render Style</label>
                    <select
                      value={waveformStyle}
                      onChange={(e) => setWaveformStyle(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-100 focus:outline-none"
                    >
                      <option value="detailed">Detailed Multi-Channel Peak Waveform</option>
                      <option value="minimal">Minimal Flat Decibel Bar</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rippleEditing}
                      onChange={(e) => setRippleEditing(e.target.checked)}
                      className="rounded accent-cyan-400"
                    />
                    <span className="text-zinc-200">Enable Ripple Editing Mode by default (clips shift on delete/trim)</span>
                  </label>
                </div>
              </div>
            )}

            {/* 5. EXPORT DEFAULTS */}
            {activeTab === 'export' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Default Container Format</label>
                    <select
                      value={defaultFormat}
                      onChange={(e) => setDefaultFormat(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-100 focus:outline-none"
                    >
                      <option value="mp4">MP4 (H.264 / AAC High Compatibility)</option>
                      <option value="webm">WebM (VP9 / Opus High Efficiency)</option>
                      <option value="prores">ProRes 422 HQ (Mastering)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Default Render Resolution</label>
                    <select
                      value={defaultResolution}
                      onChange={(e) => setDefaultResolution(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-100 focus:outline-none"
                    >
                      <option value="1920x1080">1080p FHD (1920 x 1080)</option>
                      <option value="3840x2160">4K UHD (3840 x 2160)</option>
                      <option value="1080x1920">Vertical Reel 9:16 (1080 x 1920)</option>
                      <option value="1280x720">720p HD (1280 x 720)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Default Target Bitrate (Mbps)</label>
                    <input
                      type="number"
                      min={5}
                      max={150}
                      value={defaultBitrate}
                      onChange={(e) => setDefaultBitrate(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Frame Rate</label>
                    <select
                      value={defaultFps}
                      onChange={(e) => setDefaultFps(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-100 focus:outline-none"
                    >
                      <option value={24}>24 FPS (Film)</option>
                      <option value={30}>30 FPS (Video)</option>
                      <option value={60}>60 FPS (Ultra Smooth)</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hardwareAcceleration}
                      onChange={(e) => setHardwareAcceleration(e.target.checked)}
                      className="rounded accent-cyan-400"
                    />
                    <span className="text-zinc-200 font-semibold">Enable GPU Hardware Video Encoding (NVENC / QuickSync / VideoToolbox)</span>
                  </label>
                  <p className="text-[10px] text-zinc-400">Renders up to 6.2x faster using dedicated GPU hardware encoder chips.</p>
                </div>
              </div>
            )}

            {/* 6. GPU & PERFORMANCE */}
            {activeTab === 'performance' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200">Hardware GPU Pipeline</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 text-[10px] font-mono">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 font-mono">{gpuCaps.deviceName || 'WebGL2 3D Shader Core'}</p>
                  <p className="text-[11px] text-zinc-500">
                    Max Texture: {gpuCaps.maxTextureSize}px • Estimated VRAM: {Math.round(gpuCaps.estimatedVRAMBytes / (1024 * 1024))} MB
                  </p>
                </div>

                <div className="space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isGPUChecked}
                      onChange={(e) => setIsGPUChecked(e.target.checked)}
                      className="rounded accent-cyan-400"
                    />
                    <span className="text-zinc-200">Enable Hardware-Accelerated Video Compositing</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isProxyAuto}
                      onChange={(e) => setIsProxyAuto(e.target.checked)}
                      className="rounded accent-cyan-400"
                    />
                    <span className="text-zinc-200">Auto-generate 720p Prores Proxies for 4K media</span>
                  </label>
                </div>
              </div>
            )}

            {/* 7. COLOR & RENDERING */}
            {activeTab === 'rendering' && (
              <div className="space-y-3">
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
                  <span className="font-semibold text-zinc-200">Color Science & Working Space</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-zinc-900 border border-cyan-800/80 text-cyan-300 font-medium">
                      DaVinci YRGB (Rec.709 / Gamma 2.4)
                    </div>
                    <div className="p-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                      ACEScc (v1.3 Wide Gamut)
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Color Bit-Depth Processing</label>
                  <select className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-1.5 text-zinc-100 focus:outline-none">
                    <option>32-Bit Floating Point (High Precision)</option>
                    <option>16-Bit Half Float (Balanced)</option>
                    <option>8-Bit Standard</option>
                  </select>
                </div>
              </div>
            )}

            {/* 8. NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="space-y-3">
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="block font-semibold text-zinc-200">Render & Export Completion Alert</span>
                      <span className="text-[10px] text-zinc-500">Play a notification chime and banner when video finishes rendering</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyRenderComplete}
                      onChange={(e) => setNotifyRenderComplete(e.target.checked)}
                      className="rounded accent-cyan-400"
                    />
                  </label>

                  <div className="border-t border-zinc-850" />

                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="block font-semibold text-zinc-200">Cloud Sync & Backup Status</span>
                      <span className="text-[10px] text-zinc-500">Show subtle toast notifications when project saves are persisted</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyCloudSync}
                      onChange={(e) => setNotifyCloudSync(e.target.checked)}
                      className="rounded accent-cyan-400"
                    />
                  </label>

                  <div className="border-t border-zinc-850" />

                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="block font-semibold text-zinc-200">Timeline Snap & Cut Audio Cues</span>
                      <span className="text-[10px] text-zinc-500">Play low-latency audio clicks when snapping to markers or playhead</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyAudioCues}
                      onChange={(e) => setNotifyAudioCues(e.target.checked)}
                      className="rounded accent-cyan-400"
                    />
                  </label>

                  <div className="border-t border-zinc-850" />

                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="block font-semibold text-zinc-200">AI Neural Processing Tips</span>
                      <span className="text-[10px] text-zinc-500">Display helpful suggestions for prompt engineering and color grading</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyAITips}
                      onChange={(e) => setNotifyAITips(e.target.checked)}
                      className="rounded accent-cyan-400"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 9. SECURITY & PRIVACY */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block font-semibold text-zinc-200">Anonymous Telemetry Opt-Out</span>
                      <span className="text-[10px] text-zinc-500">Do not transmit any usage statistics or crash crash dumps</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={optOutTelemetry}
                      onChange={(e) => setOptOutTelemetry(e.target.checked)}
                      className="rounded accent-cyan-400"
                    />
                  </div>

                  <div className="border-t border-zinc-850" />

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block font-semibold text-zinc-200">Local Cache Storage Only</span>
                      <span className="text-[10px] text-zinc-500">Enforce 100% client-side offline storage; bypass cloud syncing</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={localStorageOnly}
                      onChange={(e) => setLocalStorageOnly(e.target.checked)}
                      className="rounded accent-cyan-400"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                  <span className="block font-semibold text-zinc-200">Backend API Services Status</span>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="flex items-center justify-between p-2 rounded bg-zinc-900">
                      <span className="text-zinc-300">Gemini Neural AI Service</span>
                      <span className="text-emerald-400 font-bold">Secure Server-Side Active</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 10. SHORTCUTS */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-2 font-mono text-[11px]">
                {[
                  { action: 'Play / Pause Video', key: 'Space' },
                  { action: 'Split Clip at Playhead', key: 'Ctrl+B / Cmd+B' },
                  { action: 'Undo / Redo', key: 'Ctrl+Z / Ctrl+Y' },
                  { action: 'Toggle Snapping', key: 'S' },
                  { action: 'Step 1 Frame Left/Right', key: '← / →' },
                  { action: 'Zoom In / Out Timeline', key: '+ / -' },
                  { action: 'Delete Selected Clip', key: 'Delete / Backspace' },
                  { action: 'Ripple Delete Clip', key: 'Shift + Delete' },
                ].map((sc, i) => (
                  <div key={i} className="p-2 bg-zinc-950 rounded-lg border border-zinc-800 flex justify-between">
                    <span className="text-zinc-400">{sc.action}</span>
                    <span className="text-cyan-400 font-semibold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-750">
                      {sc.key}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#0a0c12] border-t border-zinc-800 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 font-mono">VeeCut Pro Engine v3.4.1</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-1.5 text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-md transition active:scale-95 cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

