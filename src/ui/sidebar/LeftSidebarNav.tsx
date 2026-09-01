/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useEditor } from '../context/EditorContext';
import {
  FolderOpen,
  Music,
  Type,
  Smile,
  Sparkles,
  Layers,
  MessageSquareText,
  SlidersHorizontal,
  Wand2,
  Filter,
  Plus,
  Search,
  Grid2X2,
  Grid3X3,
  ArrowUpDown,
  ChevronDown,
  Upload,
  Video,
  Check,
  Crown,
  Play,
  Square as StopSquare,
  Mic,
  Volume2,
  Radio,
  Sliders,
  Sun,
  Camera,
  RotateCcw,
  Sparkle,
  Zap,
  RefreshCw,
  Trash2,
  Clock,
  AlertCircle,
  Info,
  Loader2,
  Film,
  Bot,
  Youtube,
} from 'lucide-react';
import { AddClipCommand } from '../../engine/command/implementations/AddClipCommand';
import { FiltersPanel } from '../filters/FiltersPanel';
import { createBaseClip } from '../../domain/timeline/Clip';
import { createRationalTime, secondsToRationalTime, rationalTimeToSeconds } from '../../core/time/RationalTime';
import { AudioSynthesisEngine, SoundItem, SfxCategory } from '../../engine/audio/AudioSynthesisEngine';
import { SpeechEngine } from '../../engine/audio/SpeechEngine';
import { AIToolModal } from '../home/AIToolModal';
import { AI_TOOLS_LIST, AIToolItem } from '../home/homeData';
import { YouTubePanel } from '../youtube/YouTubePanel';

export type TopToolSection =
  | 'media'
  | 'audio'
  | 'text'
  | 'stickers'
  | 'effects'
  | 'transitions'
  | 'captions'
  | 'filters'
  | 'adjustment'
  | 'ai_style';

const SFX_DATABASE: SoundItem[] = [
  { id: 'sfx_whoosh_fast', name: 'Fast Cinematic Whoosh', category: 'whoosh', durationSeconds: 0.8, tags: ['transition', 'fast', 'air'] },
  { id: 'sfx_whoosh_deep', name: 'Deep Sub Whoosh Riser', category: 'whoosh', durationSeconds: 1.5, tags: ['dark', 'sub', 'riser'] },
  { id: 'sfx_impact_sub', name: 'Sub Boom Bass Impact', category: 'impact', durationSeconds: 2.2, tags: ['trailer', 'heavy', 'cinematic'] },
  { id: 'sfx_impact_metal', name: 'Cinematic Metal Hit', category: 'impact', durationSeconds: 1.4, tags: ['strike', 'heavy'] },
  { id: 'sfx_trans_riser', name: 'Tension Riser Build', category: 'transition', durationSeconds: 3.5, tags: ['epic', 'build', 'tension'] },
  { id: 'sfx_ui_pop', name: 'Clean Digital Click / Pop', category: 'ui', durationSeconds: 0.2, tags: ['interface', 'soft', 'button'] },
  { id: 'sfx_ui_bell', name: 'Notification Bell Chime', category: 'ui', durationSeconds: 0.6, tags: ['alert', 'bell'] },
  { id: 'sfx_tech_glitch', name: 'Cyberpunk Data Glitch', category: 'technology', durationSeconds: 0.9, tags: ['digital', 'matrix', 'noise'] },
  { id: 'sfx_laser_blast', name: 'Sci-Fi Laser Gun Pulse', category: 'weapons', durationSeconds: 0.5, tags: ['laser', 'space', 'shot'] },
  { id: 'sfx_comedy_boing', name: 'Cartoon Spring Boing', category: 'comedy', durationSeconds: 0.7, tags: ['fun', 'bounce'] },
  { id: 'sfx_horror_drone', name: 'Dark Dissonant Drone', category: 'horror', durationSeconds: 4.0, tags: ['creepy', 'suspense'] },
  { id: 'sfx_ambient_rain', name: 'Gentle Rain Ambient', category: 'ambient', durationSeconds: 6.0, tags: ['nature', 'calm', 'relax'] },
];

const MUSIC_DATABASE: SoundItem[] = [
  { id: 'mus_cinematic_epic', name: 'Epic Cinematic Trailer Synth', category: 'music', durationSeconds: 24, bpm: 128, tags: ['epic', 'trailer', 'heroic'] },
  { id: 'mus_lofi_chill', name: 'Midnight Lo-Fi Chill Hop', category: 'music', durationSeconds: 30, bpm: 85, tags: ['relax', 'study', 'warm'] },
  { id: 'mus_cyber_synth', name: 'Cyberpunk Neon Drive', category: 'music', durationSeconds: 28, bpm: 120, tags: ['synthwave', 'night', 'retro'] },
  { id: 'mus_vlog_groove', name: 'Upbeat Vlog Indie Groove', category: 'music', durationSeconds: 22, bpm: 115, tags: ['happy', 'travel', 'summer'] },
];

const CINEMATIC_LUTS = [
  { id: 'lut_teal_orange', name: 'Teal & Orange Blockbuster', temp: -15, tint: 20, sat: 1.25, contrast: 1.2 },
  { id: 'lut_bleach_bypass', name: 'Bleach Bypass Action', temp: 0, tint: -10, sat: 0.6, contrast: 1.45 },
  { id: 'lut_vintage_70s', name: 'Vintage 70s Warm Film', temp: 35, tint: 15, sat: 0.85, contrast: 0.95 },
  { id: 'lut_cyberpunk', name: 'Cyberpunk Neon Tokyo', temp: -25, tint: 35, sat: 1.55, contrast: 1.3 },
  { id: 'lut_film_noir', name: 'Moody Film Noir B&W', temp: 0, tint: 0, sat: 0.0, contrast: 1.6 },
  { id: 'lut_golden_hour', name: 'Golden Hour Sunset Warmth', temp: 40, tint: 10, sat: 1.2, contrast: 1.05 },
  { id: 'lut_pastel_dream', name: 'Pastel Dream Glow', temp: 10, tint: 15, sat: 1.1, contrast: 0.9 },
  { id: 'lut_matrix_green', name: 'Matrix Code Green', temp: -10, tint: -40, sat: 1.1, contrast: 1.3 },
];

