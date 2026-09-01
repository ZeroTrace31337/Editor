/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RationalTime, rationalTimeToSeconds, secondsToRationalTime } from '../../core/time/RationalTime';
import { Sequence } from '../../domain/timeline/Sequence';
import { AudioClip, TimelineClip } from '../../domain/timeline/Clip';
import { KeyframeEvaluator } from '../../domain/keyframe/KeyframeEvaluator';
import { logger } from '../../core/logging/Logger';

export interface AudioTrackEffects {
  eqLow: number;       // -12 to +12 dB
  eqMid: number;       // -12 to +12 dB
  eqHigh: number;      // -12 to +12 dB
  compressorEnabled: boolean;
  compressorThreshold: number; // -60 to 0 dB
  compressorRatio: number;     // 1 to 20
  reverbEnabled: boolean;
  reverbMix: number;           // 0 to 1
  delayEnabled: boolean;
  delayTime: number;           // 0 to 1s
  delayFeedback: number;       // 0 to 0.9
  distortionEnabled: boolean;
  distortionDrive: number;     // 0 to 100
  noiseReductionEnabled: boolean;
  noiseReductionAmount: number;// 0 to 100%
  vocalIsolation: boolean;
  normalizeGain: number;       // 0 to 6 dB
}

export interface BeatAnalysisResult {
  bpm: number;
  beats: number[];      // Timestamps in seconds
  confidence: number;
}

export class AudioMixerEngine {
  private static instance: AudioMixerEngine | null = null;
  private audioCtx: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private masterAnalyserNode: AnalyserNode | null = null;
  private masterCompressorNode: DynamicsCompressorNode | null = null;
  private clipNodesMap: Map<string, {
    source: MediaElementAudioSourceNode | AudioBufferSourceNode;
    gainNode: GainNode;
    pannerNode: StereoPannerNode;
    eqLow: BiquadFilterNode;
    eqMid: BiquadFilterNode;
    eqHigh: BiquadFilterNode;
    highpass: BiquadFilterNode;
    lowpass: BiquadFilterNode;
    analyserNode: AnalyserNode;
    compressor?: DynamicsCompressorNode;
    reverbConvolver?: ConvolverNode;
    reverbGain?: GainNode;
    delayNode?: DelayNode;
    delayFeedbackGain?: GainNode;
  }> = new Map();

  private waveformCache: Map<string, number[]> = new Map();
  private impulseResponses: Map<string, AudioBuffer> = new Map();

  public static getInstance(): AudioMixerEngine {
    if (!this.instance) {
      this.instance = new AudioMixerEngine();
    }
    return this.instance;
  }

  public getContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public getMasterGain(): GainNode {
    const ctx = this.getContext();
    if (!this.masterGainNode) {
      this.masterGainNode = ctx.createGain();
      this.masterGainNode.gain.setValueAtTime(1.0, ctx.currentTime);

      // Studio Master Bus Limiter & Compressor
      this.masterCompressorNode = ctx.createDynamicsCompressor();
      this.masterCompressorNode.threshold.setValueAtTime(-1.0, ctx.currentTime);
      this.masterCompressorNode.knee.setValueAtTime(4.0, ctx.currentTime);
      this.masterCompressorNode.ratio.setValueAtTime(12.0, ctx.currentTime);
      this.masterCompressorNode.attack.setValueAtTime(0.003, ctx.currentTime);
      this.masterCompressorNode.release.setValueAtTime(0.15, ctx.currentTime);

      // Master Analyser Node
      this.masterAnalyserNode = ctx.createAnalyser();
      this.masterAnalyserNode.fftSize = 256;
      this.masterAnalyserNode.smoothingTimeConstant = 0.8;

      this.masterGainNode.connect(this.masterCompressorNode);
      this.masterCompressorNode.connect(this.masterAnalyserNode);
      this.masterAnalyserNode.connect(ctx.destination);
    }
    return this.masterGainNode;
  }

  public getMasterAnalyser(): AnalyserNode | null {
    this.getMasterGain(); // ensure initialized
    return this.masterAnalyserNode;
  }

