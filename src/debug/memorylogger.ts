import { Logger, LogLevel } from './types';

export type MemoryLog = { level: LogLevel; message: string; meta?: Record<string, string> };

export class MemoryLogger implements Logger {
  private logs = new Array<MemoryLog>();

  getLogs(): MemoryLog[] {
    return this.logs;
  }

  debug(message: string, meta?: Record<string, any>): void {
    this.logs.push({ level: 'debug', message, meta: { callsite: this.getCallsite(), ...meta } });
  }

  info(message: string, meta?: Record<string, any>): void {
    this.logs.push({ level: 'info', message, meta: { callsite: this.getCallsite(), ...meta } });
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.logs.push({ level: 'warn', message, meta: { callsite: this.getCallsite(), ...meta } });
  }

  error(message: string, meta?: Record<string, any>): void {
    this.logs.push({ level: 'error', message, meta: { callsite: this.getCallsite(), ...meta } });
  }

  private getCallsite(): string {
    const stack = new Error().stack;
    if (!stack) return '';
    const stackLines = stack.split('\n');
    // Return the third line which is the callsite
    return stackLines[3] ? stackLines[3].trim() : '';
  }
}
