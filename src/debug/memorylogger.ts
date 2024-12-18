import { Logger } from './types';

export type MemoryLog = { level: 'info' | 'warn' | 'error'; message: string };

export class MemoryLogger implements Logger {
  private logs = new Array<MemoryLog>();

  getLogs(): MemoryLog[] {
    return this.logs;
  }

  info(message: string): void {
    this.logs.push({ level: 'info', message });
  }

  warn(message: string): void {
    this.logs.push({ level: 'warn', message });
  }

  error(message: string): void {
    this.logs.push({ level: 'error', message });
  }
}
