/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  RationalTime,
  createRationalTime,
  secondsToRationalTime,
  rationalTimeToSeconds,
  compareRationalTime,
  addRationalTime,
} from '../../core/time/RationalTime';
import { Sequence } from '../../domain/timeline/Sequence';
import { logger } from '../../core/logging/Logger';

export type PlaybackState = 'playing' | 'paused';
export type TimeUpdateListener = (time: RationalTime) => void;
export type PlaybackStateListener = (state: PlaybackState) => void;

export class PlaybackEngine {
  private currentTime: RationalTime = createRationalTime(0);
  private state: PlaybackState = 'paused';
  private sequence: Sequence;
  private animationFrameId: number | null = null;
  private lastPerfTime: number = 0;
  private timeListeners: Set<TimeUpdateListener> = new Set();
  private stateListeners: Set<PlaybackStateListener> = new Set();
  private volume: number = 1.0;
  private isMuted: boolean = false;
  private playbackRate: number = 1.0;

  constructor(sequence: Sequence) {
    this.sequence = sequence;
  }

  public setSequence(sequence: Sequence): void {
    this.sequence = sequence;
    if (compareRationalTime(this.currentTime, this.sequence.duration) > 0) {
      this.seek(createRationalTime(0));
    }
  }

  public getCurrentTime(): RationalTime {
    return this.currentTime;
  }

  public getState(): PlaybackState {
    return this.state;
  }

  public isPlaying(): boolean {
    return this.state === 'playing';
  }

  public getIsPlaying(): boolean {
    return this.state === 'playing';
  }

  public getPlaybackRate(): number {
    return this.playbackRate;
  }

  public setPlaybackRate(rate: number): void {
    this.playbackRate = rate;
  }

  public play(): void {
    if (this.state === 'playing') return;

    // If at end of sequence, loop back to start
    if (
      this.sequence.duration.value > 0n &&
      compareRationalTime(this.currentTime, this.sequence.duration) >= 0
    ) {
      this.currentTime = createRationalTime(0);
    }

    this.state = 'playing';
    this.lastPerfTime = performance.now();
    this.startLoop();
    this.notifyState();
    logger.info('PlaybackEngine', 'Playback started');
  }

  public pause(): void {
    if (this.state === 'paused') return;
    this.state = 'paused';
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.notifyState();
    logger.info('PlaybackEngine', 'Playback paused', { time: rationalTimeToSeconds(this.currentTime) });
  }

  public togglePlayPause(): void {
    if (this.isPlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }

  public togglePlay(): void {
    this.togglePlayPause();
  }

  public subscribe(listener: (time: RationalTime, isPlaying: boolean) => void): () => void {
    const timeUnsub = this.onTimeUpdate((time) => {
      listener(time, this.isPlaying());
    });
    const stateUnsub = this.onStateChange((state) => {
      listener(this.currentTime, state === 'playing');
    });

    return () => {
      timeUnsub();
      stateUnsub();
    };
  }

  public seek(time: RationalTime): void {
    let clampedTime = time;
    if (clampedTime.value < 0n) {
      clampedTime = createRationalTime(0);
    }
    if (this.sequence.duration.value > 0n && compareRationalTime(clampedTime, this.sequence.duration) > 0) {
      clampedTime = this.sequence.duration;
    }

    this.currentTime = clampedTime;
    this.notifyTime();
  }

  public seekSeconds(seconds: number): void {
    this.seek(secondsToRationalTime(seconds));
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.isMuted ? 0 : this.volume;
  }

  public toggleMute(): void {
    this.isMuted = !this.isMuted;
  }

  public isMute(): boolean {
    return this.isMuted;
  }

  private startLoop(): void {
    const loop = (now: number) => {
      if (this.state !== 'playing') return;

      const deltaMs = now - this.lastPerfTime;
      this.lastPerfTime = now;
      const deltaSeconds = (deltaMs / 1000) * this.playbackRate;

      const deltaRational = secondsToRationalTime(deltaSeconds);
      const nextTime = addRationalTime(this.currentTime, deltaRational);

      // Check if reached sequence duration
      if (
        this.sequence.duration.value > 0n &&
        compareRationalTime(nextTime, this.sequence.duration) >= 0
      ) {
        this.currentTime = this.sequence.duration;
        this.notifyTime();
        this.pause();
        return;
      }

      this.currentTime = nextTime;
      this.notifyTime();
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public onTimeUpdate(listener: TimeUpdateListener): () => void {
    this.timeListeners.add(listener);
    return () => this.timeListeners.delete(listener);
  }

  public onStateChange(listener: PlaybackStateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private notifyTime(): void {
    this.timeListeners.forEach((l) => l(this.currentTime));
  }

  private notifyState(): void {
    this.stateListeners.forEach((l) => l(this.state));
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.timeListeners.clear();
    this.stateListeners.clear();
  }
}
