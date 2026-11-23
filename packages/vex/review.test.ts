import { describe, expect, it } from 'bun:test';
import { FakeFs } from 'core/system/testing';
import { PNG } from 'pngjs';
import {
	countChanged,
	DIFFS_DIR,
	Diffs,
	downscale,
	MARKS_DIR,
	parseClaims,
	parseSnapshotNotes,
	reviewData,
	split,
} from './review';

describe('review', () => {
	it('cuts the three panels apart below the captions', () => {
		const panels = split(composite(10, 6, 0));
		expect([panels.before.width, panels.before.height]).toEqual([10, 6]);
		expect([panels.after.width, panels.diff.height]).toEqual([10, 6]);
	});

	it('counts the red pixels of a diff', () => {
		expect(countChanged(split(composite(10, 6, 7)).diff)).toBe(7);
	});

	it('downscales by averaging the pixels each output pixel covers', () => {
		const png = new PNG({ width: 4, height: 2 });
		png.data.fill(255);
		png.data.fill(0, 0, 4); // the first pixel black
		const half = downscale(png, 0.5);
		expect([half.width, half.height]).toEqual([2, 1]);
		expect(half.data[0]).toBe(191);
	});

	it('reads a claim section per snapshot, with or without its extension', () => {
		const claims = parseClaims(
			'# Claims\n\n## score.png\n\nBeams level.\n\n## `notes`\n\nStems flip.\n',
		);
		expect(claims.get('score.png')).toBe('Beams level.');
		expect(claims.get('notes')).toBe('Stems flip.');
	});

	it('names the fixture the test a line is in renders', async () => {
		const fs = new FakeFs();
		await fs.write(
			'packages/integration/render.test.ts',
			[
				"it('renders a', async () => {",
				"\texpect(await testing.render('a.musicxml')).toMatchScreenshot('a.png');",
				'});',
				"it('renders b', async () => {",
				"\tconst image = await testing.render('b.mxl', {});",
				"\texpect(image).toMatchScreenshot('b.png');",
				'});',
			].join('\n'),
		);
		const diffs = new Diffs(fs);
		expect(await diffs.fixtureOf('render.test.ts', 2)).toBe('a.musicxml');
		expect(await diffs.fixtureOf('render.test.ts', 6)).toBe('b.mxl');
		expect(await diffs.fixtureOf('missing.test.ts', 1)).toBeNull();
	});

	it('collects each diff and its json, largest share first', async () => {
		const fs = new FakeFs();
		await fs.mkdir(DIFFS_DIR);
		await fs.writeBytes(
			`${DIFFS_DIR}/small.png`,
			PNG.sync.write(composite(10, 10, 5)),
		);
		await fs.writeBytes(
			`${DIFFS_DIR}/large.png`,
			PNG.sync.write(composite(10, 10, 50)),
		);
		await fs.write(
			`${DIFFS_DIR}/large.json`,
			JSON.stringify({ test: 'x.test.ts', line: 3, mismatch: 40 }),
		);
		const moved = await new Diffs(fs).collect('## small\n\nA little.\n');
		expect(moved.map((m) => m.entry.name)).toEqual(['large.png', 'small.png']);
		expect(moved[0]?.entry).toMatchObject({
			test: 'x.test.ts',
			line: 3,
			changed: 40,
			share: 0.4,
			claim: null,
		});
		expect(moved[1]?.entry.changed).toBe(5);
		expect(moved[1]?.entry.claim).toContain('A little.');
	});

	it('fails to collect when no snapshot moved', async () => {
		const fs = new FakeFs();
		await fs.mkdir(DIFFS_DIR);
		await expect(new Diffs(fs).collect()).rejects.toThrow('no snapshot moved');
	});

	it('parses four-part guide headings while keeping plain claims intact', () => {
		const plain = parseSnapshotNotes('Beams level across rests.');
		expect(plain.guide).toBeNull();
		expect(plain.claim).toContain('Beams level across rests.');

		const structured = parseSnapshotNotes(
			[
				'### The rule',
				'A stem is 3½ stave-spaces (p. 14).',
				'',
				'### The test case',
				'Treble 4/4 with unset stems.',
				'',
				'### What to look for',
				'Check each bracket against the middle line.',
				'',
				'### What was found',
				'All 8 stems measure 3½ spaces.',
			].join('\n'),
		);
		expect(structured.claim).toBeNull();
		expect(structured.guide?.rule).toContain('3½ stave-spaces');
		expect(structured.guide?.testCase).toContain('Treble 4/4');
		expect(structured.guide?.lookFor).toContain('middle line');
		expect(structured.guide?.found).toContain('All 8 stems');
	});

	it('collects new and claimed snapshots with agent marks and single-panel images', async () => {
		const fs = new FakeFs();
		const shot = new PNG({ width: 120, height: 60 });
		shot.data.fill(255);
		await fs.writeBytes(
			'packages/integration/__screenshots__/engraving_stem-length.png',
			PNG.sync.write(shot),
		);
		await fs.write(
			'packages/integration/engraving-stem-length.test.ts',
			[
				"it('draws stem-length', async () => {",
				"\texpect(await draw('stem-length')).toMatchScreenshot('engraving_stem-length.png');",
				'});',
			].join('\n'),
		);
		await fs.write(
			`${MARKS_DIR}/engraving_stem-length.marks.json`,
			JSON.stringify({
				screenshot: 'engraving_stem-length.png',
				width: 120,
				height: 60,
				marks: [
					{
						kind: 'bracket',
						role: 'measure',
						from: { x: 20, y: 10 },
						to: { x: 20, y: 45 },
						label: '3½',
						note: 'C/5 down-stem: 3½ spaces',
						pass: true,
					},
				],
			}),
		);
		const claims = [
			'## engraving_stem-length.png',
			'',
			'### The rule',
			'Stems are 3½ spaces (p. 14).',
			'',
			'### What to look for',
			'Check the green brackets.',
		].join('\n');

		const snapshots = await new Diffs(fs).collect(claims);
		expect(snapshots).toHaveLength(1);
		const [first] = snapshots;
		expect(first?.entry).toMatchObject({
			name: 'engraving_stem-length.png',
			kind: 'new',
			test: 'engraving-stem-length.test.ts',
			line: 2,
			fixture: 'engraving/stem-length.musicxml',
			width: 120,
			height: 60,
			changed: 0,
			share: 0,
		});
		expect(first?.entry.agentMarks).toHaveLength(1);
		expect(first?.entry.guide?.rule).toContain('3½ spaces');
		expect(first?.panels.before).toBeUndefined();
		expect(first?.panels.after.width).toBe(120);

		const data = reviewData({
			id: 'stem-length',
			version: 1,
			title: 'stem-length',
			tradeoffs: null,
			unchanged: 0,
			moved: snapshots,
			mode: 'served',
			image: (name, panel) => `/${name}/${panel}.png`,
		});
		expect(data.entries[0]?.images).toEqual({
			after: '/engraving_stem-length.png/after.png',
		});
	});
});

// A composite as integration/screenshot.ts writes it: a 32px caption strip over three
// panels, old, diff and new, each `width` wide, with `red` changed pixels in the diff.
function composite(width: number, height: number, red: number): PNG {
	const png = new PNG({ width: width * 3, height: height + 32 });
	png.data.fill(255);
	for (let i = 0; i < red; i++) {
		const at =
			((32 + Math.floor(i / width)) * width * 3 + width + (i % width)) * 4;
		png.data[at + 1] = 0;
		png.data[at + 2] = 0;
	}
	return png;
}
