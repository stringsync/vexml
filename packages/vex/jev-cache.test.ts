import { describe, expect, it } from 'bun:test';
import { FakeFs } from 'core/system/testing';
import { DEFAULT_JEV_CACHE_DIR, JevCache } from './jev-cache';
import type { JevQueryRequest } from './jev-client';

describe('JevCache', () => {
	it('defaults to vexml/.cache/jev', () => {
		expect(DEFAULT_JEV_CACHE_DIR.replaceAll('\\', '/')).toMatch(
			/\/vexml\/\.cache\/jev$/,
		);
	});

	it('computes identical keys regardless of property insertion order', () => {
		const cache = new JevCache({ dir: '/cache', fs: new FakeFs() });
		const a = cache.keyFor({
			images: { b: Buffer.from('two'), a: Buffer.from('one') },
			state: { z: 1, a: { second: true, first: false } },
			questions: {
				q2: { type: 'box', instructions: 'find' },
				q1: {
					type: 'choice',
					instructions: 'pick',
					criteria: { y: 'yes', x: 'no' },
				},
			},
		});
		const b = cache.keyFor({
			images: { a: Buffer.from('one'), b: Buffer.from('two') },
			state: { a: { first: false, second: true }, z: 1 },
			questions: {
				q1: {
					type: 'choice',
					instructions: 'pick',
					criteria: { x: 'no', y: 'yes' },
				},
				q2: { type: 'box', instructions: 'find' },
			},
		});
		expect(a).toBe(b);
	});

	it('changes the cache key when model, image bytes, state, or questions change', () => {
		const fs = new FakeFs();
		const baseCache = new JevCache({ dir: '/cache', fs, model: 'jev-1.14.0' });
		const otherModel = new JevCache({ dir: '/cache', fs, model: 'jev-1.15.0' });
		const req = sampleRequest();
		const baseKey = baseCache.keyFor(req);

		expect(otherModel.keyFor(req)).not.toBe(baseKey);
		expect(
			baseCache.keyFor(
				sampleRequest({ images: { page: Buffer.from('different') } }),
			),
		).not.toBe(baseKey);
		expect(
			baseCache.keyFor(sampleRequest({ state: { extra: 'note' } })),
		).not.toBe(baseKey);
		expect(
			baseCache.keyFor(
				sampleRequest({
					questions: {
						...req.questions,
						example: {
							type: 'box',
							instructions: 'the second music example in `page`',
						},
					},
				}),
			),
		).not.toBe(baseKey);
	});

	it('round-trips typed answers on disk without writing raw image bytes', async () => {
		const fs = new FakeFs();
		const cache = new JevCache({ dir: '/cache', fs });
		const req = sampleRequest({
			images: { page: Buffer.from('SUPER_SECRET_RAW_IMAGE_BYTES') },
		});
		const expected = {
			example: {
				type: 'box' as const,
				box: { top: 0.1, left: 0.2, right: 0.8, bottom: 0.4 },
				confidence: 0.93,
			},
			verdict: {
				type: 'choice' as const,
				choice: 'match',
				confidence: 0.9,
				probabilities: { match: 0.9, shift: 0.1 },
			},
		};

		expect(await cache.has(req)).toBe(false);
		expect(await cache.get(req)).toBeNull();

		await cache.set(req, expected);
		expect(await cache.has(req)).toBe(true);
		expect(await cache.get(req)).toEqual(expected);

		const file = cache.fileFor(cache.keyFor(req));
		const storedText = await fs.read(file);
		expect(storedText).not.toContain('SUPER_SECRET_RAW_IMAGE_BYTES');
		expect(storedText).not.toContain(
			Buffer.from('SUPER_SECRET_RAW_IMAGE_BYTES').toString('base64'),
		);
	});

	it('treats corrupt or mismatched cache files as cache misses', async () => {
		const fs = new FakeFs();
		const cache = new JevCache({ dir: '/cache', fs });
		const req = sampleRequest();
		const file = cache.fileFor(cache.keyFor(req));

		await fs.mkdir('/cache', { recursive: true });
		await fs.write(file, '{not valid json');
		expect(await cache.has(req)).toBe(false);
		expect(await cache.get(req)).toBeNull();

		await fs.write(
			file,
			JSON.stringify({
				v: 1,
				model: cache.model,
				key: cache.keyFor(req),
				answers: { example: { type: 'noul', noul: 0.5 } },
			}),
		);
		expect(await cache.has(req)).toBe(false);
		expect(await cache.get(req)).toBeNull();
	});
});

function sampleRequest(
	overrides: Partial<JevQueryRequest> = {},
): JevQueryRequest {
	return {
		images: { page: Buffer.from('png-bytes-page-1') },
		questions: {
			example: {
				type: 'box',
				instructions: 'the first music example in `page`',
			},
			verdict: {
				type: 'choice',
				instructions: 'classify the crop',
				criteria: { match: 'matches', shift: 'shifted' },
			},
		},
		...overrides,
	};
}
