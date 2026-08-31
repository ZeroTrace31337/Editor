/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AiProviderId =
  | 'google_gemini'
  | 'openai'
  | 'elevenlabs'
  | 'replicate'
  | 'stability_ai'
  | 'huggingface'
  | 'custom';

export interface AiProviderConfig {
  id: AiProviderId;
  name: string;
  description: string;
  supportedCapabilities: AiCapability[];
  requiresApiKey: boolean;
  apiKeyEnvVar: string;
  isConfigured: boolean;
}

export type AiCapability =
  | 'video_generation'
  | 'image_generation'
  | 'background_removal'
  | 'object_removal'
  | 'auto_captions'
  | 'ai_voice_tts'
  | 'speech_to_text'
  | 'ai_music'
  | 'ai_sound_effects'
  | 'auto_reframe'
  | 'smart_cut'
  | 'highlight_detection'
  | 'ai_enhancement'
  | 'ai_effects';

export interface AiExecutionResult<T = any> {
  success: boolean;
  provider: AiProviderId;
  capability: AiCapability;
  data?: T;
  error?: string;
  isApiKeyMissing?: boolean;
  executionTimeMs: number;
  timestamp: string;
}

// 1. AI Video Generation
export interface AiVideoGenRequest {
  prompt: string;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '21:9';
  style?: string;
  duration?: number;
  resolution?: '720p' | '1080p' | '4k';
  fps?: number;
  motionStrength?: number;
  cameraMovement?: 'pan_left' | 'pan_right' | 'zoom_in' | 'zoom_out' | 'drone_rise' | 'static' | 'dynamic';
}

export interface AiVideoGenResult {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  aspectRatio: string;
  resolution: string;
  fps: number;
  cameraPath?: string;
  lighting?: string;
  colorPalette?: string[];
}

// 2. AI Image Generation
export interface AiImageGenRequest {
  prompt: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  style?: 'Photorealistic' | 'Cinematic' | 'Anime' | 'Cyberpunk' | '3D Render' | 'Oil Painting' | 'Minimalist';
  negativePrompt?: string;
}

export interface AiImageGenResult {
  id: string;
  imageUrl: string;
  prompt: string;
  aspectRatio: string;
  style: string;
  source: string;
}

// 3. AI Background Removal
export interface AiBackgroundRemovalRequest {
  imageOrVideoUrl: string;
  mode: 'transparent' | 'blur' | 'studio' | 'greenscreen' | 'custom_color';
  customColorHex?: string;
  feather?: number;
  threshold?: number;
}

export interface AiBackgroundRemovalResult {
  id: string;
  processedUrl: string;
  maskUrl?: string;
  mode: string;
  feather: number;
  originalUrl: string;
}

// 4. AI Object Removal / Inpainting
export interface AiObjectRemovalRequest {
  imageUrl: string;
  targetDescription: string;
  inpaintMode?: 'temporal' | 'telea' | 'diffusion';
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface AiObjectRemovalResult {
  id: string;
  processedUrl: string;
  targetDescription: string;
  inpaintMode: string;
}

// 5. AI Auto Captions / Subtitles
export interface AiAutoCaptionsRequest {
  audioOrVideoUrl?: string;
  audioBuffer?: ArrayBuffer;
  language?: string;
  style?: 'classic' | 'modern' | 'bold' | 'minimal' | 'karaoke' | 'highlight' | 'social';
}

export interface AiWordTimestamp {
  word: string;
  start: number; // seconds
  end: number;
  confidence?: number;
}

export interface AiCaptionSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  speaker?: string;
  words: AiWordTimestamp[];
}

export interface AiAutoCaptionsResult {
  language: string;
  durationSeconds: number;
  segments: AiCaptionSegment[];
  formattedSrt?: string;
  formattedVtt?: string;
}

