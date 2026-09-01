/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RationalTime, secondsToRationalTime, rationalTimeToSeconds, createRationalTime } from '../../core/time/RationalTime';
import { TextClip, CaptionWordTiming } from '../../domain/timeline/Clip';
import { Sequence } from '../../domain/timeline/Sequence';
import { Track } from '../../domain/timeline/Track';

export interface SubtitleItem {
  id: string;
  index: number;
  startTimeSec: number;
  endTimeSec: number;
  text: string;
  speaker?: string;
  words?: CaptionWordTiming[];
}

export class SubtitleService {
  private static instance: SubtitleService | null = null;

  public static getInstance(): SubtitleService {
    if (!this.instance) {
      this.instance = new SubtitleService();
    }
    return this.instance;
  }

  /**
   * Parses standard SubRip (.srt) subtitle string
   */
  public parseSRT(srtContent: string): SubtitleItem[] {
    const items: SubtitleItem[] = [];
    const blocks = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n\n');

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i].trim();
      if (!block) continue;

      const lines = block.split('\n');
      if (lines.length < 2) continue;

      let timeIndex = 1;
      // If line 0 is numeric index
      if (!lines[0].includes('-->')) {
        timeIndex = 1;
      } else {
        timeIndex = 0;
      }

      const timeLine = lines[timeIndex];
      if (!timeLine || !timeLine.includes('-->')) continue;

      const [startStr, endStr] = timeLine.split('-->').map((s) => s.trim());
      const startTimeSec = this.timestampToSeconds(startStr);
      const endTimeSec = this.timestampToSeconds(endStr);

      const text = lines.slice(timeIndex + 1).join('\n').trim();

      items.push({
        id: `srt_${i + 1}`,
        index: i + 1,
        startTimeSec,
        endTimeSec: Math.max(startTimeSec + 0.5, endTimeSec),
        text,
      });
    }

    return items;
  }

  /**
   * Parses standard WebVTT (.vtt) subtitle string
   */
  public parseVTT(vttContent: string): SubtitleItem[] {
    // Strip WEBVTT header and cue notes
    const cleaned = vttContent.replace(/^WEBVTT[^\n]*\n+/i, '');
    return this.parseSRT(cleaned);
  }

  /**
   * Exports an array of SubtitleItems or TextClips to SubRip (.srt) format
   */
  public exportToSRT(items: { text: string; startTimeSec: number; endTimeSec: number }[]): string {
    return items
      .map((item, idx) => {
        const start = this.secondsToTimestamp(item.startTimeSec, ',');
        const end = this.secondsToTimestamp(item.endTimeSec, ',');
        return `${idx + 1}\n${start} --> ${end}\n${item.text}\n`;
      })
      .join('\n');
  }

  /**
   * Exports an array of SubtitleItems or TextClips to WebVTT (.vtt) format
   */
  public exportToVTT(items: { text: string; startTimeSec: number; endTimeSec: number }[]): string {
    const srtBody = items
      .map((item, idx) => {
        const start = this.secondsToTimestamp(item.startTimeSec, '.');
        const end = this.secondsToTimestamp(item.endTimeSec, '.');
        return `${idx + 1}\n${start} --> ${end}\n${item.text}\n`;
      })
      .join('\n');
    return `WEBVTT\n\n${srtBody}`;
  }

  /**
   * Converts seconds (e.g. 74.25) to "00:01:14,250" or "00:01:14.250"
   */
  public secondsToTimestamp(sec: number, separator = ','): string {
    const totalMs = Math.round(sec * 1000);
    const ms = totalMs % 1000;
    const totalSec = Math.floor(totalMs / 1000);
    const s = totalSec % 60;
    const totalMin = Math.floor(totalSec / 60);
    const m = totalMin % 60;
    const h = Math.floor(totalMin / 60);

    const pad = (num: number, digits: number) => num.toString().padStart(digits, '0');
    return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}${separator}${pad(ms, 3)}`;
  }

  /**
   * Converts "00:01:14,250" to seconds
   */
  public timestampToSeconds(timeStr: string): number {
    const normalized = timeStr.replace(',', '.');
    const parts = normalized.split(':');
    if (parts.length === 3) {
      const h = parseFloat(parts[0]);
      const m = parseFloat(parts[1]);
      const s = parseFloat(parts[2]);
      return h * 3600 + m * 60 + s;
    } else if (parts.length === 2) {
      const m = parseFloat(parts[0]);
      const s = parseFloat(parts[1]);
      return m * 60 + s;
    }
    return parseFloat(normalized) || 0;
  }
}
