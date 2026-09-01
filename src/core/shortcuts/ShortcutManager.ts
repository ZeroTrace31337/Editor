/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommandRegistry } from '../../engine/command/CommandRegistry';
import { EditorExecutionContext } from '../../engine/command/CommandTypes';
import { logger } from '../logging/Logger';

export type ShortcutPresetName = 'VeeCut' | 'DaVinci Resolve' | 'Premiere Pro' | 'Final Cut Pro';

export interface ShortcutBinding {
  commandId: string;
  keyCombo: string; // e.g. "Mod+B", "Space", "Shift+Delete", "J", "K", "L", "Mod+Z"
}

const STORAGE_KEY = 'veecut_custom_shortcuts';
const PRESET_STORAGE_KEY = 'veecut_active_shortcut_preset';

export class ShortcutManager {
  private static instance: ShortcutManager | null = null;
  private activePreset: ShortcutPresetName = 'VeeCut';
  private bindings: Map<string, string> = new Map(); // commandId -> keyCombo
  private keyToCommandMap: Map<string, string> = new Map(); // normalized keyCombo -> commandId

  public static getInstance(): ShortcutManager {
    if (!ShortcutManager.instance) {
      ShortcutManager.instance = new ShortcutManager();
    }
    return ShortcutManager.instance;
  }

  private constructor() {
    this.loadFromStorage();
  }

  public getActivePreset(): ShortcutPresetName {
    return this.activePreset;
  }

  public setPreset(preset: ShortcutPresetName): void {
    this.activePreset = preset;
    this.bindings.clear();
    this.keyToCommandMap.clear();

    const presetBindings = this.getPresetBindings(preset);
    presetBindings.forEach((b) => {
      this.bindings.set(b.commandId, b.keyCombo);
      this.keyToCommandMap.set(this.normalizeKeyCombo(b.keyCombo), b.commandId);
    });

    localStorage.setItem(PRESET_STORAGE_KEY, preset);
    localStorage.removeItem(STORAGE_KEY);
  }

  public getBinding(commandId: string): string | undefined {
    return this.bindings.get(commandId);
  }

  public setBinding(commandId: string, keyCombo: string): { conflictWith?: string } {
    const normalized = this.normalizeKeyCombo(keyCombo);
    const existingCommand = this.keyToCommandMap.get(normalized);
    let conflictWith: string | undefined = undefined;

    if (existingCommand && existingCommand !== commandId) {
      conflictWith = existingCommand;
      this.bindings.delete(existingCommand);
    }

    // Remove old mapping for this command
    const oldCombo = this.bindings.get(commandId);
    if (oldCombo) {
      this.keyToCommandMap.delete(this.normalizeKeyCombo(oldCombo));
    }

    this.bindings.set(commandId, keyCombo);
    this.keyToCommandMap.set(normalized, commandId);
    this.saveToStorage();

    return { conflictWith };
  }

  public removeBinding(commandId: string): void {
    const oldCombo = this.bindings.get(commandId);
    if (oldCombo) {
      this.keyToCommandMap.delete(this.normalizeKeyCombo(oldCombo));
      this.bindings.delete(commandId);
      this.saveToStorage();
    }
  }

  public resetToDefault(): void {
    this.setPreset('VeeCut');
  }

  public handleKeyDown(event: KeyboardEvent, ctx: EditorExecutionContext): boolean {
    // Ignore input events inside text fields or textareas (unless Escape or specific modifier)
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      if (event.key === 'Escape') {
        target.blur();
        return true;
      }
      return false;
    }

    const combo = this.eventToKeyCombo(event);
    const commandId = this.keyToCommandMap.get(this.normalizeKeyCombo(combo));

    if (commandId) {
      event.preventDefault();
      event.stopPropagation();
      CommandRegistry.getInstance().executeCommand(commandId, ctx);
      return true;
    }

