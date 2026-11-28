import { describe, expect, it } from 'bun:test';
import { MemoryLogger } from 'core/log';
import { FakeFs } from 'core/system/testing';
import { PNG } from 'pngjs';
import { FakeJev } from './fake-jev';
import { LEDGER_FILE, RULE_NOTES_DIR } from './rule-notes';
import {
	composeBeforeAfterPng,
	diffCropPixels,
	sortTriageItems,
	type TriageCheckItem,
	triageRuleCrops,
} from './rule-triage';
import {
	ENGRAVING_FIXTURES_DIR,
	MARKS_DIR,
	SCREENSHOTS_DIR,
	VERDICTS_DIR,
} from './rule-verdicts';
import { rulesTriage } from './rules-triage-command';

describe('rule-triage', () => {
	it('diffs crop pixels exactly and detects moved pixels or dimension changes', () => {
		const a = solidPng(40, 20, [255, 255, 255]);
		const b = solidPng(40, 20, [255, 255, 255]);
		expect(diffCropPixels(a, b)).toEqual({
			changed: false,
			movedPixels: 0,
			totalPixels: 800,
		});

		paintPixel(b, 10, 5, [0, 0, 0]);
		expect(diffCropPixels(a, b)).toEqual({
			changed: true,
			movedPixels: 1,
			totalPixels: 800,
		});

		const wider = solidPng(42, 20, [255, 255, 255]);
		expect(diffCropPixels(a, wider)).toEqual({
			changed: true,
			movedPixels: 40,
			totalPixels: 840,
		});
	});

	it('composes one labeled Before/After PNG within Jev image bounds', () => {
		const before = solidPng(120, 60, [255, 255, 255]);
		const after = solidPng(120, 60, [255, 255, 255]);
		paintPixel(after, 20, 20, [0, 0, 0]);

		const composed = PNG.sync.read(composeBeforeAfterPng(before, after));
		expect(composed.width).toBeGreaterThanOrEqual(280);
		expect(composed.height).toBeGreaterThanOrEqual(280);
		expect(composed.width).toBeLessThanOrEqual(1568);
		expect(composed.height).toBeLessThanOrEqual(1568);
	});

	it('skips unchanged checks with zero Jev API calls', async () => {
		const { fs, readAt } = await setupFixture({
			rules: [
				{
					id: 'stem-length',
					page: '14',
					rule: 'Stems are 3.5 spaces.',
					checks: [
						{
							question: 'Is the stem 3.5 spaces long?',
							crop: 'measure 1, 5 spaces',
						},
					],
				},
			],
			beforeMark: null,
			afterMark: null,
		});
		const fake = new FakeJev([], false);

		const report = await triageRuleCrops({
			since: 'main',
			client: fake,
			readAt,
			fs,
		});

		expect(fake.queries).toHaveLength(0);
		expect(report).toMatchObject({
			since: 'main',
			scannedRules: 1,
			scannedChecks: 1,
			movedChecks: 0,
			skippedUnchanged: 1,
			skippedMissingBefore: 0,
			skippedMissingAfter: 0,
			uncachedImages: 0,
			items: [],
		});
	});

	it('sends one Before/After image and two batched questions per moved check, then hits cache on rerun', async () => {
		const { fs, readAt } = await setupFixture({
			rules: [
				{
					id: 'stem-length',
					page: '14',
					rule: 'Stems are 3.5 spaces.',
					checks: [
						{
							question: 'Is the first stem 3.5 spaces long?',
							crop: 'measure 1, 5 spaces',
						},
						{
							question: 'Is the second stem 3.5 spaces long?',
							crop: 'measure 2, 5 spaces',
						},
					],
				},
			],
			// Only measure 1 moves; measure 2 stays identical.
			beforeMark: { x: 25, y: 60 },
			afterMark: { x: 30, y: 60 },
		});
		const fake = new FakeJev([
			{
				check: { type: 'noul', noul: 0.94 },
				verdict: {
					type: 'choice',
					choice: 'spacing_shift',
					confidence: 0.91,
					probabilities: {
						clearly_matches: 0.07,
						spacing_shift: 0.91,
						regression: 0.02,
					},
				},
			},
		]);

		const first = await triageRuleCrops({
			since: 'main',
			cacheDir: '.cache/jev-test',
			client: fake,
			readAt,
			fs,
		});

		expect(fake.queries).toHaveLength(1);
		const req = fake.queries[0];
		expect(Object.keys(req?.images ?? {})).toEqual(['comparison']);
		expect(Object.keys(req?.questions ?? {})).toEqual(['check', 'verdict']);
		expect(req?.questions.check?.type).toBe('noul');
		expect(req?.questions.verdict?.type).toBe('choice');
		expect(first).toMatchObject({
			scannedChecks: 2,
			movedChecks: 1,
			skippedUnchanged: 1,
			uncachedImages: 1,
			cacheHits: 0,
			cacheMisses: 1,
			counts: {
				regressions: 0,
				lowConfidence: 0,
				spacingShifts: 1,
				clearlyMatches: 0,
			},
		});

		const second = await triageRuleCrops({
			since: 'main',
			cacheDir: '.cache/jev-test',
			client: fake,
			readAt,
			fs,
		});

		expect(fake.queries).toHaveLength(1);
		expect(second).toMatchObject({
			movedChecks: 1,
			uncachedImages: 0,
			cacheHits: 1,
			cacheMisses: 0,
		});
		expect(second.items[0]).toMatchObject({
			ruleId: 'stem-length',
			checkN: 1,
			verdict: 'spacing_shift',
			priority: 'spacing-shift',
		});
	});

	it('enforces --max-images before issuing any Jev API call', async () => {
		const { fs, readAt } = await setupFixture({
			rules: [
				{
					id: 'stem-length',
					page: '14',
					rule: 'Stems are 3.5 spaces.',
					checks: [
						{ question: 'First check?', crop: 'measure 1, 5 spaces' },
						{ question: 'Second check?', crop: 'measure 2, 5 spaces' },
					],
				},
			],
			beforeMark: [
				{ x: 25, y: 60 },
				{ x: 145, y: 60 },
			],
			afterMark: [
				{ x: 30, y: 60 },
				{ x: 150, y: 60 },
			],
		});
		const fake = new FakeJev();

		await expect(
			triageRuleCrops({
				since: 'main',
				maxImages: 1,
				cacheDir: '.cache/jev-budget',
				client: fake,
				readAt,
				fs,
			}),
		).rejects.toThrow('Jev image budget exceeded');
		expect(fake.queries).toHaveLength(0);
	});

	it('orders regressions first, then low-confidence checks, then spacing shifts, then clearly matching', () => {
		const items: TriageCheckItem[] = [
			makeItem(
				'r-clear',
				1,
				'clearly_matches',
				0.95,
				0.96,
				false,
				'clearly-matches',
			),
			makeItem(
				'r-shift',
				1,
				'spacing_shift',
				0.92,
				0.9,
				false,
				'spacing-shift',
			),
			makeItem(
				'r-low-b',
				1,
				'spacing_shift',
				0.65,
				0.88,
				true,
				'low-confidence',
			),
			makeItem(
				'r-low-a',
				1,
				'clearly_matches',
				0.85,
				0.55,
				true,
				'low-confidence',
			),
			makeItem('r-reg-lo', 1, 'regression', 0.72, 0.25, false, 'regression'),
			makeItem('r-reg-hi', 1, 'regression', 0.95, 0.1, false, 'regression'),
		];

		expect(sortTriageItems(items).map((item) => item.ruleId)).toEqual([
			'r-reg-hi',
			'r-reg-lo',
			'r-low-a',
			'r-low-b',
			'r-shift',
			'r-clear',
		]);
	});

	it('prints an advisory table or JSON without writing verdict files', async () => {
		const { fs, readAt } = await setupFixture({
			rules: [
				{
					id: 'stem-length',
					page: '14',
					rule: 'Stems are 3.5 spaces.',
					checks: [
						{ question: 'Is the stem clear?', crop: 'measure 1, 5 spaces' },
					],
				},
			],
			beforeMark: { x: 25, y: 60 },
			afterMark: { x: 30, y: 60 },
		});
		const fake = new FakeJev([
			{
				check: { type: 'noul', noul: 0.12 },
				verdict: {
					type: 'choice',
					choice: 'regression',
					confidence: 0.93,
					probabilities: {
						clearly_matches: 0.02,
						spacing_shift: 0.05,
						regression: 0.93,
					},
				},
			},
		]);

		const tableLog = new MemoryLogger();
		await rulesTriage({
			since: 'main',
			cacheDir: '.cache/jev-cli',
			client: fake,
			readAt,
			fs,
			log: tableLog,
		});
		const output = tableLog.entries
			.map((entry) => String(entry.message))
			.join('\n');
		expect(output).toContain('regression');
		expect(output).toContain('stem-length#1');
		expect(output).toContain('advisory only');
		expect(await fs.exists(VERDICTS_DIR)).toBe(false);

		const jsonLog = new MemoryLogger();
		await rulesTriage({
			since: 'main',
			json: true,
			cacheDir: '.cache/jev-cli',
			client: fake,
			readAt,
			fs,
			log: jsonLog,
		});
		const parsed = JSON.parse(String(jsonLog.entries[0]?.message ?? '{}')) as {
			movedChecks: number;
			counts: { regressions: number };
		};
		expect(parsed).toMatchObject({
			movedChecks: 1,
			counts: { regressions: 1 },
		});
	});
});

