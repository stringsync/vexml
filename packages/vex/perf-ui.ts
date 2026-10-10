import * as path from 'node:path';
import { createServer, type Plugin } from 'vite';
import { perfMiddleware } from './perf-middleware';
import type { RetryQueue } from './perf-retrier';
import type { PerfRun } from './perf-run';

const SITE_DIR = path.resolve(import.meta.dir, '../site');

/**
 * Opens a page in the browser that shows the run as it goes, and resolves to the page's URL.
 * The server stays up for the life of the process. BROWSER=none serves without opening.
 */
export async function servePerfUi(opts: PerfUiOptions): Promise<string> {
	// The page lives in packages/site for its theme and components. `vite build` only builds
	// index.html, so vexml.dev never ships it.
	const routes: Plugin = {
		name: 'vex-perf',
		configureServer(server) {
			server.middlewares.use(perfMiddleware(opts));
		},
	};
	const server = await createServer({
		root: SITE_DIR,
		configFile: path.join(SITE_DIR, 'vite.config.ts'),
		plugins: [routes],
		// Vite's own banner would interleave with the run's progress lines.
		logLevel: 'warn',
		server: {
			// An explicit address: given `localhost`, two servers can each take the port, one
			// on ::1 and one on 127.0.0.1, and the browser lands on whichever it resolves first.
			// One address means a busy port is noticed, and the URL printed is this server's.
			host: '127.0.0.1',
			open: '/perf.html',
		},
	});
	await server.listen();
	const base = server.resolvedUrls?.local[0] ?? 'http://127.0.0.1:5173/';
	return new URL('perf.html', base).href;
}

export interface PerfUiOptions {
	run: PerfRun;
	/** Where the page's retry button sends its requests. */
	retries: RetryQueue;
}
