/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project } from '../../domain/project/Project';
import { TimelineEngine } from '../../engine/timeline/TimelineEngine';
import { CanvasCompositor } from '../compositor/CanvasCompositor';
import { CanvasVideoExporter, ExportSettings } from './CanvasVideoExporter';
import { TaskManager } from '../../engine/tasks/TaskManager';

export type ExportFormatPreset = 'mp4_h264' | 'webm_vp9' | 'mov_prores' | 'audio_wav';
export type ExportStage = 'idle' | 'decoding' | 'effects' | 'compositing' | 'color' | 'audio' | 'muxing' | 'completed' | 'failed';

export interface RenderJob {
  id: string;
  name: string;
  preset: ExportFormatPreset;
  resolution: { width: number; height: number };
  fps: number;
  quality: 'draft' | 'high' | 'ultra_4k' | 'prores';
  bitrateMbps: number;
  useProxies: boolean;
  status: 'queued' | 'rendering' | 'completed' | 'failed' | 'cancelled';
  currentStage: ExportStage;
  currentFrame: number;
  totalFrames: number;
  progress: number; // 0.0 to 1.0
  renderFps: number;
  estimatedRemainingSec: number;
  error?: string;
  outputBlob?: Blob;
  outputUrl?: string;
  createdAt: number;
  completedAt?: number;
}

export class RenderQueueManager {
  private static instance: RenderQueueManager;
  private jobs: RenderJob[] = [];
  private listeners: Set<() => void> = new Set();
  private isProcessing = false;
  private activeExporter: CanvasVideoExporter | null = null;

  private constructor() {}

  public static getInstance(): RenderQueueManager {
    if (!RenderQueueManager.instance) {
      RenderQueueManager.instance = new RenderQueueManager();
    }
    return RenderQueueManager.instance;
  }

  public addJob(
    name: string,
    preset: ExportFormatPreset,
    width: number,
    height: number,
    fps: number,
    bitrateMbps = 12,
    useProxies = false
  ): RenderJob {
    const job: RenderJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      preset,
      resolution: { width, height },
      fps,
      quality: width >= 3840 ? 'ultra_4k' : 'high',
      bitrateMbps,
      useProxies,
      status: 'queued',
      currentStage: 'idle',
      currentFrame: 0,
      totalFrames: 0,
      progress: 0,
      renderFps: 0,
      estimatedRemainingSec: 0,
      createdAt: Date.now(),
    };

    this.jobs.push(job);
    this.notify();
    return job;
  }

  public getJobs(): RenderJob[] {
    return this.jobs;
  }

  public cancelJob(jobId: string): void {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return;
    if (job.status === 'rendering') {
      this.activeExporter?.cancel();
    }
    job.status = 'cancelled';
    job.currentStage = 'failed';
    this.notify();
  }

  public retryJob(jobId: string): void {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return;
    job.status = 'queued';
    job.currentStage = 'idle';
    job.progress = 0;
    job.error = undefined;
    this.notify();
  }

  public deleteJob(jobId: string): void {
    this.jobs = this.jobs.filter((j) => j.id !== jobId);
    this.notify();
  }

  /**
   * Executes the render queue sequentially using TimelineEngine and CanvasCompositor.
   */
  public async processQueue(
    project: Project,
    timelineEngine: TimelineEngine,
    compositor: CanvasCompositor
  ): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const queued = this.jobs.filter((j) => j.status === 'queued');
    for (const job of queued) {
      job.status = 'rendering';
      job.currentStage = 'decoding';
      this.notify();

      const startTime = Date.now();
      this.activeExporter = new CanvasVideoExporter(timelineEngine, compositor);

      const mimeType = job.preset === 'webm_vp9' ? 'video/webm;codecs=vp9' : 'video/mp4';

      const exportSettings: ExportSettings = {
        width: job.resolution.width,
        height: job.resolution.height,
        fps: job.fps,
        format: mimeType as any,
        filename: `${job.name}.mp4`,
      };

      try {
        job.currentStage = 'effects';
        this.notify();

        const task = TaskManager.getInstance().addTask(
          `Render Export: ${job.name}`,
          'export_render',
          'high'
        );

        const blob = await this.activeExporter.exportVideo(
          project,
          exportSettings,
          (prog, statusText) => {
            job.progress = prog;
            const elapsedSec = (Date.now() - startTime) / 1000;
            if (prog > 0 && elapsedSec > 0) {
              const totalSec = elapsedSec / prog;
              job.estimatedRemainingSec = Math.max(0, Math.round(totalSec - elapsedSec));
              job.renderFps = Math.round((job.fps * prog * 60) / Math.max(1, elapsedSec));
            }

            // Update stages realistically
            if (prog < 0.2) job.currentStage = 'decoding';
            else if (prog < 0.5) job.currentStage = 'effects';
            else if (prog < 0.75) job.currentStage = 'color';
            else if (prog < 0.9) job.currentStage = 'compositing';
            else job.currentStage = 'muxing';

            TaskManager.getInstance().updateProgress(task.id, prog, statusText);
            this.notify();
          }
        );

        job.status = 'completed';
        job.currentStage = 'completed';
        job.progress = 1.0;
        job.outputBlob = blob;
        job.outputUrl = URL.createObjectURL(blob);
        job.completedAt = Date.now();
      } catch (err: any) {
        if ((job.status as string) !== 'cancelled') {
          job.status = 'failed';
          job.currentStage = 'failed';
          job.error = err?.message || 'Rendering failed';
        }
      } finally {
        this.activeExporter = null;
        this.notify();
      }
    }

    this.isProcessing = false;
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }
}
