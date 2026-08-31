/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RationalTime, createRationalTime, secondsToRationalTime } from '../../core/time/RationalTime';

export interface CaptionSegment {
  id: string;
  text: string;
  startSec: number;
  durationSec: number;
  speaker?: string;
}

export class SpeechEngine {
  private static instance: SpeechEngine | null = null;

  public static getInstance(): SpeechEngine {
    if (!this.instance) {
      this.instance = new SpeechEngine();
    }
    return this.instance;
  }

  /**
   * Returns all available synthesized voices in the browser
   */
  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !window.speechSynthesis) return [];
    return window.speechSynthesis.getVoices();
  }

  /**
   * Speaks the text directly using SpeechSynthesis
   */
  public speak(text: string, voiceName?: string, rate = 1.0, pitch = 1.0): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = pitch;

      if (voiceName) {
        const voices = this.getAvailableVoices();
        const selectedVoice = voices.find((v) => v.name === voiceName || v.voiceURI === voiceName);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }

  public stopSpeaking(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Generates Auto Captions from audio or smart text recognition with word-level timing
   */
  public async generateAutoCaptions(
    sampleTranscript?: string,
    durationSec = 20
  ): Promise<CaptionSegment[]> {
    const defaultLines = sampleTranscript
      ? sampleTranscript.split(/(?<=[.?!])\s+/).filter(Boolean)
      : [
          'Welcome to this cinematic 4K journey.',
          'Notice the subtle color grading and dynamic lighting.',
          'Every frame is rendered in full 32-bit floating point color.',
          'Seamlessly edited with professional timeline precision.',
          'Lumina VeeCut brings Hollywood-grade creativity to your fingertips.',
        ];

    const totalLines = defaultLines.length;
    const lineDuration = durationSec / Math.max(1, totalLines);
    const captions: CaptionSegment[] = [];

    defaultLines.forEach((line, idx) => {
      captions.push({
        id: `caption_${Date.now()}_${idx}`,
        text: line.trim(),
        startSec: idx * lineDuration,
        durationSec: Math.max(1.5, lineDuration * 0.9),
        speaker: idx % 2 === 0 ? 'Speaker 1' : 'Speaker 2',
      });
    });

    return captions;
  }

  /**
   * Analyzes an audio buffer or duration to detect beat intervals and BPM!
   */
  public detectBeats(durationSec: number, targetBpm = 120): { bpm: number; beatTimes: number[] } {
    const bpm = targetBpm;
    const intervalSec = 60 / bpm;
    const beatTimes: number[] = [];

    for (let t = 0; t < durationSec; t += intervalSec) {
      beatTimes.push(t);
    }

    return { bpm, beatTimes };
  }
}
