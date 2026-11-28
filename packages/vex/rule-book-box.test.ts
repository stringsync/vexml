import { describe, expect, it } from 'bun:test';
import { FakeFs } from 'core/system/testing';
import { PNG } from 'pngjs';
import { FakeJev } from './fake-jev';
import { prepareJevImageWithTransform } from './jev-image';
import { BookCropper } from './rule-book';
import {
	BookBoxFinder,
	formatBookLine,
	validateBookBoxCrop,
} from './rule-book-box';
import { parseBookBox } from './rule-checks';

describe('BookBoxFinder', () => {
	it('batches multiple queries for one page into a single Jev box request', async () => {
		const { fs, cropper } = await makeBookWithStaves();
		const jev = new FakeJev([
			{
				q0: {
					type: 'box',
					box: { top: 0.2, left: 0.1, right: 0.6, bottom: 0.4 },
					confidence: 0.92,
				},
				q1: {
					type: 'box',
					box: { top: 0.6, left: 0.2, right: 0.8, bottom: 0.8 },
					confidence: 0.87,
				},
			},
		]);
		const finder = new BookBoxFinder(cropper, jev, {
			cacheDir: '/cache/jev',
			fs,
		});

		const run = await finder.find([
			{ id: 'rule-a#1', page: '135', description: 'first trill example' },
			{ id: 'rule-b#1', page: '135', description: 'second trill example' },
		]);

		expect(jev.queries).toHaveLength(1);
		expect(Object.keys(jev.queries[0]?.images ?? {})).toEqual(['page']);
		expect(Object.keys(jev.queries[0]?.questions ?? {})).toEqual(['q0', 'q1']);
		expect(jev.queries[0]?.questions.q0?.type).toBe('box');
		expect(run.pages).toBe(1);
		expect(run.uncachedImages).toBe(1);
		expect(run.cacheMisses).toBe(1);
		expect(run.cacheHits).toBe(0);
		expect(run.results.map((r) => r.id)).toEqual(['rule-a#1', 'rule-b#1']);
		expect(run.results[0]?.flags).toEqual([]);
		expect(run.results[0]?.staffSpace).toBeCloseTo(10, 1);
		expect(run.results[1]?.flags).toEqual([]);
		expect(run.results[1]?.staffSpace).toBeCloseTo(10, 1);
	});

	it('un-maps padded Jev coordinates accurately back to original page fractions', async () => {
		const fs = new FakeFs();
		await fs.write(
			'/book/index.json',
			JSON.stringify({ pages: [{ pdf: 1, label: '10' }] }),
		);
		// Narrow tall page triggers horizontal white padding inside prepareJevImageWithTransform.
		const narrowPage = makePageWithStaveBands(120, 600, [
			[150, 160, 170, 180, 190],
		]);
		const rawBytes = PNG.sync.write(narrowPage);
		await fs.writeBytes('/book/pages/page-001.png', rawBytes);
		const { transform } = prepareJevImageWithTransform(rawBytes);

		// Compute the prepared-image coordinates that correspond to original x: 0.25..0.75, y: 0.2..0.4.
		const left =
			(transform.padX + 0.25 * transform.scaledWidth) / transform.preparedWidth;
		const right =
			(transform.padX + 0.75 * transform.scaledWidth) / transform.preparedWidth;
		const top =
			(transform.padY + 0.2 * transform.scaledHeight) /
			transform.preparedHeight;
		const bottom =
			(transform.padY + 0.4 * transform.scaledHeight) /
			transform.preparedHeight;

		const jev = new FakeJev([
			{
				q0: {
					type: 'box',
					box: { top, left, right, bottom },
					confidence: 0.9,
				},
			},
		]);
		const finder = new BookBoxFinder(new BookCropper(fs, '/book'), jev, {
			useCache: false,
			fs,
		});

		const run = await finder.find([
			{ id: 'padded#1', page: '10', description: 'stave on padded page' },
		]);
		const box = run.results[0]?.box;
		expect(box?.x).toBeCloseTo(0.25, 2);
		expect(box?.y).toBeCloseTo(0.2, 2);
		expect(box?.w).toBeCloseTo(0.5, 2);
		expect(box?.h).toBeCloseTo(0.2, 2);
		expect(run.results[0]?.staffSpace).toBeCloseTo(10, 1);
	});

	it('flags stave-less, low-confidence, and collapsed boxes', async () => {
		const { fs, cropper } = await makeBookWithStaves();
		const jev = new FakeJev([
			{
				// Hits the blank middle strip with no stave lines and low confidence.
				q0: {
					type: 'box',
					box: { top: 0.45, left: 0.2, right: 0.5, bottom: 0.52 },
					confidence: 0.31,
				},
				// Tiny collapsed box.
				q1: {
					type: 'box',
					box: { top: 0.22, left: 0.2, right: 0.21, bottom: 0.23 },
					confidence: 0.95,
				},
			},
		]);
		const finder = new BookBoxFinder(cropper, jev, {
			minConfidence: 0.5,
			useCache: false,
			fs,
		});

		const run = await finder.find([
			{ id: 'blank#1', page: '135', description: 'blank region' },
			{ id: 'tiny#1', page: '135', description: 'tiny dot' },
		]);
		expect(run.results[0]?.staffSpace).toBeNull();
		expect(run.results[0]?.flags).toEqual(['low-confidence', 'no-stave']);
		expect(run.results[1]?.flags).toEqual(['tiny-box', 'no-stave']);
	});

	it('reuses the content-hash disk cache without spending image budget on repeats', async () => {
		const { fs, cropper } = await makeBookWithStaves();
		const jev = new FakeJev([
			{
				q0: {
					type: 'box',
					box: { top: 0.2, left: 0.1, right: 0.6, bottom: 0.4 },
					confidence: 0.91,
				},
			},
		]);

		const first = await new BookBoxFinder(cropper, jev, {
			cacheDir: '/cache/jev',
			maxImages: 1,
			fs,
		}).find([{ id: 'r#1', page: '135', description: 'trill above stave' }]);
		expect(first.uncachedImages).toBe(1);
		expect(first.cacheMisses).toBe(1);
		expect(jev.queries).toHaveLength(1);

		const second = await new BookBoxFinder(cropper, jev, {
			cacheDir: '/cache/jev',
			maxImages: 0,
			fs,
		}).find([{ id: 'r#1', page: '135', description: 'trill above stave' }]);
		expect(second.uncachedImages).toBe(0);
		expect(second.cacheHits).toBe(1);
		expect(second.cacheMisses).toBe(0);
		expect(jev.queries).toHaveLength(1);
		expect(second.results[0]?.bookLine).toBe(first.results[0]?.bookLine);
	});

	it('refuses before issuing any Jev call when distinct uncached pages exceed maxImages', async () => {
		const { fs, cropper } = await makeBookWithStaves();
		const jev = new FakeJev();
		const finder = new BookBoxFinder(cropper, jev, {
			maxImages: 1,
			cacheDir: '/cache/jev',
			fs,
		});

		let error: unknown;
		try {
			await finder.find([
				{ id: 'a#1', page: '135', description: 'page 135 example' },
				{ id: 'b#1', page: '136', description: 'page 136 example' },
			]);
		} catch (caught) {
			error = caught;
		}
		expect(error).toBeInstanceOf(Error);
		expect((error as Error).message).toContain('Jev image budget exceeded');
		expect(jev.queries).toHaveLength(0);
	});
});

