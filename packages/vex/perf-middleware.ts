import type { IncomingMessage, ServerResponse } from 'node:http';
import { ENGINES, type Engine, EVENTS_PATH } from './perf-events';
import type { RetryQueue } from './perf-retrier';
import type { PerfRun } from './perf-run';

const IMAGE_ROUTE = new RegExp(
	`^/api/perf/image/([^/]+)/(${ENGINES.join('|')})\\.png$`,
);

const RETRY_ROUTE = /^\/api\/perf\/retry\/([^/]+)$/;

/**
 * The run's routes, as connect middleware: the event stream, the images, and retrying a
 * fixture. Anything else falls through to Vite.
 */
export function perfMiddleware({
	run,
	retries,
}: {
	run: PerfRun;
	retries: RetryQueue;
}) {
	return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
		const url = new URL(req.url ?? '/', 'http://localhost');
		const retry = RETRY_ROUTE.exec(url.pathname);
		if (retry && req.method === 'POST') {
			// 202: queued, not done; the renders arrive on the event stream.
			const queued = retries.request(decodeURIComponent(retry[1] ?? ''));
			res.writeHead(queued ? 202 : 404).end();
			return;
		}

		if (url.pathname === EVENTS_PATH) {
			res.writeHead(200, {
				'content-type': 'text/event-stream',
				'cache-control': 'no-cache',
				connection: 'keep-alive',
			});
			const unsubscribe = run.subscribe((event) => {
				res.write(`data: ${JSON.stringify(event)}\n\n`);
			});
			req.on('close', unsubscribe);
			return;
		}

		const match = IMAGE_ROUTE.exec(url.pathname);
		if (match) {
			const image = run.image(
				decodeURIComponent(match[1] ?? ''),
				match[2] as Engine,
			);
			if (!image) {
				res.writeHead(404).end();
				return;
			}
			// Each run reuses the paths, so a cached image would be the previous run's.
			res
				.writeHead(200, {
					'content-type': 'image/png',
					'cache-control': 'no-store',
				})
				.end(image);
			return;
		}

		next();
	};
}
