/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TaskType = 'proxy_generation' | 'motion_tracking' | 'waveform_analysis' | 'cache_generation' | 'export_render';
export type TaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type TaskPriority = 'high' | 'normal' | 'background';

export interface BackgroundTask {
  id: string;
  name: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number; // 0.0 to 1.0
  message: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  action?: () => Promise<void>;
  cancelHandler?: () => void;
}

export class TaskManager {
  private static instance: TaskManager;
  private tasks: Map<string, BackgroundTask> = new Map();
  private listeners: Set<() => void> = new Set();
  private maxConcurrentTasks = 3;
  private isProcessing = false;

  private constructor() {}

  public static getInstance(): TaskManager {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager();
    }
    return TaskManager.instance;
  }

  public addTask(
    name: string,
    type: TaskType,
    priority: TaskPriority = 'normal',
    action?: () => Promise<void>,
    cancelHandler?: () => void
  ): BackgroundTask {
    const task: BackgroundTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      type,
      priority,
      status: 'pending',
      progress: 0,
      message: 'Queued',
      createdAt: Date.now(),
      action,
      cancelHandler,
    };

    this.tasks.set(task.id, task);
    this.notify();
    this.processQueue();
    return task;
  }

  public updateProgress(taskId: string, progress: number, message?: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.progress = Math.min(1.0, Math.max(0.0, progress));
    if (message) task.message = message;
    if (task.progress >= 1.0) {
      task.status = 'completed';
      task.completedAt = Date.now();
    }
    this.notify();
  }

  public cancelTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.status = 'cancelled';
    task.message = 'Cancelled by user';
    task.cancelHandler?.();
    this.notify();
    this.processQueue();
  }

  public retryTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task || !task.action) return;
    task.status = 'pending';
    task.progress = 0;
    task.message = 'Retrying...';
    task.error = undefined;
    this.notify();
    this.processQueue();
  }

  public getTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getActiveTaskCount(): number {
    return Array.from(this.tasks.values()).filter((t) => t.status === 'running' || t.status === 'pending').length;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const running = Array.from(this.tasks.values()).filter((t) => t.status === 'running');
    if (running.length >= this.maxConcurrentTasks) {
      this.isProcessing = false;
      return;
    }

    // Get next pending task by priority
    const priorityWeights: Record<TaskPriority, number> = { high: 3, normal: 2, background: 1 };
    const pending = Array.from(this.tasks.values())
      .filter((t) => t.status === 'pending')
      .sort((a, b) => priorityWeights[b.priority] - priorityWeights[a.priority]);

    if (pending.length > 0) {
      const nextTask = pending[0];
      nextTask.status = 'running';
      nextTask.startedAt = Date.now();
      nextTask.message = 'Processing...';
      this.notify();

      if (nextTask.action) {
        try {
          await nextTask.action();
          nextTask.status = 'completed';
          nextTask.progress = 1.0;
          nextTask.message = 'Done';
          nextTask.completedAt = Date.now();
        } catch (e: any) {
          nextTask.status = 'failed';
          nextTask.error = e?.message || 'Task failed';
          nextTask.message = `Failed: ${nextTask.error}`;
        }
      }
      this.notify();
    }

    this.isProcessing = false;
    // Check if more tasks can be scheduled
    const remainingPending = Array.from(this.tasks.values()).filter((t) => t.status === 'pending');
    if (remainingPending.length > 0) {
      this.processQueue();
    }
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }
}