describe('formatBookLine and validateBookBoxCrop', () => {
	it('clamps rounded Book: lines so parseBookBox always accepts them', () => {
		const line = formatBookLine('135', {
			x: 0.5006,
			y: 0.9004,
			w: 0.4996,
			h: 0.0998,
		});
		const parsed = parseBookBox(line.replace(/^Book:\s*/, ''));
		expect(parsed.page).toBe('135');
		expect(parsed.x + parsed.w).toBeLessThanOrEqual(1);
		expect(parsed.y + parsed.h).toBeLessThanOrEqual(1);
	});

	it('detects staves cleanly on valid crops', () => {
		const page = makePageWithStaveBands(400, 600, [[120, 130, 140, 150, 160]]);
		const validated = validateBookBoxCrop(
			page,
			{ x: 0.1, y: 0.15, w: 0.8, h: 0.2 },
			0.88,
		);
		expect(validated.flags).toEqual([]);
		expect(validated.staffSpace).toBeCloseTo(10, 1);
	});
});

async function makeBookWithStaves() {
	const fs = new FakeFs();
	await fs.write(
		'/book/index.json',
		JSON.stringify({
			pages: [
				{ pdf: 135, label: '135' },
				{ pdf: 136, label: '136' },
			],
		}),
	);
	const p135 = makePageWithStaveBands(400, 600, [
		[150, 160, 170, 180, 190],
		[390, 400, 410, 420, 430],
	]);
	const p136 = makePageWithStaveBands(400, 600, [[200, 210, 220, 230, 240]]);
	await fs.writeBytes('/book/pages/page-135.png', PNG.sync.write(p135));
	await fs.writeBytes('/book/pages/page-136.png', PNG.sync.write(p136));
	return { fs, cropper: new BookCropper(fs, '/book') };
}

function makePageWithStaveBands(
	width: number,
	height: number,
	bands: readonly (readonly number[])[],
): PNG {
	const png = new PNG({ width, height });
	png.data.fill(255);
	for (const lines of bands) {
		for (const y of lines) {
			if (y < 0 || y >= height) {
				continue;
			}
			for (let x = 10; x < width - 10; x++) {
				const i = (y * width + x) * 4;
				png.data[i] = 20;
				png.data[i + 1] = 20;
				png.data[i + 2] = 20;
				png.data[i + 3] = 255;
			}
		}
	}
	return png;
}
