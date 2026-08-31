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

export interface IAiProvider {
  readonly id: AiProviderId;
  readonly name: string;
  readonly description: string;
  readonly supportedCapabilities: AiCapability[];
  readonly apiKeyEnvVar: string;

  checkStatus(): Promise<{ isConfigured: boolean; message: string }>;

  // Feature Handlers
  generateVideo?(request: AiVideoGenRequest): Promise<AiExecutionResult<AiVideoGenResult>>;
  generateImage?(request: AiImageGenRequest): Promise<AiExecutionResult<AiImageGenResult>>;
  removeBackground?(request: AiBackgroundRemovalRequest): Promise<AiExecutionResult<AiBackgroundRemovalResult>>;
  removeObject?(request: AiObjectRemovalRequest): Promise<AiExecutionResult<AiObjectRemovalResult>>;
  generateCaptions?(request: AiAutoCaptionsRequest): Promise<AiExecutionResult<AiAutoCaptionsResult>>;
  generateVoiceTts?(request: AiVoiceTtsRequest): Promise<AiExecutionResult<AiVoiceTtsResult>>;
  transcribeSpeech?(request: AiSpeechToTextRequest): Promise<AiExecutionResult<AiSpeechToTextResult>>;
  generateMusic?(request: AiMusicGenRequest): Promise<AiExecutionResult<AiMusicGenResult>>;
  generateSfx?(request: AiSfxGenRequest): Promise<AiExecutionResult<AiSfxGenResult>>;
  autoReframe?(request: AiAutoReframeRequest): Promise<AiExecutionResult<AiAutoReframeResult>>;
  smartCut?(request: AiSmartCutRequest): Promise<AiExecutionResult<AiSmartCutResult>>;
  detectHighlights?(request: AiHighlightDetectionRequest): Promise<AiExecutionResult<AiHighlightDetectionResult>>;
  enhanceMedia?(request: AiEnhancementRequest): Promise<AiExecutionResult<AiEnhancementResult>>;
  applyAiEffects?(request: AiEffectsRequest): Promise<AiExecutionResult<AiEffectsResult>>;
}
