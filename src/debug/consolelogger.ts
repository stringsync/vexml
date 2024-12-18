import { Logger } from './types';

export class ConsoleLogger implements Logger {
  info(message: string, meta?: Record<string, string>): void {
    console.log(this.toCompleteMessage(message, meta));
  }

  warn(message: string, meta?: Record<string, string>): void {
    console.warn(this.toCompleteMessage(message, meta));
  }

  error(message: string, meta?: Record<string, string>): void {
    console.error(this.toCompleteMessage(message, meta));
  }

  private toCompleteMessage(message: string, meta?: Record<string, string>): string {
    if (meta) {
      return `${message} ${Object.entries(meta)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ')}`;
    }
    return message;
  }
}
