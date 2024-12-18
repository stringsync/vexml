/* eslint-disable @typescript-eslint/no-unused-vars */
import { Logger } from './types';

export class NoopLogger implements Logger {
  debug(message: string, meta?: Record<string, any>): void {}
  info(message: string, meta?: Record<string, any>): void {}
  warn(message: string, meta?: Record<string, any>): void {}
  error(message: string, meta?: Record<string, any>): void {}
}
