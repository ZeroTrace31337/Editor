/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RationalTime, createRationalTime, secondsToRationalTime } from '../../core/time/RationalTime';

export type SfxCategory =
  | 'whoosh'
  | 'impact'
  | 'transition'
  | 'cinematic'
  | 'horror'
  | 'comedy'
  | 'nature'
  | 'weapons'
  | 'technology'
  | 'crowd'
  | 'ui'
  | 'ambient';

export interface SoundItem {
  id: string;
  name: string;
  category: SfxCategory | 'music';
  durationSeconds: number;
  tags: string[];
  bpm?: number;
  key?: string;
  isAi?: boolean;
}

export class AudioSynthesisEngine {
  private static instance: AudioSynthesisEngine | null = null;
  private audioCtx: AudioContext | null = null;
  private activeSource: AudioNode | null = null;
  private isPreviewPlaying = false;
  private currentPlayingId: string | null = null;

  // Microphone Recording State
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  private analyserNode: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private onLevelCallback: ((level: number) => void) | null = null;

  public static getInstance(): AudioSynthesisEngine {
    if (!this.instance) {
      this.instance = new AudioSynthesisEngine();
    }
    return this.instance;
  }

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public stopPreview(): void {
    if (this.activeSource) {
      try {
        (this.activeSource as any).stop?.();
      } catch {}
      this.activeSource.disconnect();
      this.activeSource = null;
    }
    this.isPreviewPlaying = false;
    this.currentPlayingId = null;
  }

  public isPlaying(id: string): boolean {
    return this.isPreviewPlaying && this.currentPlayingId === id;
  }

  /**
   * Generates procedural real audio for any SFX or Music item on the fly using Web Audio synthesis!
   */
  public playPreview(sound: SoundItem, onEnded?: () => void): void {
    this.stopPreview();
    const ctx = this.getContext();
    this.isPreviewPlaying = true;
    this.currentPlayingId = sound.id;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.7, ctx.currentTime);
    masterGain.connect(ctx.destination);

    const now = ctx.currentTime;
    const dur = Math.min(sound.durationSeconds, 8); // Max 8s for preview

    if (sound.category === 'whoosh') {
      this.synthWhoosh(ctx, masterGain, now, dur);
    } else if (sound.category === 'impact') {
      this.synthImpact(ctx, masterGain, now, dur);
    } else if (sound.category === 'transition' || sound.category === 'cinematic') {
      this.synthRiserOrBoom(ctx, masterGain, now, dur);
    } else if (sound.category === 'technology' || sound.category === 'ui') {
      this.synthUIBeep(ctx, masterGain, now, dur);
    } else if (sound.category === 'nature' || sound.category === 'ambient') {
      this.synthAmbientNoise(ctx, masterGain, now, dur);
    } else if (sound.category === 'comedy') {
      this.synthComedyBoing(ctx, masterGain, now, dur);
    } else if (sound.category === 'horror') {
      this.synthHorrorDrone(ctx, masterGain, now, dur);
    } else if (sound.category === 'weapons') {
      this.synthLaserOrGun(ctx, masterGain, now, dur);
    } else {
      // Music preview: procedural synth beat chord progression
      this.synthMusicGroove(ctx, masterGain, now, dur, sound.bpm || 120);
    }

