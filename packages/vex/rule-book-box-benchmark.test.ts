import { describe, expect, it } from 'bun:test';
import { MemoryLogger } from 'core/log';
import { FakeFs, FakePs } from 'core/system/testing';
import { PNG } from 'pngjs';
import { FakeJev } from './fake-jev';
import { BookCropper } from './rule-book';
import {
	boxIoU,
	boxOverlap,
	extractRuleDescription,
	runBookBoxBenchmark,
	selectBenchmarkPages,
} from './rule-book-box-benchmark';
import { parseBenchmarkCount, rulesBookBox } from './rules-book-box-command';

describe('book-box benchmark helpers', () => {
	it('computes IoU, recall, precision, and centre-hit accurately', () => {
		const exact = boxOverlap(
			{ x: 0.2, y: 0.3, w: 0.4, h: 0.1 },
			{ x: 0.2, y: 0.3, w: 0.4, h: 0.1 },
		);
		expect(exact.iou).toBeCloseTo(1, 6);
		expect(exact.recall).toBeCloseTo(1, 6);
		expect(exact.precision).toBeCloseTo(1, 6);
		expect(exact.centerHit).toBe(true);

		const half = boxIoU(
			{ x: 0.0, y: 0.0, w: 0.4, h: 0.2 },
			{ x: 0.2, y: 0.0, w: 0.4, h: 0.2 },
		);
		expect(half).toBeCloseTo(1 / 3, 5);

		const disjoint = boxOverlap(
			{ x: 0.1, y: 0.1, w: 0.1, h: 0.1 },
			{ x: 0.5, y: 0.5, w: 0.1, h: 0.1 },
		);
		expect(disjoint.iou).toBe(0);
		expect(disjoint.centerHit).toBe(false);
	});

	it('selects distinct pages evenly stratified in ascending numeric order', () => {
		const pages = ['235', '12', '5', '100', '42', '199', '88', '152'];
		expect(selectBenchmarkPages(pages, 3)).toEqual(['12', '100', '199']);
		expect(selectBenchmarkPages(pages, 20)).toEqual([
			'5',
			'12',
			'42',
			'88',
			'100',
			'152',
			'199',
			'235',
		]);
	});

	it('extracts rule prose without page citation and cleans fixture measure numbers', () => {
		const note = [
			'### The rule',
			'',
			'Place tr above the stave. See Behind Bars p. 135.',
			'',
			'### Checks',
			'',
			'1. Does tr sit above the stave in measure 1?',
		].join('\n');
		expect(
			extractRuleDescription(note, 'Does tr sit above the stave in measure 1?'),
		).toBe(
			'Place tr above the stave. Specific example: Does tr sit above the stave?',
		);
	});

	it('parses --benchmark values', () => {
		expect(parseBenchmarkCount(undefined)).toBeNull();
		expect(parseBenchmarkCount('true')).toBe(10);
		expect(parseBenchmarkCount('5')).toBe(5);
		expect(() => parseBenchmarkCount('0')).toThrow('positive integer');
		expect(() => parseBenchmarkCount('abc')).toThrow('positive integer');
	});
});

