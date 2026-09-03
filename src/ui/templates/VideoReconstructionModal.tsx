/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Film,
  Link,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Wand2,
  Music,
  Type,
  Eye,
  Sliders,
  Share2,
  Download,
  X,
  RefreshCw,
  Info,
  Youtube,
  Smartphone,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import {
  VideoReconstructionEngine,
  ReconstructedTemplateResult,
  ReconstructedShot,
} from '../../domain/template/VideoReconstructionEngine';
import { TemplateService } from '../../domain/template/templateService';
import { useEditor } from '../context/EditorContext';
import { UserMediaSlotAssignment, UserTextSlotAssignment } from '../../domain/template/Template';

interface VideoReconstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUrl?: string;
  initialTitle?: string;
  onLoadedIntoProject?: () => void;
}

export const VideoReconstructionModal: React.FC<VideoReconstructionModalProps> = ({
  isOpen,
  onClose,
  initialUrl = '',
  initialTitle = '',
  onLoadedIntoProject,
}) => {
  const { projectService, mediaRegistry, setWorkspaceMode } = useEditor();
  const reconstructionEngine = VideoReconstructionEngine.getInstance();
  const templateService = TemplateService.getInstance();

  // Input States
  const [sourceType, setSourceType] = useState<'url' | 'file'>('url');
  const [videoUrl, setVideoUrl] = useState(initialUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetAspect, setTargetAspect] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [customTitle, setCustomTitle] = useState(initialTitle || 'Viral Reel Trend');

  // Pipeline Execution State
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'completed' | 'failed'>('idle');
  const [currentStage, setCurrentStage] = useState('');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<ReconstructedTemplateResult | null>(null);

  // Replacement / Customization State
  const [activeTab, setActiveTab] = useState<'overview' | 'shots' | 'text' | 'replace'>('overview');
  const [userMediaReplacements, setUserMediaReplacements] = useState<Record<string, UserMediaSlotAssignment>>({});
  const [userTextEdits, setUserTextEdits] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replacementInputRef = useRef<HTMLInputElement>(null);
  const [replacingSlotId, setReplacingSlotId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartAnalysis = async () => {
    setStatus('analyzing');
    setProgress(0);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await reconstructionEngine.analyzeAndReconstruct(
        {
          sourceType,
          url: sourceType === 'url' ? videoUrl : undefined,
          file: sourceType === 'file' ? (selectedFile || undefined) : undefined,
          title: customTitle,
          targetAspectRatio: targetAspect,
        },
        (stage, pct) => {
          setCurrentStage(stage);
          setProgress(pct);
        }
      );

      setResult(res);
      setStatus('completed');
    } catch (err: any) {
      setErrorMsg(err.message || 'Video analysis encountered an issue. Please try another video source.');
      setStatus('failed');
    }
  };

  const handleOpenInEditor = () => {
    if (!result) return;

    let projectToLoad = result.project;
    let assetsToRegister = result.assetsToRegister;

    // Apply any user replacements if provided
    const mediaAssignments: UserMediaSlotAssignment[] = Object.values(userMediaReplacements);
    const textAssignments: UserTextSlotAssignment[] = Object.entries(userTextEdits).map(([slotId, text]) => ({
      slotId,
      text: String(text),
    }));

    if (mediaAssignments.length > 0 || textAssignments.length > 0) {
      const applied = reconstructionEngine.applyReplacedMedia(
        result.template,
        mediaAssignments,
        textAssignments,
        `${customTitle} Custom Edit`
      );
      projectToLoad = applied.project;
      assetsToRegister = applied.assetsToRegister;
    }

    // Register media assets in media pool
    assetsToRegister.forEach((asset) => {
      mediaRegistry.registerAsset(asset);
    });

    // Load project into project service
    projectService.setProject(projectToLoad);

    // Switch to edit workspace mode
    setWorkspaceMode('edit');

    if (onLoadedIntoProject) {
      onLoadedIntoProject();
    }
    onClose();
  };

  const handleSaveToTemplates = () => {
    if (!result) return;
    templateService.saveCustomTemplate({
      name: result.template.name,
      category: result.template.category,
      description: result.template.description,
      aspectRatio: result.template.aspectRatio,
      width: result.template.width,
      height: result.template.height,
      fps: result.template.fps,
      durationSeconds: result.template.durationSeconds,
      thumbnail: result.template.thumbnail,
      style: result.template.style,
      tags: result.template.tags,
      mediaSlots: result.template.mediaSlots,
      textSlots: result.template.textSlots,
      audioTrack: result.template.audioTrack,
      transitions: result.template.transitions,
      effects: result.template.effects,
      filters: result.template.filters,
      creatorName: 'AI Reconstructed',
    });
    alert('Reconstructed template saved to your VeeCut Template Library!');
  };

  const handleReplaceSlotMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingSlotId || !result) return;

    const url = URL.createObjectURL(file);
    const assignment: UserMediaSlotAssignment = {
      slotId: replacingSlotId,
      previewUrl: url,
      type: file.type.startsWith('video') ? 'video' : 'image',
      name: file.name,
      file,
    };

    setUserMediaReplacements((prev) => ({
      ...prev,
      [replacingSlotId]: assignment,
    }));
    setReplacingSlotId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md select-none p-4">
      <div className="bg-[#0b0e14] border border-cyan-500/30 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#101420]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Wand2 className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Analyze Video → Reconstruct Editable Template
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Vision AI Engine
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Reverse-engineers shot cuts, zooms, color grades, text overlays and beat timing into an editable multi-track NLE project.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {status === 'idle' && (
            <div className="space-y-6">
              {/* Input Type Selector */}
              <div className="flex bg-[#141824] p-1 rounded-xl border border-zinc-800 max-w-md">
                <button
                  onClick={() => setSourceType('url')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                    sourceType === 'url' ? 'bg-cyan-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>Video URL (YouTube / Web)</span>
                </button>
                <button
                  onClick={() => setSourceType('file')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                    sourceType === 'file' ? 'bg-cyan-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Video File</span>
                </button>
              </div>

              {/* Source Input Area */}
              {sourceType === 'url' ? (
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-zinc-300">Target Video Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste YouTube, TikTok or direct MP4 URL (e.g. https://www.youtube.com/watch?v=...)"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="flex-1 bg-[#141824] border border-zinc-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none transition"
                    />
                  </div>
                  {/* Preset quick samples */}
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 pt-1">
                    <span>Try sample:</span>
                    {[
                      { label: 'Cyberpunk Beat Sync', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', aspect: '9:16' as const },
                      { label: 'Cinematic B-Roll', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', aspect: '16:9' as const },
                      { label: 'Viral Dance Trend', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4', aspect: '9:16' as const },
                    ].map((s) => (
                      <button
                        key={s.label}
                        onClick={() => {
                          setVideoUrl(s.url);
                          setCustomTitle(s.label);
                          setTargetAspect(s.aspect);
                        }}
                        className="px-2 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-cyan-300 font-mono transition"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-zinc-300">Select Source Video File</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-zinc-800 hover:border-cyan-500/80 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-[#101420] transition group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                      <Upload className="w-7 h-7 text-cyan-400" />
                    </div>
                    <p className="text-sm font-semibold text-zinc-200">
                      {selectedFile ? selectedFile.name : 'Click to select or drag and drop video file'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Supports MP4, MOV, WebM, AVI (up to 500MB)
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          setCustomTitle(file.name.replace(/\.[^/.]+$/, ''));
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Title & Aspect Ratio Options */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Project / Template Title</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full bg-[#141824] border border-zinc-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Target Canvas Aspect Ratio</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: '9:16', label: '9:16 Reels / Shorts' },
                      { id: '16:9', label: '16:9 Landscape / YouTube' },
                      { id: '1:1', label: '1:1 Square Feed' },
                    ].map((asp) => (
                      <button
                        key={asp.id}
                        type="button"
                        onClick={() => setTargetAspect(asp.id as any)}
                        className={`py-2 px-2 rounded-xl text-[11px] font-semibold border transition ${
                          targetAspect === asp.id
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                            : 'bg-[#141824] border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {asp.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Legal & Attribution Transparency Box */}
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex gap-3 text-xs text-zinc-300">
                <ShieldAlert className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-cyan-200">Reconstruction Accuracy & Transparency Notice</p>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    VeeCut uses neural vision heuristics and audio transient detection to reconstruct an editable multi-layer approximation. Flat rendered video does not store original raw project timelines or unrendered assets. Reconstructed templates are designed for rapid remixing and customized media replacement.
                  </p>
                </div>
              </div>

              {/* Start Action Button */}
              <button
                onClick={handleStartAnalysis}
                disabled={sourceType === 'url' ? !videoUrl.trim() : !selectedFile}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-sm transition shadow-lg shadow-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Run Neural Analysis & Reconstruct Template</span>
              </button>
            </div>
          )}

          {status === 'analyzing' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Wand2 className="w-8 h-8 text-cyan-400 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2 max-w-md">
                <h3 className="text-lg font-bold text-white">Analyzing Video Composition</h3>
                <p className="text-xs text-cyan-300 font-mono animate-pulse">{currentStage}</p>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mt-3">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono text-zinc-500">{progress}% complete</span>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full max-w-xl text-left pt-4">
                {[
                  { label: 'Scene Cuts', desc: 'Boundary & Duration', done: progress >= 40 },
                  { label: 'Camera Motion', desc: 'Zooms & Pan Keyframes', done: progress >= 60 },
                  { label: 'Color Science', desc: 'LUT Tone & Curves', done: progress >= 75 },
                  { label: 'Rhythm & Beats', desc: 'BPM & Audio Drops', done: progress >= 85 },
                  { label: 'OCR Overlays', desc: 'Titles & Captions', done: progress >= 95 },
                  { label: 'NLE Multi-Track', desc: 'Timeline Compilation', done: progress >= 99 },
                ].map((st, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-lg border text-xs transition ${
                      st.done
                        ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200'
                        : 'bg-[#121520] border-zinc-800/80 text-zinc-500'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold mb-0.5">
                      <span>{st.label}</span>
                      {st.done ? <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> : <Clock className="w-3.5 h-3.5 text-zinc-600" />}
                    </div>
                    <span className="text-[10px] text-zinc-400">{st.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-red-950/60 border border-red-500/50 flex items-center justify-center text-red-400">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reconstruction Failed</h3>
                <p className="text-xs text-red-400 mt-1 max-w-md mx-auto">{errorMsg}</p>
              </div>
              <button
                onClick={() => setStatus('idle')}
                className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
              >
                Try Again
              </button>
            </div>
          )}

          {status === 'completed' && result && (
            <div className="space-y-6">
              {/* Top Metrics Banner */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[#131826] border border-cyan-500/30 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-400 block">AI Confidence</span>
                    <span className="text-lg font-extrabold text-cyan-300">
                      {result.report.overallConfidence}%
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#131826] border border-zinc-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                    <Film className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-400 block">Detected Shots</span>
                    <span className="text-lg font-extrabold text-white">
                      {result.report.shots.length} Scenes
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#131826] border border-zinc-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <Music className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-400 block">Rhythm Tempo</span>
                    <span className="text-lg font-extrabold text-emerald-300">
                      {result.report.audioStructure.estimatedBpm} BPM
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#131826] border border-zinc-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                    <Type className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-400 block">OCR Titles</span>
                    <span className="text-lg font-extrabold text-amber-300">
                      {result.report.textOverlays.length} Text Layers
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-zinc-800 gap-4 text-xs font-semibold">
                {[
                  { id: 'overview', label: 'Reconstruction Report' },
                  { id: 'shots', label: `Shot Boundaries (${result.report.shots.length})` },
                  { id: 'text', label: `Text Overlays (${result.report.textOverlays.length})` },
                  { id: 'replace', label: 'Slot Media Replacement' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`pb-2.5 transition border-b-2 ${
                      activeTab === tab.id
                        ? 'border-cyan-400 text-cyan-300'
                        : 'border-transparent text-zinc-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab 1: Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-[#121520] border border-zinc-800 space-y-2">
                      <span className="font-bold text-white text-xs block">Component Accuracy Breakdown</span>
                      <div className="space-y-1.5 pt-1">
                        {[
                          { name: 'Shot Cut Boundaries', score: result.report.elementConfidence.shotBoundaries },
                          { name: 'Color Grading & Curves', score: result.report.elementConfidence.colorGrading },
                          { name: 'Audio Rhythm & Beat Sync', score: result.report.elementConfidence.audioBeats },
                          { name: 'Camera Zooms & Pans', score: result.report.elementConfidence.cameraMovement },
                          { name: 'OCR Text Recognition', score: result.report.elementConfidence.textOcr },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-zinc-400">{item.name}</span>
                            <span className="font-mono text-cyan-300 font-bold">{item.score}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#121520] border border-zinc-800 space-y-2">
                      <span className="font-bold text-white text-xs block">Reconstructed Style & Color Science</span>
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Color Grade Profile:</span>
                          <span className="text-white font-semibold">{result.report.colorProfile.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Estimated Aspect Ratio:</span>
                          <span className="text-white font-mono">{result.report.aspectRatio}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Total Duration:</span>
                          <span className="text-white font-mono">{result.report.totalDuration.toFixed(1)}s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Transitions Used:</span>
                          <span className="text-cyan-300 font-medium">Whip Pan, Zoom Blur, Glitch</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#141824] border border-zinc-800 flex items-center justify-between text-zinc-300">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-cyan-400" />
                      <span>{result.report.limitationsDisclaimer}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Shots */}
              {activeTab === 'shots' && (
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1 text-xs">
                  {result.report.shots.map((shot: ReconstructedShot) => (
                    <div
                      key={shot.index}
                      className="p-3 rounded-xl bg-[#121520] border border-zinc-800 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-10 rounded-lg overflow-hidden bg-black relative shrink-0">
                          {shot.sampleThumbnail && (
                            <img src={shot.sampleThumbnail} alt={`Shot ${shot.index}`} className="w-full h-full object-cover" />
                          )}
                          <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/80 font-mono text-[9px] text-white">
                            #{shot.index}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">
                            Shot #{shot.index}: {shot.motionType.replace('_', ' ').toUpperCase()}
                          </p>
                          <p className="text-[11px] text-zinc-400">
                            {shot.startTime.toFixed(1)}s - {shot.endTime.toFixed(1)}s ({shot.duration.toFixed(1)}s duration) • {shot.colorMood}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {shot.transitionToNext && (
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono">
                            Transition: {shot.transitionToNext}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono">
                          Scale: {shot.zoomScale}x
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 3: Text */}
              {activeTab === 'text' && (
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1 text-xs">
                  {result.report.textOverlays.map((txt) => (
                    <div key={txt.id} className="p-3 rounded-xl bg-[#121520] border border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-cyan-300">
                          {txt.role} Layer ({txt.startTime}s - {(txt.startTime + txt.duration).toFixed(1)}s)
                        </span>
                        <span className="text-zinc-500 font-mono text-[10px]">{txt.fontFamily} • {txt.fontSize}px</span>
                      </div>
                      <input
                        type="text"
                        value={userTextEdits[txt.id] !== undefined ? userTextEdits[txt.id] : txt.text}
                        onChange={(e) =>
                          setUserTextEdits((prev) => ({
                            ...prev,
                            [txt.id]: e.target.value,
                          }))
                        }
                        className="w-full bg-black/40 border border-zinc-800 rounded-lg px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 4: Replace Slot Media */}
              {activeTab === 'replace' && (
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1 text-xs">
                  <p className="text-zinc-400 text-[11px]">
                    Replace the reconstructed video slots with your own media clips. Timing, motion keyframes, and color grading will be automatically preserved.
                  </p>
                  <input
                    ref={replacementInputRef}
                    type="file"
                    accept="video/*,image/*"
                    className="hidden"
                    onChange={handleReplaceSlotMedia}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    {result.template.mediaSlots.map((slot, idx) => {
                      const userReplacement = userMediaReplacements[slot.id];
                      return (
                        <div
                          key={slot.id}
                          className="p-3 rounded-xl bg-[#121520] border border-zinc-800 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-black shrink-0 border border-zinc-700">
                              <img
                                src={userReplacement ? userReplacement.previewUrl : slot.thumbnailUrl}
                                alt={slot.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="truncate max-w-[160px]">
                              <p className="font-bold text-white text-xs truncate">
                                {userReplacement ? userReplacement.name : `Slot #${idx + 1}`}
                              </p>
                              <p className="text-[10px] text-zinc-400">
                                {slot.durationSeconds.toFixed(1)}s • {slot.cropBehavior || 'cover'}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setReplacingSlotId(slot.id);
                              replacementInputRef.current?.click();
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-cyan-500 hover:text-black text-cyan-300 font-semibold text-[11px] transition"
                          >
                            {userReplacement ? 'Change' : 'Replace Media'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                <button
                  onClick={() => setStatus('idle')}
                  className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold transition"
                >
                  Analyze Another Video
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveToTemplates}
                    className="px-4 py-2.5 rounded-xl bg-[#141824] hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Save to Template Library</span>
                  </button>

                  <button
                    onClick={handleOpenInEditor}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs transition shadow-lg shadow-cyan-500/25 flex items-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>Open in Studio Timeline as Editable Project</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
