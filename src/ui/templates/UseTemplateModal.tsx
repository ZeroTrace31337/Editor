/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Video,
  Type,
  Music,
  Wand2,
  Check,
  ChevronRight,
  ChevronLeft,
  ArrowUpDown,
  RefreshCw,
  Sparkles,
  Layers,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Film,
  Plus,
  Play,
  Volume2,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  Template,
  UserMediaSlotAssignment,
  UserTextSlotAssignment,
} from '../../domain/template/Template';
import { TemplateService } from '../../domain/template/templateService';
import { useEditor } from '../context/EditorContext';

interface UseTemplateModalProps {
  template: Template | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenEditor: () => void;
}

const STOCK_LIBRARY = [
  { name: 'Cinematic Mountains', type: 'video' as const, url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80' },
  { name: 'Neon Cyber City', type: 'video' as const, url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80' },
  { name: 'Urban Portrait', type: 'image' as const, url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80' },
  { name: 'Ocean Sunset Waves', type: 'video' as const, url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80' },
  { name: 'Gym Athlete Workout', type: 'video' as const, url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80' },
  { name: 'Minimal Architecture', type: 'image' as const, url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80' },
  { name: 'Festival Party Lights', type: 'video' as const, url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80' },
  { name: 'Coffee Routine', type: 'video' as const, url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=80' },
];

export const UseTemplateModal: React.FC<UseTemplateModalProps> = ({
  template,
  isOpen,
  onClose,
  onOpenEditor,
}) => {
  const { projectService, mediaRegistry, seekSeconds } = useEditor();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [audioOption, setAudioOption] = useState<'template' | 'custom' | 'none'>('template');

  // Media Assignments State
  const [mediaAssignments, setMediaAssignments] = useState<UserMediaSlotAssignment[]>([]);

  // Text Assignments State
  const [textAssignments, setTextAssignments] = useState<UserTextSlotAssignment[]>([]);

  // Active Slot for Stock Picker Modal
  const [activePickingSlotId, setActivePickingSlotId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetSlotId, setUploadTargetSlotId] = useState<string | null>(null);

  // Initialize assignments when template changes
  React.useEffect(() => {
    if (template) {
      setProjectName(`${template.name} Edit`);
      setMediaAssignments(
        template.mediaSlots.map((slot) => ({
          slotId: slot.id,
          previewUrl: slot.defaultUrl,
          type: slot.type === 'image' ? 'image' : 'video',
          name: slot.label || slot.name,
          durationSeconds: slot.durationSeconds,
        }))
      );

      setTextAssignments(
        template.textSlots.map((slot) => ({
          slotId: slot.id,
          text: slot.defaultText,
          fontFamily: slot.fontFamily,
          fontSize: slot.fontSize,
          fontWeight: slot.fontWeight || '700',
          color: slot.color,
          alignment: slot.alignment,
          letterSpacing: slot.letterSpacing || 2,
        }))
      );
      setCurrentStep(1);
    }
  }, [template]);

  if (!isOpen || !template) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadTargetSlotId) {
      const objectUrl = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video');

      setMediaAssignments((prev) =>
        prev.map((item) =>
          item.slotId === uploadTargetSlotId
            ? {
                ...item,
                file,
                previewUrl: objectUrl,
                type: isVideo ? 'video' : 'image',
                name: file.name,
              }
            : item
        )
      );
    }
    // reset
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploadTargetSlotId(null);
  };

  const triggerUploadForSlot = (slotId: string) => {
    setUploadTargetSlotId(slotId);
    fileInputRef.current?.click();
  };

  const assignStockToSlot = (slotId: string, stock: typeof STOCK_LIBRARY[0]) => {
    setMediaAssignments((prev) =>
      prev.map((item) =>
        item.slotId === slotId
          ? {
              ...item,
              previewUrl: stock.url,
              type: stock.type,
              name: stock.name,
            }
          : item
      )
    );
    setActivePickingSlotId(null);
  };

  const updateTextAssignment = (slotId: string, updates: Partial<UserTextSlotAssignment>) => {
    setTextAssignments((prev) =>
      prev.map((item) => (item.slotId === slotId ? { ...item, ...updates } : item))
    );
  };

  const swapMediaSlots = (idxA: number, idxB: number) => {
    if (idxA < 0 || idxB < 0 || idxA >= mediaAssignments.length || idxB >= mediaAssignments.length) return;
    const next = [...mediaAssignments];
    const tempUrl = next[idxA].previewUrl;
    const tempType = next[idxA].type;
    const tempName = next[idxA].name;
    const tempFile = next[idxA].file;

    next[idxA].previewUrl = next[idxB].previewUrl;
    next[idxA].type = next[idxB].type;
    next[idxA].name = next[idxB].name;
    next[idxA].file = next[idxB].file;

    next[idxB].previewUrl = tempUrl;
    next[idxB].type = tempType;
    next[idxB].name = tempName;
    next[idxB].file = tempFile;

    setMediaAssignments(next);
  };

  const handleGenerateProject = async () => {
    setIsGenerating(true);
    try {
      const templateService = TemplateService.getInstance();
      const { project, assetsToRegister } = templateService.generateProjectFromTemplate(
        template,
        mediaAssignments,
        textAssignments,
        {
          audioChoice: audioOption,
          projectName: projectName.trim() || `${template.name} Edit`,
        }
      );

      // Register all assets into MediaRegistry
      for (const asset of assetsToRegister) {
        mediaRegistry.registerAsset(asset);
        await mediaRegistry.restoreAssetUri(asset);
      }

      // Update project in engine
      projectService.setProject(project);
      projectService.saveToLocalStorage();
      seekSeconds(0);

      // Transition smoothly into editor
      onClose();
      onOpenEditor();
    } catch (err) {
      console.error('Failed to generate project from template', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      id="use_template_modal_backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div
        id="use_template_modal_content"
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#0d1117] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#11131b]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Customize Template: {template.name}
              </h2>
              <p className="text-xs text-slate-400">
                {template.aspectRatio} • {template.duration} • {template.mediaSlots.length} Media Slots
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-Step Wizard Indicator */}
        <div className="flex items-center justify-center gap-2 py-3 px-6 bg-white/[0.02] border-b border-white/5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
              currentStep === 1
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-sky-500 text-black text-[10px] flex items-center justify-center font-bold">
              1
            </span>
            Media Slots ({template.mediaSlots.length})
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />

          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
              currentStep === 2
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-sky-500 text-black text-[10px] flex items-center justify-center font-bold">
              2
            </span>
            Text Placeholders ({template.textSlots.length})
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />

          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
              currentStep === 3
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-sky-500 text-black text-[10px] flex items-center justify-center font-bold">
              3
            </span>
            Audio & Export Setup
          </button>
        </div>

        {/* Modal Body: Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: MEDIA SLOTS */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Media Slot Assignments</h3>
                  <p className="text-xs text-slate-400">
                    Upload your own clips/photos or choose from high-res stock assets. Drag or click swap to reorder.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // Quick Auto-fill with stock
                    const next = [...mediaAssignments];
                    next.forEach((slot, i) => {
                      const stock = STOCK_LIBRARY[i % STOCK_LIBRARY.length];
                      slot.previewUrl = stock.url;
                      slot.type = stock.type;
                      slot.name = stock.name;
                    });
                    setMediaAssignments(next);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-sky-300 border border-sky-500/20"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-Fill Stock
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {template.mediaSlots.map((slot, idx) => {
                  const assignment = mediaAssignments.find((a) => a.slotId === slot.id);
                  const isAssigned = !!assignment?.previewUrl;

                  return (
                    <div
                      key={slot.id}
                      className="group relative bg-[#11131b] border border-white/10 rounded-2xl p-3 flex flex-col justify-between gap-3 shadow-md hover:border-sky-500/40 transition-all"
                    >
                      {/* Slot Header */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-mono text-[10px]">
                            {idx + 1}
                          </span>
                          {slot.name}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {slot.durationSeconds.toFixed(1)}s • {slot.type}
                        </span>
                      </div>

                      {/* Preview Image / Drop Target */}
                      <div
                        className="relative w-full aspect-video rounded-xl bg-black/50 overflow-hidden border border-white/10 cursor-pointer group-hover:border-white/20 transition-all"
                        onClick={() => triggerUploadForSlot(slot.id)}
                      >
                        {isAssigned ? (
                          <img
                            src={assignment.previewUrl}
                            alt={assignment.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                            <Upload className="w-6 h-6 mb-1 text-slate-400" />
                            <span>Click to upload</span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerUploadForSlot(slot.id);
                            }}
                            className="p-2 rounded-lg bg-black/70 hover:bg-sky-500 text-white transition-colors"
                            title="Upload File"
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePickingSlotId(slot.id);
                            }}
                            className="p-2 rounded-lg bg-black/70 hover:bg-sky-500 text-white transition-colors"
                            title="Pick from Stock Library"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Slot Actions Bar */}
                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                        <span className="line-clamp-1 max-w-[130px] font-medium text-slate-300">
                          {assignment?.name || 'Default Asset'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => swapMediaSlots(idx, idx - 1)}
                            className="p-1 rounded hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
                            title="Move Earlier"
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            disabled={idx === template.mediaSlots.length - 1}
                            onClick={() => swapMediaSlots(idx, idx + 1)}
                            className="p-1 rounded hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
                            title="Move Later"
                          >
                            →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: TEXT PLACEHOLDERS */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Custom Typography & Titles</h3>
                <p className="text-xs text-slate-400">
                  Update text values, font families, and colors while keeping the template’s keyframe animations intact.
                </p>
              </div>

              <div className="space-y-4">
                {template.textSlots.map((slot, idx) => {
                  const assignment = textAssignments.find((a) => a.slotId === slot.id);

                  return (
                    <div
                      key={slot.id}
                      className="p-4 rounded-2xl bg-[#11131b] border border-white/10 space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Type className="w-4 h-4 text-sky-400" />
                          {slot.name} ({slot.startTimeSeconds.toFixed(1)}s - {(slot.startTimeSeconds + slot.durationSeconds).toFixed(1)}s)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/5 text-[11px] text-slate-400">
                          Animation: {slot.animation || 'Fade'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Text Value */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Text Content
                          </label>
                          <input
                            type="text"
                            value={assignment?.text || ''}
                            onChange={(e) =>
                              updateTextAssignment(slot.id, { text: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 focus:border-sky-400 text-white text-xs outline-none transition-colors"
                            placeholder="Enter text..."
                          />
                        </div>

                        {/* Font & Color Styling Controls */}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                              Font
                            </label>
                            <select
                              value={assignment?.fontFamily || slot.fontFamily}
                              onChange={(e) =>
                                updateTextAssignment(slot.id, { fontFamily: e.target.value })
                              }
                              className="w-full px-2 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs outline-none"
                            >
                              <option value="Montserrat">Montserrat</option>
                              <option value="Inter">Inter</option>
                              <option value="Playfair Display">Playfair</option>
                              <option value="Cinzel">Cinzel</option>
                              <option value="Impact">Impact</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                              Color
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={assignment?.color || slot.color}
                                onChange={(e) =>
                                  updateTextAssignment(slot.id, { color: e.target.value })
                                }
                                className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                              />
                              <span className="text-[11px] font-mono text-slate-400">
                                {assignment?.color || slot.color}
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                              Align
                            </label>
                            <div className="flex items-center gap-1 bg-black/50 border border-white/10 rounded-xl p-1">
                              <button
                                type="button"
                                onClick={() => updateTextAssignment(slot.id, { alignment: 'left' })}
                                className={`flex-1 p-1 rounded-lg flex items-center justify-center ${
                                  assignment?.alignment === 'left' ? 'bg-sky-500 text-white' : 'text-slate-400'
                                }`}
                              >
                                <AlignLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => updateTextAssignment(slot.id, { alignment: 'center' })}
                                className={`flex-1 p-1 rounded-lg flex items-center justify-center ${
                                  assignment?.alignment === 'center' ? 'bg-sky-500 text-white' : 'text-slate-400'
                                }`}
                              >
                                <AlignCenter className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => updateTextAssignment(slot.id, { alignment: 'right' })}
                                className={`flex-1 p-1 rounded-lg flex items-center justify-center ${
                                  assignment?.alignment === 'right' ? 'bg-sky-500 text-white' : 'text-slate-400'
                                }`}
                              >
                                <AlignRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: AUDIO & EXPORT SETUP */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white">Audio & Project Settings</h3>
                <p className="text-xs text-slate-400">
                  Configure soundtrack options and project title before loading directly into the VeeCut editor.
                </p>
              </div>

              {/* Project Name Field */}
              <div className="p-4 rounded-2xl bg-[#11131b] border border-white/10 space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Project Title
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 focus:border-sky-400 text-white text-sm outline-none transition-colors"
                  placeholder="My Custom Edit"
                />
              </div>

              {/* Audio Track Choice */}
              <div className="p-4 rounded-2xl bg-[#11131b] border border-white/10 space-y-3">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Music className="w-4 h-4 text-sky-400" />
                  Soundtrack & Beat Snapping
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setAudioOption('template')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      audioOption === 'template'
                        ? 'bg-sky-500/10 border-sky-500/50 text-white'
                        : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white">Include Template Soundtrack</span>
                      {audioOption === 'template' && <Check className="w-4 h-4 text-sky-400" />}
                    </div>
                    {template.audioTrack && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        {template.audioTrack.title} ({template.audioTrack.bpm} BPM)
                      </p>
                    )}
                  </div>

                  <div
                    onClick={() => setAudioOption('none')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      audioOption === 'none'
                        ? 'bg-sky-500/10 border-sky-500/50 text-white'
                        : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white">No Audio (Add in Editor)</span>
                      {audioOption === 'none' && <Check className="w-4 h-4 text-sky-400" />}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Generate project with video and title tracks only.
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary Specs */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Resolution</span>
                    <span className="font-mono font-semibold">{template.width}x{template.height}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Frame Rate</span>
                    <span className="font-mono font-semibold">{template.fps} fps</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Timeline Duration</span>
                    <span className="font-mono font-semibold">{template.duration}</span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-[11px] border border-emerald-500/30">
                  Ready to Build
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#11131b]">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev + 1) as any)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20 transition-all hover:scale-105 active:scale-95"
              >
                Next Step
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                id="btn_build_template_project"
                disabled={isGenerating}
                onClick={handleGenerateProject}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-xl shadow-sky-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Project...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Open in Editor
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Stock Picker Mini Overlay Modal */}
        {activePickingSlotId && (
          <div
            className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md p-6 flex flex-col justify-between animate-in fade-in"
            onClick={() => setActivePickingSlotId(null)}
          >
            <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Choose Stock Media</h4>
                  <p className="text-xs text-slate-400">Select a high-resolution royalty-free sample clip</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePickingSlotId(null)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[320px] overflow-y-auto pr-1">
                {STOCK_LIBRARY.map((item) => (
                  <div
                    key={item.name}
                    onClick={() => assignStockToSlot(activePickingSlotId, item)}
                    className="group relative aspect-video rounded-xl overflow-hidden border border-white/10 hover:border-sky-400 cursor-pointer shadow-md"
                  >
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                      <span className="text-[11px] font-semibold text-white line-clamp-1">
                        {item.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActivePickingSlotId(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
