import { describe, expect, it } from 'bun:test';
import type { RenderContext, Stave, StaveNote } from 'vexflow/core';
import { Rect } from 'webappwiz/geometry';
import { CollisionResolver } from './collision-resolver';
import { LYRIC_FONT_SIZE, LYRIC_LINE_HEIGHT } from './constants';
import { FakeLyricMark } from './fake-lyric-mark';
import { LyricPlacer, type LyricPlacerOptions } from './lyric-placer';
import type { VoiceTranslator } from './voice-translator';

describe('LyricPlacer', () => {
	// The stave every note sits on: only its identity is read, as the syllable's stave.
	const stave = {
		getYForLine: () => 100,
		getBottomLineY: () => 140,
	} as unknown as Stave;
	const note = (x: number, modifiers: unknown[]) =>
		({
			getAbsoluteX: () => x,
			getNoteHeadBeginX: () => x,
			getNoteHeadEndX: () => x + 12,
			getModifiers: () => modifiers,
			checkStave: () => stave,
		}) as unknown as StaveNote;

	const makePlacer = (opts: LyricPlacerOptions = {}) => {
		// Captures each stroked segment so a melisma line's endpoints are assertable.
		const lines: Array<{ x1: number; x2: number; y: number }> = [];
		let pen = { x: 0, y: 0 };
		const context = {
			save() {},
			restore() {},
			setStrokeStyle() {},
			setFillStyle() {},
			setLineWidth() {},
			beginPath() {},
			stroke() {},
			moveTo(x: number, y: number) {
				pen = { x, y };
			},
			lineTo(x: number, y: number) {
				lines.push({ x1: pen.x, x2: x, y });
			},
		} as unknown as RenderContext;
		const resolver = new CollisionResolver(new Rect(0, 0, 2000, 2000), {});
		const translator = {
			noteheadHalfWidth: () => 6,
		} as unknown as VoiceTranslator;
		const placer = new LyricPlacer(translator, context, resolver, '#123456', {
			...opts,
		});
		const obstacles = () => resolver.query(new Rect(0, 0, 2000, 2000));
		return { placer, lines, obstacles };
	};

	it('follows document verse baselines and keeps relative offsets local', () => {
		const { placer, lines } = makePlacer({ documentPositions: 'follow' });
		const first = new FakeLyricMark(0, {
			extend: true,
			position: { y: -80, dx: 10, dy: 5, side: null },
		});
		const next = new FakeLyricMark(0, {});
		placer.pin([note(100, [first]), note(150, []), note(200, [next])], 0, 160);
		expect(first.baselineY).toBe(175);
		expect(next.baselineY).toBe(180);
		expect(placer.pinnedSyllables()[0]?.left).toBe(106);
		expect(lines[0]?.y).toBe(175.5);
		// A later measure needs more clearance: the whole verse follows it down.
		placer.pin([note(300, [next])], 0, 220);
		expect(next.baselineY).toBe(220);
	});

	it('strict pins each verse exactly', () => {
		const { placer } = makePlacer({ documentPositions: 'strict' });
		const first = new FakeLyricMark(0, {
			position: { y: -60, dx: 0, dy: -5, side: null },
		});
		const second = new FakeLyricMark(1, {
			position: { y: -100, dx: 0, dy: 0, side: null },
		});
		placer.pin([note(100, [first, second])], 0, 220);
		expect([first.baselineY, second.baselineY]).toEqual([165, 200]);
	});

	it('ignore keeps automatic rows and ignores relative offsets', () => {
		const { placer } = makePlacer();
		const first = new FakeLyricMark(0, {
			position: { y: -60, dx: 10, dy: -5, side: null },
		});
		const second = new FakeLyricMark(1, {
			position: { y: -100, dx: 0, dy: 0, side: null },
		});
		placer.pin([note(100, [first, second])], 0, 220);
		expect([first.baselineY, second.baselineY]).toEqual([
			220,
			220 + LYRIC_LINE_HEIGHT,
		]);
		expect(placer.pinnedSyllables()[0]?.left).toBe(96);
	});

	it('carries a later measure baseline back without requesting endless redraws', () => {
		const first = makePlacer({ documentPositions: 'strict' }).placer;
		const explicit = new FakeLyricMark(0, {
			position: { y: -80, dx: 0, dy: 0, side: null },
		});
		first.pin([note(100, [explicit])], 0, 220);
		expect(first.stepped(0)).toBe(true);
		const next = makePlacer({
			documentPositions: 'strict',
			lyricDrops: first.observedDrops(),
		}).placer;
		const implicit = new FakeLyricMark(0, {});
		next.pin([note(100, [implicit])], 0, 220);
		next.pin([note(200, [explicit])], 0, 220);
		expect(implicit.baselineY).toBe(180);
		expect(next.stepped(0)).toBe(false);
	});

	it('keeps the worst drop per row and flags a step when columns disagree', () => {
		const { placer } = makePlacer();
		placer.recordDrop(0, 0, 20);
		placer.recordDrop(0, 0, 20);
		placer.recordDrop(1, 0, 5);
		expect(placer.stepped(0)).toBe(false);
		placer.recordDrop(0, 0, 12);
		expect(placer.stepped(0)).toBe(true);
		expect(placer.observedDrops().get('0:0')).toBe(20);
		expect(placer.observedDrops().get('1:0')).toBe(5);
	});

	it('lines a syllable up with its notehead per justify', () => {
		const { placer, obstacles } = makePlacer();
		placer.pin(
			[
				note(100, [new FakeLyricMark(0, { width: 20, justify: 'left' })]),
				note(200, [new FakeLyricMark(0, { width: 20, justify: 'right' })]),
				note(300, [new FakeLyricMark(0, { width: 20 })]),
			],
			0,
			50,
		);
		expect(placer.pinnedSyllables().map((p) => p.left)).toEqual([
			100, 192, 296,
		]);
		expect(obstacles()).toHaveLength(3);
	});

	it('reads the previous pass drop for a system row, 0 when it reserved none', () => {
		const { placer } = makePlacer({ lyricDrops: new Map([['2:1', 14]]) });
		expect(placer.carriedDrop(2, 1)).toBe(14);
		expect(placer.carriedDrop(0, 1)).toBe(0);
	});

	it('pins each syllable one verse line below the baseline in the notation ink', () => {
		const { placer } = makePlacer();
		const v0 = new FakeLyricMark(0, {});
		const v1 = new FakeLyricMark(1, {});
		placer.pin([note(100, [v0, v1])], 3, 200);
		expect(v0.baselineY).toBe(200);
		expect(v1.baselineY).toBe(200 + LYRIC_LINE_HEIGHT);
		expect(v0.fillStyle).toBe('#123456');
		expect(v1.fillStyle).toBe('#123456');
	});

	it('registers each syllable as an annotation obstacle centered on its notehead', () => {
		const { placer, obstacles } = makePlacer();
		placer.pin([note(100, [new FakeLyricMark(0, { width: 20 })])], 3, 200);
		const [hit] = obstacles();
		expect(hit?.other).toMatchObject({ kind: 'annotation', band: 3 });
		// The notehead's center is half a notehead (6) right of its left edge.
		expect(hit?.other.rect).toMatchObject({
			x: 96,
			y: 200 - LYRIC_FONT_SIZE,
			w: 20,
			h: LYRIC_FONT_SIZE,
		});
	});

	it('keeps each pinned syllable with its stave, row, span and verse', () => {
		const { placer } = makePlacer();
		placer.pin(
			[
				note(100, [
					new FakeLyricMark(0, { width: 20 }),
					new FakeLyricMark(1, { width: 30 }),
				]),
			],
			3,
			200,
		);
		expect(
			placer.pinnedSyllables().map(({ lyric, ...pinned }) => pinned),
		).toEqual([
			{
				stave,
				row: 3,
				left: 96,
				width: 20,
				verseIndex: 0,
				textSize: LYRIC_FONT_SIZE,
			},
			{
				stave,
				row: 3,
				left: 91,
				width: 30,
				verseIndex: 1,
				textSize: LYRIC_FONT_SIZE,
			},
		]);
	});

	it('hangs a row at the worst drop seen this pass or carried from the last', () => {
		const { placer } = makePlacer({ lyricDrops: new Map([['0:1', 25]]) });
		placer.recordDrop(0, 1, 21);
		placer.recordDrop(0, 1, 31);
		placer.recordDrop(1, 1, 18);
		expect(placer.rowDrop(0, 1)).toBe(31);
		expect(placer.rowDrop(1, 1)).toBe(18);
		expect(placer.rowDrop(2, 1)).toBe(0);
	});

	it('ignores notes whose modifiers carry no lyrics', () => {
		const { placer, obstacles } = makePlacer();
		placer.pin(
			[
				note(100, [{ verseIndex: 0, textSize: LYRIC_FONT_SIZE }]),
				note(140, []),
			],
			0,
			200,
		);
		expect(obstacles()).toHaveLength(0);
	});

	it('spreads extra hyphens across a gap wider than the hyphen distance', () => {
		const { placer } = makePlacer({ hyphenDistance: 30 });
		const al = new FakeLyricMark(0, { hyphenated: true });
		const near = new FakeLyricMark(0, { hyphenated: true });
		placer.pin(
			[
				note(100, [al]),
				note(200, [near]),
				note(220, [new FakeLyricMark(0, {})]),
			],
			0,
			50,
		);
		// From al's hyphen (116 - 3) to the next syllable's ink (196 + 3): 86px holds two
		// more, a third of the way apart. The next pair sits closer than the distance.
		expect(al.hyphens.map(Math.round)).toEqual([142, 170]);
		expect(near.hyphens).toEqual([]);
	});

	it('draws no extra hyphens without a hyphen distance', () => {
		const { placer } = makePlacer();
		const al = new FakeLyricMark(0, { hyphenated: true });
		placer.pin([note(100, [al]), note(400, [new FakeLyricMark(0, {})])], 0, 50);
		expect(al.hyphens).toEqual([]);
	});

	it('draws a melisma line up to the note before the next syllable in its verse', () => {
		const { placer, lines } = makePlacer();
		const notes = [
			note(100, [new FakeLyricMark(0, { extend: true, width: 30 })]),
			note(140, []),
			note(180, [new FakeLyricMark(0, {})]),
		];
		placer.pin(notes, 0, 50);
		// From the end of the syllable's ink to half a notehead past the held
		// note (the one before the next syllable), on the verse's own crisped row.
		expect(lines).toEqual([{ x1: 118, x2: 146, y: 50.5 }]);
	});

	it('runs a melisma with no following syllable to the last note of the stave', () => {
		const { placer, lines } = makePlacer();
		const notes = [
			note(100, [new FakeLyricMark(0, { extend: true, width: 30 })]),
			note(180, []),
		];
		placer.pin(notes, 0, 50);
		expect(lines).toEqual([{ x1: 118, x2: 186, y: 50.5 }]);
	});

	it('skips a melisma whose syllable already sits on the held note', () => {
		const { placer, lines } = makePlacer();
		placer.pin([note(100, [new FakeLyricMark(0, { extend: true })])], 0, 50);
		expect(lines).toHaveLength(0);
	});
});
