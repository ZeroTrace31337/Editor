/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ShortcutManager } from '../../core/shortcuts/ShortcutManager';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function runShortcutsUnitTests(): { name: string; passed: boolean; details?: string }[] {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  const manager = ShortcutManager.getInstance();

  // 1. Default VeeCut Preset Bindings
  try {
    manager.setPreset('VeeCut');
    assert(manager.getActivePreset() === 'VeeCut', 'Active preset must be VeeCut');

    const spaceBinding = manager.getBinding('playback.toggle');
    assert(spaceBinding === 'Space', 'Playback toggle should default to Space');

    const splitBinding = manager.getBinding('edit.split_at_playhead');
    assert(splitBinding === 'Mod+B' || splitBinding === 'C', `Expected split shortcut, got ${splitBinding}`);

    results.push({ name: 'Shortcuts: Default Preset & Core Bindings', passed: true });
  } catch (err: any) {
    results.push({ name: 'Shortcuts: Default Preset & Core Bindings', passed: false, details: err.message });
  }

  // 2. Preset Switching (DaVinci Resolve & Premiere Pro)
  try {
    manager.setPreset('DaVinci Resolve');
    assert(manager.getActivePreset() === 'DaVinci Resolve', 'Active preset should switch to DaVinci Resolve');
    const davinciSplit = manager.getBinding('edit.split_at_playhead');
    assert(davinciSplit === 'Mod+\\', 'DaVinci Resolve split shortcut must be Mod+\\');

    manager.setPreset('Premiere Pro');
    assert(manager.getActivePreset() === 'Premiere Pro', 'Active preset should switch to Premiere Pro');
    const premiereSplit = manager.getBinding('edit.split_at_playhead');
    assert(premiereSplit === 'Mod+K', 'Premiere Pro split shortcut must be Mod+K');

    results.push({ name: 'Shortcuts: Industry Presets (DaVinci & Premiere)', passed: true });
  } catch (err: any) {
    results.push({ name: 'Shortcuts: Industry Presets (DaVinci & Premiere)', passed: false, details: err.message });
  }

  // 3. Custom Binding & Conflict Resolution
  try {
    manager.setPreset('VeeCut');
    // Assign "Space" to another command (e.g. edit.delete)
    const result = manager.setBinding('edit.delete', 'Space');
    assert(result.conflictWith === 'playback.toggle', 'Should detect conflict with previous Space owner');
    assert(manager.getBinding('edit.delete') === 'Space', 'edit.delete should now have Space');
    assert(manager.getBinding('playback.toggle') === undefined, 'Previous owner should have binding unassigned');

    // Reset to clean defaults
    manager.setPreset('VeeCut');
    assert(manager.getBinding('playback.toggle') === 'Space', 'Resetting restores default space binding');

    results.push({ name: 'Shortcuts: Custom Binding & Conflict Resolution', passed: true });
  } catch (err: any) {
    results.push({ name: 'Shortcuts: Custom Binding & Conflict Resolution', passed: false, details: err.message });
  }

  // 4. Config Export & Import
  try {
    const configJson = manager.exportConfig();
    assert(configJson.includes('"preset"'), 'Exported config must contain preset field');
    assert(configJson.includes('"bindings"'), 'Exported config must contain bindings array');

    const success = manager.importConfig(configJson);
    assert(success === true, 'Importing valid JSON config must succeed');

    results.push({ name: 'Shortcuts: JSON Config Export and Re-Import', passed: true });
  } catch (err: any) {
    results.push({ name: 'Shortcuts: JSON Config Export and Re-Import', passed: false, details: err.message });
  }

  return results;
}
