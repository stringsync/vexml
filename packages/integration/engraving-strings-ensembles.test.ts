import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { centre, markBox } from './engraving-spacing-measures';
import { bottomEdge } from './engraving-spanners';

// Behind Bars, pp. 424–430: strings scordatura, technical symbol stacking, and ensembles.
// strings-ensembles.musicxml (treble, 4/4):
// - M1: artificial harmonic double glissando (G4/C5 diamond -> B4/E5 diamond).
// - M2: scordatura tuning indication at the start of the passage.
// - M3: single-voice stacked symbols (articulation, open-string/harmonic, fingering, string, fermata, bowing).
// - M4: two-voice divisi stacked symbols (voice 1 above, voice 2 below).

describe('Behind Bars strings: scordatura, symbol stacking, and ensembles (pp. 424–430)', () => {
	it.concurrent('draws strings-ensembles', async () => {
		expect(await draw('strings-ensembles')).toMatchScreenshot(
			'engraving_strings-ensembles.png',
		);
	});

	it.concurrent('string-artificial-harmonic-gliss (p. 424): draws parallel glissando lines for both fundamental and diamond harmonic heads', async () => {
		const e = await engrave(
			'strings-ensembles',
			'string-artificial-harmonic-gliss',
		);
		const lines = e.inMeasure('glissando', 0);
		const [first, second] = lines;
		if (first) {
			markBox(e, first.box, 'Glissando 1');
		}
		if (second) {
			markBox(e, second.box, 'Glissando 2');
		}
		const space = e.space(0);
		const parallel =
			first !== undefined &&
			second !== undefined &&
			Math.abs(first.box.w - second.box.w) <= 0.5 * space &&
			Math.abs(first.box.x - second.box.x) <= 0.5 * space &&
			Math.abs(first.box.y - second.box.y) >= 0.75 * space;
		expect(
			e.check({ twoLines: lines.length === 2, parallel }),
		).toMatchMeasurements({ twoLines: true, parallel: true });
	});

	it.concurrent('string-scordatura-pitches (p. 424): places altered open-string pitches above the stave at the start of a scordatura passage', async () => {
		const e = await engrave('strings-ensembles', 'string-scordatura-pitches');
		const scordatura = must(
			e.inMeasure('words', 1)[0],
			'scordatura indication',
		);
		const topLine = must(e.lines(1)[0], 'top stave line');
		const firstHead = must(e.headsIn(1)[0], 'first note in M2');
		markBox(e, scordatura.box, 'Scordatura');
		expect(
			e.check({
				aboveStave: bottomEdge(scordatura.box) < topLine,
				startsNearOpening: scordatura.box.x <= centre(firstHead.head),
			}),
		).toMatchMeasurements({ aboveStave: true, startsNearOpening: true });
	});

	it.todo(
		'string-symbol-stack-order (p. 427): stacks symbols from articulation closest to bowing furthest, above on single voice and split by voice in divisi',
	);
});
