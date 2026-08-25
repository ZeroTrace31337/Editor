/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project, createNewProject } from '../../domain/project/Project';
import { logger } from '../../core/logging/Logger';
import { LuminaError, ErrorCode } from '../../core/errors/AppErrors';

const AUTOSAVE_KEY = 'lumina_autosave_project';
const PROJECTS_INDEX_KEY = 'lumina_saved_projects_list';

export class ProjectService {
  private currentProject: Project;
  private listeners: Set<() => void> = new Set();
  private autosaveTimer: number | null = null;

  constructor() {
    this.currentProject = createNewProject();
    this.initAutosave();
  }

  public getProject(): Project {
    return this.currentProject;
  }

  public setProject(project: Project): void {
    this.validateProject(project);
    this.currentProject = project;
    this.notify();
    this.triggerAutosave();
    logger.info('ProjectService', `Active project set to: ${project.metadata.name}`, { id: project.metadata.id });
  }

  public createProject(name = 'Untitled Project'): Project {
    const project = createNewProject(name);
    this.setProject(project);
    return project;
  }

  public serialize(project: Project = this.currentProject): string {
    // Custom JSON replacer for BigInt serialization
    return JSON.stringify(project, (_key, value) => {
      if (typeof value === 'bigint') {
        return { __bigint: value.toString() };
      }
      return value;
    }, 2);
  }

  public deserialize(jsonString: string): Project {
    try {
      const parsed = JSON.parse(jsonString, (_key, value) => {
        if (value && typeof value === 'object' && value.__bigint !== undefined) {
          return BigInt(value.__bigint);
        }
        return value;
      });

      this.validateProject(parsed);
      return parsed as Project;
    } catch (err: any) {
      logger.error('ProjectService', 'Failed to deserialize project JSON', { error: err.message });
      throw new LuminaError(
        ErrorCode.CORRUPT_PROJECT,
        `Corrupt project JSON: ${err.message}`,
        'Unable to open this project file. The file appears to be corrupted or invalid.'
      );
    }
  }

  public validateProject(project: any): void {
    if (!project || typeof project !== 'object') {
      throw new LuminaError(ErrorCode.CORRUPT_PROJECT, 'Project is not a valid object', 'Invalid project data');
    }
    if (!project.metadata || !project.metadata.id) {
      throw new LuminaError(ErrorCode.CORRUPT_PROJECT, 'Missing project metadata ID', 'Invalid project metadata');
    }
    if (!Array.isArray(project.sequences) || project.sequences.length === 0) {
      throw new LuminaError(ErrorCode.CORRUPT_PROJECT, 'Project has no sequences', 'Invalid project sequences');
    }
  }

  public saveToLocalStorage(): void {
    try {
      this.currentProject.metadata.modifiedAt = new Date().toISOString();
      const serialized = this.serialize(this.currentProject);
      localStorage.setItem(`lumina_project_${this.currentProject.metadata.id}`, serialized);
      
      // Update index
      const indexStr = localStorage.getItem(PROJECTS_INDEX_KEY);
      const index: { id: string; name: string; modifiedAt: string }[] = indexStr ? JSON.parse(indexStr) : [];
      const existingIdx = index.findIndex((item) => item.id === this.currentProject.metadata.id);
      const entry = {
        id: this.currentProject.metadata.id,
        name: this.currentProject.metadata.name,
        modifiedAt: this.currentProject.metadata.modifiedAt,
      };

      if (existingIdx >= 0) {
        index[existingIdx] = entry;
      } else {
        index.unshift(entry);
      }
      localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(index.slice(0, 20)));

      logger.info('ProjectService', `Saved project to storage: ${this.currentProject.metadata.name}`);
    } catch (err) {
      console.error('Failed to save project to localStorage', err);
    }
  }

  public loadFromLocalStorage(projectId: string): Project | null {
    const raw = localStorage.getItem(`lumina_project_${projectId}`);
    if (!raw) return null;
    const project = this.deserialize(raw);
    this.setProject(project);
    return project;
  }

  public getSavedProjectsList(): { id: string; name: string; modifiedAt: string }[] {
    try {
      const indexStr = localStorage.getItem(PROJECTS_INDEX_KEY);
      return indexStr ? JSON.parse(indexStr) : [];
    } catch {
      return [];
    }
  }

  public exportProjectFile(): void {
    const serialized = this.serialize(this.currentProject);
    const blob = new Blob([serialized], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentProject.metadata.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.lumina.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logger.info('ProjectService', `Exported project file for: ${this.currentProject.metadata.name}`);
  }

  public async importProjectFile(file: File): Promise<Project> {
    const text = await file.text();
    const project = this.deserialize(text);
    this.setProject(project);
    return project;
  }

  private initAutosave(): void {
    // Check for autosave recovery
    const autosaved = localStorage.getItem(AUTOSAVE_KEY);
    if (autosaved) {
      try {
        const recovered = this.deserialize(autosaved);
        logger.info('ProjectService', `Found autosave recovery project: ${recovered.metadata.name}`);
      } catch {}
    }

    // Periodic autosave every 30 seconds
    setInterval(() => {
      this.triggerAutosave();
    }, 30000);
  }

  public triggerAutosave(): void {
    try {
      const serialized = this.serialize(this.currentProject);
      localStorage.setItem(AUTOSAVE_KEY, serialized);
    } catch {}
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}
