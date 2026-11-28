import { describe, expect, it } from 'bun:test';
import type { Box } from './engraving-ink';
import { draw, engrave, must } from './engraving-render';
import {
	accidentalEdge,
	barX,
	boundaryStrokes,
	centre,
	distance,
	gap,
	markBox,
	openingHead,
	rhythmGaps,
	strokeShade,
	strokes,
	symbol,
} from './engraving-spacing-measures';

// The most a solid stroke's lightest column may average, out of 255.
const SOLID = 40;

// Original fixtures for Behind Bars, pp. 38–43.
describe('Behind Bars barlines and horizontal spacing', () => {
	it.concurrent('draws single, double, repeat and final barlines', async () => {
		expect(await draw('barlines')).toMatchScreenshot('engraving_barlines.png');
	});

	it.concurrent('draws a systemic barline across two parts', async () => {
		expect(await draw('barline-score')).toMatchScreenshot(
			'engraving_barline-score.png',
		);
	});

	it.concurrent('draws mixed durations, a tempo change and a whole-bar note', async () => {
		expect(await draw('rhythmic-spacing')).toMatchScreenshot(
			'engraving_rhythmic-spacing.png',
		);
	});

	it.concurrent('draws opening signatures and crowded mid-system symbols', async () => {
		expect(await draw('symbol-spacing')).toMatchScreenshot(
			'engraving_symbol-spacing.png',
		);
	});

	it.concurrent('barline-single-weight (p. 38): distinguishes a barline from stave lines and stems', async () => {
		const e = await engrave('barlines', 'barline-single-weight');
		const bar = must(boundaryStrokes(e, 0)[0], 'single barline');
		const stem = must(e.headsIn(0)[0]?.stem, 'stem');
		markBox(e, bar, `Barline: ${bar.w}px`);
		markBox(e, stem.box, `Stem: ${stem.box.w}px`);
		const line = e.lineThickness();
		const y = e.middle(0);
		markBox(e, { x: bar.x - 30, y, w: 12, h: line }, `Stave line: ${line}px`);
		expect(e.check(bar.w > line && bar.w > stem.box.w)).toMatchMeasurements(
			true,
		);
	});

	it.concurrent('barline-solo-left-edge (p. 38): leaves a solo stave open at the left', async () => {
		const e = await engrave('barlines', 'barline-solo-left-edge');
		const [top, , , , bottom] = e.lines(0);
		const left = e.measureRect(0).x;
		const span = {
			x: left,
			y: must(top, 'top line'),
			w: 1,
			h: must(bottom, 'bottom line') - must(top, 'top line'),
		};
		markBox(e, span, 'Left edge of the solo stave');
		expect(
			e.check(strokes(e, left, span.y, span.y + span.h, 3).length),
		).toMatchMeasurements(0);
	});

	it.concurrent('barline-systemic (p. 38): joins the opening of both score staves', async () => {
		const e = await engrave('barline-score', 'barline-systemic');
		const left = e.measureRect(0).x;
		const top = must(e.lines(0)[0], 'first stave top');
		const bottom = must(e.lines(0, 1)[4], 'second stave bottom');
		markBox(
			e,
			{ x: left, y: top, w: 1, h: bottom - top },
			'System opening across both staves',
		);
		expect(
			e.check(strokes(e, left, top, bottom, 3).length),
		).toMatchMeasurements(1);
	});

	it.concurrent('barline-thin-double (p. 39): uses two ordinary-weight strokes about ¾ space apart', async () => {
		const e = await engrave('barlines', 'barline-thin-double');
		const single = must(boundaryStrokes(e, 0)[0], 'single barline');
		const bars = boundaryStrokes(e, 1);
		for (const bar of bars) {
			markBox(e, bar, `Thin stroke: ${bar.w}px`);
		}
		const separation =
			bars.length === 2
				? distance(
						e,
						1,
						centre(must(bars[0], 'first stroke')),
						centre(must(bars[1], 'second stroke')),
						'Thin double stroke centres',
					)
				: null;
		// A fractional x can make the measured raster ink one pixel wider.
		const ordinaryWeights = bars.map(({ w }) => Math.abs(w - single.w) <= 1);
		expect(e.check({ ordinaryWeights, separation })).toMatchMeasurements({
			ordinaryWeights: [true, true],
			separation: 0.75,
		});
	});

	it.concurrent('barline-final (p. 39): follows the thin stroke with a beam-weight stroke', async () => {
		const e = await engrave('barlines', 'barline-final');
		const bars = boundaryStrokes(e, 4);
		const beam = must(e.of('beam')[0], 'comparison beam');
		const beamBand = must(
			beam.bandsAt(Math.floor(centre(beam.box)))[0],
			'beam thickness',
		);
		const single = must(boundaryStrokes(e, 0)[0], 'single barline');
		const thin = must(bars[0], 'final thin stroke');
		const thick = must(bars[1], 'final thick stroke');
		markBox(e, thin, `Final thin stroke: ${thin.w}px`);
		markBox(e, thick, `Final thick stroke: ${thick.w}px`);
		markBox(e, beam.box, `Beam: ${beamBand[1] - beamBand[0]}px`);
		const separation = distance(
			e,
			4,
			thin.x + thin.w,
			thick.x,
			'Clear gap between final strokes',
		);
		expect(
			e.check({
				count: bars.length,
				order: thin.w < thick.w,
				beamWeight: Math.abs(thick.w - (beamBand[1] - beamBand[0])) <= 1,
				ordinaryThin: thin.w === single.w && strokeShade(e, thin) <= SOLID,
				separation,
			}),
		).toMatchMeasurements({
			count: 2,
			order: true,
			beamWeight: true,
			ordinaryThin: true,
			separation: 0.5,
		});
	});

	it.concurrent("barline-heavy-styles: draws heavy bar-styles at the final barline's heavy weight, a third of a space apart", async () => {
		const e = await engrave('barline-heavy-styles');
		// Its measures end in light-heavy, heavy, heavy-heavy and heavy-light.
		const heavy = (measure: number, index: number, label: string) => {
			const bar = must(boundaryStrokes(e, measure)[index], label);
			markBox(e, bar, `${label}: ${bar.w}px`);
			return bar;
		};
		const final = heavy(0, 1, 'Light-heavy heavy stroke');
		const first = heavy(2, 0, 'Heavy-heavy first stroke');
		const second = heavy(2, 1, 'Heavy-heavy second stroke');
		const lead = heavy(3, 0, 'Heavy-light heavy stroke');
		const single = must(boundaryStrokes(e, 4)[0], 'light-light first stroke');
		const thin = must(boundaryStrokes(e, 3)[1], 'heavy-light thin stroke');
		markBox(e, thin, `Heavy-light thin stroke: ${thin.w}px`);
		const weights = [heavy(1, 0, 'Heavy stroke'), first, second, lead].map(
			(bar) => bar.w === final.w && strokeShade(e, bar) <= SOLID,
		);
		// A repeat sign's third of a space, give or take the pixel each edge rounds to.
		const thirdSpace = (
			measure: number,
			left: Box,
			right: Box,
			label: string,
		) => {
			const gap = right.x - (left.x + left.w);
			const third = e.space(measure) / 3;
			markBox(
				e,
				{ x: left.x + left.w, y: left.y, w: gap, h: left.h },
				`${label}: ${gap}px, ⅓ space is ${third.toFixed(1)}px`,
			);
			return Math.abs(gap - third) <= 1;
		};
		expect(
			e.check({
				weights,
				ordinaryThin: thin.w === single.w && strokeShade(e, thin) <= SOLID,
				heavyHeavyGap: thirdSpace(
					2,
					first,
					second,
					'Gap between heavy strokes',
				),
				heavyLightGap: thirdSpace(
					3,
					lead,
					thin,
					'Gap from heavy to thin stroke',
				),
			}),
		).toMatchMeasurements({
			weights: [true, true, true, true],
			ordinaryThin: true,
			heavyHeavyGap: true,
			heavyLightGap: true,
		});
	});

	it.concurrent('barline-repeat (p. 39): replaces the divider with oriented strokes and two dots', async () => {
		const e = await engrave('barlines', 'barline-repeat');
		const single = must(boundaryStrokes(e, 0)[0], 'single barline');
		const actual = [3, 2].map((measure) => {
			const bars = boundaryStrokes(e, measure);
			const thick = must(
				[...bars].sort((a, b) => b.w - a.w)[0],
				'thick repeat stroke',
			);
			const beam = must(e.of('beam')[0], 'comparison beam');
			const [beamTop, beamBottom] = must(
				beam.bandsAt(Math.floor(centre(beam.box)))[0],
				'beam thickness',
			);
			for (const bar of bars) {
				markBox(e, bar, 'Repeat stroke');
			}
			const ink = must(
				e
					.of('stavebarline')
					.find(
						({ box }) =>
							box.w > 6 && Math.abs(centre(box) - barX(e, measure)) < 10,
					),
				'repeat barline ink',
			);
			const dots = [-0.5, 0.5].flatMap((offset) => {
				const y = Math.round(e.middle(measure) + offset * e.space(measure));
				const segments = ink.segmentsAt(y);
				const dot = measure === 2 ? segments.at(-1) : segments[0];
				if (!dot || dot[1] - dot[0] < 2 || segments.length < 3) {
					return [];
				}
				return [{ x: dot[0], y: y - 2, w: dot[1] - dot[0], h: 4 }];
			});
			for (const dot of dots) {
				markBox(e, dot, 'Repeat dot');
			}
			const first = must(bars[0], 'first repeat stroke');
			const second = must(bars[1], 'second repeat stroke');
			gap(e, measure, first, second, 'Clear gap between repeat strokes');
			const space = e.space(measure);
			const separation = second.x - (first.x + first.w);
			const thin = first === thick ? second : first;
			return {
				strokes: bars.length,
				thickFirst: first === thick,
				dots: dots.length,
				beamWeight: Math.abs(thick.w - (beamBottom - beamTop)) <= 1,
				thirdSpaceGap: Math.abs(separation - space / 3) <= 1,
				ordinaryThin: thin.w === single.w && strokeShade(e, thin) <= SOLID,
			};
		});
		expect(e.check(actual)).toMatchMeasurements([
			{
				strokes: 2,
				thickFirst: false,
				dots: 2,
				beamWeight: true,
				thirdSpaceGap: true,
				ordinaryThin: true,
			},
			{
				strokes: 2,
				thickFirst: true,
				dots: 2,
				beamWeight: true,
				thirdSpaceGap: true,
				ordinaryThin: true,
			},
		]);
	});

	it.concurrent('rhythm-compressed-gaps (pp. 39–40): gives longer values room without literal time spacing', async () => {
		const e = await engrave('rhythmic-spacing', 'rhythm-compressed-gaps');
		const [half = 0, quarter = 0, eighth = 0] = rhythmGaps(e, 1);
		expect(
			e.check(
				half >= quarter &&
					quarter >= eighth &&
					half < 4 * eighth &&
					quarter < 2 * eighth,
			),
		).toMatchMeasurements(true);
	});

	it.concurrent('rhythm-rest-gaps (pp. 39–40): gives a longer rest at least the room of the shorter note', async () => {
		const e = await engrave('rhythmic-spacing', 'rhythm-rest-gaps');
		const [first = Infinity, second = Infinity, rest = -Infinity] = rhythmGaps(
			e,
			0,
		);
		expect(e.check(rest >= Math.max(first, second))).toMatchMeasurements(true);
	});

	it.concurrent('rhythm-equal-within-system (p. 40): keeps equal durations evenly spaced across a tempo change', async () => {
		const e = await engrave('rhythmic-spacing', 'rhythm-equal-within-system');
		const intervals = [...rhythmGaps(e, 2), ...rhythmGaps(e, 3)];
		expect(
			e.check(Math.max(...intervals) - Math.min(...intervals) <= 0.25),
		).toMatchMeasurements(true);
	});

	it.concurrent('rhythm-barline-beat (p. 41): puts the divider no later than the next beat', async () => {
		const e = await engrave('rhythmic-spacing', 'rhythm-barline-beat');
		const intervals = rhythmGaps(e, 2);
		const last = must(e.headsIn(2).at(-1), 'last note');
		const divider = distance(
			e,
			2,
			centre(last.head),
			barX(e, 2),
			'Last note to barline',
		);
		expect(
			e.check(divider > 0 && divider <= Math.max(...intervals) + 0.25),
		).toMatchMeasurements(true);
	});

	// The user chose MuseScore and Verovio's treatment over the book's: the lone note stays at beat 1.
	it.concurrent('rhythm-whole-bar-note (p. 41): keeps a lone note at beat 1 of a narrow bar', async () => {
		const e = await engrave('rhythmic-spacing', 'rhythm-whole-bar-note');
		const left = e.measureRect(5).x;
		const right = barX(e, 5);
		const head = centre(openingHead(e, 5));
		distance(e, 5, left, head, 'Left barline to whole note');
		distance(e, 5, head, right, 'Whole note to right barline');
		const position = (head - left) / (right - left);
		expect(e.check(position < 0.4)).toMatchMeasurements(true);
	});

	it.concurrent('rhythm-whole-note-alignment (p. 41): aligns a held note to the other part’s first beat', async () => {
		const e = await engrave('barline-score', 'rhythm-whole-note-alignment');
		const upper = openingHead(e, 1);
		const lower = must(e.headsIn(1, 1)[0], 'lower part first note').head;
		markBox(e, upper, 'Upper part first onset');
		markBox(e, lower, 'Lower part first onset');
		expect(
			e.check(Math.abs(centre(upper) - centre(lower)) <= 0.25 * e.space(1)),
		).toMatchMeasurements(true);
	});

	it.concurrent('spacing-system-signatures (p. 41): separates clef, key and metre by 1–1½ spaces', async () => {
		const e = await engrave('symbol-spacing', 'spacing-system-signatures');
		const clef = symbol(e, 0, 'clef');
		const key = symbol(e, 0, 'keysignature', 'accidental');
		const time = symbol(e, 0, 'timesignature');
		const gaps = [
			gap(e, 0, clef, key, 'Clef to key'),
			gap(e, 0, key, time, 'Key to metre'),
		];
		expect(
			e.check(gaps.map((value) => value >= 1 && value <= 1.5)),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('spacing-first-note (p. 42): leaves 2–3 spaces after the opening signatures', async () => {
		const e = await engrave('symbol-spacing', 'spacing-first-note');
		const value = gap(
			e,
			0,
			symbol(e, 0, 'timesignature'),
			openingHead(e, 0),
			'Opening metre to unaltered note',
		);
		expect(e.check(value >= 2 && value <= 3)).toMatchMeasurements(true);
	});

	it.concurrent('spacing-first-accidental (p. 42): leaves at least one space before opening accidentals', async () => {
		const e = await engrave('symbol-spacing', 'spacing-first-accidental');
		const actual = [4, 5].map((measure) => {
			const head = openingHead(e, measure);
			const times = e
				.inMeasure('timesignature', measure)
				.map(({ box }) => box)
				.filter((box) => box.w > 0 && box.x < head.x)
				.sort((a, b) => a.x - b.x);
			const first = must(times[0], 'opening timesignature');
			const time = {
				...first,
				w: Math.max(...times.map((b) => b.x + b.w)) - first.x,
			};
			const accidental = accidentalEdge(e, measure, head);
			return (
				gap(e, measure, time, accidental, 'Opening metre to note accidental') >=
				1
			);
		});
		expect(e.check(actual)).toMatchMeasurements([true, true]);
	});

	it.concurrent('spacing-mid-system-signatures (pp. 42–43): leaves room after a change of clef, time or key', async () => {
		const e = await engrave('symbol-spacing', 'spacing-mid-system-signatures');
		const clef = symbol(e, 1, 'clef');
		const time = symbol(e, 2, 'timesignature');
		const key = symbol(e, 3, 'keysignature', 'accidental');
		const clefGap = distance(
			e,
			1,
			clef.x + clef.w,
			barX(e, 1),
			'Changed clef to barline',
		);
		const timeGap = gap(
			e,
			2,
			time,
			openingHead(e, 2),
			'Changed time to first note',
		);
		const keyGap = gap(
			e,
			3,
			key,
			openingHead(e, 3),
			'Changed key to first note',
		);
		expect(
			e.check([clefGap >= 1, timeGap >= 2, keyGap >= 2]),
		).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('spacing-barline-clearance (pp. 42–43): gives accidentals and stems clear space beside a barline', async () => {
		const e = await engrave('symbol-spacing', 'spacing-barline-clearance');
		// Measure 11 opens straight after a barline with a natural and a down-stem, no grace note between.
		const accidental = accidentalEdge(e, 10, openingHead(e, 10));
		const stem = must(e.headsIn(10)[0]?.stem, 'first stem');
		const line = barX(e, 9);
		const accidentalGap = distance(
			e,
			10,
			line,
			accidental.x,
			'Barline to accidental',
		);
		const stemGap = distance(e, 10, line, stem.box.x, 'Barline to stem');
		expect(e.check([accidentalGap >= 1, stemGap >= 1])).toMatchMeasurements([
			true,
			true,
		]);
	});

	it.concurrent('spacing-tight-symbols (p. 43): leaves at least half a space around an inserted clef', async () => {
		const e = await engrave('symbol-spacing', 'spacing-tight-symbols');
		const clef = symbol(e, 9, 'clef');
		const altered = must(e.headsIn(9)[1], 'altered note');
		const accidental = accidentalEdge(e, 9, altered.head);
		const first = must(e.headsIn(9)[0], 'opening note');
		const before = distance(
			e,
			9,
			(first.ink ?? first.head).x + (first.ink ?? first.head).w,
			clef.x,
			'Opening note and flag to inserted clef',
		);
		const after = gap(e, 9, clef, accidental, 'Inserted clef to accidental');
		expect(e.check([before >= 0.5, after >= 0.5])).toMatchMeasurements([
			true,
			true,
		]);
	});

	it.concurrent('spacing-single-accidental-rhythm (p. 43): preserves equal note spacing when one accidental fits', async () => {
		const e = await engrave(
			'symbol-spacing',
			'spacing-single-accidental-rhythm',
		);
		const [before, after] = rhythmGaps(e, 7);
		const approach = must(before, 'altered gap');
		const ordinary = must(after, 'following gap');
		const altered = must(e.headsIn(7)[1], 'altered note');
		const previous = must(e.headsIn(7)[0], 'previous note');
		const accidental = accidentalEdge(e, 7, altered.head);
		const available = gap(
			e,
			7,
			previous.ink ?? previous.head,
			accidental,
			'Clearance before accidental',
		);
		const fits = available - (approach - ordinary) >= 0.5;
		expect(
			e.check({ fits, evenlySpaced: Math.abs(approach - ordinary) <= 0.25 }),
		).toMatchMeasurements({ fits: true, evenlySpaced: true });
	});

	it.concurrent('spacing-grace-after-barline (p. 43): leaves half a space to an opening grace note', async () => {
		const e = await engrave('symbol-spacing', 'spacing-grace-after-barline');
		const first = must(
			e.notes.find((note) => note.measure === 1 && note.grace),
			'opening grace note',
		);
		const clearance = distance(
			e,
			1,
			barX(e, 0),
			(first.ink ?? first.head).x,
			'Barline to grace note',
		);
		expect(e.check(clearance >= 0.5)).toMatchMeasurements(true);
	});
});
