import { describe, expect, it } from 'bun:test';
import { FakeFs } from 'core/system/testing';
import { FakeJev } from './fake-jev';
import { GuardedJev } from './guarded-jev';
import { DEFAULT_MAX_JEV_IMAGES, JevImageBudget } from './jev-budget';
import type { JevQueryRequest } from './jev-client';

describe('JevImageBudget', () => {
	it('defaults to a cap of 25 images and rejects invalid limits', () => {
		const budget = new JevImageBudget();
		expect(budget.maxImages).toBe(DEFAULT_MAX_JEV_IMAGES);
		expect(budget.maxImages).toBe(25);
		expect(budget.used).toBe(0);
		expect(budget.remaining).toBe(25);

		expect(() => new JevImageBudget({ maxImages: -1 })).toThrow(
			'non-negative integer',
		);
		expect(() => new JevImageBudget({ maxImages: 2.5 })).toThrow(
			'non-negative integer',
		);
	});

	it('checks without consuming and throws once a request exceeds remaining capacity', () => {
		const budget = new JevImageBudget({ maxImages: 3 });
		budget.check(3);
		expect(budget.used).toBe(0);
		budget.consume(2);
		expect(budget.used).toBe(2);
		expect(budget.remaining).toBe(1);
		expect(() => budget.check(2)).toThrow('Jev image budget exceeded');
		expect(() => budget.consume(2)).toThrow('Jev image budget exceeded');
		expect(budget.used).toBe(2);
	});
});

describe('GuardedJev', () => {
	it('serves unchanged requests from disk cache without re-sending or spending budget', async () => {
		const fs = new FakeFs();
		const inner = new FakeJev([
			{
				example: {
					type: 'box',
					box: { top: 0.1, left: 0.2, right: 0.8, bottom: 0.3 },
					confidence: 0.96,
				},
			},
		]);
		const firstRun = new GuardedJev(inner, {
			cacheDir: '/cache',
			fs,
			maxImages: 2,
		});
		const req = boxRequest('p1');

		const firstAnswer = await firstRun.query(req);
		expect(inner.queries).toHaveLength(1);
		expect(firstRun.usedImages).toBe(1);
		expect(firstRun.misses).toBe(1);
		expect(firstRun.hits).toBe(0);

		const secondRun = new GuardedJev(inner, {
			cacheDir: '/cache',
			fs,
			maxImages: 0,
		});
		const cachedAnswer = await secondRun.query(req);
		expect(cachedAnswer).toEqual(firstAnswer);
		expect(inner.queries).toHaveLength(1);
		expect(secondRun.usedImages).toBe(0);
		expect(secondRun.hits).toBe(1);
		expect(secondRun.misses).toBe(0);
	});

	it('deduplicates concurrent identical requests so an image is never sent twice', async () => {
		const fs = new FakeFs();
		const inner = new FakeJev();
		const guarded = new GuardedJev(inner, {
			cacheDir: '/cache',
			fs,
			maxImages: 1,
		});
		const req = boxRequest('concurrent');

		const [first, second] = await Promise.all([
			guarded.query(req),
			guarded.query(req),
		]);
		expect(first).toEqual(second);
		expect(inner.queries).toHaveLength(1);
		expect(guarded.usedImages).toBe(1);
		expect(guarded.hits).toBe(1);
		expect(guarded.misses).toBe(1);
	});

	it('refuses an oversized batch in preflight before making any API call', async () => {
		const fs = new FakeFs();
		const inner = new FakeJev();
		const guarded = new GuardedJev(inner, { cacheDir: '/cache', fs });
		const batch = Array.from({ length: 26 }, (_, index) =>
			boxRequest(`page-${index}`),
		);

		expect(guarded.queryBatch(batch)).rejects.toThrow(
			'Jev image budget exceeded: requested 26 uncached images, but only 25 of 25 remaining',
		);
		expect(inner.queries).toHaveLength(0);
		expect(guarded.usedImages).toBe(0);
	});

	it('counts only unique uncached images during batch preflight and execution', async () => {
		const fs = new FakeFs();
		const seedInner = new FakeJev();
		const seeder = new GuardedJev(seedInner, {
			cacheDir: '/cache',
			fs,
			maxImages: 5,
		});
		await seeder.query(boxRequest('cached-1'));
		await seeder.query(boxRequest('cached-2'));

		const runInner = new FakeJev();
		const guarded = new GuardedJev(runInner, {
			cacheDir: '/cache',
			fs,
			maxImages: 2,
		});
		const batch = [
			boxRequest('cached-1'),
			boxRequest('fresh-1'),
			boxRequest('fresh-1'),
			boxRequest('cached-2'),
			boxRequest('fresh-2'),
		];

		const plan = await guarded.preflight(batch);
		expect(plan).toEqual({
			totalRequests: 5,
			cachedRequests: 3,
			uncachedRequests: 2,
			uncachedImages: 2,
			remainingAfter: 0,
		});
		expect(runInner.queries).toHaveLength(0);

		const results = await guarded.queryBatch(batch);
		expect(results).toHaveLength(5);
		expect(runInner.queries).toHaveLength(2);
		expect(guarded.usedImages).toBe(2);
		expect(guarded.remainingImages).toBe(0);
		expect(guarded.hits).toBe(3);
		expect(guarded.misses).toBe(2);
	});

	it('enforces the per-run cap across sequential single queries and ask() calls', async () => {
		const fs = new FakeFs();
		const inner = new FakeJev([{ same: 0.9 }, { same: 0.8 }]);
		const guarded = new GuardedJev(inner, {
			cacheDir: '/cache',
			fs,
			maxImages: 2,
		});

		const first = await guarded.ask({
			images: { a: Buffer.from('a'), b: Buffer.from('b') },
			questions: { same: 'same music?' },
		});
		expect(first).toEqual({ same: 0.9 });
		expect(guarded.usedImages).toBe(2);

		expect(
			guarded.ask({
				images: { a: Buffer.from('c') },
				questions: { same: 'different image?' },
			}),
		).rejects.toThrow('Jev image budget exceeded');
		expect(inner.queries).toHaveLength(1);
	});

	it('supports disabling the cache while still enforcing the image cap', async () => {
		const inner = new FakeJev();
		const guarded = new GuardedJev(inner, { useCache: false, maxImages: 1 });
		const req = boxRequest('same');

		await guarded.query(req);
		expect(guarded.query(req)).rejects.toThrow('Jev image budget exceeded');
		expect(inner.queries).toHaveLength(1);
	});
});

function boxRequest(label: string): JevQueryRequest {
	return {
		images: { page: Buffer.from(`page-${label}`) },
		questions: {
			example: {
				type: 'box',
				instructions: `find example ${label} in \`page\``,
			},
		},
	};
}
