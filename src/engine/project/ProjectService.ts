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

  public static serialize(project: Project): string {
    // Custom JSON replacer for BigInt serialization
    return JSON.stringify(project, (_key, value) => {
      if (typeof value === 'bigint') {
        return { __bigint: value.toString() };
      }
      return value;
    }, 2);
  }

  public serialize(project: Project = this.currentProject): string {
    return ProjectService.serialize(project);
  }

  public static deserialize(jsonString: string): Project {
    try {
      const parsed = JSON.parse(jsonString, (_key, value) => {
        if (value && typeof value === 'object' && value.__bigint !== undefined) {
          return BigInt(value.__bigint);
        }
        return value;
      });

      ProjectService.validateProject(parsed);
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

  public deserialize(jsonString: string): Project {
    return ProjectService.deserialize(jsonString);
  }

  public static validateProject(project: any): void {
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

  public validateProject(project: any): void {
    ProjectService.validateProject(project);
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

  public deleteProject(projectId: string): boolean {
    try {
      localStorage.removeItem(`lumina_project_${projectId}`);
      const indexStr = localStorage.getItem(PROJECTS_INDEX_KEY);
      if (indexStr) {
        const index: { id: string; name: string; modifiedAt: string }[] = JSON.parse(indexStr);
        const filtered = index.filter((item) => item.id !== projectId);
        localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(filtered));
      }
      // Also notify backend in background
      fetch(`/api/projects/${projectId}`, { method: 'DELETE' }).catch(() => {});
      logger.info('ProjectService', `Deleted project: ${projectId}`);
      return true;
    } catch (err) {
      console.error('Failed to delete project', err);
      return false;
    }
  }

  public duplicateProject(projectId: string): Project | null {
    try {
      const raw = localStorage.getItem(`lumina_project_${projectId}`);
      let sourceProject: Project;
      if (raw) {
        sourceProject = this.deserialize(raw);
      } else if (this.currentProject.metadata.id === projectId) {
        sourceProject = this.currentProject;
      } else {
        return null;
      }

      const newId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const cloned: Project = {
        ...JSON.parse(JSON.stringify(sourceProject, (_key, val) => {
          if (typeof val === 'bigint') return { __bigint: val.toString() };
          return val;
        }), (_key, val) => {
          if (val && typeof val === 'object' && val.__bigint !== undefined) {
            return BigInt(val.__bigint);
          }
          return val;
        }),
        metadata: {
          ...sourceProject.metadata,
          id: newId,
          name: `${sourceProject.metadata.name} (Copy)`,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
        },
      };

      const serialized = this.serialize(cloned);
      localStorage.setItem(`lumina_project_${newId}`, serialized);

      // Update index
      const indexStr = localStorage.getItem(PROJECTS_INDEX_KEY);
      const index: { id: string; name: string; modifiedAt: string }[] = indexStr ? JSON.parse(indexStr) : [];
      index.unshift({
        id: newId,
        name: cloned.metadata.name,
        modifiedAt: cloned.metadata.modifiedAt,
      });
      localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(index.slice(0, 30)));

      // Sync with backend
      fetch(`/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newId,
          name: cloned.metadata.name,
          duration: '00:30',
          aspectRatio: '16:9',
          resolution: '1080p',
          fps: 60,
          clipsCount: cloned.sequences[0]?.tracks.reduce((acc, t) => acc + t.clips.length, 0) || 1,
          sizeMb: 12.4,
          thumbnailUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=600&auto=format&fit=crop&q=80',
        }),
      }).catch(() => {});

      logger.info('ProjectService', `Duplicated project: ${newId}`);
      return cloned;
    } catch (err) {
      console.error('Failed to duplicate project', err);
      return null;
    }
  }

  public renameProject(projectId: string, newName: string): boolean {
    try {
      if (this.currentProject.metadata.id === projectId) {
        this.currentProject.metadata.name = newName;
        this.currentProject.metadata.modifiedAt = new Date().toISOString();
        this.saveToLocalStorage();
        this.notify();
      } else {
        const raw = localStorage.getItem(`lumina_project_${projectId}`);
        if (raw) {
          const project = this.deserialize(raw);
          project.metadata.name = newName;
          project.metadata.modifiedAt = new Date().toISOString();
          localStorage.setItem(`lumina_project_${projectId}`, this.serialize(project));
        }
      }

      // Update index
      const indexStr = localStorage.getItem(PROJECTS_INDEX_KEY);
      if (indexStr) {
        const index: { id: string; name: string; modifiedAt: string }[] = JSON.parse(indexStr);
        const item = index.find((p) => p.id === projectId);
        if (item) {
          item.name = newName;
          item.modifiedAt = new Date().toISOString();
          localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(index));
        }
      }

      // Sync with backend
      fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      }).catch(() => {});

      logger.info('ProjectService', `Renamed project ${projectId} to ${newName}`);
      return true;
    } catch (err) {
      console.error('Failed to rename project', err);
      return false;
    }
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
    if (typeof localStorage === 'undefined') return;

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
    if (typeof localStorage === 'undefined') return;
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
