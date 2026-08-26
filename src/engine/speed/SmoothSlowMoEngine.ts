/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimelineClip, VideoClip } from '../../domain/timeline/Clip';
import { MediaRegistry } from '../media/MediaRegistry';
import {
  SlowMotionSettings,
  SlowMotionMode,
  SlowMotionQuality,
  SlowMotionMethod,
  createDefaultSlowMotionSettings,
} from './SpeedTypes';
import { OpticalFlowInterpolator, MotionVectorField } from './OpticalFlowInterpolator';
import { rationalTimeToSeconds, secondsToRationalTime, createRationalTime } from '../../core/time/RationalTime';
import { logger } from '../../core/logging/Logger';

export interface ProcessingProgress {
  clipId: string;
  progress: number; // 0.0 to 1.0
  currentFrame: number;
  totalFrames: number;
  status: 'idle' | 'analyzing' | 'synthesizing' | 'completed' | 'cancelled' | 'error';
  errorMessage?: string;
}

export type ProcessingProgressListener = (progress: ProcessingProgress) => void;

export class SmoothSlowMoEngine {
  private static instance: SmoothSlowMoEngine;
  private interpolator = OpticalFlowInterpolator.getInstance();
  private listeners: Set<() => void> = new Set();
  private progressListeners: Map<string, Set<ProcessingProgressListener>> = new Map();
  private activeAbortControllers: Map<string, AbortController> = new Map();

  // In-memory cache for rendered / synthesized slow-motion frames
  // key: `${clipId}_${sourceSec.toFixed(3)}_${quality}_${mode}`
  private frameCache: Map<string, ImageData> = new Map();
  private opticalFlowCache: Map<string, MotionVectorField> = new Map();

  // Shared offscreen processing canvases
  private sampleCanvasA: HTMLCanvasElement;
  private sampleCtxA: CanvasRenderingContext2D | null;
  private sampleCanvasB: HTMLCanvasElement;
  private sampleCtxB: CanvasRenderingContext2D | null;
  private synthCanvas: HTMLCanvasElement;
  private synthCtx: CanvasRenderingContext2D | null;

  private constructor() {
    this.sampleCanvasA = document.createElement('canvas');
    this.sampleCtxA = this.sampleCanvasA.getContext('2d', { willReadFrequently: true });
    this.sampleCanvasB = document.createElement('canvas');
    this.sampleCtxB = this.sampleCanvasB.getContext('2d', { willReadFrequently: true });
    this.synthCanvas = document.createElement('canvas');
    this.synthCtx = this.synthCanvas.getContext('2d', { willReadFrequently: true });
  }

  public static getInstance(): SmoothSlowMoEngine {
    if (!SmoothSlowMoEngine.instance) {
      SmoothSlowMoEngine.instance = new SmoothSlowMoEngine();
    }
    return SmoothSlowMoEngine.instance;
  }

  public getSlowMotionSettings(clip: TimelineClip): SlowMotionSettings {
    if (clip.speedSettings?.slowMotion) {
      return clip.speedSettings.slowMotion;
    }
    return createDefaultSlowMotionSettings();
  }

  public updateSlowMotionSettings(
    clip: TimelineClip,
    updates: Partial<SlowMotionSettings>
  ): SlowMotionSettings {
    if (!clip.speedSettings) {
      clip.speedSettings = {
        clipId: clip.id,
        activeTab: 'smooth_slow_mo',
        baseSpeed: updates.speed ?? 0.5,
        reverse: false,
        preservePitch: updates.preservePitch ?? true,
        opticalFlow: true,
        frameBlending: false,
        curvePreset: 'Standard',
        rampPoints: [],
        motionBlur: {
          enabled: updates.motionBlur ?? false,
          blurAmount: 50,
          shutterAngle: updates.shutterAngle ?? 180,
          direction: 'speed_auto',
        },
        slowMotion: {
          ...createDefaultSlowMotionSettings(),
          ...updates,
        },
      };
    } else {
      clip.speedSettings.slowMotion = {
        ...clip.speedSettings.slowMotion,
        ...updates,
      };
      if (updates.speed !== undefined) {
        clip.speedSettings.baseSpeed = updates.speed;
        clip.speed = updates.speed;
      }
      if (updates.preservePitch !== undefined) {
        clip.speedSettings.preservePitch = updates.preservePitch;
      }
      if (updates.motionBlur !== undefined) {
        clip.speedSettings.motionBlur.enabled = updates.motionBlur;
      }
      if (updates.shutterAngle !== undefined) {
        clip.speedSettings.motionBlur.shutterAngle = updates.shutterAngle;
      }
    }

    // Invalidate cached frames when settings change
    this.clearClipCache(clip.id);
    this.notify();
    return clip.speedSettings.slowMotion;
  }