// 6. AI Voice / Text-to-Speech
export interface AiVoiceTtsRequest {
  text: string;
  voiceName: string;
  emotion?: 'Neutral' | 'Cinematic Narrator' | 'Energetic Commercial' | 'Calm ASMR' | 'Dramatic Movie' | 'Casual Conversational';
  speed?: number; // 0.5 to 2.0
  pitch?: number;
}

export interface AiVoiceTtsResult {
  id: string;
  audioUrl: string;
  text: string;
  voiceName: string;
  emotion: string;
  durationSeconds: number;
  sampleRate: number;
}

// 7. Speech to Text
export interface AiSpeechToTextRequest {
  audioUrl: string;
  language?: string;
}

export interface AiSpeechToTextResult {
  transcription: string;
  detectedLanguage: string;
  confidence: number;
}

// 8. AI Music Generation
export interface AiMusicGenRequest {
  prompt: string;
  genre?: string;
  mood?: string;
  durationSeconds?: number;
  bpm?: number;
}

export interface AiMusicGenResult {
  id: string;
  title: string;
  audioUrl: string;
  durationSeconds: number;
  bpm: number;
  genre: string;
  mood: string;
  waveformPeaks: number[];
}

// 9. AI Sound Effects Generation
export interface AiSfxGenRequest {
  prompt: string;
  category?: 'whoosh' | 'impact' | 'transition' | 'ui' | 'cinematic' | 'foley' | 'ambient' | 'sci-fi';
  durationSeconds?: number;
}

export interface AiSfxGenResult {
  id: string;
  name: string;
  audioUrl: string;
  category: string;
  durationSeconds: number;
}

// 10. Auto Reframe
export interface AiAutoReframeRequest {
  videoUrl: string;
  sourceAspectRatio: '16:9' | '4:3' | '21:9';
  targetAspectRatio: '9:16' | '1:1' | '4:5' | '16:9';
  subjectTrackingMode: 'face' | 'action' | 'motion' | 'center';
}

export interface AiAutoReframeResult {
  id: string;
  sourceAspectRatio: string;
  targetAspectRatio: string;
  keyframes: Array<{ time: number; cropX: number; cropY: number; scale: number }>;
}

// 11. Smart Cut
export interface AiSmartCutRequest {
  videoUrl: string;
  silenceThresholdDb?: number;
  minSilenceDurationSec?: number;
  removePauses?: boolean;
}

export interface AiSmartCutResult {
  id: string;
  originalDurationSec: number;
  newDurationSec: number;
  removedSegmentsCount: number;
  keepRanges: Array<{ start: number; end: number }>;
}

// 12. Highlight Detection
export interface AiHighlightDetectionRequest {
  videoUrl: string;
  highlightCount?: number;
  criteria?: 'action_peaks' | 'audio_loudness' | 'visual_movement' | 'facial_emotion' | 'combined';
}

export interface AiHighlightDetectionResult {
  id: string;
  highlights: Array<{
    start: number;
    end: number;
    duration: number;
    excitementScore: number;
    reason: string;
    thumbnailUrl?: string;
  }>;
}

// 13. AI Enhancement (Super-resolution & Audio Denoise)
export interface AiEnhancementRequest {
  mediaUrl: string;
  mediaType: 'video' | 'audio' | 'image';
  factor?: '2x' | '4x' | '8x';
  denoiseAmount?: number;
  audioVocalIsolation?: boolean;
}

export interface AiEnhancementResult {
  id: string;
  enhancedUrl: string;
  scaleFactor: string;
  metrics: {
    sharpnessBoostPercent: number;
    noiseReductionDb: number;
  };
}

// 14. AI Effects & Neural Grading
export interface AiEffectsRequest {
  mediaUrl: string;
  styleName: string;
  intensity?: number;
  customPrompt?: string;
}

export interface AiEffectsResult {
  id: string;
  colorGrade: {
    temperature: number;
    tint: number;
    saturation: number;
    contrast: number;
    exposure: number;
    highlights: number;
    shadows: number;
    vignette: number;
    filmGrain: number;
  };
  suggestedEffects: string[];
}
