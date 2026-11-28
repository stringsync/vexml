import { describe, expect, it } from 'bun:test';
import { tmpdir } from 'node:os';
import { FakeFs, FakePs } from 'core/system/testing';
import { PNG } from 'pngjs';
import { LEDGER_FILE, RULE_NOTES_DIR } from './rule-notes';
import {
	collectStrip,
	defaultStripPath,
	parseAnswerGroups,
	type ReferenceSource,
	STRIP_SPACE_PX,
	type StripModel,
	stripHtml,
	stripWidth,
	tileSize,
} from './rule-strip';
import {
	ENGRAVING_FIXTURES_DIR,
	INTEGRATION_DIR,
	MARKS_DIR,
	SCREENSHOTS_DIR,
} from './rule-verdicts';

describe('rule strip layout', () => {
	it('scales every tile to one staff-space size', () => {
		expect(tileSize({ width: 80, height: 120, space: 10 })).toEqual({
			width: 112,
			height: 168,
		});
		// An SVG crop in its own units lands at the same size per space.
		expect(tileSize({ width: 720, height: 1080, space: 90 })).toEqual({
			width: 112,
			height: 168,
		});
		expect(tileSize({ width: 10, height: 10, space: 10 }, 20).width).toBe(20);
	});

	it('is as wide as its widest single tile, and never narrower than the minimum column', () => {
		const narrow = model([
			{ label: 'vexml', group: 'vexml', image: img(10) },
			{ label: 'OSMD', group: 'reference', image: img(10) },
		]);
		expect(stripWidth(narrow)).toBe(2 * 20 + 480);
		const wide = model([
			{ label: 'vexml', group: 'vexml', image: img(500) },
			{ label: 'OSMD', group: 'reference', image: img(700) },
		]);
		const widestTile = 700 * (STRIP_SPACE_PX / 10) + 2 * 6 + 2;
		expect(stripWidth(wide)).toBe(2 * 20 + widestTile);
	});

	it('stacks primary tiles above a References divider and shows why a tile is missing', () => {
		const html = stripHtml(
			model([
				{ label: 'Behind Bars p. 5', group: 'book', reason: 'no <book>' },
				{
					label: 'vexml: without the fix (main)',
					group: 'vexml',
					image: img(10),
				},
				{ label: 'vexml: with the fix', group: 'vexml', image: img(10) },
				{ label: 'MuseScore', group: 'reference', image: img(10) },
				{ label: 'Verovio', group: 'reference', image: img(10) },
			]),
		);
		expect(html).toContain('<h1>A stem is 3½ spaces &amp; no more.</h1>');
		expect(html).toContain('Behind Bars p. 14 · stem-length');
		expect(html).not.toContain('Fix review');
		expect(html).toContain('Check 1: Is the stem long enough?');
		expect(html).toContain('no &lt;book&gt;');
		expect(html.match(/class="sep"/g)).toHaveLength(1);
		expect(html).toContain('<span>References</span>');
		expect(html.match(/<img /g)).toHaveLength(4);
	});

	it('omits the References divider when there are no reference tiles', () => {
		const html = stripHtml(
			model([{ label: 'vexml', group: 'vexml', image: img(10) }]),
		);
		expect(html).not.toContain('class="sep"');
	});

	it('names a fix review in a banner', () => {
		const html = stripHtml({
			...model([
				{ label: 'vexml: with the fix', group: 'vexml', image: img(10) },
			]),
			since: 'main',
		});
		expect(html).toContain(
			'Fix review: vexml without the fix (main) and with it',
		);
	});

	it('stacks tiles under lettered answer groups, showing each letter once', () => {
		const html = stripHtml({
			...model([
				{
					label: 'Behind Bars p. 14',
					group: 'book',
					key: 'book',
					image: img(10),
				},
				{ label: 'vexml', group: 'vexml', key: 'vexml', image: img(10) },
				{
					label: 'MuseScore',
					group: 'reference',
					key: 'musescore',
					image: img(10),
				},
				{ label: 'OSMD', group: 'reference', key: 'osmd', image: img(10) },
				{
					label: 'Verovio',
					group: 'reference',
					key: 'verovio',
					image: img(10),
				},
			]),
			groups: parseAnswerGroups(
				'A=book,musescore: each sharp bracketed; B=vexml,osmd: plain sharps',
			),
		});
		expect(html).not.toContain('References');
		const a = html.indexOf('each sharp bracketed');
		const b = html.indexOf('plain sharps');
		expect(a).toBeGreaterThan(-1);
		expect(b).toBeGreaterThan(a);
		// Book and MuseScore sit under A, vexml and OSMD under B, Verovio left over.
		expect(html.indexOf('Behind Bars p. 14</figcaption>')).toBeGreaterThan(a);
		expect(html.indexOf('MuseScore</figcaption>')).toBeLessThan(b);
		expect(html.indexOf('>vexml</figcaption>')).toBeGreaterThan(b);
		expect(html.match(/class="badge">A</g)).toHaveLength(1);
		expect(html.match(/class="badge">B</g)).toHaveLength(1);
		expect(html.match(/class="badge/g)).toHaveLength(2);
		expect(html).toContain('<figcaption>MuseScore</figcaption>');
		expect(html.indexOf('Not grouped')).toBeGreaterThan(b);
		expect(html.indexOf('>Verovio</figcaption>')).toBeGreaterThan(
			html.indexOf('Not grouped'),
		);
	});

	it('reads answer groups and refuses malformed ones', () => {
		expect(
			parseAnswerGroups('A = Book, MuseScore : bracketed ;B=vexml'),
		).toEqual([
			{ letter: 'A', description: 'bracketed', keys: ['book', 'musescore'] },
			{ letter: 'B', description: '', keys: ['vexml'] },
		]);
		expect(() => parseAnswerGroups('A=finale')).toThrow(
			'unknown tile "finale"',
		);
		expect(() => parseAnswerGroups('A=vexml;B=vexml')).toThrow(
			'tile vexml is in two answer groups',
		);
		expect(() => parseAnswerGroups('A=vexml;A=osmd')).toThrow('given twice');
		expect(() => parseAnswerGroups('ab=vexml')).toThrow('one capital letter');
		expect(() => parseAnswerGroups('vexml')).toThrow('<letter>=<tile>');
		expect(() => parseAnswerGroups(' ; ')).toThrow('names no answer groups');
	});

	it('writes outside the repository by default', () => {
		expect(defaultStripPath('stem-length', 2)).toBe(
			`${tmpdir()}/vex-rule-strip/stem-length-check-2.png`,
		);
		expect(defaultStripPath('stem-length')).toEndWith('/stem-length.png');
	});
});

describe('collecting a rule strip', () => {
	it('lines up the book, vexml before and after, and the reference renderers', async () => {
		const fs = await ruleFs(CHECKS_NOTE);
		const asked: string[] = [];
		const strip = await collectStrip({
			id: 'stem-length',
			since: 'main',
			fs,
			ps: new FakePs(),
			references: fakeReferences,
			readAt: async (ref, repoPath) => {
				asked.push(`${ref}:${repoPath}`);
				return fs.readBytes(repoPath.replace(/^vexml\//, ''));
			},
		});
		expect(strip.rule).toBe('A stem is 3½ spaces.');
		expect(strip.rows).toHaveLength(2);
		const [first] = strip.rows;
		expect(first?.question).toBe('Is the stem long enough?');
		expect(first?.tiles.map((t) => t.label)).toEqual([
			'Behind Bars p. 14',
			'vexml: without the fix (main)',
			'vexml: with the fix',
			'MuseScore',
			'OSMD',
		]);
		// No book directory: the tile says why rather than failing the strip.
		expect(first?.tiles[0]?.reason).toContain('VEXML_BOOK_DIR');
		expect(first?.tiles[2]?.image?.space).toBe(10);
		expect(first?.tiles[3]?.image?.src).toStartWith('data:image/svg+xml');
		expect(first?.tiles[4]?.reason).toBe('OSMD failed');
		// Check 2 declares no book box, so it shows no book tile.
		expect(strip.rows[1]?.tiles[0]?.label).toBe(
			'vexml: without the fix (main)',
		);
		expect(asked).toContain(
			`main:vexml/${SCREENSHOTS_DIR}/engraving_stem-length.png`,
		);
	});

	it('shows one vexml tile without --since, and narrows to one check', async () => {
		const strip = await collectStrip({
			id: 'stem-length',
			check: 2,
			fs: await ruleFs(CHECKS_NOTE),
			ps: new FakePs(),
			references: null,
		});
		expect(strip.rows.map((r) => r.n)).toEqual([2]);
		expect(strip.rows[0]?.tiles.map((t) => t.label)).toEqual(['vexml']);
		expect(strip.since).toBeUndefined();
	});

	it('keys every tile for answer groups, and needs --since for the unfixed tile', async () => {
		const fs = await ruleFs(CHECKS_NOTE);
		const ps = new FakePs();
		const groups = parseAnswerGroups('A=unfixed,osmd; B=vexml,musescore');
		const strip = await collectStrip({
			id: 'stem-length',
			check: 1,
			since: 'main',
			groups,
			fs,
			ps,
			references: fakeReferences,
			readAt: async (_ref, repoPath) =>
				repoPath.endsWith('.png')
					? PNG.sync.write(new PNG({ width: 120, height: 100 }))
					: null,
		});
		expect(strip.since).toBe('main');
		expect(strip.groups).toEqual(groups);
		expect(strip.rows[0]?.tiles.map((t) => t.key)).toEqual([
			'book',
			'unfixed',
			'vexml',
			'musescore',
			'osmd',
		]);
		await expect(
			collectStrip({ id: 'stem-length', groups, fs, ps, references: null }),
		).rejects.toThrow('the unfixed tile needs --since');
	});

	it('shows the whole fixture for a rule with no checks', async () => {
		const strip = await collectStrip({
			id: 'stem-length',
			fs: await ruleFs('### The rule\n\nA stem is 3½ spaces.\n'),
			ps: new FakePs(),
			references: null,
		});
		expect(strip.rows).toHaveLength(1);
		expect(strip.rows[0]?.question).toBeNull();
		expect(strip.rows[0]?.tiles[0]?.image?.width).toBe(120);
	});

	it('says when the screenshot is missing', async () => {
		const fs = await ruleFs(CHECKS_NOTE);
		await fs.rm(`${SCREENSHOTS_DIR}/engraving_stem-length.png`);
		const strip = await collectStrip({
			id: 'stem-length',
			check: 1,
			fs,
			ps: new FakePs(),
			references: null,
		});
		expect(strip.rows[0]?.tiles[1]?.reason).toContain(
			'vex test stem-length --update',
		);
	});

	it('fails on an unknown rule or check', async () => {
		const fs = await ruleFs(CHECKS_NOTE);
		const ps = new FakePs();
		await expect(collectStrip({ id: 'nope', fs, ps })).rejects.toThrow(
			'no Behind Bars rule "nope"',
		);
		await expect(
			collectStrip({ id: 'stem-length', check: 3, fs, ps }),
		).rejects.toThrow('stem-length has 2 checks, no check 3');
	});
});

function img(width: number) {
	return { src: 'data:image/png;base64,', width, height: 10, space: 10 };
}

function model(tiles: StripModel['rows'][number]['tiles']): StripModel {
	return {
		id: 'stem-length',
		page: '14',
		rule: 'A stem is 3½ spaces & no more.',
		rows: [{ question: 'Is the stem long enough?', n: 1, tiles }],
	};
}

const fakeReferences: ReferenceSource = {
	cropAll: async () => [
		{
			tile: {
				id: 'musescore',
				label: 'MuseScore',
				status: 'ready',
				url: '',
				width: 400,
				height: 600,
				space: 50,
			},
			bytes: Buffer.from('<svg/>'),
			contentType: 'image/svg+xml',
		},
		{
			tile: {
				id: 'osmd',
				label: 'OSMD',
				status: 'unavailable',
				reason: 'OSMD failed',
			},
		},
	],
};

const CHECKS_NOTE = `### The rule

A stem is 3½ spaces.

### Checks

1. Is the stem long enough?
   Crop: measure 1, 4 spaces
   Book: p. 14, 0.1 0.1 0.2 0.1
2. Does the stem attach to the head?
   Crop: measure 1, from 2 spaces, 4 spaces
`;

const LEDGER = [
	'# Engraving',
	'',
	'## 5–37: Ground rules',
	'',
	'| Id | Page | Rule | Status | Link |',
	'| --- | --- | --- | --- | --- |',
	'| stem-length | 14 | A stem is 3½ spaces. | pass | [stem-length](engraving-stem-length.test.ts) |',
].join('\n');

const CHECK_TEST = `
import { describe, expect, it } from 'bun:test';
import { draw } from './engraving-render';

describe('stem-length', () => {
	it('draws', async () => {
		expect(await draw('stem-length')).toMatchScreenshot('engraving_stem-length.png');
	});
});
`;

async function ruleFs(note: string): Promise<FakeFs> {
	const fs = new FakeFs();
	await fs.write(LEDGER_FILE, LEDGER);
	await fs.write(`${RULE_NOTES_DIR}/stem-length.md`, note);
	await fs.write(
		`${INTEGRATION_DIR}/engraving-stem-length.test.ts`,
		CHECK_TEST,
	);
	await fs.write(
		`${ENGRAVING_FIXTURES_DIR}/stem-length.musicxml`,
		'<score-partwise/>',
	);
	await fs.writeBytes(
		`${SCREENSHOTS_DIR}/engraving_stem-length.png`,
		PNG.sync.write(new PNG({ width: 120, height: 100 })),
	);
	await fs.write(
		`${MARKS_DIR}/engraving_stem-length.geometry.json`,
		JSON.stringify({
			screenshot: 'engraving_stem-length.png',
			measures: [{ index: 0, system: 0, x: 0, w: 100 }],
			staves: [
				{
					part: 0,
					measure: 0,
					staff: 1,
					lines: [40, 50, 60, 70, 80],
					x: 0,
					w: 100,
				},
			],
		}),
	);
	return fs;
}