    setTimeout(() => {
      if (this.currentPlayingId === sound.id) {
        this.stopPreview();
        onEnded?.();
      }
    }, dur * 1000);
  }

  private synthWhoosh(ctx: AudioContext, dest: AudioNode, now: number, dur: number): void {
    // Filtered noise with exponential sweep
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 3.0;
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(3200, now + dur * 0.5);
    filter.frequency.exponentialRampToValueAtTime(100, now + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.8, now + dur * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    whiteNoise.start(now);
    whiteNoise.stop(now + dur);
    this.activeSource = whiteNoise;
  }

  private synthImpact(ctx: AudioContext, dest: AudioNode, now: number, dur: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + dur * 0.6);

    gain.gain.setValueAtTime(1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    // Add noise punch
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const out = noiseBuffer.getChannelData(0);
    for (let i = 0; i < out.length; i++) out[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.connect(gain);
    noise.start(now);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + dur);
    this.activeSource = osc;
  }

  private synthRiserOrBoom(ctx: AudioContext, dest: AudioNode, now: number, dur: number): void {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc2.type = 'sine';
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + dur * 0.9);
    osc2.frequency.setValueAtTime(65, now);
    osc2.frequency.exponentialRampToValueAtTime(850, now + dur * 0.9);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(6000, now + dur * 0.9);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.7, now + dur * 0.85);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + dur);
    osc2.stop(now + dur);
    this.activeSource = osc;
  }

  private synthUIBeep(ctx: AudioContext, dest: AudioNode, now: number, dur: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1760, now + 0.08);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + Math.min(dur, 0.4));

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + Math.min(dur, 0.4));
    this.activeSource = osc;
  }

  private synthAmbientNoise(ctx: AudioContext, dest: AudioNode, now: number, dur: number): void {
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        data[i] = (b0 + b1 + b2) * 0.15;
      }
    }
    const pinkNoise = ctx.createBufferSource();
    pinkNoise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.5);
    gain.gain.setValueAtTime(0.5, now + dur - 0.5);
    gain.gain.linearRampToValueAtTime(0.001, now + dur);

    pinkNoise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    pinkNoise.start(now);
    pinkNoise.stop(now + dur);
    this.activeSource = pinkNoise;
  }

  private synthComedyBoing(ctx: AudioContext, dest: AudioNode, now: number, dur: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(660, now + 0.15);
    osc.frequency.linearRampToValueAtTime(330, now + 0.35);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + Math.min(dur, 0.8));

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + Math.min(dur, 0.8));
    this.activeSource = osc;
  }

  private synthHorrorDrone(ctx: AudioContext, dest: AudioNode, now: number, dur: number): void {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(55, now);
    osc2.frequency.setValueAtTime(58.5, now); // Dissonant beating

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.01, now + dur);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + dur);
    osc2.stop(now + dur);
    this.activeSource = osc1;
  }

  private synthLaserOrGun(ctx: AudioContext, dest: AudioNode, now: number, dur: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + Math.min(dur, 0.3));

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + Math.min(dur, 0.3));
    this.activeSource = osc;
  }

  private synthMusicGroove(ctx: AudioContext, dest: AudioNode, now: number, dur: number, bpm: number): void {
    const beatSec = 60 / bpm;
    const chords = [
      [220, 261.63, 329.63], // Am
      [174.61, 220, 261.63], // F
      [261.63, 329.63, 392], // C
      [196, 246.94, 293.66], // G
    ];

    const masterGrooveGain = ctx.createGain();
    masterGrooveGain.gain.setValueAtTime(0.5, now);
    masterGrooveGain.gain.linearRampToValueAtTime(0.5, now + dur - 0.5);
    masterGrooveGain.gain.linearRampToValueAtTime(0.01, now + dur);
    masterGrooveGain.connect(dest);

    let step = 0;
    for (let t = 0; t < dur; t += beatSec) {
      const chord = chords[Math.floor(step / 4) % chords.length];
      const isKick = step % 2 === 0;
      const isSnare = step % 4 === 2;

      // Synth chord pad
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + t);
        g.gain.setValueAtTime(0.08, now + t);
        g.gain.exponentialRampToValueAtTime(0.001, now + t + beatSec * 0.9);
        osc.connect(g);
        g.connect(masterGrooveGain);
        osc.start(now + t);
        osc.stop(now + t + beatSec * 0.95);
      });

      // Kick
      if (isKick) {
        const kickOsc = ctx.createOscillator();
        const kickGain = ctx.createGain();
        kickOsc.frequency.setValueAtTime(130, now + t);
        kickOsc.frequency.exponentialRampToValueAtTime(45, now + t + 0.12);
        kickGain.gain.setValueAtTime(0.6, now + t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.15);
        kickOsc.connect(kickGain);
        kickGain.connect(masterGrooveGain);
        kickOsc.start(now + t);
        kickOsc.stop(now + t + 0.16);
      }

      // Snare / Hi-hat
      if (isSnare) {
        const hihatBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
        const data = hihatBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
        const snare = ctx.createBufferSource();
        snare.buffer = hihatBuffer;
        const snareGain = ctx.createGain();
        snareGain.gain.setValueAtTime(0.3, now + t);
        snare.connect(snareGain);
        snareGain.connect(masterGrooveGain);
        snare.start(now + t);
      }

      step++;
    }
  }

  /**
   * Generates a real Audio Blob and Waveform data points for the given sound so it can be added to the project media pool and timeline!
   */
  public async generateAudioBlob(sound: SoundItem): Promise<{ blob: Blob; url: string; waveform: number[] }> {
    const sampleRate = 44100;
    const dur = Math.max(1, sound.durationSeconds);
    const offlineCtx = new OfflineAudioContext(2, sampleRate * dur, sampleRate);

    const masterGain = offlineCtx.createGain();
    masterGain.gain.setValueAtTime(0.8, 0);
    masterGain.connect(offlineCtx.destination);

    if (sound.category === 'whoosh') {
      this.synthWhoosh(offlineCtx as any, masterGain, 0, dur);
    } else if (sound.category === 'impact') {
      this.synthImpact(offlineCtx as any, masterGain, 0, dur);
    } else if (sound.category === 'transition' || sound.category === 'cinematic') {
      this.synthRiserOrBoom(offlineCtx as any, masterGain, 0, dur);
    } else if (sound.category === 'technology' || sound.category === 'ui') {
      this.synthUIBeep(offlineCtx as any, masterGain, 0, dur);
    } else if (sound.category === 'nature' || sound.category === 'ambient') {
      this.synthAmbientNoise(offlineCtx as any, masterGain, 0, dur);
    } else if (sound.category === 'comedy') {
      this.synthComedyBoing(offlineCtx as any, masterGain, 0, dur);
    } else if (sound.category === 'horror') {
      this.synthHorrorDrone(offlineCtx as any, masterGain, 0, dur);
    } else if (sound.category === 'weapons') {
      this.synthLaserOrGun(offlineCtx as any, masterGain, 0, dur);
    } else {
      this.synthMusicGroove(offlineCtx as any, masterGain, 0, dur, sound.bpm || 120);
    }

    const renderedBuffer = await offlineCtx.startRendering();
    const wavBlob = this.audioBufferToWav(renderedBuffer);
    const url = URL.createObjectURL(wavBlob);

    // Compute waveform peaks (64 bins)
    const channelData = renderedBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / 64);
    const waveform: number[] = [];
    for (let i = 0; i < 64; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[i * blockSize + j] || 0);
      }
      waveform.push(Math.min(1.0, (sum / blockSize) * 2.5));
    }

    return { blob: wavBlob, url, waveform };
  }

  /**
   * Real Voiceover Microphone Recording
   */
  public async startMicrophoneRecording(onLevel?: (level: number) => void): Promise<void> {
    this.recordedChunks = [];
    this.onLevelCallback = onLevel || null;

    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      throw new Error('Microphone access denied or not available in current environment.');
    }

    const ctx = this.getContext();
    const source = ctx.createMediaStreamSource(this.audioStream);
    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 256;
    source.connect(this.analyserNode);

    // Monitor input level
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    const checkLevel = () => {
      if (!this.analyserNode) return;
      this.analyserNode.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length / 255;
      this.onLevelCallback?.(avg);
      this.animationFrameId = requestAnimationFrame(checkLevel);
    };
    this.animationFrameId = requestAnimationFrame(checkLevel);

    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
    this.mediaRecorder = new MediaRecorder(this.audioStream, { mimeType });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };
    this.mediaRecorder.start(100);
  }

  public stopMicrophoneRecording(): Promise<{ blob: Blob; url: string; duration: number }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('No active recording.'));
      }

      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);

        if (this.audioStream) {
          this.audioStream.getTracks().forEach((t) => t.stop());
          this.audioStream = null;
        }
        this.mediaRecorder = null;
        this.analyserNode = null;

        // Estimate duration from blob or size
        const durationSec = Math.max(1, this.recordedChunks.length * 0.1);
        resolve({ blob, url, duration: durationSec });
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Helper: converts AudioBuffer into standard WAV Blob
   */
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new DataView(new ArrayBuffer(length));
    let pos = 0;

    const setUint16 = (data: number) => { out.setUint16(pos, data, true); pos += 2; };
    const setUint32 = (data: number) => { out.setUint32(pos, data, true); pos += 4; };

    // RIFF chunk
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8);
    setUint32(0x45564157); // "WAVE"

    // FMT sub-chunk
    setUint32(0x20746d66); // "fmt "
    setUint32(16); // 16 for PCM
    setUint16(1);  // PCM format
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
    setUint16(numOfChan * 2); // block align
    setUint16(16); // bits per sample

    // Data sub-chunk
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4);

    // Interleave channels
    const channels: Float32Array[] = [];
    for (let i = 0; i < numOfChan; i++) {
      channels.push(buffer.getChannelData(i));
    }

    for (let i = 0; i < buffer.length; i++) {
      for (let c = 0; c < numOfChan; c++) {
        let sample = Math.max(-1, Math.min(1, channels[c][i]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        out.setInt16(pos, sample, true);
        pos += 2;
      }
    }

    return new Blob([out.buffer], { type: 'audio/wav' });
  }
}
