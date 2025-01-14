import { Logger } from './types';

export class PerformanceMonitor {
  constructor(private log: Logger, private thresholdMs: number) {}

  check(elapsedMs: number, meta?: Record<string, any>): void {
    if (elapsedMs >= this.thresholdMs) {
      this.log.warn(`[SLOW WARNING] ${this.inferMethodName()} took ${this.getElapsedStr(elapsedMs)}`, meta);
    }
  }

  private inferMethodName(): string {
    try {
      return (
        new Error().stack
          ?.split('\n')
          .at(3)
          ?.trimStart()
          .replace('at ', '')
          ?.match(/(.+)\s/)
          ?.at(0)
          ?.trimEnd() ?? '<unknown>'
      );
    } catch (e) {
      // Fallback if stack parsing fails
    }
    return '<unknown>';
  }

  private getElapsedStr(elapsedMs: number): string {
    return elapsedMs > 1 ? `${Math.round(elapsedMs)}ms` : `${elapsedMs.toFixed(3)}ms`;
  }
}
