import { describe, expect, it } from 'bun:test';
import { Stave, StaveNote, Stem, TickContext } from 'vexflow/core';
import { SpacedBeam } from './spaced-beam';
import { StaveTremolo } from './stave-tremolo';

describe('StaveTremolo', () => {
	it('places a single stroke on a stave line clear of head and stem end', () => {
		const stave = makeStave();
		const lines = Array.from({ length: stave.getNumLines() }, (_, i) =>
			stave.getYForLine(i),
		);

		const up = makeNote('g/4', '4', Stem.UP, stave, 1);
		const upY = up.tremolo.strokeYs(up.note, stave)[0] ?? Number.NaN;
		const upHead = up.note.getYs()[0] ?? Number.NaN;
		expect(lines.some((line) => Math.abs(upY - line) < 0.01)).toBe(true);
		expect(upY).toBeLessThan(upHead - 10);
		expect(upY).toBeGreaterThan(up.note.getStemExtents().topY + 5);

		const down = makeNote('d/5', '4', Stem.DOWN, stave, 1);
		const downY = down.tremolo.strokeYs(down.note, stave)[0] ?? Number.NaN;
		const downHead = down.note.getYs()[0] ?? Number.NaN;
		expect(lines.some((line) => Math.abs(downY - line) < 0.01)).toBe(true);
		expect(downY).toBeGreaterThan(downHead + 10);
		expect(downY).toBeLessThan(down.note.getStemExtents().topY - 5);
	});

	it('keeps 2, 3, and 4 strokes at least one stave-space clear of the notehead and extends stems past them', () => {
		const stave = makeStave();
		const space = stave.getSpacingBetweenLines();

		const upChecks = [2, 3, 4].map((strokes) => {
			const { note, tremolo } = makeNote('a/4', '4', Stem.UP, stave, strokes);
			const ys = tremolo.strokeYs(note, stave);
			const headTop = (note.getYs()[0] ?? 0) - 5;
			const lowestStrokeBottom = Math.max(...ys) + 3.75;
			const highestStrokeTop = Math.min(...ys) - 3.75;
			return (
				ys.length === strokes &&
				headTop - lowestStrokeBottom >= space &&
				highestStrokeTop - note.getStemExtents().topY >= 4.5
			);
		});
		expect(upChecks).toEqual([true, true, true]);

		const down = makeNote('c/5', '4', Stem.DOWN, stave, 3);
		const downYs = down.tremolo.strokeYs(down.note, stave);
		const headBottom = (down.note.getYs()[0] ?? 0) + 5;
		const highestStrokeTop = Math.min(...downYs) - 3.75;
		const lowestStrokeBottom = Math.max(...downYs) + 3.75;
		expect(highestStrokeTop - headBottom).toBeGreaterThanOrEqual(space);
		expect(
			down.note.getStemExtents().topY - lowestStrokeBottom,
		).toBeGreaterThanOrEqual(4.5);
	});

	it('extends flagged stems so strokes clear the flag', () => {
		const stave = makeStave();
		const { note, tremolo } = makeNote('g/4', '8', Stem.UP, stave, 2);
		const ys = tremolo.strokeYs(note, stave);
		const highestStrokeTop = Math.min(...ys) - 3.75;
		// Flag spans ~3.3 spaces down from stem tip.
		const flagBottom = note.getStemExtents().topY + 33;
		expect(highestStrokeTop).toBeGreaterThan(flagBottom);
	});

	it('keeps ledger-line tremolo strokes inside the stave lines', () => {
		const stave = makeStave();
		const topLine = stave.getYForLine(0);
		const bottomLine = stave.getYForLine(stave.getNumLines() - 1);

		const cases = [
			['c/4', Stem.UP],
			['a/3', Stem.UP],
			['a/5', Stem.DOWN],
			['c/6', Stem.DOWN],
		] as const;
		const inside = cases.map(([key, dir]) => {
			const { note, tremolo } = makeNote(key, '4', dir, stave, 3);
			const ys = tremolo.strokeYs(note, stave);
			return (
				Math.min(...ys) - 3.75 >= topLine &&
				Math.max(...ys) + 3.75 <= bottomLine
			);
		});
		expect(inside).toEqual([true, true, true, true]);
	});

	it('reports minimum beam reach for SpacedBeam tremolo notes', () => {
		const stave = makeStave();
		const n1 = makeNote('c/5', '8', Stem.DOWN, stave, 2, true);
		const n2 = makeNote('c/5', '8', Stem.DOWN, stave, 2, true);
		const beam = new SpacedBeam([n1.note, n2.note]);
		beam.renderOptions.flatBeams = true;
		const reach = StaveTremolo.minBeamReach(n1.note, 5);
		expect(reach).toBeGreaterThan(35);
	});

	it('centres whole-note strokes on the non-displaced notehead above low notes and below high notes', () => {
		const stave = makeStave();
		const space = stave.getSpacingBetweenLines();

		const low = makeWholeNote(['f/4'], stave, 3);
		const high = makeWholeNote(['d/5'], stave, 3);
		const chordUp = makeWholeNote(['g/4', 'a/4'], stave, 3);
		const chordDown = makeWholeNote(['d/5', 'e/5'], stave, 3);

		const actualXs = [low, high, chordUp, chordDown].map(({ note, tremolo }) =>
			tremolo.strokeX(note),
		);
		const expectedXs = [low, high, chordUp, chordDown].map(
			({ note }) => note.getNoteHeadBeginX() + note.getGlyphWidth() / 2,
		);
		expect(actualXs).toEqual(expectedXs);

		// Low whole note & stem-up chord place strokes above the topmost notehead.
		const lowYs = low.tremolo.strokeYs(low.note, stave);
		expect(Math.max(...lowYs) + 3.75).toBeLessThanOrEqual(
			(low.note.getYs()[0] ?? 0) - 5 - space,
		);
		const chordUpYs = chordUp.tremolo.strokeYs(chordUp.note, stave);
		expect(Math.max(...chordUpYs) + 3.75).toBeLessThanOrEqual(
			Math.min(...chordUp.note.getYs()) - 5 - space,
		);

		// High whole note & stem-down chord place strokes below the bottommost notehead.
		const highYs = high.tremolo.strokeYs(high.note, stave);
		expect(Math.min(...highYs) - 3.75).toBeGreaterThanOrEqual(
			(high.note.getYs()[0] ?? 0) + 5 + space,
		);
		const chordDownYs = chordDown.tremolo.strokeYs(chordDown.note, stave);
		expect(Math.min(...chordDownYs) - 3.75).toBeGreaterThanOrEqual(
			Math.max(...chordDown.note.getYs()) + 5 + space,
		);
	});
});

function makeStave(): Stave {
	return new Stave(0, 40, 200);
}

function makeWholeNote(
	keys: string[],
	stave: Stave,
	strokes: number,
): { note: StaveNote; tremolo: StaveTremolo } {
	const note = new StaveNote({ keys, duration: 'w', autoStem: true });
	const tremolo = new StaveTremolo(strokes);
	note.addModifier(tremolo);
	note.setStave(stave);
	new TickContext().addTickable(note).preFormat().setX(50);
	return { note, tremolo };
}

function makeNote(
	key: string,
	duration: string,
	stemDirection: number,
	stave: Stave,
	strokes: number,
	beamed = false,
): { note: StaveNote; tremolo: StaveTremolo } {
	const note = new StaveNote({ keys: [key], duration, stemDirection });
	const tremolo = new StaveTremolo(strokes);
	note.addModifier(tremolo);
	if (!beamed) {
		StaveTremolo.extendStem(note, strokes);
	}
	note.setStave(stave);
	return { note, tremolo };
}
