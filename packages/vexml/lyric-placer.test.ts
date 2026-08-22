import { describe, expect, it } from 'bun:test';
import type { RenderContext, StaveNote } from 'vexflow';
import { Rect } from 'webappwiz/geometry';
import { CollisionResolver } from './collision-resolver';
import { LYRIC_FONT_SIZE, LYRIC_LINE_HEIGHT } from './constants';
import { FakeLyricMark } from './fake-lyric-mark';
import { LyricPlacer } from './lyric-placer';
import type { VoiceTranslator } from './voice-translator';

describe('LyricPlacer', () => {
	const note = (x: number, modifiers: unknown[]) =>
		({
			getAbsoluteX: () => x,
			getModifiers: () => modifiers,
		}) as unknown as StaveNote;

	const makePlacer = (opts: { lyricDrops?: Map<string, number> } = {}) => {
		// Captures each stroked segment so a melisma line's endpoints are assertable.
		const lines: Array<{ x1: number; x2: number; y: number }> = [];
		let pen = { x: 0, y: 0 };
		const context = {
			save() {},
			restore() {},
			setStrokeStyle() {},
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
			lyricDrops: opts.lyricDrops,
		});
		const obstacles = () => resolver.query(new Rect(0, 0, 2000, 2000));
		return { placer, lines, obstacles };
	};

	it('keeps the worst drop per row and flags a step when columns disagree', () => {
		const { placer } = makePlacer();
		placer.recordDrop(0, 0, 20);
		placer.recordDrop(0, 0, 20);
		placer.recordDrop(1, 0, 5);
		expect(placer.stepped()).toBe(false);
		placer.recordDrop(0, 0, 12);
		expect(placer.stepped()).toBe(true);
		expect(placer.observedDrops().get('0:0')).toBe(20);
		expect(placer.observedDrops().get('1:0')).toBe(5);
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

	it('registers each syllable as an annotation obstacle centered on its note', () => {
		const { placer, obstacles } = makePlacer();
		placer.pin([note(100, [new FakeLyricMark(0, { width: 20 })])], 3, 200);
		const [hit] = obstacles();
		expect(hit?.other).toMatchObject({ kind: 'annotation', band: 3 });
		expect(hit?.other.rect).toMatchObject({
			x: 90,
			y: 200 - LYRIC_FONT_SIZE,
			w: 20,
			h: LYRIC_FONT_SIZE,
		});
	});

	it('ignores notes whose modifiers carry no lyrics', () => {
		const { placer, obstacles } = makePlacer();
		placer.pin([note(100, [{ verseIndex: 0 }]), note(140, [])], 0, 200);
		expect(obstacles()).toHaveLength(0);
	});

	it('draws a melisma line up to the note before the next syllable in its verse', () => {
		const { placer, lines } = makePlacer();
		const notes = [
			note(100, [new FakeLyricMark(0, { extend: true, width: 30 })]),
			note(140, []),
			note(180, [new FakeLyricMark(0, {})]),
		];
		placer.pin(notes, 0, 50);
		// From half the syllable's width past its note to half a notehead past the held
		// note (the one before the next syllable), on the verse's own crisped row.
		expect(lines).toEqual([{ x1: 115, x2: 146, y: 50.5 }]);
	});

	it('runs a melisma with no following syllable to the last note of the stave', () => {
		const { placer, lines } = makePlacer();
		const notes = [
			note(100, [new FakeLyricMark(0, { extend: true, width: 30 })]),
			note(180, []),
		];
		placer.pin(notes, 0, 50);
		expect(lines).toEqual([{ x1: 115, x2: 186, y: 50.5 }]);
	});

	it('skips a melisma whose syllable already sits on the held note', () => {
		const { placer, lines } = makePlacer();
		placer.pin([note(100, [new FakeLyricMark(0, { extend: true })])], 0, 50);
		expect(lines).toHaveLength(0);
	});
});
