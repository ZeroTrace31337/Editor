/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TextClip } from '../../domain/timeline/Clip';
import { rationalTimeToSeconds } from '../time/RationalTime';

export interface SubtitleCue {
  index: number;
  startSeconds: number;
  endSeconds: number;
  text: string;
}

/**
 * Format seconds into SRT timestamp: HH:MM:SS,mmm
 */
export function secondsToSrtTime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = Math.floor(safeSeconds % 60);
  const millis = Math.floor((safeSeconds % 1) * 1000);

  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  const ss = secs.toString().padStart(2, '0');
  const mmm = millis.toString().padStart(3, '0');

  return `${hh}:${mm}:${ss},${mmm}`;
}

/**
 * Format seconds into VTT timestamp: HH:MM:SS.mmm
 */
export function secondsToVttTime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = Math.floor(safeSeconds % 60);
  const millis = Math.floor((safeSeconds % 1) * 1000);

  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  const ss = secs.toString().padStart(2, '0');
  const mmm = millis.toString().padStart(3, '0');

  return `${hh}:${mm}:${ss}.${mmm}`;
}

/**
 * Parse timestamp string (SRT or VTT) into seconds
 */
export function parseTimestampToSeconds(timestamp: string): number {
  const normalized = timestamp.trim().replace(',', '.');
  const parts = normalized.split(':');
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  }
  return 0;
}

/**
 * Parse an SRT (SubRip) subtitle string into structured cues
 */
export function parseSRT(srtContent: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  if (!srtContent || srtContent.trim().length === 0) return cues;

  // Normalize newlines
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n/);

  let cueIndex = 1;
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    let timeLineIdx = 0;
    // If the first line is numeric index, timestamp is on line 1
    if (/^\d+$/.test(lines[0].trim())) {
      timeLineIdx = 1;
    }

    const timeLine = lines[timeLineIdx];
    if (!timeLine || !timeLine.includes('-->')) continue;

    const [startStr, endStr] = timeLine.split('-->');
    if (!startStr || !endStr) continue;

    const startSeconds = parseTimestampToSeconds(startStr);
    const endSeconds = parseTimestampToSeconds(endStr);
    const textLines = lines.slice(timeLineIdx + 1);
    const text = textLines.join('\n').trim();

    if (text.length > 0 && endSeconds > startSeconds) {
      cues.push({
        index: cueIndex++,
        startSeconds,
        endSeconds,
        text,
      });
    }
  }

  return cues;
}

/**
 * Parse a WebVTT (.vtt) subtitle string into structured cues
 */
export function parseVTT(vttContent: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  if (!vttContent || vttContent.trim().length === 0) return cues;

  const normalized = vttContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n/);

  let cueIndex = 1;
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    // Skip WEBVTT header block
    if (lines.length === 1 && lines[0].startsWith('WEBVTT')) continue;
    if (lines[0].startsWith('NOTE') || lines[0].startsWith('STYLE')) continue;

    let timeLineIdx = 0;
    if (!lines[0].includes('-->') && lines.length > 1 && lines[1].includes('-->')) {
      timeLineIdx = 1;
    }

    const timeLine = lines[timeLineIdx];
    if (!timeLine || !timeLine.includes('-->')) continue;

    const [startStr, endStrPart] = timeLine.split('-->');
    if (!startStr || !endStrPart) continue;

    // WebVTT timestamps may have cue settings like "line:0% position:50%"
    const endStr = endStrPart.trim().split(/\s+/)[0];

    const startSeconds = parseTimestampToSeconds(startStr);
    const endSeconds = parseTimestampToSeconds(endStr);
    const textLines = lines.slice(timeLineIdx + 1);
    const text = textLines.join('\n').trim();

    if (text.length > 0 && endSeconds > startSeconds) {
      cues.push({
        index: cueIndex++,
        startSeconds,
        endSeconds,
        text,
      });
    }
  }

  return cues;
}

/**
 * Export timeline TextClips as a standard SubRip (.srt) string
 */
export function exportSRT(textClips: TextClip[]): string {
  const sorted = [...textClips].sort(
    (a, b) => rationalTimeToSeconds(a.timelineRange.start) - rationalTimeToSeconds(b.timelineRange.start)
  );

  const blocks: string[] = [];
  sorted.forEach((clip, idx) => {
    const startSec = rationalTimeToSeconds(clip.timelineRange.start);
    const durSec = rationalTimeToSeconds(clip.timelineRange.duration);
    const endSec = startSec + durSec;
    const text = clip.text || clip.name || 'Caption';

    const srtBlock = [
      (idx + 1).toString(),
      `${secondsToSrtTime(startSec)} --> ${secondsToSrtTime(endSec)}`,
      text,
    ].join('\n');

    blocks.push(srtBlock);
  });

  return blocks.join('\n\n') + '\n';
}

/**
 * Export timeline TextClips as a standard WebVTT (.vtt) string
 */
export function exportVTT(textClips: TextClip[]): string {
  const sorted = [...textClips].sort(
    (a, b) => rationalTimeToSeconds(a.timelineRange.start) - rationalTimeToSeconds(b.timelineRange.start)
  );

  const lines: string[] = ['WEBVTT', '', 'NOTE Exported from VeeCut Professional Video Editor', ''];

  sorted.forEach((clip, idx) => {
    const startSec = rationalTimeToSeconds(clip.timelineRange.start);
    const durSec = rationalTimeToSeconds(clip.timelineRange.duration);
    const endSec = startSec + durSec;
    const text = clip.text || clip.name || 'Caption';

    lines.push((idx + 1).toString());
    lines.push(`${secondsToVttTime(startSec)} --> ${secondsToVttTime(endSec)}`);
    lines.push(text);
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Trigger download of subtitle file in the browser
 */
export function downloadSubtitleFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
