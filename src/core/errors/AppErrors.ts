/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ErrorCode {
  INVALID_MEDIA = 'INVALID_MEDIA',
  MEDIA_OFFLINE = 'MEDIA_OFFLINE',
  CLIP_NOT_FOUND = 'CLIP_NOT_FOUND',
  UNSUPPORTED_CODEC = 'UNSUPPORTED_CODEC',
  CORRUPT_PROJECT = 'CORRUPT_PROJECT',
  TIMELINE_COLLISION = 'TIMELINE_COLLISION',
  INVALID_RANGE = 'INVALID_RANGE',
  EXPORT_FAILED = 'EXPORT_FAILED',
  COMMAND_EXECUTION_FAILED = 'COMMAND_EXECUTION_FAILED',
}

export class LuminaError extends Error {
  public readonly code: ErrorCode;
  public readonly userMessage: string;
  public readonly context?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, userMessage: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'LuminaError';
    this.code = code;
    this.userMessage = userMessage;
    this.context = context;
    Object.setPrototypeOf(this, LuminaError.prototype);
  }
}

export class MediaOfflineError extends LuminaError {
  constructor(mediaId: string, path: string) {
    super(
      ErrorCode.MEDIA_OFFLINE,
      `Media asset ${mediaId} not found at path: ${path}`,
      'Media Offline. The original source file could not be located.',
      { mediaId, path }
    );
  }
}

export class TimelineCollisionError extends LuminaError {
  constructor(trackId: string, details: string) {
    super(
      ErrorCode.TIMELINE_COLLISION,
      `Track ${trackId} collision: ${details}`,
      'Cannot place clip: space on this track is already occupied.',
      { trackId, details }
    );
  }
}
