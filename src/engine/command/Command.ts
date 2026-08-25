/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CommandContext {
  projectId: string;
  sequenceId: string;
}

export interface ICommand {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly timestamp: number;

  execute(): Promise<void> | void;
  undo(): Promise<void> | void;
}
