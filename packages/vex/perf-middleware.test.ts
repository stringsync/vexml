import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { FakeClock } from 'webappwiz/time/testing';
import { EVENTS_PATH, imagePath } from './perf-events';
import { perfMiddleware } from './perf-middleware';
import { PerfRun } from './perf-run';

const PNG = Buffer.from('not really a png');

describe('perfMiddleware', () => {
	let run: PerfRun;
	let server: Server;
	let base: string;

	beforeEach(async () => {
		run = new PerfRun(new FakeClock());
		const middleware = perfMiddleware(run);
		// Whatever the middleware passes on lands here, so a test can tell it let go.
		server = createServer((req, res) =>
			middleware(req, res, () => res.writeHead(418).end()),
		);
		await new Promise<void>((resolve) => server.listen(0, resolve));
		base = `http://localhost:${(server.address() as AddressInfo).port}`;
	});

	afterEach(() => {
		server.closeAllConnections();
		server.close();
	});

	it('serves a render image as a png', async () => {
		run.render('a b', 'vexml', { ms: 1, size: '1x1' }, PNG);

		const res = await fetch(base + imagePath('a b', 'vexml'));

		expect(res.headers.get('content-type')).toBe('image/png');
		expect(Buffer.from(await res.arrayBuffer())).toEqual(PNG);
	});

	it('never lets a browser cache an image, since the next run reuses its path', async () => {
		run.render('a', 'vexml', { ms: 1, size: '1x1' }, PNG);

		const res = await fetch(base + imagePath('a', 'vexml'));

		expect(res.headers.get('cache-control')).toBe('no-store');
	});

	it('404s an image the run never produced', async () => {
		const res = await fetch(base + imagePath('a', 'osmd'));

		expect(res.status).toBe(404);
	});

	it('streams the run so far as server-sent events', async () => {
		run.start(['a']);

		const res = await fetch(base + EVENTS_PATH);
		const reader = res.body?.getReader();
		const chunk = await reader?.read();
		await reader?.cancel();

		expect(res.headers.get('content-type')).toBe('text/event-stream');
		expect(new TextDecoder().decode(chunk?.value)).toBe(
			'data: {"type":"start","at":0,"fixtures":["a"]}\n\n',
		);
	});

	it('leaves every other path to the next handler', async () => {
		const res = await fetch(`${base}/perf.html`);

		expect(res.status).toBe(418);
	});
});
