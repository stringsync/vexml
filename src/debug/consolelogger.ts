import { Logger, LogLevel } from './types';

export class ConsoleLogger implements Logger {
  constructor(private levels: LogLevel[] = ['debug', 'info', 'warn', 'error']) {}

  debug(message: string, meta?: Record<string, any>): void {
    if (this.levels.includes('debug')) {
      console.debug(this.toCompleteMessage(message, meta));
    }
  }

  info(message: string, meta?: Record<string, any>): void {
    if (this.levels.includes('info')) {
      console.log(this.toCompleteMessage(message, meta));
    }
  }

  warn(message: string, meta?: Record<string, any>): void {
    if (this.levels.includes('warn')) {
      console.warn(this.toCompleteMessage(message, meta));
    }
  }

  error(message: string, meta?: Record<string, any>): void {
    if (this.levels.includes('error')) {
      console.error(this.toCompleteMessage(message, meta));
    }
  }

  private toCompleteMessage(message: string, meta?: Record<string, any>): string {
    if (meta) {
      return `[vexml] ${message} ${Object.entries(meta)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ')}`;
    }
    return `[vexml] ${message}`;
  }
}
