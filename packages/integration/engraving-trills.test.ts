import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { centre, markBox } from './engraving-spacing-measures';
import { bottomEdge } from './engraving-spanners';

describe('Behind Bars trills (design and placing)', () => {
	it.concurrent('draws single, double-stemmed and chord trill marks', async () => {
		expect(await draw('trills')).toMatchScreenshot('engraving_trills.png');
	});

	it.concurrent('trill-above-flush-left (p. 135): places tr above stave, above accent and below fermata', async () => {
		const e = await engrave('trills', 'trill-above-flush-left');
		const top = must(e.lines(0)[0], 'top stave line');
		const trills = e.inMeasure('ornament', 0).sort((a, b) => a.box.x - b.box.x);
		expect(trills).toHaveLength(4);
		const accent = must(e.inMeasure('accent', 0)[0], 'beat 3 accent');
		const tr3 = must(trills[2], 'beat 3 tr');
		const tr4 = must(trills[3], 'beat 4 tr');
		const fermata = must(e.inMeasure('fermata', 0)[0], 'beat 4 fermata');
		for (const [i, t] of trills.entries()) {
			markBox(e, t.box, `tr ${i + 1}`);
		}
		markBox(e, accent.box, 'Accent');
		markBox(e, fermata.box, 'Fermata');
		expect(
			e.check({
				allAboveStave: trills.every((t) => bottomEdge(t.box) < top),
				trAboveAccent: bottomEdge(tr3.box) < accent.box.y,
				trBelowFermata: bottomEdge(fermata.box) < tr4.box.y,
			}),
		).toMatchMeasurements({
			allAboveStave: true,
			trAboveAccent: true,
			trBelowFermata: true,
		});
	});

	it.concurrent('trill-double-stemmed-voices (p. 135): places upper voice tr above stave and lower voice tr below stave inside dynamic', async () => {
		const e = await engrave('trills', 'trill-double-stemmed-voices');
		const m2 = e.measureRect(1);
		const lines = e.lines(1);
		const top = must(lines[0], 'top stave line');
		const bottom = must(lines[4], 'bottom stave line');
		const trills = e.inMeasure('ornament', 1).sort((a, b) => a.box.y - b.box.y);
		expect(trills).toHaveLength(2);
		const upper = must(trills[0], 'upper voice tr');
		const lower = must(trills[1], 'lower voice tr');
		const dynamic = must(
			e.of('words').find((ink) => {
				const cx = centre(ink.box);
				return cx >= m2.x && cx < m2.x + m2.w;
			}),
			'p dynamic',
		);
		markBox(e, upper.box, 'Voice 1 tr');
		markBox(e, lower.box, 'Voice 2 tr');
		markBox(e, dynamic.box, 'Dynamic p');
		expect(
			e.check({
				upperAboveStave: bottomEdge(upper.box) < top,
				lowerBelowStave: lower.box.y > bottom,
				lowerAboveDynamic: bottomEdge(lower.box) < dynamic.box.y,
			}),
		).toMatchMeasurements({
			upperAboveStave: true,
			lowerBelowStave: true,
			lowerAboveDynamic: true,
		});
	});

	it.concurrent('trill-single-stemmed-chord (p. 135): draws two distinct tr signs on a double-trill chord', async () => {
		const e = await engrave('trills', 'trill-single-stemmed-chord');
		const top = must(e.lines(2)[0], 'top stave line');
		const trills = e.inMeasure('ornament', 2).sort((a, b) => a.box.y - b.box.y);
		expect(trills).toHaveLength(2);
		const upper = must(trills[0], 'upper tr');
		const lower = must(trills[1], 'lower tr');
		markBox(e, upper.box, 'Upper tr');
		markBox(e, lower.box, 'Lower tr');
		expect(
			e.check({
				count: trills.length,
				bothAboveStave: trills.every((t) => bottomEdge(t.box) < top),
				distinct: bottomEdge(upper.box) < lower.box.y,
			}),
		).toMatchMeasurements({
			count: 2,
			bothAboveStave: true,
			distinct: true,
		});
	});
});