  /**
   * Evaluates and synthesizes a smooth slow-motion frame for video rendering.
   * If mode is 'original', standard frame is returned.
   */
  public getInterpolatedFrame(
    videoElement: HTMLVideoElement,
    clip: TimelineClip,
    sourceSeconds: number,
    renderWidth: number,
    renderHeight: number
  ): HTMLCanvasElement | HTMLVideoElement {
    const settings = this.getSlowMotionSettings(clip);

    // If Original mode or speed >= 1.0 without slow mo, return source video
    if (settings.mode === 'original' || (clip.speed >= 1.0 && !clip.speedSettings?.opticalFlow)) {
      return videoElement;
    }

    const nativeFps = 30.0;
    const nativeFrameDuration = 1.0 / nativeFps;

    // Determine the two adjacent source frames
    const frameIndexA = Math.floor(sourceSeconds / nativeFrameDuration);
    const timeA = frameIndexA * nativeFrameDuration;
    const timeB = timeA + nativeFrameDuration;
    const subFrameT = (sourceSeconds - timeA) / nativeFrameDuration;

    // If exactly at a native frame boundary or subFrameT is tiny, return direct
    if (subFrameT <= 0.05) {
      return videoElement;
    }

    const cacheKey = `${clip.id}_${timeA.toFixed(3)}_${subFrameT.toFixed(2)}_${settings.quality}_${settings.mode}`;
    const cached = this.frameCache.get(cacheKey);

    const procWidth = Math.min(renderWidth, settings.quality === 'ultra' ? 960 : settings.quality === 'high' ? 640 : 480);
    const procHeight = Math.min(renderHeight, Math.round((procWidth * renderHeight) / (renderWidth || 1)));

    if (this.synthCanvas.width !== procWidth || this.synthCanvas.height !== procHeight) {
      this.synthCanvas.width = procWidth;
      this.synthCanvas.height = procHeight;
      this.sampleCanvasA.width = procWidth;
      this.sampleCanvasA.height = procHeight;
      this.sampleCanvasB.width = procWidth;
      this.sampleCanvasB.height = procHeight;
    }

    if (cached && this.synthCtx) {
      this.synthCtx.putImageData(cached, 0, 0);
      return this.synthCanvas;
    }

    if (!this.sampleCtxA || !this.sampleCtxB || !this.synthCtx) {
      return videoElement;
    }

    try {
      // Sample Frame A
      this.sampleCtxA.drawImage(videoElement, 0, 0, procWidth, procHeight);
      const imgDataA = this.sampleCtxA.getImageData(0, 0, procWidth, procHeight);

      // In real-time video playback, we synthesize using Frame A + slight temporal offset or optical flow
      // Calculate optical flow motion vector field
      const flowKey = `${clip.id}_${timeA.toFixed(3)}_${procWidth}x${procHeight}`;
      let flow = this.opticalFlowCache.get(flowKey);

      if (!flow) {
        // Fast temporal estimation
        this.sampleCtxB.drawImage(videoElement, 0, 0, procWidth, procHeight);
        const imgDataB = this.sampleCtxB.getImageData(0, 0, procWidth, procHeight);

        flow = this.interpolator.computeOpticalFlow(
          imgDataA,
          imgDataB,
          settings.quality,
          settings.method,
          settings.motionSmoothing
        );
        this.opticalFlowCache.set(flowKey, flow);
      }

      const outImageData = this.synthCtx.createImageData(procWidth, procHeight);

      this.interpolator.synthesizeInterpolatedFrame(
        imgDataA,
        imgDataA, // in live playback, flow warps frame A forward
        flow,
        subFrameT,
        outImageData,
        settings.method,
        settings.motionBlur,
        settings.shutterAngle
      );

      this.synthCtx.putImageData(outImageData, 0, 0);

      // Cache up to 120 frames to conserve memory
      if (this.frameCache.size > 120) {
        const firstKey = this.frameCache.keys().next().value;
        if (firstKey) this.frameCache.delete(firstKey);
      }
      this.frameCache.set(cacheKey, outImageData);

      return this.synthCanvas;
    } catch {
      return videoElement;
    }
  }