const STICKER_COLLECTIONS = {
  trending: [
    { label: 'Fire Flame', icon: '🔥', size: 80, anim: 'pop', loop: 'pulse' },
    { label: 'Explosion Boom', icon: '💥', size: 80, anim: 'bounce', loop: 'shake' },
    { label: 'Rocket Launch', icon: '🚀', size: 80, anim: 'slide-up', loop: 'float' },
    { label: 'Golden Crown', icon: '👑', size: 80, anim: 'pop', loop: 'pulse' },
    { label: 'Sparkle Star', icon: '✨', size: 75, anim: 'fade', loop: 'pulse' },
    { label: '100 Percent', icon: '💯', size: 75, anim: 'pop', loop: 'shake' },
  ],
  emoji: [
    { label: 'Heart Eyes', icon: '😍', size: 75, anim: 'pop', loop: 'pulse' },
    { label: 'Cool Glasses', icon: '😎', size: 75, anim: 'slide-down', loop: 'float' },
    { label: 'Mind Blown', icon: '🤯', size: 80, anim: 'bounce', loop: 'shake' },
    { label: 'Laugh Cry', icon: '😂', size: 75, anim: 'pop', loop: 'shake' },
    { label: 'Party Popper', icon: '🎉', size: 80, anim: 'pop', loop: 'float' },
    { label: 'Thumbs Up', icon: '👍', size: 75, anim: 'slide-up', loop: 'pulse' },
  ],
  reactions: [
    { label: 'Shock Gas', icon: '😱', size: 75, anim: 'bounce', loop: 'shake' },
    { label: 'Clap Hands', icon: '👏', size: 75, anim: 'pop', loop: 'pulse' },
    { label: 'Fire Eyes', icon: '🤩', size: 75, anim: 'pop', loop: 'pulse' },
    { label: 'Target Bullseye', icon: '🎯', size: 75, anim: 'zoom-in', loop: 'pulse' },
    { label: 'Check Approved', icon: '✅', size: 70, anim: 'pop', loop: 'none' },
    { label: 'Warning Danger', icon: '⚠️', size: 70, anim: 'shake', loop: 'pulse' },
  ],
  badges: [
    { label: 'NEW Drop', icon: '🏷️ NEW', size: 48, anim: 'slide-right', loop: 'pulse' },
    { label: 'LIVE Stream', icon: '🔴 LIVE', size: 48, anim: 'fade', loop: 'pulse' },
    { label: 'Subscribe VIP', icon: '🔔 SUBSCRIBE', size: 48, anim: 'pop', loop: 'float' },
    { label: 'Sale 50%', icon: '⚡ 50% OFF', size: 48, anim: 'bounce', loop: 'pulse' },
    { label: 'Best Seller', icon: '🏆 BEST', size: 48, anim: 'pop', loop: 'float' },
    { label: 'Pro Verified', icon: '💎 PRO', size: 48, anim: 'pop', loop: 'pulse' },
  ],
  shapes: [
    { label: 'Arrow Right', icon: '➡️', size: 70, anim: 'slide-left', loop: 'pulse' },
    { label: 'Red Circle', icon: '⭕', size: 70, anim: 'zoom-in', loop: 'pulse' },
    { label: 'Green Star', icon: '⭐', size: 75, anim: 'pop', loop: 'float' },
    { label: 'Diamond Glow', icon: '💠', size: 70, anim: 'fade', loop: 'pulse' },
    { label: 'Question Mark', icon: '❓', size: 70, anim: 'bounce', loop: 'shake' },
    { label: 'Exclamation Mark', icon: '❗', size: 70, anim: 'pop', loop: 'pulse' },
  ],
  ai: [
    { label: 'Cyber Skull', icon: '💀⚡', size: 75, anim: 'pop', loop: 'shake' },
    { label: 'Neon Hologram', icon: '🔮✨', size: 75, anim: 'fade', loop: 'pulse' },
    { label: 'Laser Katana', icon: '⚔️🔥', size: 75, anim: 'slide-up', loop: 'float' },
  ],
};

const EFFECTS_LIBRARY = [
  { id: 'radial-blur', name: 'Radial Blur Zoom', category: 'blur', desc: 'Fast circular focal zoom blur', defaultParams: { blurRadius: 16 } },
  { id: 'wave-distortion', name: 'Wave Water Warp', category: 'distortion', desc: 'Liquid sine wave animation', defaultParams: { frequency: 0.05, amplitude: 15 } },
  { id: 'scanlines', name: 'CRT Scanlines & Phosphor', category: 'glitch', desc: 'Retro monitor CRT scanlines', defaultParams: { count: 180, opacity: 0.4 } },
  { id: 'light-leak', name: 'Vintage Light Leak', category: 'light', desc: 'Warm anamorphic optical flare', defaultParams: { intensity: 0.8, warmth: 0.7 } },
  { id: 'vhs-retro', name: 'VHS Retro Tape Glitch', category: 'glitch', desc: '80s magnetic tape tracking and noise', defaultParams: { trackingNoise: 0.4, colorBleed: 0.6 } },
  { id: 'letterbox-cinematic', name: 'Letterbox Cinematic 2.39:1', category: 'cinematic', desc: 'Anamorphic widescreen black bars', defaultParams: { aspectRatio: '2.39:1' } },
  { id: 'body-glow', name: 'Subject Edge Glow', category: 'light', desc: 'Electric contour glow outline', defaultParams: { glowColor: '#22d3ee', blur: 20 } },
  { id: 'ai-relight', name: 'AI Scene Relighting', category: 'ai', desc: 'Dynamic directional studio light source', defaultParams: { lightColor: '#fbbf24', lightIntensity: 1.2 } },
  { id: 'gaussian-blur', name: 'Gaussian Soft Blur', category: 'blur', desc: 'Smooth frosted Gaussian defocus', defaultParams: { radius: 12 } },
  { id: 'neon-glow', name: 'Neon Cyber Glow', category: 'light', desc: 'Vibrant neon bloom radiance', defaultParams: { intensity: 1.5, color: '#ec4899' } },
  { id: 'film-grain', name: '35mm Kodak Film Grain', category: 'cinematic', desc: 'Authentic organic celluloid grain', defaultParams: { intensity: 0.25 } },
  { id: 'sharpen', name: 'Unsharp Mask High-Pass', category: 'blur', desc: 'Edge contrast clarity enhancer', defaultParams: { amount: 1.5 } },
  { id: 'chromatic-glitch', name: 'RGB Chromatic Glitch', category: 'glitch', desc: 'Color channel offset twitch', defaultParams: { offset: 12 } },
  { id: 'vignette', name: 'Vignette Dark Corners', category: 'cinematic', desc: 'Lens illumination falloff', defaultParams: { amount: 0.45 } },
];

const TRANSITIONS_LIBRARY = [
  { id: 'cross-dissolve', name: 'Cross Dissolve', category: 'basic', desc: 'Smooth alpha crossfade' },
  { id: 'fade-black', name: 'Dip to Black', category: 'basic', desc: 'Gradual fade into darkness' },
  { id: 'fade-white', name: 'Flash to White', category: 'basic', desc: 'High exposure bright flash' },
  { id: 'wipe-right', name: 'Wipe Right', category: 'basic', desc: 'Horizontal linear curtain wipe' },
  { id: 'slide-left', name: 'Slide Left Push', category: 'motion', desc: 'Fast kinetic camera slide' },
  { id: 'zoom-in', name: 'Zoom In Punch', category: 'motion', desc: 'Rapid focal zoom push' },
  { id: 'spin', name: '360° Spin Whirl', category: 'motion', desc: 'Dynamic rotational blur spin' },
  { id: 'whip-pan', name: 'Speed Whip Pan', category: 'motion', desc: 'High-velocity camera whip' },
  { id: 'shake', name: 'Earthquake Shake', category: 'motion', desc: 'Seismic impact screen tremor' },
  { id: 'glitch-trans', name: 'Digital Matrix Glitch', category: 'stylized', desc: 'Corrupted frame data glitch' },
  { id: 'light-leak', name: 'Warm Light Leak', category: 'stylized', desc: 'Organic film burn flare' },
  { id: 'rgb-split', name: 'RGB Channel Split', category: 'stylized', desc: 'Separated color channel swipe' },
  { id: 'distortion-warp', name: 'Warp Distortion', category: 'stylized', desc: 'Gravitational lens warp' },
  { id: 'cube-3d', name: '3D Cube Rotate', category: 'advanced', desc: 'Spatial 3D box turn' },
  { id: 'ai-seamless', name: 'AI Seamless Match Cut', category: 'advanced', desc: 'Smart geometric morphing cut' },
  { id: 'beat-snap', name: 'Audio Beat Snap', category: 'advanced', desc: 'Rhythmic snap synced to music' },
];

