import { spawnSync, type SpawnSyncOptions } from 'node:child_process';
import chalk from 'chalk';

export function run(command: string, args: string[] = [], opts: SpawnSyncOptions = {}): void {
  console.log(chalk.cyan(`$ ${[command, ...args].join(' ')}`));
  const result = spawnSync(command, args, { stdio: 'inherit', ...opts });
  if (result.error) {
    throw result.error;
  }
  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
  if (result.signal) {
    throw new Error(`${command} terminated with signal ${result.signal}`);
  }
}

export function withTiming<T extends unknown[]>(next: (...args: T) => Promise<void>): (...args: T) => Promise<void> {
  return async (...args: T) => {
    const start = performance.now();
    process.once('exit', () => {
      const elapsed = performance.now() - start;
      const display = elapsed < 10 ? `${elapsed.toFixed(2)}ms` : `${(elapsed / 1000).toFixed(2)}s`;
      console.log(chalk.dim(`done in ${display}`));
    });
    await next(...args);
  };
}

export function withErrorHandling<T extends unknown[]>(
  next: (...args: T) => Promise<void>
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    try {
      await next(...args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(message));
      process.exit(1);
    }
  };
}
