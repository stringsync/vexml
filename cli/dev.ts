import { run } from './run';

// Vite dev server for the playground. Vite uses packages/site as its root and finds
// the vite.config.ts there.
export async function dev() {
	await run('bunx', ['vite', 'packages/site']);
}