  /**
   * Pre-renders / processes full optical flow slow motion for a video clip.
   * Can be previewed and executed in the background without blocking the UI.
   */
  public async processSmoothSlowMotion(
    clip: TimelineClip,
    mediaRegistry: MediaRegistry,
    onProgress?: ProcessingProgressListener
  ): Promise<boolean> {
    const videoClip = clip as VideoClip;
    const asset = mediaRegistry.getAsset(videoClip.mediaAssetId);
    if (!asset || !asset.uri) {
      throw new Error('Media asset not found for slow motion processing');
    }

    // Cancel any previous job on this clip
    this.cancelProcessing(clip.id);

    const abortCtrl = new AbortController();
    this.activeAbortControllers.set(clip.id, abortCtrl);

    const settings = this.getSlowMotionSettings(clip);
    const speed = settings.speed || 0.5;
    const sourceDurationSec = rationalTimeToSeconds(clip.sourceRange.duration);
    const outputDurationSec = sourceDurationSec / speed;
    const outputFps = 30;
    const totalFrames = Math.ceil(outputDurationSec * outputFps);

    logger.info('SmoothSlowMoEngine', `Starting smooth slow-mo processing: ${totalFrames} frames at ${speed}x speed`);

    const notifyProg = (prog: ProcessingProgress) => {
      onProgress?.(prog);
      const set = this.progressListeners.get(clip.id);
      if (set) {
        set.forEach((cb) => cb(prog));
      }
    };

    notifyProg({
      clipId: clip.id,
      progress: 0,
      currentFrame: 0,
      totalFrames,
      status: 'analyzing',
    });

    try {
      const hiddenVideo = document.createElement('video');
      hiddenVideo.crossOrigin = 'anonymous';
      hiddenVideo.src = asset.uri;
      hiddenVideo.muted = true;

      await new Promise<void>((res, reject) => {
        hiddenVideo.onloadedmetadata = () => res();
        hiddenVideo.onerror = (e) => reject(new Error('Failed to load video element for slow-mo processing'));
      });

      const procWidth = settings.quality === 'ultra' ? 1280 : settings.quality === 'high' ? 854 : 640;
      const procHeight = Math.round((procWidth * (hiddenVideo.videoHeight || 720)) / (hiddenVideo.videoWidth || 1280));

      const offCanvasA = document.createElement('canvas');
      offCanvasA.width = procWidth;
      offCanvasA.height = procHeight;
      const offCtxA = offCanvasA.getContext('2d', { willReadFrequently: true });

      const offCanvasB = document.createElement('canvas');
      offCanvasB.width = procWidth;
      offCanvasB.height = procHeight;
      const offCtxB = offCanvasB.getContext('2d', { willReadFrequently: true });

      const synthCanvas = document.createElement('canvas');
      synthCanvas.width = procWidth;
      synthCanvas.height = procHeight;
      const synthCtx = synthCanvas.getContext('2d', { willReadFrequently: true });

      if (!offCtxA || !offCtxB || !synthCtx) {
        throw new Error('Could not create processing canvas contexts');
      }

      const nativeFrameDuration = 1.0 / 30.0;
      const sourceStartSec = rationalTimeToSeconds(clip.sourceRange.start);

      for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
        if (abortCtrl.signal.aborted) {
          notifyProg({
            clipId: clip.id,
            progress: frameIdx / totalFrames,
            currentFrame: frameIdx,
            totalFrames,
            status: 'cancelled',
          });
          return false;
        }

        const outTimeSec = frameIdx / outputFps;
        const srcTimeSec = sourceStartSec + outTimeSec * speed;

        const frameIdxA = Math.floor(srcTimeSec / nativeFrameDuration);
        const timeA = frameIdxA * nativeFrameDuration;
        const timeB = timeA + nativeFrameDuration;
        const subFrameT = Math.max(0, Math.min(1, (srcTimeSec - timeA) / nativeFrameDuration));

        // Seek video to frame A
        hiddenVideo.currentTime = Math.min(hiddenVideo.duration, timeA);
        await new Promise((r) => setTimeout(r, 10));

        offCtxA.drawImage(hiddenVideo, 0, 0, procWidth, procHeight);
        const imgA = offCtxA.getImageData(0, 0, procWidth, procHeight);

        // Seek video to frame B
        hiddenVideo.currentTime = Math.min(hiddenVideo.duration, timeB);
        await new Promise((r) => setTimeout(r, 10));

        offCtxB.drawImage(hiddenVideo, 0, 0, procWidth, procHeight);
        const imgB = offCtxB.getImageData(0, 0, procWidth, procHeight);

        // Compute optical flow field
        const flow = this.interpolator.computeOpticalFlow(
          imgA,
          imgB,
          settings.quality,
          settings.method,
          settings.motionSmoothing
        );

        // Synthesize target frame
        const synthesized = synthCtx.createImageData(procWidth, procHeight);
        this.interpolator.synthesizeInterpolatedFrame(
          imgA,
          imgB,
          flow,
          subFrameT,
          synthesized,
          settings.method,
          settings.motionBlur,
          settings.shutterAngle
        );

        const cacheKey = `${clip.id}_${timeA.toFixed(3)}_${subFrameT.toFixed(2)}_${settings.quality}_${settings.mode}`;
        this.frameCache.set(cacheKey, synthesized);

        const progressVal = (frameIdx + 1) / totalFrames;
        notifyProg({
          clipId: clip.id,
          progress: progressVal,
          currentFrame: frameIdx + 1,
          totalFrames,
          status: 'synthesizing',
        });

        // Yield to browser UI thread
        if (frameIdx % 5 === 0) {
          await new Promise((r) => setTimeout(r, 8));
        }
      }

      this.updateSlowMotionSettings(clip, { isProcessed: true, processedAt: Date.now() });

      notifyProg({
        clipId: clip.id,
        progress: 1.0,
        currentFrame: totalFrames,
        totalFrames,
        status: 'completed',
      });

      this.activeAbortControllers.delete(clip.id);
      logger.info('SmoothSlowMoEngine', 'Smooth slow-mo processing completed successfully');
      return true;
    } catch (err: any) {
      logger.error('SmoothSlowMoEngine', 'Error during slow motion processing', { error: err });
      notifyProg({
        clipId: clip.id,
        progress: 0,
        currentFrame: 0,
        totalFrames,
        status: 'error',
        errorMessage: err?.message || 'Processing failed',
      });
      this.activeAbortControllers.delete(clip.id);
      return false;
    }
  }

  public cancelProcessing(clipId: string): void {
    const ctrl = this.activeAbortControllers.get(clipId);
    if (ctrl) {
      ctrl.abort();
      this.activeAbortControllers.delete(clipId);
    }
  }

  public isProcessing(clipId: string): boolean {
    return this.activeAbortControllers.has(clipId);
  }

  public clearClipCache(clipId: string): void {
    const keysToDelete: string[] = [];
    for (const k of this.frameCache.keys()) {
      if (k.startsWith(clipId)) keysToDelete.push(k);
    }
    keysToDelete.forEach((k) => this.frameCache.delete(k));

    const flowKeysToDelete: string[] = [];
    for (const k of this.opticalFlowCache.keys()) {
      if (k.startsWith(clipId)) flowKeysToDelete.push(k);
    }
    flowKeysToDelete.forEach((k) => this.opticalFlowCache.delete(k));
  }

  public onProgress(clipId: string, listener: ProcessingProgressListener): () => void {
    let set = this.progressListeners.get(clipId);
    if (!set) {
      set = new Set();
      this.progressListeners.set(clipId, set);
    }
    set.add(listener);
    return () => set?.delete(listener);
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }
}
