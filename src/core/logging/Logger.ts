/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  subsystem: string;
  message: string;
  context?: Record<string, unknown>;
}

class LuminaLogger {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 1000;

  public log(level: LogLevel, subsystem: string, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      subsystem,
      message,
      context,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const formatted = `[${entry.timestamp}] [${level.toUpperCase()}] [${subsystem}] ${message}`;
    if (level === 'error') {
      console.error(formatted, context || '');
    } else if (level === 'warn') {
      console.warn(formatted, context || '');
    } else if (level === 'info') {
      console.info(formatted, context || '');
    } else {
      console.debug(formatted, context || '');
    }
  }

  public debug(subsystem: string, message: string, context?: Record<string, unknown>): void {
    this.log('debug', subsystem, message, context);
  }

  public info(subsystem: string, message: string, context?: Record<string, unknown>): void {
    this.log('info', subsystem, message, context);
  }

  public warn(subsystem: string, message: string, context?: Record<string, unknown>): void {
    this.log('warn', subsystem, message, context);
  }

  public error(subsystem: string, message: string, context?: Record<string, unknown>): void {
    this.log('error', subsystem, message, context);
  }

  public getRecentLogs(limit = 100): LogEntry[] {
    return this.logs.slice(-limit);
  }
}

export const logger = new LuminaLogger();
