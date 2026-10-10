import * as path from 'node:path';
import { createServer, type Plugin } from 'vite';
import { perfMiddleware } from './perf-middleware';
import type { PerfRun } from './perf-run';

const SITE_DIR = path.resolve(import.meta.dir, '../site');

/**
 * Opens a page in the browser that shows run as it goes, and resolves to the page's URL.
 * The server stays up for the life of the process. BROWSER=none serves without opening.
 */
export async function servePerfUi(run: PerfRun): Promise<string> {
	// The page lives in packages/site for its theme and components. `vite build` only builds
	// index.html, so vexml.dev never ships it.
	const routes: Plugin = {
		name: 'vex-perf',
		configureServer(server) {
			server.middlewares.use(perfMiddleware(run));
		},
	};
	const server = await createServer({
		root: SITE_DIR,
		configFile: path.join(SITE_DIR, 'vite.config.ts'),
		plugins: [routes],
		// Vite's own banner would interleave with the run's progress lines.
		logLevel: 'warn',
		server: { open: '/perf.html' },
	});
	await server.listen();
	const base = server.resolvedUrls?.local[0] ?? 'http://localhost:5173/';
	return new URL('perf.html', base).href;
}
