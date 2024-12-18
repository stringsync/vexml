/* eslint-disable @typescript-eslint/no-unused-vars */
import { Logger } from './types';

export class NoopLogger implements Logger {
  info(message: string): void {}
  warn(message: string): void {}
  error(message: string): void {}
  withCtx(ctx: Record<string, string>): Logger {
    return new NoopLogger();
  }
}
