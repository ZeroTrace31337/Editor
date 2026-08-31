/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AiServiceRegistry } from '../AiServiceRegistry';
import {
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
  AiExecutionResult,
} from '../AiTypes';

export class AiVideoService {
  public static async generate(request: AiVideoGenRequest): Promise<AiExecutionResult<AiVideoGenResult>> {
    const provider = AiServiceRegistry.getInstance().getProviderForCapability('video_generation');
    return provider.generateVideo ? provider.generateVideo(request) : {
      success: false,
      provider: provider.id,
      capability: 'video_generation',
      error: 'Provider does not support video generation',
      executionTimeMs: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export class AiImageService {
  public static async generate(request: AiImageGenRequest): Promise<AiExecutionResult<AiImageGenResult>> {
    const provider = AiServiceRegistry.getInstance().getProviderForCapability('image_generation');
    return provider.generateImage ? provider.generateImage(request) : {
      success: false,
      provider: provider.id,
      capability: 'image_generation',
      error: 'Provider does not support image generation',
      executionTimeMs: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export class AiBackgroundRemovalService {
  public static async remove(request: AiBackgroundRemovalRequest): Promise<AiExecutionResult<AiBackgroundRemovalResult>> {
    const provider = AiServiceRegistry.getInstance().getProviderForCapability('background_removal');
    return provider.removeBackground ? provider.removeBackground(request) : {
      success: false,
      provider: provider.id,
      capability: 'background_removal',
      error: 'Provider does not support background removal',
      executionTimeMs: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export class AiObjectRemovalService {
  public static async remove(request: AiObjectRemovalRequest): Promise<AiExecutionResult<AiObjectRemovalResult>> {
    const provider = AiServiceRegistry.getInstance().getProviderForCapability('object_removal');
    return provider.removeObject ? provider.removeObject(request) : {
      success: false,
      provider: provider.id,
      capability: 'object_removal',
      error: 'Provider does not support object removal',
      executionTimeMs: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export class AiAutoCaptionsService {
  public static async generate(request: AiAutoCaptionsRequest): Promise<AiExecutionResult<AiAutoCaptionsResult>> {
    const provider = AiServiceRegistry.getInstance().getProviderForCapability('auto_captions');
    return provider.generateCaptions ? provider.generateCaptions(request) : {
      success: false,
      provider: provider.id,
      capability: 'auto_captions',
      error: 'Provider does not support auto captions',
      executionTimeMs: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export class AiVoiceService {
  public static async synthesize(request: AiVoiceTtsRequest): Promise<AiExecutionResult<AiVoiceTtsResult>> {
    const provider = AiServiceRegistry.getInstance().getProviderForCapability('ai_voice_tts');
    return provider.generateVoiceTts ? provider.generateVoiceTts(request) : {
      success: false,
      provider: provider.id,
      capability: 'ai_voice_tts',
      error: 'Provider does not support voice synthesis',
      executionTimeMs: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export class AiSttService {
  public static async transcribe(request: AiSpeechToTextRequest): Promise<AiExecutionResult<AiSpeechToTextResult>> {
    const provider = AiServiceRegistry.getInstance().getProviderForCapability('speech_to_text');
    return provider.transcribeSpeech ? provider.transcribeSpeech(request) : {
      success: false,
      provider: provider.id,
      capability: 'speech_to_text',
      error: 'Provider does not support speech transcription',
      executionTimeMs: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export class AiMusicService {
  public static async generate(request: AiMusicGenRequest): Promise<AiExecutionResult<AiMusicGenResult>> {
    const provider = AiServiceRegistry.getInstance().getProviderForCapability('ai_music');
    return provider.generateMusic ? provider.generateMusic(request) : {
      success: false,
      provider: provider.id,
      capability: 'ai_music',
      error: 'Provider does not support music generation',
      executionTimeMs: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export class AiSfxService {
  public static async generate(request: AiSfxGenRequest): Promise<AiExecutionResult<AiSfxGenResult>> {
    const provider = AiServiceRegistry.getInstance().getProviderForCapability('ai_sound_effects');
    return provider.generateSfx ? provider.generateSfx(request) : {
      success: false,
      provider: provider.id,
      capability: 'ai_sound_effects',
      error: 'Provider does not support sound effects generation',
      executionTimeMs: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export class AiAutoReframeService {
  public static async reframe(request: AiAutoReframeRequest): Promise<AiExecutionResult<AiAutoReframeResult>> {
    const provider = AiServiceRegistry.getInstance().getProviderForCapability('auto_reframe');
    return provider.autoReframe ? provider.autoReframe(request) : {
      success: false,
      provider: provider.id,
      capability: 'auto_reframe',
      error: 'Provider does not support auto reframe',
      executionTimeMs: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export class AiSmartCutService {
  public static async process(request: AiSmartCutRequest): Promise<AiExecutionResult<AiSmartCutResult>> {
    const provider = AiServiceRegistry.getInstance().getProviderForCapability('smart_cut');
    return provider.smartCut ? provider.smartCut(request) : {
      success: false,
      provider: provider.id,
      capability: 'smart_cut',
      error: 'Provider does not support smart cut',
      executionTimeMs: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export class AiHighlightDetectionService {
  public static async detect(request: AiHighlightDetectionRequest): Promise<AiExecutionResult<AiHighlightDetectionResult>> {
    const provider = AiServiceRegistry.getInstance().getProviderForCapability('highlight_detection');
    return provider.detectHighlights ? provider.detectHighlights(request) : {
      success: false,
      provider: provider.id,
      capability: 'highlight_detection',
      error: 'Provider does not support highlight detection',
      executionTimeMs: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export class AiEnhancementService {
  public static async enhance(request: AiEnhancementRequest): Promise<AiExecutionResult<AiEnhancementResult>> {
    const provider = AiServiceRegistry.getInstance().getProviderForCapability('ai_enhancement');
    return provider.enhanceMedia ? provider.enhanceMedia(request) : {
      success: false,
      provider: provider.id,
      capability: 'ai_enhancement',
      error: 'Provider does not support enhancement',
      executionTimeMs: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export class AiEffectsService {
  public static async apply(request: AiEffectsRequest): Promise<AiExecutionResult<AiEffectsResult>> {
    const provider = AiServiceRegistry.getInstance().getProviderForCapability('ai_effects');
    return provider.applyAiEffects ? provider.applyAiEffects(request) : {
      success: false,
      provider: provider.id,
      capability: 'ai_effects',
      error: 'Provider does not support AI effects',
      executionTimeMs: 0,
      timestamp: new Date().toISOString(),
    };
  }
}
