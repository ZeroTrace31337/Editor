/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { ClipMask } from '../../../domain/mask/ClipMask';

export class AddMaskCommand implements ICommand {
  public readonly id: string;
  public readonly name: string = 'AddMask';
  public readonly description: string;
  public readonly timestamp: number;
  private timelineEngine: TimelineEngine;
  private clipId: string;
  private mask: ClipMask;

  constructor(timelineEngine: TimelineEngine, clipId: string, mask: ClipMask) {
    this.id = `cmd_add_mask_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.timelineEngine = timelineEngine;
    this.clipId = clipId;
    this.mask = mask;
    this.description = `Add Mask: ${mask.name}`;
    this.timestamp = Date.now();
  }

  public execute(): void {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) return;

    if (!found.clip.masks) {
      found.clip.masks = [];
    }
    found.clip.masks.push(this.mask);
    found.clip.activeMaskId = this.mask.id;
    this.timelineEngine.setSequence(this.timelineEngine.getSequence());
  }

  public undo(): void {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found || !found.clip.masks) return;

    found.clip.masks = found.clip.masks.filter((m) => m.id !== this.mask.id);
    if (found.clip.activeMaskId === this.mask.id) {
      found.clip.activeMaskId = found.clip.masks[0]?.id;
    }
    this.timelineEngine.setSequence(this.timelineEngine.getSequence());
  }
}

export class UpdateMaskCommand implements ICommand {
  public readonly id: string;
  public readonly name: string = 'UpdateMask';
  public readonly description: string;
  public readonly timestamp: number;
  private timelineEngine: TimelineEngine;
  private clipId: string;
  private maskId: string;
  private newMaskData: Partial<ClipMask>;
  private previousMaskData: Partial<ClipMask> | null = null;

  constructor(
    timelineEngine: TimelineEngine,
    clipId: string,
    maskId: string,
    newMaskData: Partial<ClipMask>
  ) {
    this.id = `cmd_update_mask_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.timelineEngine = timelineEngine;
    this.clipId = clipId;
    this.maskId = maskId;
    this.newMaskData = newMaskData;
    this.description = `Update Mask`;
    this.timestamp = Date.now();
  }

  public execute(): void {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found || !found.clip.masks) return;

    const mask = found.clip.masks.find((m) => m.id === this.maskId);
    if (!mask) return;

    this.previousMaskData = { ...mask };
    Object.assign(mask, this.newMaskData);
    this.timelineEngine.setSequence(this.timelineEngine.getSequence());
  }

  public undo(): void {
    if (!this.previousMaskData) return;
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found || !found.clip.masks) return;

    const mask = found.clip.masks.find((m) => m.id === this.maskId);
    if (!mask) return;

    Object.assign(mask, this.previousMaskData);
    this.timelineEngine.setSequence(this.timelineEngine.getSequence());
  }
}

export class DeleteMaskCommand implements ICommand {
  public readonly id: string;
  public readonly name: string = 'DeleteMask';
  public readonly description: string;
  public readonly timestamp: number;
  private timelineEngine: TimelineEngine;
  private clipId: string;
  private maskId: string;
  private deletedMask: ClipMask | null = null;
  private deletedIndex = -1;

  constructor(timelineEngine: TimelineEngine, clipId: string, maskId: string) {
    this.id = `cmd_del_mask_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.timelineEngine = timelineEngine;
    this.clipId = clipId;
    this.maskId = maskId;
    this.description = `Delete Mask`;
    this.timestamp = Date.now();
  }

  public execute(): void {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found || !found.clip.masks) return;

    const idx = found.clip.masks.findIndex((m) => m.id === this.maskId);
    if (idx === -1) return;

    this.deletedIndex = idx;
    this.deletedMask = { ...found.clip.masks[idx] };

    found.clip.masks.splice(idx, 1);
    if (found.clip.activeMaskId === this.maskId) {
      found.clip.activeMaskId = found.clip.masks[0]?.id;
    }
    this.timelineEngine.setSequence(this.timelineEngine.getSequence());
  }

  public undo(): void {
    if (!this.deletedMask) return;
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) return;

    if (!found.clip.masks) {
      found.clip.masks = [];
    }
    found.clip.masks.splice(this.deletedIndex, 0, this.deletedMask);
    found.clip.activeMaskId = this.deletedMask.id;
    this.timelineEngine.setSequence(this.timelineEngine.getSequence());
  }
}