    return false;
  }

  public exportConfig(): string {
    const config = {
      preset: this.activePreset,
      bindings: Array.from(this.bindings.entries()).map(([commandId, keyCombo]) => ({
        commandId,
        keyCombo,
      })),
    };
    return JSON.stringify(config, null, 2);
  }

  public importConfig(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed.bindings)) {
        this.bindings.clear();
        this.keyToCommandMap.clear();
        parsed.bindings.forEach((b: any) => {
          if (b.commandId && b.keyCombo) {
            this.bindings.set(b.commandId, b.keyCombo);
            this.keyToCommandMap.set(this.normalizeKeyCombo(b.keyCombo), b.commandId);
          }
        });
        this.activePreset = parsed.preset || 'VeeCut';
        this.saveToStorage();
        return true;
      }
    } catch (e) {
      logger.error('ShortcutManager', 'Failed to import shortcut config', { error: e });
    }
    return false;
  }

  private normalizeKeyCombo(combo: string): string {
    return combo
      .toLowerCase()
      .replace(/cmd|command|ctrl|control/g, 'mod')
      .split('+')
      .map((s) => s.trim())
      .sort()
      .join('+');
  }

  private eventToKeyCombo(e: KeyboardEvent): string {
    const parts: string[] = [];
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const isMod = isMac ? e.metaKey : e.ctrlKey;

    if (isMod) parts.push('Mod');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');

    let key = e.key;
    if (key === ' ') key = 'Space';
    else if (key === 'ArrowRight') key = 'Right';
    else if (key === 'ArrowLeft') key = 'Left';
    else if (key === 'ArrowUp') key = 'Up';
    else if (key === 'ArrowDown') key = 'Down';
    else if (key === 'Backspace' && isMac) key = 'Delete';

    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      parts.push(key.length === 1 ? key.toUpperCase() : key);
    }

    return parts.join('+');
  }

  private saveToStorage(): void {
    const serializable = Array.from(this.bindings.entries());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    localStorage.setItem(PRESET_STORAGE_KEY, this.activePreset);
  }

  private loadFromStorage(): void {
    const savedPreset = localStorage.getItem(PRESET_STORAGE_KEY) as ShortcutPresetName | null;
    if (savedPreset) this.activePreset = savedPreset;

    const savedBindings = localStorage.getItem(STORAGE_KEY);
    if (savedBindings) {
      try {
        const parsed: [string, string][] = JSON.parse(savedBindings);
        this.bindings.clear();
        this.keyToCommandMap.clear();
        parsed.forEach(([cmdId, combo]) => {
          this.bindings.set(cmdId, combo);
          this.keyToCommandMap.set(this.normalizeKeyCombo(combo), cmdId);
        });
        return;
      } catch {}
    }

    // Default to preset bindings
    this.setPreset(this.activePreset);
  }

  private getPresetBindings(preset: ShortcutPresetName): ShortcutBinding[] {
    const all = CommandRegistry.getInstance().getAllCommands();
    const defaults: ShortcutBinding[] = all
      .filter((cmd) => !!cmd.defaultShortcut)
      .map((cmd) => ({
        commandId: cmd.id,
        keyCombo: cmd.defaultShortcut!,
      }));

    if (preset === 'DaVinci Resolve') {
      return defaults.map((b) => {
        if (b.commandId === 'edit.split_at_playhead') return { ...b, keyCombo: 'Mod+\\' };
        if (b.commandId === 'edit.ripple_delete') return { ...b, keyCombo: 'Shift+Backspace' };
        if (b.commandId === 'timeline.toggle_snapping') return { ...b, keyCombo: 'N' };
        return b;
      });
    }

    if (preset === 'Premiere Pro') {
      return defaults.map((b) => {
        if (b.commandId === 'edit.split_at_playhead') return { ...b, keyCombo: 'Mod+K' };
        if (b.commandId === 'view.command_palette') return { ...b, keyCombo: 'Mod+Shift+K' };
        if (b.commandId === 'edit.ripple_delete') return { ...b, keyCombo: 'Shift+Delete' };
        return b;
      });
    }

    if (preset === 'Final Cut Pro') {
      return defaults.map((b) => {
        if (b.commandId === 'edit.split_at_playhead') return { ...b, keyCombo: 'Mod+B' };
        if (b.commandId === 'edit.delete') return { ...b, keyCombo: 'Delete' };
        if (b.commandId === 'timeline.zoom_fit') return { ...b, keyCombo: 'Shift+Z' };
        return b;
      });
    }

    return defaults;
  }
}