interface Point {
	x: number;
	y: number;
}

interface SetupRule {
	id: string;
	page: string;
	rule: string;
	checks: { question: string; crop: string }[];
}

interface SetupFixtureOptions {
	rules: SetupRule[];
	beforeMark: Point | Point[] | null;
	afterMark: Point | Point[] | null;
}

async function setupFixture(opts: SetupFixtureOptions): Promise<{
	fs: FakeFs;
	readAt: (ref: string, repoPath: string) => Promise<Uint8Array | null>;
}> {
	const fs = new FakeFs();
	const rows = opts.rules
		.map(
			(r) =>
				`| ${r.id} | ${r.page} | ${r.rule} | pending | [${r.id}](engraving-${r.id}.test.ts) |`,
		)
		.join('\n');
	await fs.write(
		LEDGER_FILE,
		[
			'| Id | Page | Rule | Status | Link |',
			'| --- | --- | --- | --- | --- |',
			rows,
			'',
		].join('\n'),
	);

	const geometry = {
		screenshot: 'engraving_stem_length.png',
		measures: [
			{ index: 0, system: 0, x: 20, w: 100 },
			{ index: 1, system: 0, x: 140, w: 100 },
		],
		staves: [
			{
				part: 0,
				measure: 0,
				staff: 1,
				lines: [50, 60, 70, 80, 90],
				x: 20,
				w: 100,
			},
			{
				part: 0,
				measure: 1,
				staff: 1,
				lines: [50, 60, 70, 80, 90],
				x: 140,
				w: 100,
			},
		],
	};

	const beforePng = solidPng(260, 140, [255, 255, 255]);
	const afterPng = solidPng(260, 140, [255, 255, 255]);
	for (const pt of toPoints(opts.beforeMark)) {
		paintPixel(beforePng, pt.x, pt.y, [0, 0, 0]);
	}
	for (const pt of toPoints(opts.afterMark)) {
		paintPixel(afterPng, pt.x, pt.y, [0, 0, 0]);
	}
	const beforeBytes = PNG.sync.write(beforePng);
	const afterBytes = PNG.sync.write(afterPng);
	const geometryJson = JSON.stringify(geometry);

	const gitFiles = new Map<string, Uint8Array>();
	for (const r of opts.rules) {
		const fixtureName = r.id;
		const checksText = r.checks
			.map((c, idx) => `${idx + 1}. ${c.question}\n   Crop: ${c.crop}`)
			.join('\n');
		await fs.write(
			`${RULE_NOTES_DIR}/${r.id}.md`,
			`### The rule\n\n${r.rule}\n\n### Checks\n\n${checksText}\n`,
		);
		await fs.write(
			`${ENGRAVING_FIXTURES_DIR}/${fixtureName}.musicxml`,
			'<score-partwise/>',
		);
		await fs.writeBytes(
			`${SCREENSHOTS_DIR}/engraving_${fixtureName}.png`,
			afterBytes,
		);
		await fs.write(
			`${MARKS_DIR}/engraving_${fixtureName}.geometry.json`,
			geometryJson,
		);
		gitFiles.set(
			`vexml/${SCREENSHOTS_DIR}/engraving_${fixtureName}.png`,
			beforeBytes,
		);
		gitFiles.set(
			`vexml/${MARKS_DIR}/engraving_${fixtureName}.geometry.json`,
			Buffer.from(geometryJson, 'utf8'),
		);
	}

	const readAt = async (
		_ref: string,
		repoPath: string,
	): Promise<Uint8Array | null> => gitFiles.get(repoPath) ?? null;

	return { fs, readAt };
}

