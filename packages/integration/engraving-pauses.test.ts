import { describe, expect, it } from 'bun:test';
import type { Ink } from './engraving-ink';
import type { Engraving } from './engraving-model';
import { draw, engrave, must } from './engraving-render';
import { centre, markBox } from './engraving-spacing-measures';
import { bottomEdge, rightEdge } from './engraving-spanners';

describe('Behind Bars pauses, breath marks, caesuras, and fermatas', () => {
	it.concurrent('draws breath marks, caesuras, and fermatas across single and double-stemmed staves', async () => {
		expect(await draw('pauses')).toMatchScreenshot('engraving_pauses.png');
	});

	it.concurrent('draws a default fermata on a braced two-stave part', async () => {
		expect(await draw('pauses-braced')).toMatchScreenshot(
			'engraving_pauses-braced.png',
		);
	});

	it.concurrent('pause-breath-caesura-place (p. 187): places breath comma before next note and caesura before barline straddling top stave lines', async () => {
		const e = await engrave('pauses', 'pause-breath-caesura-place');
		const space = e.space(0);
		const lines = e.lines(0);
		const topLine = must(lines[0], 'top stave line');
		const secondLine = must(lines[1], 'second stave line');
		const heads = e.headsIn(0);
		const g4 = must(heads[0], 'G4 in measure 1');
		const a4 = must(heads[1], 'A4 in measure 1');
		const rect = e.measureRect(0);
		const barlineX = rect.x + rect.w;
		const breath = must(
			e.inMeasure('breath-mark', 0)[0],
			'breath comma in measure 1',
		);
		const caesura = must(e.inMeasure('caesura', 0)[0], 'caesura in measure 1');
		markBox(e, breath.box, 'Breath');
		markBox(e, caesura.box, 'Caesura');
		const midG4A4 = (g4.head.x + g4.head.w + a4.head.x) / 2;
		const breathBeforeNext =
			centre(breath.box) > midG4A4 && breath.box.x + breath.box.w < a4.head.x;
		const midA4Bar = (a4.head.x + a4.head.w + barlineX) / 2;
		const caesuraBeforeBar =
			centre(caesura.box) > midA4Bar &&
			caesura.box.x + caesura.box.w < barlineX;
		const caesuraStraddles =
			Math.abs(bottomEdge(caesura.box) - secondLine) <= 0.35 * space &&
			Math.abs(caesura.box.y - (topLine - space)) <= 0.35 * space;
		expect(
			e.check([breathBeforeNext, caesuraBeforeBar, caesuraStraddles]),
		).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('pause-fermata-size (p. 188): sizes a standard fermata at about one stave-space high and two spaces wide', async () => {
		const e = await engrave('pauses', 'pause-fermata-size');
		const fermata = must(fermatasIn(e, 1)[0], 'fermata in measure 2');
		const space = e.space(1);
		markBox(e, fermata.box, 'Fermata');
		const hSpaces = fermata.box.h / space;
		const wSpaces = fermata.box.w / space;
		expect(
			e.check([
				hSpaces >= 0.75 && hSpaces <= 1.5,
				wSpaces >= 1.5 && wSpaces <= 2.5,
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('pause-fermata-centre (p. 188): centres fermatas on noteheads (main-side head on seconds), rests, and barlines', async () => {
		const e = await engrave('pauses', 'pause-fermata-centre');
		const space = e.space(2);
		const tol = 0.35 * space;
		const heads = e.headsIn(2);
		const rest = must(e.restsIn(2)[0], 'quarter rest');
		const rect = e.measureRect(2);
		const barlineX = rect.x + rect.w;
		// M3 heads: F4, D5, G4 (main-side of G4/A4), A4 (displaced)
		const targets = [
			centre(must(heads[0], 'F4').head),
			centre(must(heads[1], 'D5').head),
			centre(must(heads[2], 'G4').head),
			centre(rest.head),
			barlineX,
		];
		const fermatas = fermatasIn(e, 2, 0, 1, true);
		expect(fermatas).toHaveLength(5);
		const centred = targets.map((tx, i) => {
			const f = must(fermatas[i], `fermata ${i + 1}`);
			markBox(e, f.box, `F${i + 1}`);
			return Math.abs(centre(f.box) - tx) <= tol;
		});
		expect(e.check(centred)).toMatchMeasurements([
			true,
			true,
			true,
			true,
			true,
		]);
	});

	it.concurrent('pause-fermata-above (p. 188): places single-stemmed fermatas upright above the stave regardless of stem direction', async () => {
		const e = await engrave('pauses', 'pause-fermata-above');
		const top = must(e.lines(3)[0], 'top stave line');
		const fermatas = fermatasIn(e, 3);
		expect(fermatas).toHaveLength(2);
		const above = fermatas.map((f, i) => {
			markBox(e, f.box, `Fermata ${i + 1}`);
			return bottomEdge(f.box) < top;
		});
		expect(e.check(above)).toMatchMeasurements([true, true]);
	});

	it.concurrent('pause-fermata-tremolo (p. 188): centres a fermata outside the beams of a two-note tremolo', async () => {
		const e = await engrave('pauses', 'pause-fermata-tremolo');
		const space = e.space(4);
		const top = must(e.lines(4)[0], 'top stave line');
		const heads = e.headsIn(4);
		const a4 = must(heads[0], 'A4 in measure 5');
		const c5 = must(heads[1], 'C5 in measure 5');
		const fermata = must(fermatasIn(e, 4)[0], 'fermata in measure 5');
		markBox(e, fermata.box, 'Fermata');
		const midX = (centre(a4.head) + centre(c5.head)) / 2;
		const centred = Math.abs(centre(fermata.box) - midX) <= 0.35 * space;
		const above = bottomEdge(fermata.box) < top;
		expect(e.check([centred, above])).toMatchMeasurements([true, true]);
	});

	// fix: #4503
	it.todo('pause-fermata-stack-order (pp. 188-189): fermata outside trill');

	it.concurrent('pause-fermata-inside-slur (p. 189): positions a mid-phrase fermata cleanly inside its slur without colliding with the arc', async () => {
		const e = await engrave('pauses', 'pause-fermata-inside-slur');
		const space = e.space(6);
		const fermata = must(fermatasIn(e, 6)[0], 'fermata in measure 7');
		const slur = must(e.inMeasure('slur', 6)[0], 'slur in measure 7');
		markBox(e, fermata.box, 'Fermata');
		markBox(e, slur.box, 'Slur');
		const insideX =
			fermata.box.x > slur.box.x &&
			rightEdge(fermata.box) < rightEdge(slur.box);
		const slurBand = slur.bandsAt(Math.round(centre(fermata.box)))[0];
		const clearance = slurBand ? fermata.box.y - slurBand[1] : -Infinity;
		const noOverlap = slur.overlaps(fermata) === 0;
		const clearGap = clearance >= 0.3 * space;
		expect(e.check([insideX, noOverlap, clearGap])).toMatchMeasurements([
			true,
			true,
			true,
		]);
	});

	it.concurrent('pause-fermata-double-stem (p. 189): places upper-voice fermata upright above and lower-voice fermata inverted below in double-stemmed writing', async () => {
		const e = await engrave('pauses', 'pause-fermata-double-stem');
		const lines = e.lines(7);
		const top = must(lines[0], 'top stave line');
		const bottom = must(lines[4], 'bottom stave line');
		const fermatas = fermatasIn(e, 7);
		expect(fermatas).toHaveLength(2);
		const byY = [...fermatas].sort((a, b) => a.box.y - b.box.y);
		const upper = must(byY[0], 'upper fermata');
		const lower = must(byY[1], 'lower fermata');
		markBox(e, upper.box, 'Upper fermata');
		markBox(e, lower.box, 'Lower fermata');
		expect(
			e.check([bottomEdge(upper.box) < top, lower.box.y > bottom]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('pause-fermata-braced-staves (p. 189): places a default fermata on the lower stave of a braced part upright above that stave', async () => {
		const e = await engrave('pauses-braced', 'pause-fermata-braced-staves');
		const staff2Top = must(e.lines(0, 0, 2)[0], 'staff 2 top line');
		const fermata = must(fermatasIn(e, 0, 0, 2)[0], 'lower-stave fermata');
		markBox(e, fermata.box, 'Lower-stave fermata');
		expect(e.check(bottomEdge(fermata.box) < staff2Top)).toMatchMeasurements(
			true,
		);
	});
});

const FERMATA_KINDS = new Set(['fermata', 'vexml-fermata']);

function fermatasIn(
	e: Engraving,
	measure: number,
	part = 0,
	staff = 1,
	includeRightBarline = false,
): Ink[] {
	const rect = e.measureRect(measure);
	const space = e.space(measure, part);
	const lines = e.lines(measure, part, staff);
	const top = must(lines[0], 'top stave line');
	const bottom = must(lines[4], 'bottom stave line');
	const rightBound = includeRightBarline
		? rect.x + rect.w + space
		: rect.x + rect.w;
	return e.inks
		.filter((ink) => {
			if (!FERMATA_KINDS.has(ink.kind)) {
				return false;
			}
			const cx = centre(ink.box);
			return (
				cx >= rect.x + 0.5 * space &&
				cx <= rightBound &&
				ink.box.y >= top - 6 * space &&
				bottomEdge(ink.box) <= bottom + 6 * space
			);
		})
		.sort((a, b) => a.box.x - b.box.x);
}
