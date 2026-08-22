import { describe, expect, it } from 'bun:test';
import type { Chord } from '@stringsync/mdom';
import { MDocument } from '@stringsync/mdom';
import type { StaveNote, TabNote, TabStave } from 'vexflow';
import { Rect } from 'webappwiz/geometry';
import { GeometryCollector } from './geometry-collector';

describe('GeometryCollector', () => {
	// A real two-note mdom chord (C4 carrying string 2 / fret 5, E4 with no tab technical),
	// so the collector reads the same shapes the parser produces.
	const chord = ((): Chord => {
		const built = MDocument.empty()
			.score.addPart({ id: 'P1', name: 'M' })
			.addMeasure()
			.getOrCreateVoice('1')
			.addChord(
				[
					{ step: 'C', octave: 4 },
					{ step: 'E', octave: 4 },
				],
				{ type: 'quarter' },
			);
		built.notes[0]?.setStringFret({ string: 2, fret: 5 });
		return built;
	})();

	const staveNote = (ys: (number | undefined)[], headXs?: number[]) =>
		({
			getNoteHeadBeginX: () => 10,
			getNoteHeadEndX: () => 22,
			getYs: () => ys,
			noteHeads: ys.map((_, i) => ({
				getText: () => '',
				getFont: () => '30px Bravura',
				getBoundingBox: () => ({
					getX: () => headXs?.[i] ?? 11,
					getW: () => 12,
				}),
			})),
		}) as unknown as StaveNote;

	it('captures one raw note per notehead, spanning the head and replaying its glyph', () => {
		const collector = new GeometryCollector();
		collector.collectStaveNotes(3, [{ note: staveNote([50, 60]), chord }]);
		const notes = collector.notes();
		expect(notes).toHaveLength(2);
		expect(notes[0]?.rect.x).toBe(11);
		expect(notes[0]?.rect.w).toBe(12);
		expect(notes[0]?.measureIndex).toBe(3);
		expect(notes[0]?.tab).toBeNull();
		expect(notes[0]?.glyph).toMatchObject({ x: 11, y: 50 });
		expect(notes[1]?.glyph).toMatchObject({ y: 60 });
		expect(notes[0]?.chord).toHaveLength(2);
	});

	it('tracks a displaced notehead (a second) at its own drawn box, not the stem column', () => {
		const collector = new GeometryCollector();
		// The lower head of a stem-down second draws a head-width left of the column.
		collector.collectStaveNotes(0, [
			{ note: staveNote([60, 50], [-1, 11]), chord },
		]);
		const notes = collector.notes();
		expect(notes[0]?.rect.x).toBe(-1);
		expect(notes[0]?.glyph).toMatchObject({ x: -1 });
		expect(notes[1]?.rect.x).toBe(11);
	});

	it('skips a chord note the formatter gave no y', () => {
		const collector = new GeometryCollector();
		collector.collectStaveNotes(0, [{ note: staveNote([50]), chord }]);
		expect(collector.notes()).toHaveLength(1);
	});

	it('captures tab frets only for notes carrying string+fret, y from the string line', () => {
		const collector = new GeometryCollector();
		const tabNote = {
			getAbsoluteX: () => 40,
			getPositions: () => [{ str: 2, fret: '5' }],
			fretElement: [
				{
					getText: () => '5',
					getFont: () => '10pt Arial',
					getWidth: () => 8,
					getYShift: () => 3,
				},
			],
		} as unknown as TabNote;
		const tabStave = {
			getYForLine: (line: number) => 100 + line * 10,
		} as unknown as TabStave;
		collector.collectTabNotes(1, tabStave, [{ note: tabNote, chord }]);
		const notes = collector.notes();
		expect(notes).toHaveLength(1); // the E4 has no string/fret, so no fret box for it
		expect(notes[0]?.tab).toEqual({ string: 2, fret: 5 });
		// string 2 sits on line 1 (y 110); the fret box centers on it
		expect(notes[0]?.rect.y).toBe(103);
		expect(notes[0]?.rect.bottom).toBe(117);
		expect(notes[0]?.glyph).toMatchObject({ x: 36, y: 113 });
	});

	it('grows a measure box up to its system decoration ceiling, never shrinking one', () => {
		const collector = new GeometryCollector();
		collector.addMeasure({
			rect: new Rect(0, 40, 100, 60),
			index: 0,
			number: '1',
			systemIndex: 0,
		});
		collector.addMeasure({
			rect: new Rect(0, 40, 100, 60),
			index: 1,
			number: '2',
			systemIndex: 1,
		});
		collector.applyDecorationTops({
			decorationTopOf: (system) => (system === 0 ? 25 : 90),
		});
		// System 0's ceiling (25) is above the box, so the box grows to it; system 1's
		// ceiling (90) is inside the box and must not shrink it.
		expect(collector.measures()[0]?.rect).toMatchObject({ y: 25, h: 75 });
		expect(collector.measures()[1]?.rect).toMatchObject({ y: 40, h: 60 });
	});
});
