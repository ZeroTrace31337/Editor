/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useEditor } from '../context/EditorContext';
import { Settings, X, Cpu, HardDrive, Monitor, Sliders, Shield, Zap, Check } from 'lucide-react';
import { GPUDeviceManager } from '../../rendering/gpu/GPUDeviceManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { project, projectService } = useEditor();
  const [activeTab, setActiveTab] = useState<'project' | 'performance' | 'rendering' | 'shortcuts'>('project');
  const [fps, setFps] = useState(project.settings.frameRate.numerator / project.settings.frameRate.denominator);
  const [sampleRate, setSampleRate] = useState(project.settings.audioSampleRate || 48000);
  const [isGPUChecked, setIsGPUChecked] = useState(true);
  const [isProxyAuto, setIsProxyAuto] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const gpuCaps = GPUDeviceManager.getInstance().getCapabilities();

  const handleSave = () => {
    project.settings.frameRate = { numerator: fps, denominator: 1 };
    project.settings.audioSampleRate = sampleRate;
    projectService.setProject({ ...project });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
              CineFlow Project Preferences & Engine Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Tabs */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-44 bg-zinc-950/60 border-r border-zinc-800 p-2 space-y-1 text-xs">
            {[
              { id: 'project', label: 'Project Settings', icon: Monitor },
              { id: 'performance', label: 'GPU & Acceleration', icon: Cpu },
              { id: 'rendering', label: 'Color & Rendering', icon: Sliders },
              { id: 'shortcuts', label: 'Key Bindings', icon: Zap },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-purple-950/60 text-purple-300 border border-purple-800/60 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
            {activeTab === 'project' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Project Name</label>
                  <input
                    type="text"
                    value={project.metadata.name}
                    onChange={(e) => {
                      project.metadata.name = e.target.value;
                      projectService.setProject({ ...project });
                    }}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Timeline Frame Rate</label>
                    <select
                      value={fps}
                      onChange={(e) => setFps(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-1.5 text-zinc-100 focus:outline-none"
                    >
                      <option value={24}>24.00 FPS (Cinematic 24p)</option>
                      <option value={25}>25.00 FPS (PAL)</option>
                      <option value={30}>30.00 FPS (NTSC Standard)</option>
                      <option value={60}>60.00 FPS (Smooth Broadcast)</option>
                      <option value={120}>120.00 FPS (High Frame Rate)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Audio Sample Rate</label>
                    <select
                      value={sampleRate}
                      onChange={(e) => setSampleRate(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-1.5 text-zinc-100 focus:outline-none"
                    >
                      <option value={44100}>44.1 kHz (CD Quality)</option>
                      <option value={48000}>48.0 kHz (Studio Video Standard)</option>
                      <option value={96000}>96.0 kHz (High Resolution Audio)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200">Hardware GPU Pipeline</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 text-[10px] font-mono">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono">{gpuCaps.deviceName || 'WebGL2 3D Core'}</p>
                  <p className="text-[11px] text-zinc-500">
                    Max Texture: {gpuCaps.maxTextureSize}px • Estimated VRAM: {Math.round(gpuCaps.estimatedVRAMBytes / (1024*1024))} MB
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isGPUChecked}
                      onChange={(e) => setIsGPUChecked(e.target.checked)}
                      className="rounded accent-purple-600"
                    />
                    <span className="text-zinc-300">Enable Hardware-Accelerated Video Compositing</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isProxyAuto}
                      onChange={(e) => setIsProxyAuto(e.target.checked)}
                      className="rounded accent-purple-600"
                    />
                    <span className="text-zinc-300">Auto-generate 720p Prores Proxies for 4K media</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'rendering' && (
              <div className="space-y-3">
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
                  <span className="font-semibold text-zinc-200">Color Science & Working Space</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-zinc-900 border border-purple-800/80 text-purple-300 font-medium">
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

            {activeTab === 'shortcuts' && (
              <div className="space-y-2 font-mono text-[11px]">
                <div className="p-2 bg-zinc-950 rounded border border-zinc-800 flex justify-between">
                  <span className="text-zinc-400">Play / Pause</span>
                  <span className="text-purple-300 font-semibold">Space</span>
                </div>
                <div className="p-2 bg-zinc-950 rounded border border-zinc-800 flex justify-between">
                  <span className="text-zinc-400">Split Clip at Playhead</span>
                  <span className="text-purple-300 font-semibold">Ctrl + B / Cmd + B</span>
                </div>
                <div className="p-2 bg-zinc-950 rounded border border-zinc-800 flex justify-between">
                  <span className="text-zinc-400">Undo / Redo</span>
                  <span className="text-purple-300 font-semibold">Ctrl+Z / Ctrl+Y</span>
                </div>
                <div className="p-2 bg-zinc-950 rounded border border-zinc-800 flex justify-between">
                  <span className="text-zinc-400">Toggle Snapping</span>
                  <span className="text-purple-300 font-semibold">S</span>
                </div>
                <div className="p-2 bg-zinc-950 rounded border border-zinc-800 flex justify-between">
                  <span className="text-zinc-400">Step 1 Frame</span>
                  <span className="text-purple-300 font-semibold">← / →</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-md shadow-md transition active:scale-95"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