function toPoints(input: Point | Point[] | null): Point[] {
	if (input === null) {
		return [];
	}
	return Array.isArray(input) ? input : [input];
}

function solidPng(
	width: number,
	height: number,
	rgb: readonly [number, number, number],
): PNG {
	const png = new PNG({ width, height });
	for (let i = 0; i < width * height; i++) {
		const offset = i * 4;
		png.data[offset] = rgb[0];
		png.data[offset + 1] = rgb[1];
		png.data[offset + 2] = rgb[2];
		png.data[offset + 3] = 255;
	}
	return png;
}

function paintPixel(
	png: PNG,
	x: number,
	y: number,
	rgb: readonly [number, number, number],
): void {
	const offset = (y * png.width + x) * 4;
	png.data[offset] = rgb[0];
	png.data[offset + 1] = rgb[1];
	png.data[offset + 2] = rgb[2];
	png.data[offset + 3] = 255;
}

function makeItem(
	ruleId: string,
	checkN: number,
	verdict: TriageCheckItem['verdict'],
	verdictConfidence: number,
	checkScore: number,
	lowConfidence: boolean,
	priority: TriageCheckItem['priority'],
): TriageCheckItem {
	return {
		ruleId,
		checkN,
		page: '14',
		rule: 'Test rule.',
		fixtureName: ruleId.replaceAll('-', '_'),
		question: 'Does it match?',
		verdict,
		verdictConfidence,
		verdictProbabilities: {
			clearly_matches: verdict === 'clearly_matches' ? verdictConfidence : 0.05,
			spacing_shift: verdict === 'spacing_shift' ? verdictConfidence : 0.05,
			regression: verdict === 'regression' ? verdictConfidence : 0.05,
		},
		checkScore,
		lowConfidence,
		priority,
		movedPixels: 12,
		totalPixels: 400,
		beforeSize: { width: 20, height: 20 },
		afterSize: { width: 20, height: 20 },
	};
}
