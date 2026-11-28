import { afterEach, describe, expect, it } from 'bun:test';
import { createServer } from 'node:net';
import { FakeClock } from 'core/time/testing';
import { EVENTS_PATH, retryPath } from './perf-events';
import type { RetryQueue } from './perf-retrier';
import { PerfRun } from './perf-run';
import { type PerfUiServer, startPerfUi } from './perf-ui';

describe('startPerfUi', () => {
	let ui: PerfUiServer | undefined;

	afterEach(async () => {
		await ui?.close();
		ui = undefined;
	});

	it('binds the requested 127.0.0.1 port, serves perf.html at / and /perf.html, and wires events and retries', async () => {
		const port = await freePort();
		const run = new PerfRun(new FakeClock());
		run.start(['beam']);
		const retries = new RecordingRetryQueue();

		ui = await startPerfUi({
			run,
			retries,
			port,
			strictPort: true,
			open: false,
		});

		expect(ui.url).toBe(`http://127.0.0.1:${port}/perf.html`);

		const rootRes = await fetch(`http://127.0.0.1:${port}/`);
		expect(rootRes.status).toBe(200);
		const rootHtml = await rootRes.text();
		expect(rootHtml).toContain('<title>vex perf</title>');
		expect(rootHtml).toContain('/perf/main.tsx');

		const pageRes = await fetch(ui.url);
		expect(pageRes.status).toBe(200);
		expect(await pageRes.text()).toContain('<title>vex perf</title>');

		const eventsRes = await fetch(`http://127.0.0.1:${port}${EVENTS_PATH}`);
		expect(eventsRes.status).toBe(200);
		const reader = eventsRes.body?.getReader();
		const chunk = await reader?.read();
		await reader?.cancel();
		expect(new TextDecoder().decode(chunk?.value)).toBe(
			'data: {"type":"start","at":0,"fixtures":["beam"]}\n\n',
		);

		const retryRes = await fetch(
			`http://127.0.0.1:${port}${retryPath('beam')}`,
			{ method: 'POST' },
		);
		expect(retryRes.status).toBe(202);
		expect(retries.requested).toEqual(['beam']);
	});
});

class RecordingRetryQueue implements RetryQueue {
	readonly requested: string[] = [];

	request(fixture: string): boolean {
		this.requested.push(fixture);
		return true;
	}
}

async function freePort(): Promise<number> {
	return await new Promise((resolve, reject) => {
		const server = createServer();
		server.once('error', reject);
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			if (!address || typeof address === 'string') {
				server.close();
				reject(new Error('expected an IPv4 port'));
				return;
			}
			const { port } = address;
			server.close((err) => (err ? reject(err) : resolve(port)));
		});
	});
}
