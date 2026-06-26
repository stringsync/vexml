import { run } from './run';

// Vite dev server for the site/ playground. Vite uses site/ as its root and finds
// site/vite.config.ts there.
export async function dev() {
	await run('bunx', ['vite', 'site']);
}
