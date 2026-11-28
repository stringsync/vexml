import { describe, expect, it } from 'bun:test';
import type { Ink } from './engraving-ink';
import type { Engraving } from './engraving-model';
import { draw, engrave, must } from './engraving-render';
import { centre, markBox } from './engraving-spacing-measures';
import { bottomEdge, onStave } from './engraving-spanners';

// Behind Bars, pp. 349–370: harp notation (ENGRAVING.md).
// - harp-grand.musicxml: 2-staff grand-staff harp part (M1 pedal diagram, M2 damp-all, M3 downbeat damp).
// - harp-marks.musicxml: 1-staff harp part (M1 pedal diagram, M2 strum arrows, M3 damp/damp-all,
//   M4 octave harmonics, M5 fingernails, M6 snap pizzicato).

describe('Behind Bars harp (pp. 349–370)', () => {
	it.concurrent('draws harp-grand', async () => {
		expect(await draw('harp-grand')).toMatchScreenshot(
			'engraving_harp-grand.png',
		);
	});

	it.concurrent('draws harp-marks', async () => {
		expect(await draw('harp-marks')).toMatchScreenshot(
			'engraving_harp-marks.png',
		);
	});

	it.concurrent('harp-pedal-diagram-order (p. 355): draws pedal diagram with raised, centred, and lowered ticks and divider', async () => {
		const e = await engrave('harp-marks', 'harp-pedal-diagram-order');
		const top = must(e.lines(0)[0], 'top stave line');
		const space = e.space(0);
		const diagram = must(onStave(e, 'words', 0, 8, 2)[0], 'harp pedal diagram');
		markBox(e, diagram.box, 'Pedal diagram');
		expect(
			e.check(
				bottomEdge(diagram.box) < top &&
					diagram.box.w >= 3 * space &&
					diagram.box.h >= 1.2 * space,
			),
		).toMatchMeasurements(true);
	});

	it.concurrent('harp-pedal-diagram-placement (p. 356): places harp pedal diagram between the two staves', async () => {
		const e = await engrave('harp-grand', 'harp-pedal-diagram-placement');
		const upperBottom = must(
			e.lines(0, 0, 1).at(-1),
			'upper bottom stave line',
		);
		const lowerTop = must(e.lines(0, 0, 2)[0], 'lower top stave line');
		const diagram = must(
			e.inMeasure('words', 0)[0],
			'grand-staff harp pedal diagram',
		);
		markBox(e, diagram.box, 'Pedal diagram');
		expect(
			e.check(
				diagram.box.y > upperBottom && bottomEdge(diagram.box) < lowerTop,
			),
		).toMatchMeasurements(true);
	});

	it.concurrent('harp-chord-strum-arrow (p. 360): draws plain vertical strum arrows above chords without wavy arpeggio lines', async () => {
		const e = await engrave('harp-marks', 'harp-chord-strum-arrow');
		const top = must(e.lines(1)[0], 'top stave line');
		const space = e.space(1);
		const marked = aboveStaveInks(e, 'notehead', 1, top - space);
		for (const [i, ink] of marked.entries()) {
			markBox(
				e,
				{ x: ink.box.x, y: ink.box.y, w: ink.box.w, h: top - ink.box.y },
				`Strum arrow ${i + 1}`,
			);
		}
		expect(
			e.check({
				arrowCount: marked.length,
				noWavyArpeggio: e.inMeasure('arpeggio', 1).length === 0,
			}),
		).toMatchMeasurements({
			arrowCount: 2,
			noWavyArpeggio: true,
		});
	});

	it.concurrent('harp-damp-sign-glyph (p. 364): draws circle-with-cross damping signs clear of the stave', async () => {
		const e = await engrave('harp-marks', 'harp-damp-sign-glyph');
		const top = must(e.lines(2)[0], 'top stave line');
		const damps = onStave(e, 'words', 2, 8, 2);
		for (const [i, damp] of damps.entries()) {
			markBox(e, damp.box, `Damp ${i + 1}`);
		}
		expect(
			e.check({
				count: damps.length,
				allAboveStave: damps.every((d) => bottomEdge(d.box) < top),
				ordered:
					damps.length === 2 &&
					centre(must(damps[0], 'damp 1').box) <
						centre(must(damps[1], 'damp 2').box),
			}),
		).toMatchMeasurements({
			count: 2,
			allAboveStave: true,
			ordered: true,
		});
	});

	it.concurrent('harp-damp-between-staves (p. 364): places both-hands damping sign between staves and downbeat sign after barline', async () => {
		const e = await engrave('harp-grand', 'harp-damp-between-staves');
		const upperBottom2 = must(
			e.lines(1, 0, 1).at(-1),
			'measure 2 upper bottom stave line',
		);
		const lowerTop2 = must(
			e.lines(1, 0, 2)[0],
			'measure 2 lower top stave line',
		);
		const dampAll = must(
			e.inMeasure('words', 1)[0],
			'measure 2 grand-staff damp-all sign',
		);
		markBox(e, dampAll.box, 'Damp all');

		const upperBottom3 = must(
			e.lines(2, 0, 1).at(-1),
			'measure 3 upper bottom stave line',
		);
		const lowerTop3 = must(
			e.lines(2, 0, 2)[0],
			'measure 3 lower top stave line',
		);
		const m3 = e.measureRect(2);
		const space3 = e.space(2);
		const damp = must(
			e.inMeasure('words', 2)[0],
			'measure 3 downbeat damp sign',
		);
		markBox(e, damp.box, 'Downbeat damp');

		expect(
			e.check({
				dampAllBetweenStaves:
					dampAll.box.y > upperBottom2 && bottomEdge(dampAll.box) < lowerTop2,
				downbeatBetweenStaves:
					damp.box.y > upperBottom3 && bottomEdge(damp.box) < lowerTop3,
				downbeatAfterBarline:
					damp.box.x > m3.x &&
					damp.box.x - m3.x < 3 * space3 &&
					centre(damp.box) < m3.x + m3.w / 3,
			}),
		).toMatchMeasurements({
			dampAllBetweenStaves: true,
			downbeatBetweenStaves: true,
			downbeatAfterBarline: true,
		});
	});

	it.concurrent('harp-octave-harmonic-circle (p. 366): draws a small circle above each octave harmonic note', async () => {
		const e = await engrave('harp-marks', 'harp-octave-harmonic-circle');
		const top = must(e.lines(3)[0], 'top stave line');
		const space = e.space(3);
		const marked = aboveStaveInks(e, 'harmonic-circle', 3, top - space);
		for (const [i, ink] of marked.entries()) {
			markBox(
				e,
				{ x: ink.box.x, y: ink.box.y, w: ink.box.w, h: top - ink.box.y },
				`Harmonic ${i + 1}`,
			);
		}
		const chordCircles = marked.slice(2);
		const stacked =
			chordCircles.length === 2 &&
			Math.abs(
				must(chordCircles[0], 'lower chord circle').box.y -
					must(chordCircles[1], 'upper chord circle').box.y,
			) >= space;
		expect(
			e.check({
				count: marked.length,
				stacked,
			}),
		).toMatchMeasurements({
			count: 4,
			stacked: true,
		});
	});

	it.concurrent('harp-fingernail-symbol (p. 367): places the fingernail glyph above both stem-up and stem-down notes', async () => {
		const e = await engrave('harp-marks', 'harp-fingernail-symbol');
		const top = must(e.lines(4)[0], 'top stave line');
		const space = e.space(4);
		const marked = aboveStaveInks(e, 'fingernails', 4, top - space);
		for (const [i, ink] of marked.entries()) {
			markBox(
				e,
				{ x: ink.box.x, y: ink.box.y, w: ink.box.w, h: top - ink.box.y },
				`Fingernail ${i + 1}`,
			);
		}
		expect(e.check(marked.length)).toMatchMeasurements(2);
	});

	it.concurrent('harp-snap-pizzicato-symbol (p. 368): places the snap-pizzicato glyph above both stem-up and stem-down notes', async () => {
		const e = await engrave('harp-marks', 'harp-snap-pizzicato-symbol');
		const top = must(e.lines(5)[0], 'top stave line');
		const space = e.space(5);
		const marked = aboveStaveInks(e, 'snap-pizzicato', 5, top - space);
		for (const [i, ink] of marked.entries()) {
			markBox(
				e,
				{ x: ink.box.x, y: ink.box.y, w: ink.box.w, h: top - ink.box.y },
				`Snap pizzicato ${i + 1}`,
			);
		}
		expect(e.check(marked.length)).toMatchMeasurements(2);
	});
});

/** Inks of `kind` whose top reaches above `ceiling`, ordered left to right. */
function aboveStaveInks(
	e: Engraving,
	kind: string,
	measure: number,
	ceiling: number,
): Ink[] {
	return e
		.inMeasure(kind, measure)
		.filter((ink) => ink.box.y < ceiling)
		.sort((a, b) => a.box.x - b.box.x || b.box.y - a.box.y);
}
