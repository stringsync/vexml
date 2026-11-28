import { describe, expect, it } from 'bun:test';
import type { Ink } from './engraving-ink';
import type { Engraving } from './engraving-model';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';

// Behind Bars, pp. 140–143: glissando lines (ENGRAVING.md). glissandos.musicxml, treble, 4/4:
// - M1: C4 to G4. M2: A5 to D5. M3: C4 to G♯4, the line meets an accidental.
// - M4: F4 to F♯4. M5: B4 to B♭4. M6: two-note chords, C4/E4 to G4/B4, two lines.

describe('Behind Bars glissandos (pp. 140–143)', () => {
	it.concurrent('draws glissandos', async () => {
		expect(await draw('glissandos')).toMatchScreenshot(
			'engraving_glissandos.png',
		);
	});

	it.concurrent('gliss-line-straight-thin (p. 140): draws a thin straight diagonal line', async () => {
		const e = await engrave('glissandos', 'gliss-line-straight-thin');
		const line = must(e.inMeasure('glissando', 0)[0], 'glissando');
		markBox(e, line.box, 'Glissando');
		const thickness = line.count() / line.box.w / e.space(0);
		const mid = centreAt(line, Math.round(line.box.x + line.box.w / 2));
		const ends =
			(centreAt(line, line.box.x + 1) +
				centreAt(line, line.box.x + line.box.w - 2)) /
			2;
		const thin = thickness <= 0.4;
		const straight = Math.abs(mid - ends) <= 1.5;
		expect(e.check(thin && straight)).toMatchMeasurements(true);
	});

	it.concurrent('gliss-line-between-heads (p. 141): angles the line from the first head to the second', async () => {
		const e = await engrave('glissandos', 'gliss-line-between-heads');
		const results = [0, 1].map((m) => {
			const line = must(e.inMeasure('glissando', m)[0], 'glissando');
			const [from, to] = e.headsIn(m);
			const a = must(from, 'first note');
			const b = must(to, 'second note');
			markBox(e, line.box, 'Glissando');
			const space = e.space(m);
			const startY = centreAt(line, line.box.x + 1);
			const endY = centreAt(line, line.box.x + line.box.w - 2);
			return (
				line.box.x >= a.head.x + a.head.w - 0.5 * space &&
				line.box.x + line.box.w <= b.head.x + 0.5 * space &&
				Math.abs(startY - a.cy) <= 1.5 * space &&
				Math.abs(endY - b.cy) <= 1.5 * space
			);
		});
		expect(e.check(results)).toMatchMeasurements([true, true]);
	});

	// fix: #4513
	it.todo('gliss-line-clear-of-accidental (p. 141): clear of the sharp');

	// fix: #4513
	it.todo('gliss-same-letter-direction (p. 142): tilts to the pitch');

	it.concurrent('gliss-parallel-lines (p. 143): draws parallel lines for parallel chord glissandos', async () => {
		const e = await engrave('glissandos', 'gliss-parallel-lines');
		const [a, b] = e.inMeasure('glissando', 5);
		const first = must(a, 'upper line');
		const second = must(b, 'lower line');
		markBox(e, first.box, 'Glissando 1');
		markBox(e, second.box, 'Glissando 2');
		expect(
			e.check({
				twoLines: e.inMeasure('glissando', 5).length === 2,
				parallel:
					Math.abs(first.box.w - second.box.w) <= 1 &&
					Math.abs(first.box.h - second.box.h) <= 1 &&
					Math.abs(first.box.x - second.box.x) <= 1,
			}),
		).toMatchMeasurements({ twoLines: true, parallel: true });
	});
});

/** The vertical centre of an ink's first band in column x. */
function centreAt(ink: Ink, x: number): number {
	const [top, bottom] = ink.bandsAt(Math.round(x))[0] ?? [0, 0];
	return (top + bottom) / 2;
}

/** Right end minus left end of a measure's glissando: negative when it rises. */
function _slope(e: Engraving, measure: number): number {
	const line = must(e.inMeasure('glissando', measure)[0], 'glissando');
	return (
		centreAt(line, line.box.x + line.box.w - 2) - centreAt(line, line.box.x + 1)
	);
}
