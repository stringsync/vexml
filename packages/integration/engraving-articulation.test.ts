import { describe, expect, it } from 'bun:test';
import type { Ink } from './engraving-ink';
import type { Engraving } from './engraving-model';
import { stemDirection } from './engraving-model';
import { draw, engrave, must, quarters } from './engraving-render';
import { centre, markBox } from './engraving-spacing-measures';
import { onStave } from './engraving-spanners';
import { column } from './engraving-tie-arcs';

describe('Behind Bars articulation marks', () => {
	it.concurrent('draws staccato dots on single and double-stemmed notes and under slurs', async () => {
		expect(await draw('articulation')).toMatchScreenshot(
			'engraving_articulation.png',
		);
	});

	it.concurrent('artic-notehead-side (p. 117): puts articulation on the notehead side, never below a down-stem', async () => {
		const e = await engrave('articulation', 'artic-notehead-side');
		const sides = headSides(e, 0);
		expect(e.check(sides)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('artic-centred-notehead (p. 118): centres each articulation on its notehead', async () => {
		const e = await engrave('articulation', 'artic-centred-notehead');
		const heads = e.headsIn(0);
		const centred = dots(e, 0).map((dot, i) => {
			markBox(e, dot.box, `Dot ${i + 1}`);
			return (
				Math.abs(centre(dot.box) - centre(must(heads[i], 'note').head)) <=
				0.25 * e.space(0)
			);
		});
		expect(e.check(centred)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('artic-consistent-distance (p. 119): keeps staccato dots the same distance from each notehead', async () => {
		const e = await engrave('articulation', 'artic-consistent-distance');
		const found = dots(e, 2);
		const gaps = e.headsIn(2).map((note, i) => {
			const dot = must(found[i], 'staccato dot');
			markBox(e, dot.box, `Dot ${i + 1}`);
			return Math.abs(dot.box.y + dot.box.h / 2 - note.cy);
		});
		expect(
			e.check(Math.max(...gaps) - Math.min(...gaps) <= 0.5 * e.space(2)),
		).toMatchMeasurements(true);
	});

	it.concurrent('artic-stemless-as-stemmed (p. 119): places articulation on a stemless note as if it had a stem, down-stemmed on the middle line', async () => {
		const e = await engrave('articulation', 'artic-stemless-as-stemmed');
		const sides = [7, 8, 9].map((m) => {
			const note = must(e.headsIn(m)[0], 'whole note');
			const dot = must(dots(e, m)[0], 'staccato dot');
			markBox(e, dot.box, 'Dot');
			const dotY = dot.box.y + dot.box.h / 2;
			// A whole note below the middle line is as an up-stem: dot below.
			return m === 7 ? dotY > note.cy : dotY < note.cy;
		});
		expect(e.check(sides)).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('artic-double-stem-stem-end (p. 117): puts articulation beyond the stem end of each part', async () => {
		const e = await engrave('articulation', 'artic-double-stem-stem-end');
		const beyond = stemEnds(e).map(({ dot, tip, up }) => {
			markBox(e, dot.box, 'Dot');
			return up ? dot.box.y + dot.box.h <= tip : dot.box.y >= tip;
		});
		expect(e.check(beyond)).toMatchMeasurements(Array(8).fill(true));
	});

	it.concurrent('artic-stem-end-gap (p. 121): leaves about half a space between a stem end and articulation outside the stave', async () => {
		const e = await engrave('articulation', 'artic-stem-end-gap');
		const gaps = stemEnds(e).map(({ dot, tip, up }) => {
			markBox(e, dot.box, 'Dot');
			const gap = up ? tip - (dot.box.y + dot.box.h) : dot.box.y - tip;
			const spaces = quarters(gap, e.space(1));
			return spaces >= 0.25 && spaces <= 1;
		});
		expect(e.check(gaps)).toMatchMeasurements(Array(8).fill(true));
	});

	it.concurrent('artic-stave-space (pp. 119–120): centres staccato dots in a stave-space, clear of the lines', async () => {
		const e = await engrave('articulation', 'artic-stave-space');
		const clear = [2, 3].flatMap((m) => {
			const lines = e.lines(m);
			return dots(e, m).map((dot) => {
				markBox(e, dot.box, 'Dot');
				const y = dot.box.y + dot.box.h / 2;
				return (
					Math.min(...lines.map((l) => Math.abs(l - y))) >= 0.25 * e.space(m)
				);
			});
		});
		expect(e.check(clear)).toMatchMeasurements(Array(8).fill(true));
	});

	it.concurrent('artic-first-clear-space (p. 119): puts a staccato dot no closer than the first clear stave-space from its note', async () => {
		const e = await engrave('articulation', 'artic-first-clear-space');
		const far = [...apart(e, 2, 0.9), ...apart(e, 3, 0.4)];
		expect(e.check(far)).toMatchMeasurements(Array(8).fill(true));
	});

	it.concurrent('artic-ledger-outer (p. 120): keeps articulation between a ledger-line note and the stave in the outermost stave-space', async () => {
		const e = await engrave('articulation', 'artic-ledger-outer');
		const lines = e.lines(4);
		const top = must(lines[0], 'top stave line');
		const second = must(lines[1], 'second stave line');
		const fourth = must(lines[3], 'fourth stave line');
		const bottom = must(lines[4], 'bottom stave line');
		const found = dots(e, 4);
		const [high, low] = [must(found[0], 'high dot'), must(found[1], 'low dot')];
		markBox(e, high.box, 'High dot');
		markBox(e, low.box, 'Low dot');
		const highY = high.box.y + high.box.h / 2;
		const lowY = low.box.y + low.box.h / 2;
		expect(
			e.check([highY > top && highY < second, lowY > fourth && lowY < bottom]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('slur-mixed-stem-artic (p. 122): puts articulation beside each notehead under a slur above mixed stems', async () => {
		const e = await engrave('articulation', 'slur-mixed-stem-artic');
		expect(e.check(headSides(e, 5))).toMatchMeasurements([
			true,
			true,
			true,
			true,
		]);
	});

	it.concurrent('slur-artic-middle-inside (p. 122): keeps the middle articulation of a slur inside it', async () => {
		const e = await engrave('articulation', 'slur-artic-middle-inside');
		const slur = must(onStave(e, 'slur', 6, 8, 8)[0], 'slur');
		markBox(e, slur.box, 'Slur');
		const inside = dots(e, 6).map((dot) => {
			markBox(e, dot.box, 'Dot');
			const span = column(slur, Math.round(centre(dot.box)));
			return span !== null && span[1] <= dot.box.y;
		});
		expect(e.check(inside)).toMatchMeasurements([true, true]);
	});
});

/** A measure's staccato dots, left to right. */
function dots(e: Engraving, measure: number): Ink[] {
	return e
		.inMeasure('staccato-dot', measure)
		.sort((a, b) => a.box.x - b.box.x || a.box.y - b.box.y);
}

/** Whether each dot sits on its note's head side: above a down-stem, below an up-stem. */
function headSides(e: Engraving, measure: number): boolean[] {
	const found = dots(e, measure);
	return e.headsIn(measure).map((note, i) => {
		const dot = must(found[i], 'staccato dot');
		markBox(e, dot.box, `Dot ${i + 1}`);
		const up = stemDirection(note) === 'up';
		return up ? dot.box.y > note.cy : dot.box.y + dot.box.h < note.cy;
	});
}

/** Each stem's free end with the staccato dot nearest it, in measure 1. */
function stemEnds(e: Engraving): { dot: Ink; tip: number; up: boolean }[] {
	const found = dots(e, 1);
	return e.headsIn(1).map((note) => {
		const stem = must(note.stem, 'stem');
		const up = stemDirection(note) === 'up';
		const tip = up ? stem.box.y : stem.box.y + stem.box.h;
		const dot = must(
			[...found].sort(
				(a, b) =>
					Math.hypot(centre(a.box) - centre(stem.box), a.box.y - tip) -
					Math.hypot(centre(b.box) - centre(stem.box), b.box.y - tip),
			)[0],
			'staccato dot',
		);
		return { dot, tip, up };
	});
}

/** Whether each dot lies at least `spaces` stave-spaces from its note's centre. */
function apart(e: Engraving, measure: number, spaces: number): boolean[] {
	const found = dots(e, measure);
	return e.headsIn(measure).map((note, i) => {
		const dot = must(found[i], 'staccato dot');
		markBox(e, dot.box, `Dot ${i + 1}`);
		return (
			Math.abs(dot.box.y + dot.box.h / 2 - note.cy) >= spaces * e.space(measure)
		);
	});
}
