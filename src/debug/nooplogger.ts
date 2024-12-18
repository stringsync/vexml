/* eslint-disable @typescript-eslint/no-unused-vars */
import { Logger } from './types';

export class NoopLogger implements Logger {
  info(message: string, meta?: Record<string, string>): void {}
  warn(message: string, meta?: Record<string, string>): void {}
  error(message: string, meta?: Record<string, string>): void {}
}