  public getRealtimeMasterLevels(): { rms: number; peak: number; lufsEstimate: number } {
    if (!this.masterAnalyserNode) {
      return { rms: 0, peak: 0, lufsEstimate: -70 };
    }
    const dataArray = new Uint8Array(this.masterAnalyserNode.frequencyBinCount);
    this.masterAnalyserNode.getByteTimeDomainData(dataArray);

    let sumSquares = 0;
    let peak = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const norm = (dataArray[i] - 128) / 128;
      const absVal = Math.abs(norm);
      if (absVal > peak) peak = absVal;
      sumSquares += norm * norm;
    }
    const rms = Math.sqrt(sumSquares / dataArray.length);
    const db = rms > 0.0001 ? 20 * Math.log10(rms) : -70;
    const lufsEstimate = Math.max(-70, Math.min(0, db - 3.0));

    return {
      rms: Math.min(1.0, rms * 1.8),
      peak: Math.min(1.0, peak * 1.5),
      lufsEstimate,
    };
  }

  public getRealtimeClipLevels(clipId: string): { rms: number; peak: number } {
    const nodes = this.clipNodesMap.get(clipId);
    if (!nodes || !nodes.analyserNode) {
      return { rms: 0, peak: 0 };
    }
    const dataArray = new Uint8Array(nodes.analyserNode.frequencyBinCount);
    nodes.analyserNode.getByteTimeDomainData(dataArray);

    let sumSquares = 0;
    let peak = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const norm = (dataArray[i] - 128) / 128;
      const absVal = Math.abs(norm);
      if (absVal > peak) peak = absVal;
      sumSquares += norm * norm;
    }
    const rms = Math.sqrt(sumSquares / dataArray.length);
    return {
      rms: Math.min(1.0, rms * 1.8),
      peak: Math.min(1.0, peak * 1.5),
    };
  }

  public setMasterVolume(volume: number): void {
    const master = this.getMasterGain();
    const ctx = this.getContext();
    master.gain.setValueAtTime(Math.max(0, Math.min(2.0, volume)), ctx.currentTime);
  }

  /**
   * Connects an HTMLMediaElement (video or audio) into the Web Audio processing graph
   */
  public attachMediaElement(
    element: HTMLMediaElement,
    clipId: string,
    initialEffects?: Partial<AudioTrackEffects>
  ): void {
    const ctx = this.getContext();
    const master = this.getMasterGain();

    if (this.clipNodesMap.has(clipId)) {
      return;
    }

    try {
      const source = ctx.createMediaElementSource(element);
      const gainNode = ctx.createGain();
      const pannerNode = ctx.createStereoPanner ? ctx.createStereoPanner() : (ctx.createPanner() as any);
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 128;
      analyserNode.smoothingTimeConstant = 0.8;

      // 3-Band Equalizer
      const eqLow = ctx.createBiquadFilter();
      eqLow.type = 'lowshelf';
      eqLow.frequency.setValueAtTime(120, ctx.currentTime);
      eqLow.gain.setValueAtTime(initialEffects?.eqLow ?? 0, ctx.currentTime);

      const eqMid = ctx.createBiquadFilter();
      eqMid.type = 'peaking';
      eqMid.frequency.setValueAtTime(1200, ctx.currentTime);
      eqMid.Q.setValueAtTime(1.0, ctx.currentTime);
      eqMid.gain.setValueAtTime(initialEffects?.eqMid ?? 0, ctx.currentTime);

      const eqHigh = ctx.createBiquadFilter();
      eqHigh.type = 'highshelf';
      eqHigh.frequency.setValueAtTime(6500, ctx.currentTime);
      eqHigh.gain.setValueAtTime(initialEffects?.eqHigh ?? 0, ctx.currentTime);

      // Clean Voice Isolation / Highpass & Lowpass filters
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(initialEffects?.vocalIsolation ? 100 : 20, ctx.currentTime);

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(initialEffects?.noiseReductionEnabled ? 12000 : 20000, ctx.currentTime);

      // Serial Graph Wiring:
      // Source -> Highpass -> Lowpass -> EQLow -> EQMid -> EQHigh -> Gain -> Pan -> Analyser -> Master
      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(eqLow);
      eqLow.connect(eqMid);
      eqMid.connect(eqHigh);
      eqHigh.connect(gainNode);
      gainNode.connect(pannerNode);
      pannerNode.connect(analyserNode);
      analyserNode.connect(master);

      this.clipNodesMap.set(clipId, {
        source,
        gainNode,
        pannerNode,
        eqLow,
        eqMid,
        eqHigh,
        highpass,
        lowpass,
        analyserNode,
      });
    } catch (e) {
      logger.warn('AudioMixerEngine', `Failed to attach audio graph for clip ${clipId}`, { error: e });
    }
  }

  /**
   * Applies real-time volume, keyframes, pan, and DSP equalizer parameters
   */
  public updateClipAudio(
    clip: TimelineClip,
    currentTime: RationalTime,
    effects?: Partial<AudioTrackEffects>
  ): void {
    const nodeSet = this.clipNodesMap.get(clip.id);
    if (!nodeSet) return;

    const ctx = this.getContext();
    const now = ctx.currentTime;

    // 1. Calculate Base Volume & Keyframed Automation
    let effectiveVolume = (clip as AudioClip).volume ?? 1.0;
    if (clip.muted) {
      effectiveVolume = 0;
    } else if (clip.keyframeTracks && clip.keyframeTracks['volume']) {
      const elapsed = rationalTimeToSeconds(currentTime) - rationalTimeToSeconds(clip.timelineRange.start);
      effectiveVolume = KeyframeEvaluator.evaluateNumber(clip.keyframeTracks['volume'], secondsToRationalTime(elapsed));
    }

    // 2. Fade In & Fade Out evaluation
    const elapsedSec = rationalTimeToSeconds(currentTime) - rationalTimeToSeconds(clip.timelineRange.start);
    const clipDurSec = rationalTimeToSeconds(clip.timelineRange.duration);
    const fadeInSec = (clip as AudioClip).fadeInDuration ? rationalTimeToSeconds((clip as AudioClip).fadeInDuration) : 0;
    const fadeOutSec = (clip as AudioClip).fadeOutDuration ? rationalTimeToSeconds((clip as AudioClip).fadeOutDuration) : 0;

    if (fadeInSec > 0 && elapsedSec < fadeInSec) {
      effectiveVolume *= Math.max(0, Math.min(1, elapsedSec / fadeInSec));
    }
    if (fadeOutSec > 0 && elapsedSec > (clipDurSec - fadeOutSec)) {
      const remaining = clipDurSec - elapsedSec;
      effectiveVolume *= Math.max(0, Math.min(1, remaining / fadeOutSec));
    }

    nodeSet.gainNode.gain.setValueAtTime(Math.max(0, Math.min(3.0, effectiveVolume)), now);

    // 3. Stereo Pan
    const pan = (clip as AudioClip).pan ?? 0;
    if (nodeSet.pannerNode && 'pan' in nodeSet.pannerNode) {
      nodeSet.pannerNode.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);
    }

    // 4. Equalizer Updates
    if (effects) {
      if (effects.eqLow !== undefined) nodeSet.eqLow.gain.setValueAtTime(effects.eqLow, now);
      if (effects.eqMid !== undefined) nodeSet.eqMid.gain.setValueAtTime(effects.eqMid, now);
      if (effects.eqHigh !== undefined) nodeSet.eqHigh.gain.setValueAtTime(effects.eqHigh, now);
      if (effects.vocalIsolation !== undefined) {
        nodeSet.highpass.frequency.setValueAtTime(effects.vocalIsolation ? 120 : 20, now);
      }
      if (effects.noiseReductionEnabled !== undefined) {
        const nrCutoff = effects.noiseReductionEnabled
          ? 18000 - (effects.noiseReductionAmount ?? 50) * 80
          : 20000;
        nodeSet.lowpass.frequency.setValueAtTime(nrCutoff, now);
      }
    }
  }

  /**
   * Real Beat Detection and BPM Estimation Engine (Onset Peak Detection & Spectral Energy Flux)
   */
  public async analyzeBeats(audioBuffer: AudioBuffer): Promise<BeatAnalysisResult> {
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0); // Primary channel
    const bufferLength = channelData.length;

    // Window size for energy detection (approx 20ms)
    const windowSize = Math.floor(sampleRate * 0.02);
    const hopSize = Math.floor(windowSize / 2);
    const numWindows = Math.floor((bufferLength - windowSize) / hopSize);

    const energy: Float32Array = new Float32Array(numWindows);
    for (let i = 0; i < numWindows; i++) {
      const start = i * hopSize;
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        const val = channelData[start + j];
        sum += val * val;
      }
      energy[i] = Math.sqrt(sum / windowSize);
    }

    // Dynamic threshold peak picking
    const beats: number[] = [];
    const localWindow = 25; // 25 frames context
    for (let i = localWindow; i < numWindows - localWindow; i++) {
      let localMean = 0;
      let localMax = 0;
      for (let k = i - localWindow; k <= i + localWindow; k++) {
        localMean += energy[k];
        if (energy[k] > localMax) localMax = energy[k];
      }
      localMean /= (localWindow * 2 + 1);

      const threshold = localMean * 1.45;
      if (energy[i] > threshold && energy[i] === localMax && energy[i] > 0.05) {
        const timeSec = (i * hopSize) / sampleRate;
        // Ensure minimum 150ms between consecutive detected beats (max 400 BPM)
        if (beats.length === 0 || timeSec - beats[beats.length - 1] > 0.15) {
          beats.push(parseFloat(timeSec.toFixed(3)));
        }
      }
    }

    // Estimate BPM from inter-beat intervals (IBI)
    let estimatedBpm = 120;
    if (beats.length >= 4) {
      const intervals: number[] = [];
      for (let i = 1; i < beats.length; i++) {
        intervals.push(beats[i] - beats[i - 1]);
      }
      intervals.sort((a, b) => a - b);
      const medianInterval = intervals[Math.floor(intervals.length / 2)];
      if (medianInterval > 0) {
        let rawBpm = 60 / medianInterval;
        while (rawBpm < 75) rawBpm *= 2;
        while (rawBpm > 175) rawBpm /= 2;
        estimatedBpm = Math.round(rawBpm);
      }
    }

    return {
      bpm: estimatedBpm,
      beats,
      confidence: Math.min(1.0, beats.length / (bufferLength / sampleRate * (estimatedBpm / 60) * 0.8)),
    };
  }

  /**
   * Generates cached waveform peak data for accurate, high-performance UI timeline drawing
   */
  public async getWaveformPeaks(
    assetId: string,
    audioBufferOrUri: AudioBuffer | string,
    numSamples = 400
  ): Promise<number[]> {
    if (this.waveformCache.has(assetId)) {
      return this.waveformCache.get(assetId)!;
    }

    let buffer: AudioBuffer;
    if (typeof audioBufferOrUri === 'string') {
      const ctx = this.getContext();
      const res = await fetch(audioBufferOrUri);
      const arrayBuf = await res.arrayBuffer();
      buffer = await ctx.decodeAudioData(arrayBuf);
    } else {
      buffer = audioBufferOrUri;
    }

    const channelData = buffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / numSamples);
    const peaks: number[] = [];

    for (let i = 0; i < numSamples; i++) {
      const start = i * blockSize;
      let max = 0;
      for (let j = 0; j < blockSize; j++) {
        const val = Math.abs(channelData[start + j] || 0);
        if (val > max) max = val;
      }
      peaks.push(parseFloat(max.toFixed(3)));
    }

    this.waveformCache.set(assetId, peaks);
    return peaks;
  }

  /**
   * Creates an audio MediaStreamDestination for the video exporter so rendered videos have full multi-track audio
   */
  public createExportDestination(): MediaStreamAudioDestinationNode {
    const ctx = this.getContext();
    const dest = ctx.createMediaStreamDestination();
    const master = this.getMasterGain();
    master.connect(dest);
    return dest;
  }
}
