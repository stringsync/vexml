import type { Ps } from 'webappwiz/system';

export interface DevOptions {
	ps: Ps;
}

// Vite dev server for the playground. Vite uses packages/site as its root and finds
// the vite.config.ts there.
export async function dev(opts: DevOptions) {
	// No exit code check: the way this ends is Ctrl-C, which is not a failure.
	await opts.ps.spawn(['bunx', 'vite', 'packages/site']);
}
