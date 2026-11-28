import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';
import { bottomEdge } from './engraving-spanners';

// Behind Bars, pp. 435–436: vocal syllabic slurs (short on mid/low pitches, long above)
// and vocal breath tick and comma above the stave.

describe('Behind Bars vocal syllabic slurs and breathing marks (pp. 435–436)', () => {
	it.concurrent('draws vocal-slurs-breathing', async () => {
		expect(await draw('vocal-slurs-breathing')).toMatchScreenshot(
			'engraving_vocal-slurs-breathing.png',
		);
	});

	it.todo(
		'vocal-short-slur-placement (p. 436): places short syllabic slurs near noteheads on mid-stave notes and above the stave on low notes below the stave',
	);

	it.todo(
		'vocal-long-slur-above (p. 436): places a long syllabic slur above the stave clear of the sung text',
	);

	it.concurrent('vocal-breath-mark-tick-comma (p. 436): draws a tick on beat 2 and a comma on beat 4 above the stave', async () => {
		const e = await engrave(
			'vocal-slurs-breathing',
			'vocal-breath-mark-tick-comma',
		);
		const space = e.space(3);
		const top = must(e.lines(3)[0], 'top stave line');
		const marks = e
			.inMeasure('breath-mark', 3)
			.sort((a, b) => a.box.x - b.box.x);
		const tick = must(marks[0], 'tick in measure 4');
		const comma = must(marks[1], 'comma in measure 4');
		markBox(e, tick.box, 'Tick');
		markBox(e, comma.box, 'Comma');
		const above =
			bottomEdge(tick.box) <= top + 0.1 * space &&
			bottomEdge(comma.box) <= top + 0.1 * space;
		const distinct = tick.box.w > comma.box.w + 0.05 * space;
		expect(e.check([marks.length === 2, above, distinct])).toMatchMeasurements([
			true,
			true,
			true,
		]);
	});
});
