import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { barX, markBox } from './engraving-spacing-measures';

// Behind Bars, pp. 136–138: trill lines and signs (ENGRAVING.md). trill-lines.musicxml, treble, 4/4:
// - M1: a trilled half note tied to a half note. M2: a trilled half note, then F♯ (line stops on it).
// - M3: E, then a trilled D on the last beat pair of the bar. M4: a whole note where that line stops.
// - M5: four trilled quarter notes with no line. M6: two trills with a trilling-note accidental.

describe('Behind Bars trill lines (pp. 136–138)', () => {
	it.concurrent('draws trill lines, signs and accidentals', async () => {
		expect(await draw('trill-lines')).toMatchScreenshot(
			'engraving_trill-lines.png',
		);
	});

	it.concurrent('trill-line-tied-continuous (p. 136): runs one trill line across both tied notes to the barline', async () => {
		const e = await engrave('trill-lines', 'trill-line-tied-continuous');
		const line = must(e.inMeasure('trill-line', 0)[0], 'trill line').box;
		const second = must(e.headsIn(0)[1], 'tied second note').head;
		const bar = barX(e, 0);
		markBox(e, line, 'Trill line');
		markBox(e, second, 'Tied note');
		const lineRight = line.x + line.w;
		const gapToBar = (bar - lineRight) / e.space(0);
		expect(
			e.check({
				pastTiedHead: lineRight > second.x + second.w,
				reachesBar: gapToBar >= 0 && gapToBar <= 1,
			}),
		).toMatchMeasurements({ pastTiedHead: true, reachesBar: true });
	});

	it.concurrent('trill-line-to-next-note (p. 136): runs the trill line right up to the following note or its accidental', async () => {
		const e = await engrave('trill-lines', 'trill-line-to-next-note');
		const line = must(e.inMeasure('trill-line', 1)[0], 'trill line').box;
		const next = must(e.headsIn(1)[1], 'following note');
		const sharpLeft = must(next.ink, 'following note ink').x;
		markBox(e, line, 'Trill line');
		e.marks.reference('next-accidental', {
			kind: 'line',
			from: { x: sharpLeft, y: line.y - 4 },
			to: { x: sharpLeft, y: next.head.y + next.head.h },
			label: 'Sharp',
			note: `M2 F# accidental left edge at x=${sharpLeft}`,
		});
		const gap = (sharpLeft - (line.x + line.w)) / e.space(1);
		expect(e.check(gap >= 0 && gap <= 1)).toMatchMeasurements(true);
	});

	it.concurrent('trill-line-stops-barline (p. 136): ends the line at the barline without crossing it', async () => {
		const e = await engrave('trill-lines', 'trill-line-stops-barline');
		const line = must(e.inMeasure('trill-line', 2)[0], 'trill line').box;
		const bar = barX(e, 2);
		markBox(e, line, 'Trill line');
		const gap = (bar - (line.x + line.w)) / e.space(2);
		expect(e.check(gap >= 0 && gap <= 1)).toMatchMeasurements(true);
	});

	it.concurrent('trill-line-after-sign (p. 136): begins the line directly after the tr sign without overlapping it', async () => {
		const e = await engrave('trill-lines', 'trill-line-after-sign');
		const sign = must(e.inMeasure('ornament', 0)[0], 'trill sign').box;
		const line = must(e.inMeasure('trill-line', 0)[0], 'trill line').box;
		markBox(e, sign, 'Trill sign');
		markBox(e, line, 'Trill line');
		const gap = (line.x - (sign.x + sign.w)) / e.space(0);
		expect(e.check(gap >= 0 && gap <= 1)).toMatchMeasurements(true);
	});

	it.concurrent('trill-resignal-each-note (p. 137): draws a trill sign on every re-articulated note and no line', async () => {
		const e = await engrave('trill-lines', 'trill-resignal-each-note');
		const signs = e.inMeasure('ornament', 4);
		const lines = e.inMeasure('trill-line', 4);
		for (const sign of signs) {
			markBox(e, sign.box, 'Trill sign');
		}
		expect(
			e.check({ signs: signs.length, lines: lines.length }),
		).toMatchMeasurements({ signs: 4, lines: 0 });
	});

	it.concurrent('trill-accidental-mark (p. 138): stacks the trilling-note accidental above the sign', async () => {
		const e = await engrave('trill-lines', 'trill-accidental-mark');
		const signs = e.inMeasure('ornament', 5);
		for (const sign of signs) {
			markBox(e, sign.box, 'Sign and accidental');
		}
		expect(
			e.check(signs.map((s) => s.box.h > 2 * 1.5 * e.space(5))),
		).toMatchMeasurements([true, true]);
	});
});
