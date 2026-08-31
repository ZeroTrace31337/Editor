/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AiProviderId,
  AiCapability,
  AiExecutionResult,
  AiVideoGenRequest,
  AiVideoGenResult,
  AiImageGenRequest,
  AiImageGenResult,
  AiBackgroundRemovalRequest,
  AiBackgroundRemovalResult,
  AiObjectRemovalRequest,
  AiObjectRemovalResult,
  AiAutoCaptionsRequest,
  AiAutoCaptionsResult,
  AiVoiceTtsRequest,
  AiVoiceTtsResult,
  AiSpeechToTextRequest,
  AiSpeechToTextResult,
  AiMusicGenRequest,
  AiMusicGenResult,
  AiSfxGenRequest,
  AiSfxGenResult,
  AiAutoReframeRequest,
  AiAutoReframeResult,
  AiSmartCutRequest,
  AiSmartCutResult,
  AiHighlightDetectionRequest,
  AiHighlightDetectionResult,
  AiEnhancementRequest,
  AiEnhancementResult,
  AiEffectsRequest,
  AiEffectsResult,
} from './AiTypes';
import { IAiProvider } from './AiProvider';

export class BaseBackendAiProvider implements IAiProvider {
  public readonly id: AiProviderId;
  public readonly name: string;
  public readonly description: string;
  public readonly supportedCapabilities: AiCapability[];
  public readonly apiKeyEnvVar: string;

  constructor(
    id: AiProviderId,
    name: string,
    description: string,
    supportedCapabilities: AiCapability[],
    apiKeyEnvVar: string
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.supportedCapabilities = supportedCapabilities;
    this.apiKeyEnvVar = apiKeyEnvVar;
  }

  public async checkStatus(): Promise<{ isConfigured: boolean; message: string }> {
    try {
      const res = await fetch(`/api/ai/provider-status?provider=${this.id}`);
      if (!res.ok) throw new Error('Status request failed');
      const data = await res.json();
      return {
        isConfigured: data.isConfigured,
        message: data.message || (data.isConfigured ? 'Provider configured and active' : `${this.name} API key not configured`),
      };
    } catch {
      return {
        isConfigured: false,
        message: `Could not verify ${this.name} configuration`,
      };
    }
  }

