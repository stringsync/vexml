import { run } from './util.ts';

export async function dev(): Promise<void> {
  run('npx', ['vite', '--config', 'site/vite.config.js']);
}
