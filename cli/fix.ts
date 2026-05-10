import { spawnSync } from 'node:child_process';
import chalk from 'chalk';

export async function fix(opts: { check: boolean }): Promise<void> {
  const failures = new Array<string>();

  if (!format(opts.check)) {
    failures.push('format');
  }
  if (!lint(opts.check)) {
    failures.push('lint');
  }
  if (!typecheck()) {
    failures.push('typecheck');
  }

  if (failures.length > 0) {
    throw new Error(`fix failed: ${failures.join(', ')}`);
  }
}

function format(check: boolean): boolean {
  const args = ['prettier', '.', '--loglevel=warn', check ? '--check' : '--write'];
  const ok = exec('npx', args);
  console.log(`format: ${ok ? chalk.green('success') : chalk.red('failed')}`);
  return ok;
}

function lint(check: boolean): boolean {
  const args = ['eslint', '.'];
  if (!check) {
    args.push('--fix');
  }
  const ok = exec('npx', args);
  console.log(`lint: ${ok ? chalk.green('success') : chalk.red('failed')}`);
  return ok;
}

function typecheck(): boolean {
  const ok = exec('npx', ['tsc', '--noEmit']);
  console.log(`typecheck: ${ok ? chalk.green('success') : chalk.red('failed')}`);
  return ok;
}

function exec(command: string, args: string[]): boolean {
  console.log(chalk.cyan(`$ ${[command, ...args].join(' ')}`));
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) {
    throw result.error;
  }
  if (result.signal) {
    throw new Error(`${command} terminated with signal ${result.signal}`);
  }
  return result.status === 0;
}
