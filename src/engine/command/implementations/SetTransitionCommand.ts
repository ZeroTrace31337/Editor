/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { ClipTransition } from '../../../rendering/transitions/TransitionTypes';

export class SetTransitionCommand implements ICommand {
  public readonly id = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Set Clip Transition';
  public readonly description: string;
  public readonly timestamp = Date.now();

  private timelineEngine: TimelineEngine;
  private clipId: string;
  private position: 'in' | 'out';
  private transition?: ClipTransition;
  private previousTransition?: ClipTransition;

  constructor(
    timelineEngine: TimelineEngine,
    clipId: string,
    position: 'in' | 'out',
    transition?: ClipTransition
  ) {
    this.timelineEngine = timelineEngine;
    this.clipId = clipId;
    this.position = position;
    this.transition = transition ? JSON.parse(JSON.stringify(transition)) : undefined;
    this.description = transition
      ? `Set transition ${position} to ${transition.type}`
      : `Remove transition ${position}`;
  }

  public async execute(): Promise<void> {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) throw new Error(`Clip ${this.clipId} not found`);

    if (this.position === 'in') {
      this.previousTransition = found.clip.transitionIn ? JSON.parse(JSON.stringify(found.clip.transitionIn)) : undefined;
      found.clip.transitionIn = this.transition ? JSON.parse(JSON.stringify(this.transition)) : undefined;
    } else {
      this.previousTransition = found.clip.transitionOut ? JSON.parse(JSON.stringify(found.clip.transitionOut)) : undefined;
      found.clip.transitionOut = this.transition ? JSON.parse(JSON.stringify(this.transition)) : undefined;
    }
  }

  public async undo(): Promise<void> {
    const found = this.timelineEngine.findClip(this.clipId);
    if (!found) throw new Error(`Clip ${this.clipId} not found`);

    if (this.position === 'in') {
      found.clip.transitionIn = this.previousTransition ? JSON.parse(JSON.stringify(this.previousTransition)) : undefined;
    } else {
      found.clip.transitionOut = this.previousTransition ? JSON.parse(JSON.stringify(this.previousTransition)) : undefined;
    }
  }
}