export const LeftSidebarNav: React.FC = () => {
  const {
    project,
    projectService,
    timelineEngine,
    commandManager,
    importFile,
    removeMediaAsset,
    uploadStates,
    isUploading,
    currentTime,
    selectedClip,
    setSelectedClipId,
    setWorkspaceMode,
    addMediaAssetAndClip,
    applyAIResultToTimeline,
  } = useEditor();

  const [activeTool, setActiveTool] = useState<TopToolSection>('media');
  const [activeCategory, setActiveCategory] = useState<string>('Yours');
  const [searchQuery, setSearchQuery] = useState('');
  const [gridMode, setGridMode] = useState<'2x2' | '3x3'>('3x3');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio state
  const [activeAudioSubTab, setActiveAudioSubTab] = useState<'sfx' | 'music' | 'voiceover' | 'tts'>('sfx');
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Sticker state
  const [stickerCategory, setStickerCategory] = useState<'trending' | 'emoji' | 'reactions' | 'badges' | 'shapes' | 'ai'>('trending');
  const [stickerAiPrompt, setStickerAiPrompt] = useState('');
  const [isGeneratingSticker, setIsGeneratingSticker] = useState(false);

  // Effects & Transitions state
  const [effectsCategory, setEffectsCategory] = useState<'all' | 'blur' | 'distortion' | 'glitch' | 'light' | 'cinematic' | 'ai'>('all');
  const [transitionsCategory, setTransitionsCategory] = useState<'all' | 'basic' | 'motion' | 'stylized' | 'advanced'>('all');

  // Captions state
  const [captionsLanguage, setCaptionsLanguage] = useState('en');
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [isCleaningCaptions, setIsCleaningCaptions] = useState(false);
  const [isTranslatingCaptions, setIsTranslatingCaptions] = useState(false);

  // Filter state
  const [isGeneratingSmartFilter, setIsGeneratingSmartFilter] = useState(false);

  // Voiceover Modal / Recording
  const [isVoiceoverRecording, setIsVoiceoverRecording] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [recordDuration, setRecordDuration] = useState(0);

  // Video / Webcam Recording Modal
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const [isWebcamRecording, setIsWebcamRecording] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const webcamRecorderRef = useRef<MediaRecorder | null>(null);
  const webcamChunksRef = useRef<Blob[]>([]);

  // Text-to-Speech State
  const [ttsText, setTtsText] = useState('Welcome to VeeCut, the ultimate professional video editor.');
  const [ttsRate, setTtsRate] = useState(1.0);
  const [ttsPitch, setTtsPitch] = useState(1.0);
  const [isSpeakingTts, setIsSpeakingTts] = useState(false);

  // AI Tool Modal State
  const [selectedAIToolModal, setSelectedAIToolModal] = useState<AIToolItem | null>(null);
  const [sidebarAiPrompt, setSidebarAiPrompt] = useState('');
  const [isSidebarAiRunning, setIsSidebarAiRunning] = useState(false);

  const handleApplyAIResult = async (resultInfo: any) => {
    await applyAIResultToTimeline(resultInfo);
  };

  const audioSynth = AudioSynthesisEngine.getInstance();
  const speechEngine = SpeechEngine.getInstance();

  const assets = project.mediaPool || [];
  const filteredAssets = assets.filter((asset) => {
    if (searchQuery && !asset.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      try {
        await importFile(files[i]);
      } catch (e) {
        console.error('Import failed', e);
      }
    }
  };

  const handleAddAssetToTimeline = async (asset: any) => {
    await addMediaAssetAndClip(asset);
  };

  // Play / Stop SFX preview
  const handleToggleSoundPreview = (sound: SoundItem) => {
    if (playingSoundId === sound.id) {
      audioSynth.stopPreview();
      setPlayingSoundId(null);
    } else {
      setPlayingSoundId(sound.id);
      audioSynth.playPreview(sound, () => {
        setPlayingSoundId(null);
      });
    }
  };

  // Synthesize Sound and Add to Timeline
  const handleAddSoundToTimeline = async (sound: SoundItem) => {
    setIsSynthesizing(true);
    try {
      const { url, durationSeconds = sound.durationSeconds } = sound as any;
      const sequence = timelineEngine.getSequence();
      let audioTrack = sequence.tracks.find((t) => t.kind === 'audio');
      if (!audioTrack) audioTrack = sequence.tracks[0];

      const durRational = secondsToRationalTime(durationSeconds);
      const clipId = `audio_clip_${Date.now()}`;
      const clip = createBaseClip(
        clipId,
        'audio',
        sound.name,
        audioTrack.id,
        { start: currentTime, duration: durRational },
        { start: createRationalTime(0), duration: durRational }
      );
      (clip as any).volume = 1.0;
      (clip as any).pan = 0.0;
      (clip as any).mediaAssetId = sound.id;

      const cmd = new AddClipCommand(timelineEngine, audioTrack.id, clip as any);
      await commandManager.execute(cmd);
      setSelectedClipId(clipId);
      projectService.setProject({ ...project });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Start Mic Voiceover Recording
  const handleStartVoiceover = async () => {
    try {
      setIsVoiceoverRecording(true);
      setRecordDuration(0);
      await audioSynth.startMicrophoneRecording((level) => {
        setMicLevel(level);
      });
    } catch (err: any) {
      alert(err.message || 'Microphone recording failed.');
      setIsVoiceoverRecording(false);
    }
  };

  // Stop Voiceover and Place Clip
  const handleStopVoiceover = async () => {
    try {
      const { blob, url, duration } = await audioSynth.stopMicrophoneRecording();
      setIsVoiceoverRecording(false);

      const sequence = timelineEngine.getSequence();
      let audioTrack = sequence.tracks.find((t) => t.kind === 'audio');
      if (!audioTrack) audioTrack = sequence.tracks[0];

      const durRational = secondsToRationalTime(duration);
      const clipId = `voiceover_${Date.now()}`;
      const clip = createBaseClip(
        clipId,
        'audio',
        `Voiceover Recording ${new Date().toLocaleTimeString()}`,
        audioTrack.id,
        { start: currentTime, duration: durRational },
        { start: createRationalTime(0), duration: durRational }
      );
      (clip as any).volume = 1.0;
      (clip as any).pan = 0.0;

      const cmd = new AddClipCommand(timelineEngine, audioTrack.id, clip as any);
      await commandManager.execute(cmd);
      setSelectedClipId(clipId);
      projectService.setProject({ ...project });
    } catch (e) {
      console.error(e);
      setIsVoiceoverRecording(false);
    }
  };

  // Open Webcam Stream
  const handleOpenWebcam = async () => {
    setIsWebcamOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setWebcamStream(stream);
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
      }
    } catch (e) {
      alert('Camera access denied or unavailable.');
      setIsWebcamOpen(false);
    }
  };

  const handleStartWebcamRecord = () => {
    if (!webcamStream) return;
    webcamChunksRef.current = [];
    const recorder = new MediaRecorder(webcamStream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) webcamChunksRef.current.push(e.data);
    };
    recorder.start(100);
    webcamRecorderRef.current = recorder;
    setIsWebcamRecording(true);
  };

  const handleStopWebcamRecord = () => {
    if (!webcamRecorderRef.current) return;
    webcamRecorderRef.current.onstop = () => {
      const blob = new Blob(webcamChunksRef.current, { type: 'video/webm' });
      const file = new File([blob], `Webcam_Recording_${Date.now()}.webm`, { type: 'video/webm' });
      importFile(file);

      // Close webcam stream
      webcamStream?.getTracks().forEach((t) => t.stop());
      setWebcamStream(null);
      setIsWebcamOpen(false);
      setIsWebcamRecording(false);
    };
    webcamRecorderRef.current.stop();
  };

  // Text-to-Speech Preview & Add
  const handlePreviewTts = async () => {
    setIsSpeakingTts(true);
    await speechEngine.speak(ttsText, undefined, ttsRate, ttsPitch);
    setIsSpeakingTts(false);
  };

  const handleAddTtsToTimeline = () => {
    const sequence = timelineEngine.getSequence();
    let audioTrack = sequence.tracks.find((t) => t.kind === 'audio');
    if (!audioTrack) audioTrack = sequence.tracks[0];

    const estimatedDuration = Math.max(2, (ttsText.split(' ').length / 2.5) / ttsRate);
    const durRational = secondsToRationalTime(estimatedDuration);
    const clipId = `tts_${Date.now()}`;
    const clip = createBaseClip(
      clipId,
      'audio',
      `TTS: "${ttsText.substring(0, 20)}..."`,
      audioTrack.id,
      { start: currentTime, duration: durRational },
      { start: createRationalTime(0), duration: durRational }
    );
    (clip as any).volume = 1.0;
    (clip as any).pan = 0.0;

    const cmd = new AddClipCommand(timelineEngine, audioTrack.id, clip as any);
    commandManager.execute(cmd);
    setSelectedClipId(clipId);
    projectService.setProject({ ...project });
  };

  // Auto Captions generation
  const handleGenerateCaptions = async () => {
    const sequence = timelineEngine.getSequence();
    const videoTrack = sequence.tracks.find((t) => t.kind === 'video') || sequence.tracks[0];
    const captions = await speechEngine.generateAutoCaptions();

    for (const cap of captions) {
      const startRational = secondsToRationalTime(cap.startSec);
      const durRational = secondsToRationalTime(cap.durationSec);
      const clip = createBaseClip(
        cap.id,
        'text',
        cap.text,
        videoTrack.id,
        { start: startRational, duration: durRational },
        { start: createRationalTime(0), duration: durRational }
      );
      (clip as any).text = cap.text;
      (clip as any).fontSize = 38;
      (clip as any).textColor = '#ffffff';
      (clip as any).strokeColor = '#000000';
      (clip as any).strokeWidth = 4;
      (clip as any).backgroundColor = 'rgba(0,0,0,0.6)';
      (clip as any).backgroundPadding = 12;
      (clip as any).backgroundRadius = 6;
      (clip as any).alignment = 'center';
      (clip as any).animation = 'fade';

      const cmd = new AddClipCommand(timelineEngine, videoTrack.id, clip as any);
      await commandManager.execute(cmd);
    }
    projectService.setProject({ ...project });
  };

  // AI Sticker Generation Handler
  const handleGenerateAiSticker = async () => {
    if (!stickerAiPrompt.trim()) return;
    setIsGeneratingSticker(true);
    try {
      const res = await fetch('/api/ai/generate-sticker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: stickerAiPrompt, style: '3D Render' }),
      });
      if (res.ok) {
        const data = await res.json();
        const sequence = timelineEngine.getSequence();
        const track = sequence.tracks.find((tr) => tr.kind === 'video') || sequence.tracks[0];
        const dur = secondsToRationalTime(3.5);
        const clip = createBaseClip(
          `sticker_ai_${Date.now()}`,
          'text',
          `AI: ${stickerAiPrompt.substring(0, 15)}`,
          track.id,
          { start: currentTime, duration: dur },
          { start: createRationalTime(0), duration: dur }
        );
        (clip as any).text = data.stickerEmoji || '✨ ' + stickerAiPrompt;
        (clip as any).fontSize = 72;
        (clip as any).animation = 'pop';
        (clip as any).loopAnimation = 'pulse';

        const cmd = new AddClipCommand(timelineEngine, track.id, clip as any);
        await commandManager.execute(cmd);
        setSelectedClipId(clip.id);
        projectService.setProject({ ...project });
      }
    } catch (e) {
      console.error('Failed to generate AI sticker', e);
    } finally {
      setIsGeneratingSticker(false);
    }
  };

  // AI Caption Cleanup Handler
  const handleAICaptionCleanup = async () => {
    setIsCleaningCaptions(true);
    try {
      const sequence = timelineEngine.getSequence();
      for (const track of sequence.tracks) {
        for (const clip of track.clips) {
          if ((clip as any).type === 'text' && (clip as any).text) {
            const res = await fetch('/api/ai/caption-cleanup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ rawText: (clip as any).text }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.cleanedText) {
                (clip as any).text = data.cleanedText;
              }
            }
          }
        }
      }
      projectService.setProject({ ...project });
    } catch (e) {
      console.error('Caption cleanup failed', e);
    } finally {
      setIsCleaningCaptions(false);
    }
  };

  // AI Caption Translate Handler
  const handleAICaptionTranslate = async () => {
    setIsTranslatingCaptions(true);
    try {
      const sequence = timelineEngine.getSequence();
      for (const track of sequence.tracks) {
        for (const clip of track.clips) {
          if ((clip as any).type === 'text' && (clip as any).text) {
            const res = await fetch('/api/ai/translate-captions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: (clip as any).text, targetLang: captionsLanguage }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.translatedText) {
                (clip as any).text = data.translatedText;
              }
            }
          }
        }
      }
      projectService.setProject({ ...project });
    } catch (e) {
      console.error('Caption translate failed', e);
    } finally {
      setIsTranslatingCaptions(false);
    }
  };

  // AI Smart Filter Handler
  const handleAISmartFilter = async () => {
    if (!selectedClip) return;
    setIsGeneratingSmartFilter(true);
    try {
      const res = await fetch('/api/ai/smart-filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: 'Cinematic Dynamic Contrast' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.params) {
          selectedClip.colorGrade.temp = data.params.temp || 0;
          selectedClip.colorGrade.tint = data.params.tint || 0;
          selectedClip.colorGrade.saturation = data.params.saturation || 1.2;
          selectedClip.colorGrade.contrast = data.params.contrast || 1.25;
          selectedClip.colorGrade.vignette = data.params.vignette || 0.2;
        }
      } else {
        selectedClip.colorGrade.contrast = 1.3;
        selectedClip.colorGrade.saturation = 1.25;
        selectedClip.colorGrade.vignette = 0.25;
      }
      projectService.setProject({ ...project });
    } catch (e) {
      console.error('Smart filter error', e);
      selectedClip.colorGrade.contrast = 1.3;
      selectedClip.colorGrade.saturation = 1.25;
      projectService.setProject({ ...project });
    } finally {
      setIsGeneratingSmartFilter(false);
    }
  };

  const topTools: { id: TopToolSection; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'media', label: 'Media', icon: FolderOpen },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'stickers', label: 'Stickers', icon: Smile },
    { id: 'effects', label: 'Effects', icon: Sparkles },
    { id: 'transitions', label: 'Transitions', icon: Layers },
    { id: 'captions', label: 'Captions', icon: MessageSquareText },
    { id: 'filters', label: 'Filters', icon: Filter },
    { id: 'adjustment', label: 'Adjustment', icon: SlidersHorizontal },
    { id: 'ai_style', label: 'AI style', icon: Wand2 },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0d0f17] border-r border-zinc-800/80 select-none overflow-hidden text-xs">
      {/* 1. TOP HORIZONTAL TOOL NAVIGATION BAR */}
      <div className="flex items-center justify-between border-b border-zinc-800/90 px-2 py-1.5 bg-[#0a0c13] shrink-0 overflow-x-auto">
        <div className="flex items-center space-x-1 sm:space-x-2">
          {topTools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  setActiveTool(tool.id);
                  if (tool.id === 'adjustment') setWorkspaceMode('adjust');
                  else if (tool.id === 'effects') setWorkspaceMode('effects');
                  else if (tool.id === 'audio') setWorkspaceMode('audio');
                }}
                className={`flex flex-col items-center justify-center px-1.5 py-1 rounded-md transition-all group relative ${
                  isActive
                    ? 'text-cyan-400 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mb-0.5 transition-transform group-hover:scale-105 ${
                    isActive ? 'text-cyan-400' : 'text-zinc-400'
                  }`}
                />
                <span className="text-[10px] leading-tight whitespace-nowrap">{tool.label}</span>
                {isActive && (
                  <div className="absolute -bottom-1.5 left-1 right-1 h-[2px] bg-cyan-400 rounded-full shadow-sm shadow-cyan-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. MEDIA TAB */}
      {activeTool === 'media' && (
        <div className="flex-1 flex min-h-0">
          {/* Left Mini-Sidebar Categories */}
          <div className="w-24 shrink-0 bg-[#0a0c13] border-r border-zinc-850 flex flex-col p-2 space-y-1 text-xs">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-1 px-2 rounded-md bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 text-left font-semibold text-[11px] mb-2 flex items-center justify-between"
            >
              <span>Import</span>
            </button>

            {[
              { id: 'Yours', label: 'Yours' },
              { id: 'YouTube', label: 'YouTube', isYt: true },
              { id: 'AI media', label: 'AI media', isAi: true },
              { id: 'Spaces', label: 'Spaces' },
              { id: 'Library', label: 'Library' },
              { id: 'Brand assets', label: 'Brand assets' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full py-1.5 px-1.5 rounded flex items-center justify-between text-[11px] transition ${
                  activeCategory === cat.id
                    ? 'text-white font-bold bg-zinc-800/70'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/40'
                }`}
              >
                <div className="flex items-center gap-1">
                  {cat.isYt ? (
                    <Youtube className="w-3 h-3 text-rose-500 shrink-0" />
                  ) : null}
                  <span>{cat.label}</span>
                  {cat.isAi && (
                    <span className="px-1 py-0.2 rounded text-[8px] bg-cyan-500 text-black font-black">
                      AI
                    </span>
                  )}
                  {cat.isYt && (
                    <span className="px-1 py-0.2 rounded text-[7.5px] bg-rose-600 text-white font-bold">
                      LIVE
                    </span>
                  )}
                </div>
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              </button>
            ))}
          </div>

          {/* Right Media Shelf & Grid or YouTube Search Panel */}
          {activeCategory === 'YouTube' ? (
            <div className="flex-1 flex flex-col min-w-0 bg-[#0d0f17] overflow-hidden">
              <YouTubePanel />
            </div>
          ) : (
          <div
            className="flex-1 flex flex-col min-w-0 bg-[#0d0f17]"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingOver(false);
              handleFiles(e.dataTransfer.files);
            }}
          >
            {/* Top Row: Import Button, Record Dropdown, Grid Toggles, Sort */}
            <div className="px-3 pt-2.5 pb-2 flex items-center justify-between border-b border-zinc-850">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 text-[11px] font-semibold transition active:scale-95"
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Import</span>
                </button>

                <div className="relative group">
                  <button
                    onClick={handleOpenWebcam}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-[11px] font-medium transition"
                  >
                    <Video className="w-3 h-3 text-zinc-400" />
                    <span>Record</span>
                    <ChevronDown className="w-2.5 h-2.5 text-zinc-400" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-zinc-400">
                <button
                  onClick={() => setGridMode('2x2')}
                  className={`p-1 rounded hover:text-white ${gridMode === '2x2' ? 'text-white' : 'text-zinc-500'}`}
                  title="2 Column Grid"
                >
                  <Grid2X2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setGridMode('3x3')}
                  className={`p-1 rounded hover:text-white ${gridMode === '3x3' ? 'text-white' : 'text-zinc-500'}`}
                  title="3 Column Grid"
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Second Row: "All" title + Search Bar */}
            <div className="px-3 py-1.5 space-y-1 border-b border-zinc-850">
              <div className="text-[11px] font-semibold text-zinc-300">All Files</div>
              <div className="relative">
                <Search className="w-3 h-3 text-zinc-500 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search media..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#121520] border border-zinc-800 rounded px-2 pl-6.5 py-1 text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/80"
                />
              </div>
            </div>

            {/* Media Grid & Upload State */}
            <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2">
              {/* Active Uploading / Processing Banners */}
              {uploadStates.length > 0 && (
                <div className="space-y-1.5 mb-1">
                  {uploadStates.map((up) => (
                    <div
                      key={up.id}
                      className={`p-2 rounded-lg text-[11px] border ${
                        up.status === 'failed'
                          ? 'bg-red-950/40 border-red-500/50 text-red-300'
                          : up.status === 'ready'
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                          : 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-medium">
                        <span className="truncate max-w-[180px]">{up.name}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider">
                          {up.status === 'generating_thumbnail'
                            ? 'Thumbnail'
                            : up.status === 'processing'
                            ? 'Probing'
                            : up.status}
                        </span>
                      </div>
                      {up.status !== 'failed' && (
                        <div className="w-full h-1.5 bg-black/60 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 rounded-full"
                            style={{ width: `${up.progress}%` }}
                          />
                        </div>
                      )}
                      {up.error && (
                        <div className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{up.error}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* AI Media Category Shelf */}
              {activeCategory === 'AI media' ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                    <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>10 Neural AI Video Models</span>
                    </span>
                    <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                      Gemini 2.5 Active
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {AI_TOOLS_LIST.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => setSelectedAIToolModal(tool)}
                        className="p-2 rounded-xl bg-[#121522] border border-zinc-800/80 hover:border-cyan-500/60 transition text-left flex flex-col justify-between group cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[8.5px] font-bold px-1 py-0.2 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                            {tool.badge}
                          </span>
                          <Wand2 className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-400 transition" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-zinc-200 group-hover:text-white truncate">
                            {tool.name}
                          </p>
                          <p className="text-[9px] text-zinc-400 line-clamp-1 mt-0.5">
                            {tool.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : filteredAssets.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 min-h-[220px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all ${
                    isDraggingOver
                      ? 'border-cyan-400 bg-cyan-500/10'
                      : 'border-zinc-800 hover:border-cyan-500/50 bg-[#10131d]'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6 text-cyan-400" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-200">Drag & drop media files</p>
                  <p className="text-[10px] text-zinc-400 mt-1">or click to browse from device</p>
                  <div className="flex flex-wrap gap-1 items-center justify-center mt-3 max-w-[200px]">
                    {['MP4', 'MOV', 'WebM', 'AVI', 'MKV', 'PNG', 'JPG', 'MP3', 'WAV'].map((fmt) => (
                      <span
                        key={fmt}
                        className="px-1.5 py-0.5 rounded bg-zinc-850 text-zinc-400 text-[9px] font-mono"
                      >
                        {fmt}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={`grid ${gridMode === '2x2' ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
                  {filteredAssets.map((asset) => {
                    const isAudio = asset.type === 'audio' || asset.name.endsWith('.mp3');
                    const durSec = rationalTimeToSeconds(asset.duration);

                    return (
                      <div
                        key={asset.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/json', JSON.stringify(asset));
                        }}
                        onClick={() => handleAddAssetToTimeline(asset)}
                        className="group relative bg-[#131622] border border-zinc-800/90 rounded-lg overflow-hidden hover:border-cyan-500/80 transition-all shadow-xs flex flex-col cursor-pointer"
                      >
                        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                          {asset.thumbnailUrl ? (
                            <img
                              src={asset.thumbnailUrl}
                              alt={asset.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : isAudio ? (
                            <div className="w-full h-full bg-gradient-to-br from-purple-950/80 via-zinc-900 to-indigo-950 flex items-center justify-center">
                              <Music className="w-6 h-6 text-purple-400" />
                            </div>
                          ) : (
                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                              <Film className="w-6 h-6 text-zinc-600" />
                            </div>
                          )}

                          {/* Duration / Format Pill */}
                          <div className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 backdrop-blur-xs text-[9px] font-mono text-zinc-300 flex items-center gap-0.5">
                            <span>{durSec > 0 ? `${durSec.toFixed(1)}s` : asset.type.toUpperCase()}</span>
                          </div>

                          {/* Hover Overlay & Add to Timeline */}
                          <div className="absolute inset-0 bg-cyan-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="p-1.5 rounded-full bg-cyan-500 text-black shadow-lg">
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          </div>
                        </div>

                        {/* Card Info & Delete */}
                        <div className="p-1 px-1.5 bg-[#10121c] flex items-center justify-between gap-1">
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-medium text-zinc-300 truncate block group-hover:text-white" title={asset.name}>
                              {asset.name}
                            </span>
                            <span className="text-[8.5px] text-zinc-500 font-mono block">
                              {asset.videoMetadata
                                ? `${asset.videoMetadata.width}×${asset.videoMetadata.height}`
                                : `${(asset.fileSize / 1024 / 1024).toFixed(1)} MB`}
                            </span>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeMediaAsset(asset.id);
                            }}
                            title="Delete file from project"
                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      )}

      {/* 3. AUDIO TAB */}
      {activeTool === 'audio' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#0d0f17] p-3 space-y-3 overflow-y-auto">
          {/* Subtabs */}
          <div className="flex items-center gap-1 bg-[#121520] p-1 rounded-lg border border-zinc-800">
            {[
              { id: 'sfx', label: 'Sound FX' },
              { id: 'music', label: 'Music' },
              { id: 'voiceover', label: 'Voiceover' },
              { id: 'tts', label: 'AI Voice (TTS)' },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setActiveAudioSubTab(sub.id as any)}
                className={`flex-1 py-1 rounded text-[11px] font-semibold transition ${
                  activeAudioSubTab === sub.id
                    ? 'bg-cyan-500 text-black shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* SFX / Music List */}
          {(activeAudioSubTab === 'sfx' || activeAudioSubTab === 'music') && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-zinc-300">
                {activeAudioSubTab === 'sfx' ? 'Cinematic Sound Effects' : 'Royalty-Free Music Library'}
              </span>
              <div className="space-y-1.5">
                {(activeAudioSubTab === 'sfx' ? SFX_DATABASE : MUSIC_DATABASE).map((snd) => {
                  const isPlayingThis = playingSoundId === snd.id;
                  return (
                    <div
                      key={snd.id}
                      className="p-2 rounded-lg bg-[#111422] border border-zinc-800/90 hover:border-cyan-500/70 flex items-center justify-between transition group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={() => handleToggleSoundPreview(snd)}
                          className={`p-1.5 rounded-full transition ${
                            isPlayingThis
                              ? 'bg-cyan-400 text-black shadow-xs'
                              : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700'
                          }`}
                        >
                          {isPlayingThis ? <StopSquare className="w-3 h-3 fill-black" /> : <Play className="w-3 h-3 fill-current" />}
                        </button>
                        <div className="truncate">
                          <span className="font-semibold text-zinc-200 block truncate text-[11px]">{snd.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">{snd.durationSeconds}s {snd.bpm ? `• ${snd.bpm} BPM` : ''}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddSoundToTimeline(snd)}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-cyan-500 hover:text-black text-zinc-300 text-[10px] font-bold flex items-center gap-1 transition shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Voiceover Recording */}
          {activeAudioSubTab === 'voiceover' && (
            <div className="p-4 rounded-xl bg-[#111422] border border-zinc-800 space-y-4 text-center">
              <div className="font-bold text-zinc-200 text-xs">Studio Microphone Recording</div>
              <div className="w-20 h-20 mx-auto rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center relative overflow-hidden">
                <Mic className={`w-8 h-8 ${isVoiceoverRecording ? 'text-red-500 animate-pulse' : 'text-zinc-400'}`} />
                {isVoiceoverRecording && (
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-red-500/40 transition-all"
                    style={{ height: `${micLevel * 100}%` }}
                  />
                )}
              </div>

              <div className="space-y-1">
                <span className="text-zinc-400 text-[11px]">
                  {isVoiceoverRecording ? 'Recording active voiceover...' : 'Ready to record voiceover directly to timeline'}
                </span>
              </div>

              {!isVoiceoverRecording ? (
                <button
                  onClick={handleStartVoiceover}
                  className="w-full py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white font-bold text-xs transition flex items-center justify-center gap-2"
                >
                  <Radio className="w-4 h-4" />
                  <span>Start Recording</span>
                </button>
              ) : (
                <button
                  onClick={handleStopVoiceover}
                  className="w-full py-2 rounded-lg bg-zinc-200 hover:bg-white text-black font-bold text-xs transition flex items-center justify-center gap-2"
                >
                  <StopSquare className="w-4 h-4 fill-black" />
                  <span>Stop & Add to Timeline</span>
                </button>
              )}
            </div>
          )}

          {/* Text-to-Speech */}
          {activeAudioSubTab === 'tts' && (
            <div className="p-3 rounded-xl bg-[#111422] border border-zinc-800 space-y-3">
              <span className="font-bold text-zinc-200 text-xs">AI Text-to-Speech Synthesizer</span>
              <textarea
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 text-[11px] focus:outline-none focus:border-cyan-500"
              />

              <div className="space-y-1">
                <div className="flex justify-between text-zinc-400 text-[10px]">
                  <span>Speaking Speed</span>
                  <span className="font-mono text-zinc-200">{ttsRate}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={ttsRate}
                  onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handlePreviewTts}
                  disabled={isSpeakingTts}
                  className="flex-1 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-[11px] flex items-center justify-center gap-1"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{isSpeakingTts ? 'Speaking...' : 'Preview Voice'}</span>
                </button>
                <button
                  onClick={handleAddTtsToTimeline}
                  className="flex-1 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[11px] flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Track</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. TEXT TAB */}
      {activeTool === 'text' && (
        <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#0d0f17]">
          <span className="font-bold text-zinc-200 text-xs">Text & Title Templates</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Cinematic Title', size: 54, color: '#fef08a', stroke: '#000000', anim: 'fade' },
              { label: 'Cyberpunk Neon', size: 48, color: '#22d3ee', stroke: '#ec4899', anim: 'pop' },
              { label: 'Lower Third Minimal', size: 32, color: '#ffffff', stroke: '#000000', anim: 'slide-up' },
              { label: 'Viral Meme Headline', size: 60, color: '#facc15', stroke: '#000000', anim: 'bounce' },
              { label: 'Retro 80s Synth', size: 52, color: '#ff007f', stroke: '#7e22ce', anim: 'typewriter' },
              { label: 'Clean Subtitle', size: 34, color: '#ffffff', stroke: '#000000', anim: 'fade' },
            ].map((t) => (
              <div
                key={t.label}
                onClick={() => {
                  const sequence = timelineEngine.getSequence();
                  const track = sequence.tracks.find((tr) => tr.kind === 'video') || sequence.tracks[0];
                  const dur = secondsToRationalTime(4);
                  const clip = createBaseClip(
                    `text_${Date.now()}`,
                    'text',
                    t.label,
                    track.id,
                    { start: currentTime, duration: dur },
                    { start: createRationalTime(0), duration: dur }
                  );
                  (clip as any).text = t.label;
                  (clip as any).fontSize = t.size;
                  (clip as any).textColor = t.color;
                  (clip as any).strokeColor = t.stroke;
                  (clip as any).strokeWidth = 4;
                  (clip as any).animation = t.anim;
                  (clip as any).alignment = 'center';

                  const cmd = new AddClipCommand(timelineEngine, track.id, clip as any);
                  commandManager.execute(cmd);
                  setSelectedClipId(clip.id);
                }}
                className="p-3 rounded-xl bg-[#111422] border border-zinc-800 hover:border-cyan-500 cursor-pointer flex flex-col items-center justify-center text-center transition group"
              >
                <Type className="w-5 h-5 text-cyan-400 mb-1 group-hover:scale-110 transition" />
                <span className="font-bold text-zinc-200 text-[11px]">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. STICKERS TAB */}
      {activeTool === 'stickers' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#0d0f17] p-3 space-y-3 overflow-y-auto">
          {/* Sticker Categories */}
          <div className="flex items-center gap-1 bg-[#121520] p-1 rounded-lg border border-zinc-800 shrink-0 overflow-x-auto">
            {['trending', 'emoji', 'reactions', 'badges', 'shapes', 'ai'].map((cat) => (
              <button
                key={cat}
                onClick={() => setStickerCategory(cat as any)}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold capitalize whitespace-nowrap transition ${
                  stickerCategory === cat
                    ? 'bg-cyan-500 text-black shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {cat === 'ai' ? '✨ AI Gen' : cat}
              </button>
            ))}
          </div>

          {/* AI Sticker Generator Form */}
          {stickerCategory === 'ai' ? (
            <div className="p-3 rounded-xl bg-[#111422] border border-cyan-500/40 space-y-2.5">
              <span className="font-bold text-zinc-100 text-xs flex items-center gap-1.5 text-cyan-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Sticker Studio</span>
              </span>
              <input
                type="text"
                value={stickerAiPrompt}
                onChange={(e) => setStickerAiPrompt(e.target.value)}
                placeholder="e.g. 3D holographic gaming trophy, neon skull..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleGenerateAiSticker}
                disabled={isGeneratingSticker || !stickerAiPrompt.trim()}
                className="w-full py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                {isGeneratingSticker ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Sparkle className="w-3.5 h-3.5" />}
                <span>Generate Sticker Asset</span>
              </button>
            </div>
          ) : null}

          {/* Sticker Grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {STICKER_COLLECTIONS[stickerCategory as keyof typeof STICKER_COLLECTIONS]?.map((stk) => (
              <div
                key={stk.label}
                onClick={() => {
                  const sequence = timelineEngine.getSequence();
                  const track = sequence.tracks.find((tr) => tr.kind === 'video') || sequence.tracks[0];
                  const dur = secondsToRationalTime(3);
                  const clip = createBaseClip(
                    `sticker_${Date.now()}`,
                    'text',
                    stk.label,
                    track.id,
                    { start: currentTime, duration: dur },
                    { start: createRationalTime(0), duration: dur }
                  );
                  (clip as any).text = stk.icon;
                  (clip as any).fontSize = stk.size || 72;
                  (clip as any).animation = stk.anim || 'pop';
                  (clip as any).loopAnimation = stk.loop || 'pulse';
                  const cmd = new AddClipCommand(timelineEngine, track.id, clip as any);
                  commandManager.execute(cmd);
                  setSelectedClipId(clip.id);
                }}
                className="p-2.5 rounded-xl bg-[#111422] border border-zinc-800 hover:border-cyan-500 hover:bg-zinc-800/60 cursor-pointer transition flex flex-col items-center justify-center group"
              >
                <span className="text-2xl group-hover:scale-125 transition-transform duration-200">{stk.icon}</span>
                <span className="text-[9px] text-zinc-400 mt-1 truncate max-w-full font-medium">{stk.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. EFFECTS TAB */}
      {activeTool === 'effects' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#0d0f17] p-3 space-y-3 overflow-y-auto">
          {/* Effect Categories */}
          <div className="flex items-center gap-1 bg-[#121520] p-1 rounded-lg border border-zinc-800 shrink-0 overflow-x-auto">
            {['all', 'blur', 'distortion', 'glitch', 'light', 'cinematic', 'ai'].map((cat) => (
              <button
                key={cat}
                onClick={() => setEffectsCategory(cat as any)}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold capitalize whitespace-nowrap transition ${
                  effectsCategory === cat
                    ? 'bg-cyan-500 text-black shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {EFFECTS_LIBRARY.filter(
              (fx) => effectsCategory === 'all' || fx.category === effectsCategory
            ).map((fx) => (
              <div
                key={fx.id}
                onClick={() => {
                  if (selectedClip) {
                    selectedClip.effects = [
                      ...(selectedClip.effects || []),
                      {
                        id: `fx_${Date.now()}`,
                        effectId: fx.id,
                        name: fx.name,
                        enabled: true,
                        params: fx.defaultParams || {},
                        opacity: 1.0,
                      },
                    ];
                    projectService.setProject({ ...project });
                  }
                }}
                className="p-2.5 rounded-xl bg-[#111422] border border-zinc-800 hover:border-cyan-500 cursor-pointer transition flex flex-col justify-between h-20 group"
              >
                <div className="flex items-center justify-between">
                  <Sparkles className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
                  <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                    {fx.category}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-200 text-[11px] block truncate group-hover:text-white">{fx.name}</span>
                  <span className="text-[9px] text-zinc-500 block truncate">{fx.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. TRANSITIONS TAB */}
      {activeTool === 'transitions' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#0d0f17] p-3 space-y-3 overflow-y-auto">
          {/* Transition Categories */}
          <div className="flex items-center gap-1 bg-[#121520] p-1 rounded-lg border border-zinc-800 shrink-0 overflow-x-auto">
            {['all', 'basic', 'motion', 'stylized', 'advanced'].map((cat) => (
              <button
                key={cat}
                onClick={() => setTransitionsCategory(cat as any)}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold capitalize whitespace-nowrap transition ${
                  transitionsCategory === cat
                    ? 'bg-purple-500 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {TRANSITIONS_LIBRARY.filter(
              (tr) => transitionsCategory === 'all' || tr.category === transitionsCategory
            ).map((trans) => (
              <div
                key={trans.id}
                onClick={() => {
                  if (selectedClip) {
                    selectedClip.transitionIn = {
                      id: `trans_${Date.now()}`,
                      type: trans.id as any,
                      duration: secondsToRationalTime(1.0),
                      position: 'in',
                      alignment: 'start',
                    };
                    projectService.setProject({ ...project });
                  }
                }}
                className="p-2.5 rounded-xl bg-[#111422] border border-zinc-800 hover:border-purple-500 cursor-pointer transition flex flex-col justify-between h-20 group"
              >
                <div className="flex items-center justify-between">
                  <Layers className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                    {trans.category}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-200 text-[11px] block truncate group-hover:text-white">{trans.name}</span>
                  <span className="text-[9px] text-zinc-500 block truncate">{trans.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. CAPTIONS TAB */}
      {activeTool === 'captions' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#0d0f17] p-3 space-y-3 overflow-y-auto">
          <div className="text-center p-3 rounded-xl bg-[#111422] border border-zinc-800 space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <MessageSquareText className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="font-bold text-zinc-200 text-xs block">AI Automatic Captions & Subtitles</span>
            <p className="text-zinc-400 text-[11px]">
              Transcribe spoken dialog into animated, styled karaoke subtitles.
            </p>
          </div>

          {/* Subtitle Language & Transcribe */}
          <div className="p-3 rounded-xl bg-[#111422] border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-zinc-400 font-medium">Source Language</label>
              <select
                value={captionsLanguage}
                onChange={(e) => setCaptionsLanguage(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="en">English (US/UK)</option>
                <option value="es">Spanish (Español)</option>
                <option value="fr">French (Français)</option>
                <option value="de">German (Deutsch)</option>
                <option value="ja">Japanese (日本語)</option>
                <option value="zh">Chinese (中文)</option>
              </select>
            </div>

            <button
              onClick={handleGenerateCaptions}
              disabled={isGeneratingCaptions}
              className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              {isGeneratingCaptions ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Auto Transcribe & Generate</span>
            </button>
          </div>

          {/* AI Cleanup & Translate */}
          <div className="p-3 rounded-xl bg-[#111422] border border-zinc-800 space-y-2">
            <span className="font-bold text-zinc-300 text-[11px] block">AI Subtitle Optimization</span>
            <div className="flex gap-2">
              <button
                onClick={handleAICaptionCleanup}
                disabled={isCleaningCaptions}
                className="flex-1 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-semibold flex items-center justify-center gap-1"
                title="Remove filler words and improve grammar"
              >
                <Wand2 className="w-3 h-3 text-purple-400" />
                <span>Remove Filler Words</span>
              </button>

              <button
                onClick={handleAICaptionTranslate}
                disabled={isTranslatingCaptions}
                className="flex-1 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-semibold flex items-center justify-center gap-1"
                title="Translate all timeline captions"
              >
                <Sparkle className="w-3 h-3 text-cyan-400" />
                <span>Translate All</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. FILTERS & LUTS TAB */}
      {activeTool === 'filters' && <FiltersPanel />}

      {/* 10. ADJUSTMENT & AI STYLE TABS */}
      {activeTool === 'adjustment' && (
        <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#0d0f17]">
          <span className="font-bold text-zinc-200 text-xs">Global Adjustment Layer</span>
          <button
            onClick={() => {
              const sequence = timelineEngine.getSequence();
              const track = sequence.tracks.find((tr) => tr.kind === 'video') || sequence.tracks[0];
              const dur = secondsToRationalTime(10);
              const clip = createBaseClip(
                `adj_${Date.now()}`,
                'adjustment',
                'Adjustment Layer',
                track.id,
                { start: currentTime, duration: dur },
                { start: createRationalTime(0), duration: dur }
              );
              const cmd = new AddClipCommand(timelineEngine, track.id, clip as any);
              commandManager.execute(cmd);
              setSelectedClipId(clip.id);
            }}
            className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Adjustment Layer to Track</span>
          </button>
        </div>
      )}

      {activeTool === 'ai_style' && (
        <div className="flex-1 p-3 overflow-y-auto space-y-4 bg-[#0d0f17]">
          {/* AI Copilot Quick Box */}
          <div className="p-3 rounded-xl bg-gradient-to-tr from-[#111422] to-[#1a1f33] border border-cyan-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-cyan-400" />
                <span>AI Timeline Copilot</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                Gemini 3.7
              </span>
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={sidebarAiPrompt}
                onChange={(e) => setSidebarAiPrompt(e.target.value)}
                placeholder="e.g. Add title 'EPIC VLOG', split clip, apply golden hour"
                className="flex-1 bg-black/50 border border-zinc-800 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && sidebarAiPrompt.trim()) {
                    setIsSidebarAiRunning(true);
                    try {
                      const res = await fetch('/api/ai/assistant-command', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          message: sidebarAiPrompt,
                          currentTimeSeconds: rationalTimeToSeconds(currentTime),
                          selectedClipInfo: selectedClip ? { id: selectedClip.id, name: selectedClip.name } : null,
                        }),
                      });
                      const data = await res.json();
                      await handleApplyAIResult({ assistantActions: data.actions });
                      setSidebarAiPrompt('');
                    } catch (err) {
                      console.error('AI assistant error:', err);
                    } finally {
                      setIsSidebarAiRunning(false);
                    }
                  }
                }}
              />
              <button
                onClick={async () => {
                  if (!sidebarAiPrompt.trim()) return;
                  setIsSidebarAiRunning(true);
                  try {
                    const res = await fetch('/api/ai/assistant-command', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        message: sidebarAiPrompt,
                        currentTimeSeconds: rationalTimeToSeconds(currentTime),
                        selectedClipInfo: selectedClip ? { id: selectedClip.id, name: selectedClip.name } : null,
                      }),
                    });
                    const data = await res.json();
                    await handleApplyAIResult({ assistantActions: data.actions });
                    setSidebarAiPrompt('');
                  } catch (err) {
                    console.error('AI assistant error:', err);
                  } finally {
                    setIsSidebarAiRunning(false);
                  }
                }}
                disabled={isSidebarAiRunning}
                className="px-3 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs disabled:opacity-50 cursor-pointer"
              >
                {isSidebarAiRunning ? '...' : 'Run'}
              </button>
            </div>
          </div>

          {/* 10 AI Tools Suite Launchers */}
          <div className="space-y-2">
            <span className="font-bold text-zinc-200 text-xs block">AI Tools Suite (10 Real Tools)</span>
            <div className="grid grid-cols-1 gap-1.5">
              {AI_TOOLS_LIST.map((aiTool) => (
                <div
                  key={aiTool.id}
                  onClick={() => setSelectedAIToolModal(aiTool)}
                  className="p-2.5 rounded-xl bg-[#111422] border border-zinc-800 hover:border-cyan-500 cursor-pointer flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${aiTool.accentGradient} flex items-center justify-center text-white shadow-sm`}>
                      <Wand2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-semibold text-zinc-200 block text-xs group-hover:text-cyan-400 transition">
                        {aiTool.name}
                      </span>
                      <span className="text-[10px] text-zinc-400 block line-clamp-1">
                        {aiTool.description}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-zinc-800 group-hover:bg-cyan-500/20 text-zinc-300 group-hover:text-cyan-400 font-bold border border-zinc-700 group-hover:border-cyan-500/30 transition shrink-0 ml-2">
                    Open
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Webcam Recording Modal */}
      {isWebcamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-100 text-sm">Studio Webcam Recording</span>
              <button onClick={() => setIsWebcamOpen(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            <div className="aspect-video bg-black rounded-xl overflow-hidden relative">
              <video ref={webcamVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
            <div className="flex justify-end gap-2">
              {!isWebcamRecording ? (
                <button
                  onClick={handleStartWebcamRecord}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Radio className="w-4 h-4" />
                  <span>Start Recording</span>
                </button>
              ) : (
                <button
                  onClick={handleStopWebcamRecord}
                  className="px-4 py-2 rounded-lg bg-white text-black font-bold text-xs flex items-center gap-1.5"
                >
                  <StopSquare className="w-4 h-4 fill-black" />
                  <span>Stop & Import Video</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Tool Launcher Modal */}
      {selectedAIToolModal && (
        <AIToolModal
          isOpen={!!selectedAIToolModal}
          onClose={() => setSelectedAIToolModal(null)}
          tool={selectedAIToolModal}
          onApplyToTimeline={handleApplyAIResult}
        />
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="video/*,audio/*,image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
};