describe('runBookBoxBenchmark and rulesBookBox CLI', () => {
	it('compares batched Jev boxes against committed Book: boxes and writes comparison PNGs', async () => {
		const { fs, ps, cropper } = await makeBenchmarkFixture();
		const jev = new FakeJev([
			{
				q0: {
					type: 'box',
					box: { top: 0.2, left: 0.1, right: 0.6, bottom: 0.35 },
					confidence: 0.93,
				},
				q1: {
					type: 'box',
					box: { top: 0.6, left: 0.2, right: 0.7, bottom: 0.75 },
					confidence: 0.88,
				},
			},
			{
				q0: {
					type: 'box',
					box: { top: 0.25, left: 0.15, right: 0.65, bottom: 0.4 },
					confidence: 0.81,
				},
			},
		]);

		const report = await runBookBoxBenchmark({
			pageCount: 2,
			maxImages: 2,
			outputDir: '/tmp/bench-out',
			notesDir: '/notes',
			cacheDir: '/cache/jev',
			cropper,
			client: jev,
			fs,
		});

		expect(jev.queries).toHaveLength(2);
		expect(report.summary.pages).toBe(2);
		expect(report.summary.checks).toBe(3);
		expect(report.summary.meanIoU).toBeGreaterThan(0.8);
		expect(report.summary.actualStaveCount).toBe(3);
		expect(report.summary.expectedStaveCount).toBe(3);
		expect(report.summary.uncachedImages).toBe(2);
		expect(await fs.exists('/tmp/bench-out/page-10.png')).toBe(true);
		expect(await fs.exists('/tmp/bench-out/page-20.png')).toBe(true);
		const rendered = PNG.sync.read(
			Buffer.from(await fs.readBytes('/tmp/bench-out/page-10.png')),
		);
		expect(rendered.width).toBeGreaterThan(400);
		expect(rendered.height).toBeGreaterThan(300);

		// CLI JSON benchmark run hits the warm cache without sending any new Jev request.
		const log = new MemoryLogger();
		await rulesBookBox({
			benchmark: '2',
			maxImages: 2,
			output: '/tmp/bench-cli',
			json: true,
			client: jev,
			cacheDir: '/cache/jev',
			notesDir: '/notes',
			cwd: '/',
			fs,
			ps,
			log,
		});
		expect(jev.queries).toHaveLength(2);
		const parsed = JSON.parse(String(log.entries[0]?.message ?? '{}')) as {
			summary: { cacheHits: number; uncachedImages: number };
		};
		expect(parsed.summary.cacheHits).toBe(2);
		expect(parsed.summary.uncachedImages).toBe(0);
	});

	it('rejects --benchmark larger than --max-images before any Jev call', async () => {
		const { fs, cropper } = await makeBenchmarkFixture();
		const jev = new FakeJev();

		let error: unknown;
		try {
			await runBookBoxBenchmark({
				pageCount: 5,
				maxImages: 2,
				notesDir: '/notes',
				outputDir: '/tmp/bench-cap',
				cropper,
				client: jev,
				fs,
			});
		} catch (caught) {
			error = caught;
		}
		expect(error).toBeInstanceOf(Error);
		expect((error as Error).message).toContain(
			'--benchmark 5 exceeds --max-images 2',
		);
		expect(jev.queries).toHaveLength(0);
	});

	it('supports direct --page + --query and --rule modes and refuses when Jev is unavailable', async () => {
		const { fs, ps } = await makeBenchmarkFixture();
		const log = new MemoryLogger();
		const jev = new FakeJev([
			{
				q0: {
					type: 'box',
					box: { top: 0.2, left: 0.1, right: 0.6, bottom: 0.35 },
					confidence: 0.9,
				},
			},
		]);

		await rulesBookBox({
			page: '10',
			queries: ['upper stave example'],
			output: '/tmp/direct-overlay',
			client: jev,
			cacheDir: '/cache/jev-direct',
			cwd: '/',
			fs,
			ps,
			log,
		});
		const out = log.entries.map((e) => String(e.message)).join('\n');
		expect(out).toContain('Book: p. 10,');
		expect(out).toContain('stave');
		expect(await fs.exists('/tmp/direct-overlay/page-10.png')).toBe(true);

		const disabled = new FakeJev([], false);
		let unavailableErr: unknown;
		try {
			await rulesBookBox({
				page: '10',
				queries: ['upper stave example'],
				client: disabled,
				cwd: '/',
				fs,
				ps,
				log: new MemoryLogger(),
			});
		} catch (caught) {
			unavailableErr = caught;
		}
		expect(unavailableErr).toBeInstanceOf(Error);
		expect((unavailableErr as Error).message).toContain('TYPESAFE_API_KEY');
	});
});

async function makeBenchmarkFixture() {
	const fs = new FakeFs();
	const ps = new FakePs();
	ps.setEnv({ VEXML_BOOK_DIR: '/book' });
	await fs.mkdir('/notes', { recursive: true });
	await fs.write(
		'/book/index.json',
		JSON.stringify({
			pages: [
				{ pdf: 10, label: '10' },
				{ pdf: 20, label: '20' },
			],
		}),
	);
	const page10 = makeStavePage(400, 600, [
		[150, 160, 170, 180, 190],
		[390, 400, 410, 420, 430],
	]);
	const page20 = makeStavePage(400, 600, [[175, 185, 195, 205, 215]]);
	await fs.writeBytes('/book/pages/page-010.png', PNG.sync.write(page10));
	await fs.writeBytes('/book/pages/page-020.png', PNG.sync.write(page20));

	await fs.write(
		'/notes/rule-alpha.md',
		[
			'### The rule',
			'',
			'Upper and lower examples on page 10. See Behind Bars p. 10.',
			'',
			'### Checks',
			'',
			'1. Does the upper example align?',
			'   Crop: measure 1',
			'   Book: p. 10, 0.100 0.200 0.500 0.150',
			'2. Does the lower example align?',
			'   Crop: measure 2',
			'   Book: p. 10, 0.200 0.600 0.500 0.150',
		].join('\n'),
	);
	await fs.write(
		'/notes/rule-beta.md',
		[
			'### The rule',
			'',
			'Single stave example on page 20. See Behind Bars p. 20.',
			'',
			'### Checks',
			'',
			'1. Does the middle stave align?',
			'   Crop: measure 1',
			'   Book: p. 20, 0.150 0.250 0.500 0.150',
		].join('\n'),
	);
	return { fs, ps, cropper: new BookCropper(fs, '/book') };
}

function makeStavePage(
	width: number,
	height: number,
	bands: readonly (readonly number[])[],
): PNG {
	const png = new PNG({ width, height });
	png.data.fill(255);
	for (const lines of bands) {
		for (const y of lines) {
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
