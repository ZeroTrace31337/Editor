/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from './Command';
import { logger } from '../../core/logging/Logger';

export type HistoryChangeListener = () => void;

export class CommandManager {
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  private maxHistory: number = 50;
  private listeners: Set<HistoryChangeListener> = new Set();

  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory;
  }

  public async execute(command: ICommand): Promise<void> {
    try {
      await command.execute();
      this.undoStack.push(command);
      this.redoStack = []; // Clear redo stack on new action
      if (this.undoStack.length > this.maxHistory) {
        this.undoStack.shift();
      }
      logger.info('CommandManager', `Executed command: ${command.name}`, { id: command.id });
      this.notifyListeners();
    } catch (err: any) {
      logger.error('CommandManager', `Command execution failed: ${command.name}`, { error: err.message });
      throw err;
    }
  }

  public async undo(): Promise<void> {
    if (!this.canUndo()) return;
    const command = this.undoStack.pop()!;
    try {
      await command.undo();
      this.redoStack.push(command);
      logger.info('CommandManager', `Undid command: ${command.name}`, { id: command.id });
      this.notifyListeners();
    } catch (err: any) {
      logger.error('CommandManager', `Command undo failed: ${command.name}`, { error: err.message });
      throw err;
    }
  }

  public async redo(): Promise<void> {
    if (!this.canRedo()) return;
    const command = this.redoStack.pop()!;
    try {
      await command.execute();
      this.undoStack.push(command);
      logger.info('CommandManager', `Redid command: ${command.name}`, { id: command.id });
      this.notifyListeners();
    } catch (err: any) {
      logger.error('CommandManager', `Command redo failed: ${command.name}`, { error: err.message });
      throw err;
    }
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public getUndoStack(): readonly ICommand[] {
    return this.undoStack;
  }

  public getRedoStack(): readonly ICommand[] {
    return this.redoStack;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notifyListeners();
  }

  public subscribe(listener: HistoryChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l());
  }
}
