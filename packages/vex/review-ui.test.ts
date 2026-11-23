import { afterEach, describe, expect, it } from 'bun:test';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { FakeFs } from 'core/system/testing';
import {
	CLIENT_HEADER,
	emptyReview,
	type Review,
	type ReviewData,
	SEQ_HEADER,
	STATE_PATH,
} from './review-data';
import { ReviewStore } from './review-store';
import { reviewMiddleware } from './review-ui';

describe('reviewMiddleware', () => {
	let server: Server | null = null;

	afterEach(() => {
		server?.closeAllConnections();
		server?.close();
		server = null;
	});

	async function startMiddleware(
		data: ReviewData,
		store: ReviewStore,
	): Promise<string> {
		const middleware = reviewMiddleware({ data, moved: [], store });
		server = createServer((req, res) =>
			middleware(req, res, () => res.writeHead(404).end()),
		);
		await new Promise<void>((resolve) => server?.listen(0, resolve));
		return `http://localhost:${(server.address() as AddressInfo).port}`;
	}

	it('ignores out-of-order stale PUTs from the same client so submit approvals are never lost', async () => {
		const fs = new TrackingFs();
		const data = makeData('vexflow-update', 1);
		const store = new ReviewStore(fs, data.id);
		const base = await startMiddleware(data, store);

		const submitted = makeReview(data.id, 1, approvedVerdicts(78), true);
		const stale = makeReview(data.id, 1, approvedVerdicts(6), false);

		const newerRes = await putState(base, submitted, {
			clientId: 'tab-1',
			seq: 79,
		});
		expect(newerRes.status).toBe(204);

		// Late arrival of an older PUT from the same tab must not overwrite seq 79.
		const staleRes = await putState(base, stale, {
			clientId: 'tab-1',
			seq: 6,
		});
		expect(staleRes.status).toBe(204);

		const saved = (await (await fetch(base + STATE_PATH)).json()) as Review;
		expect(saved).toEqual(submitted);
	});

	it('serializes concurrent PUTs and serves the newest state on GET', async () => {
		const gate = deferred();
		const fs = new TrackingFs({ blockFirstWrite: gate.promise });
		const data = makeData('concurrent-put', 1);
		const store = new ReviewStore(fs, data.id);
		const base = await startMiddleware(data, store);

		const first = makeReview(data.id, 1, { 'a.png': 'approved' }, false);
		const second = makeReview(
			data.id,
			1,
			{ 'a.png': 'approved', 'b.png': 'approved' },
			true,
		);

		const put1 = putState(base, first, { clientId: 'tab-1', seq: 1 });
		const put2 = putState(base, second, { clientId: 'tab-1', seq: 2 });
		gate.resolve();
		const [res1, res2] = await Promise.all([put1, put2]);
		expect(res1.status).toBe(204);
		expect(res2.status).toBe(204);

		const loaded = (await (await fetch(base + STATE_PATH)).json()) as Review;
		expect(loaded).toEqual(second);
	});

	it('allows a retry after a failed write and accepts a new client session', async () => {
		const fs = new TrackingFs({ failRenameOnce: true });
		const data = makeData('retry-put', 1);
		const store = new ReviewStore(fs, data.id);
		const base = await startMiddleware(data, store);

		const submitted = makeReview(data.id, 1, { 'a.png': 'approved' }, true);
		const failed = await putState(base, submitted, {
			clientId: 'tab-1',
			seq: 3,
		});
		expect(failed.status).toBe(500);

		const retried = await putState(base, submitted, {
			clientId: 'tab-1',
			seq: 3,
		});
		expect(retried.status).toBe(204);

		// A reloaded tab starts a new client id at seq 1 and can reopen the review.
		const reopened = makeReview(data.id, 1, { 'a.png': 'approved' }, false);
		const reloadRes = await putState(base, reopened, {
			clientId: 'tab-2',
			seq: 1,
		});
		expect(reloadRes.status).toBe(204);
		expect(await store.readReview(data)).toEqual(reopened);
	});
});

class TrackingFs extends FakeFs {
	private failRenameOnce: boolean;
	private readonly blockFirstWrite: Promise<void> | null;
	private writeCalls = 0;

	constructor(
		opts: { failRenameOnce?: boolean; blockFirstWrite?: Promise<void> } = {},
	) {
		super();
		this.failRenameOnce = opts.failRenameOnce ?? false;
		this.blockFirstWrite = opts.blockFirstWrite ?? null;
	}

	override async write(file: string, content: string): Promise<void> {
		this.writeCalls++;
		if (this.writeCalls === 1 && this.blockFirstWrite) {
			await this.blockFirstWrite;
		}
		await super.write(file, content);
	}

	override async rename(from: string, to: string): Promise<void> {
		if (this.failRenameOnce) {
			this.failRenameOnce = false;
			throw new Error('rename failed');
		}
		await super.rename(from, to);
	}
}

function putState(
	base: string,
	review: Review,
	opts: { clientId: string; seq: number },
) {
	return fetch(base + STATE_PATH, {
		method: 'PUT',
		headers: {
			'content-type': 'application/json',
			[CLIENT_HEADER]: opts.clientId,
			[SEQ_HEADER]: String(opts.seq),
		},
		body: JSON.stringify(review),
	});
}

function approvedVerdicts(count: number): Review['verdicts'] {
	const verdicts: Review['verdicts'] = {};
	for (let i = 1; i <= count; i++) {
		verdicts[`snap_${i}.png`] = 'approved';
	}
	return verdicts;
}

function deferred() {
	let resolve!: () => void;
	const promise = new Promise<void>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

function makeData(id: string, version: number): ReviewData {
	return {
		id,
		version,
		title: id,
		tradeoffs: null,
		unchanged: 0,
		entries: [],
		mode: 'served',
	};
}

function makeReview(
	id: string,
	version: number,
	verdicts: Review['verdicts'],
	submitted: boolean,
): Review {
	return {
		...emptyReview({ id, version }),
		verdicts,
		submitted,
	};
}
