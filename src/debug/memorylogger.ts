import { Logger } from './types';

export type MemoryLog = { level: 'info' | 'warn' | 'error'; message: string; meta?: Record<string, string> };

export class MemoryLogger implements Logger {
  private logs = new Array<MemoryLog>();

  getLogs(): MemoryLog[] {
    return this.logs;
  }

  info(message: string, meta?: Record<string, string>): void {
    this.logs.push({ level: 'info', message, meta });
  }

  warn(message: string, meta?: Record<string, string>): void {
    this.logs.push({ level: 'warn', message, meta });
  }

  error(message: string, meta?: Record<string, string>): void {
    this.logs.push({ level: 'error', message, meta });
  }
}