  private async callEndpoint<TReq, TRes>(
    endpoint: string,
    capability: AiCapability,
    body: TReq
  ): Promise<AiExecutionResult<TRes>> {
    const startTime = performance.now();
    try {
      const res = await fetch(`/api/ai/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, providerId: this.id }),
      });

      const json = await res.json().catch(() => ({ error: 'Invalid response from AI server' }));

      if (!res.ok) {
        return {
          success: false,
          provider: this.id,
          capability,
          error: json.error || `AI processing failed with HTTP ${res.status}`,
          isApiKeyMissing: !!json.isApiKeyMissing,
          executionTimeMs: Math.round(performance.now() - startTime),
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        provider: this.id,
        capability,
        data: json as TRes,
        executionTimeMs: Math.round(performance.now() - startTime),
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.id,
        capability,
        error: err.message || 'Network error communicating with AI server',
        executionTimeMs: Math.round(performance.now() - startTime),
        timestamp: new Date().toISOString(),
      };
    }
  }

  public async generateVideo(request: AiVideoGenRequest): Promise<AiExecutionResult<AiVideoGenResult>> {
    return this.callEndpoint<AiVideoGenRequest, AiVideoGenResult>('video-gen', 'video_generation', request);
  }

  public async generateImage(request: AiImageGenRequest): Promise<AiExecutionResult<AiImageGenResult>> {
    return this.callEndpoint<AiImageGenRequest, AiImageGenResult>('image-gen', 'image_generation', request);
  }

  public async removeBackground(request: AiBackgroundRemovalRequest): Promise<AiExecutionResult<AiBackgroundRemovalResult>> {
    return this.callEndpoint<AiBackgroundRemovalRequest, AiBackgroundRemovalResult>('background-remove', 'background_removal', request);
  }

  public async removeObject(request: AiObjectRemovalRequest): Promise<AiExecutionResult<AiObjectRemovalResult>> {
    return this.callEndpoint<AiObjectRemovalRequest, AiObjectRemovalResult>('object-remove', 'object_removal', request);
  }

  public async generateCaptions(request: AiAutoCaptionsRequest): Promise<AiExecutionResult<AiAutoCaptionsResult>> {
    return this.callEndpoint<AiAutoCaptionsRequest, AiAutoCaptionsResult>('auto-captions', 'auto_captions', request);
  }

  public async generateVoiceTts(request: AiVoiceTtsRequest): Promise<AiExecutionResult<AiVoiceTtsResult>> {
    return this.callEndpoint<AiVoiceTtsRequest, AiVoiceTtsResult>('voice-tts', 'ai_voice_tts', request);
  }

  public async transcribeSpeech(request: AiSpeechToTextRequest): Promise<AiExecutionResult<AiSpeechToTextResult>> {
    return this.callEndpoint<AiSpeechToTextRequest, AiSpeechToTextResult>('speech-to-text', 'speech_to_text', request);
  }

  public async generateMusic(request: AiMusicGenRequest): Promise<AiExecutionResult<AiMusicGenResult>> {
    return this.callEndpoint<AiMusicGenRequest, AiMusicGenResult>('music-gen', 'ai_music', request);
  }

  public async generateSfx(request: AiSfxGenRequest): Promise<AiExecutionResult<AiSfxGenResult>> {
    return this.callEndpoint<AiSfxGenRequest, AiSfxGenResult>('sfx-gen', 'ai_sound_effects', request);
  }

  public async autoReframe(request: AiAutoReframeRequest): Promise<AiExecutionResult<AiAutoReframeResult>> {
    return this.callEndpoint<AiAutoReframeRequest, AiAutoReframeResult>('auto-reframe', 'auto_reframe', request);
  }

  public async smartCut(request: AiSmartCutRequest): Promise<AiExecutionResult<AiSmartCutResult>> {
    return this.callEndpoint<AiSmartCutRequest, AiSmartCutResult>('smart-cut', 'smart_cut', request);
  }

  public async detectHighlights(request: AiHighlightDetectionRequest): Promise<AiExecutionResult<AiHighlightDetectionResult>> {
    return this.callEndpoint<AiHighlightDetectionRequest, AiHighlightDetectionResult>('highlight-detection', 'highlight_detection', request);
  }

  public async enhanceMedia(request: AiEnhancementRequest): Promise<AiExecutionResult<AiEnhancementResult>> {
    return this.callEndpoint<AiEnhancementRequest, AiEnhancementResult>('enhancement', 'ai_enhancement', request);
  }

  public async applyAiEffects(request: AiEffectsRequest): Promise<AiExecutionResult<AiEffectsResult>> {
    return this.callEndpoint<AiEffectsRequest, AiEffectsResult>('effects', 'ai_effects', request);
  }
}

export class AiServiceRegistry {
  private static instance: AiServiceRegistry;
  private providers: Map<AiProviderId, IAiProvider> = new Map();
  private defaultProviderMap: Map<AiCapability, AiProviderId> = new Map();

  private constructor() {
    this.registerDefaultProviders();
  }

  public static getInstance(): AiServiceRegistry {
    if (!AiServiceRegistry.instance) {
      AiServiceRegistry.instance = new AiServiceRegistry();
    }
    return AiServiceRegistry.instance;
  }

  private registerDefaultProviders(): void {
    // 1. Google Gemini Provider
    const gemini = new BaseBackendAiProvider(
      'google_gemini',
      'Google Gemini AI',
      'Multi-modal LLM, Veo Video Generation, Imagen 3, and high-fidelity speech synthesis',
      [
        'video_generation',
        'image_generation',
        'auto_captions',
        'ai_voice_tts',
        'speech_to_text',
        'ai_effects',
        'highlight_detection',
        'auto_reframe',
      ],
      'GEMINI_API_KEY'
    );
    this.registerProvider(gemini);

    // 2. ElevenLabs Provider
    const elevenlabs = new BaseBackendAiProvider(
      'elevenlabs',
      'ElevenLabs AI Voice',
      'Ultra-realistic human vocal synthesis, emotion modulation, and cinematic voiceover',
      ['ai_voice_tts', 'ai_sound_effects'],
      'ELEVENLABS_API_KEY'
    );
    this.registerProvider(elevenlabs);

    // 3. OpenAI Provider
    const openai = new BaseBackendAiProvider(
      'openai',
      'OpenAI (GPT-4o & Whisper)',
      'Whisper audio transcription, DALL-E image generation, and intelligent video script analysis',
      ['speech_to_text', 'auto_captions', 'image_generation', 'smart_cut'],
      'OPENAI_API_KEY'
    );
    this.registerProvider(openai);

    // 4. Replicate Provider
    const replicate = new BaseBackendAiProvider(
      'replicate',
      'Replicate Neural Models',
      'BiRefNet background removal, Stable Video Diffusion, and MusicGen audio generation',
      ['background_removal', 'object_removal', 'video_generation', 'ai_music', 'ai_enhancement'],
      'REPLICATE_API_KEY'
    );
    this.registerProvider(replicate);

    // 5. Stability AI Provider
    const stability = new BaseBackendAiProvider(
      'stability_ai',
      'Stability AI',
      'Stable Diffusion 3.5, Stable Fast 3D, and inpainting neural pipelines',
      ['image_generation', 'object_removal', 'background_removal'],
      'STABILITY_API_KEY'
    );
    this.registerProvider(stability);

    // 6. Hugging Face Provider
    const huggingface = new BaseBackendAiProvider(
      'huggingface',
      'Hugging Face Hub',
      'Open-source transformer models for audio enhancement and scene segmentation',
      ['ai_enhancement', 'smart_cut', 'ai_music', 'ai_sound_effects'],
      'HUGGINGFACE_API_KEY'
    );
    this.registerProvider(huggingface);

    // Set Default Routing
    this.defaultProviderMap.set('video_generation', 'google_gemini');
    this.defaultProviderMap.set('image_generation', 'google_gemini');
    this.defaultProviderMap.set('background_removal', 'replicate');
    this.defaultProviderMap.set('object_removal', 'replicate');
    this.defaultProviderMap.set('auto_captions', 'google_gemini');
    this.defaultProviderMap.set('ai_voice_tts', 'google_gemini');
    this.defaultProviderMap.set('speech_to_text', 'google_gemini');
    this.defaultProviderMap.set('ai_music', 'replicate');
    this.defaultProviderMap.set('ai_sound_effects', 'google_gemini');
    this.defaultProviderMap.set('auto_reframe', 'google_gemini');
    this.defaultProviderMap.set('smart_cut', 'google_gemini');
    this.defaultProviderMap.set('highlight_detection', 'google_gemini');
    this.defaultProviderMap.set('ai_enhancement', 'replicate');
    this.defaultProviderMap.set('ai_effects', 'google_gemini');
  }

  public registerProvider(provider: IAiProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(id: AiProviderId): IAiProvider | undefined {
    return this.providers.get(id);
  }

  public getAllProviders(): IAiProvider[] {
    return Array.from(this.providers.values());
  }

  public getProviderForCapability(capability: AiCapability): IAiProvider {
    const preferredId = this.defaultProviderMap.get(capability);
    if (preferredId && this.providers.has(preferredId)) {
      return this.providers.get(preferredId)!;
    }
    // Fallback to Gemini
    return this.providers.get('google_gemini')!;
  }
}
