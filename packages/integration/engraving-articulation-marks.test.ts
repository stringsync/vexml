import { describe, expect, it } from 'bun:test';
import type { Ink } from './engraving-ink';
import type { Engraving } from './engraving-model';
import { draw, engrave, must } from './engraving-render';
import { centre, markBox } from './engraving-spacing-measures';
import { bottomEdge, onStave, rightEdge } from './engraving-spanners';
import { column } from './engraving-tie-arcs';

describe('Behind Bars accents, tenuto lines and strong accents', () => {
	it.concurrent('draws accents, strong accents and tenuto lines on notes, ledger lines and under slurs', async () => {
		expect(await draw('articulation-marks')).toMatchScreenshot(
			'engraving_articulation-marks.png',
		);
	});

	it.concurrent('artic-strong-above (p. 117): places a strong accent above the stave whatever the stem direction', async () => {
		const e = await engrave('articulation-marks', 'artic-strong-above');
		const top = must(e.lines(0)[0], 'top stave line');
		const strong = marks(e, 'strong-accent', 0);
		expect(strong).toHaveLength(4);
		const above = strong.map((accent, i) => {
			markBox(e, accent.box, `Strong ${i + 1}`);
			return bottomEdge(accent.box) < top;
		});
		expect(e.check(above)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('artic-accent-outside-stave (p. 120): places accents and staccato wedges outside the stave unless they would sit far from the note', async () => {
		const e = await engrave('articulation-marks', 'artic-accent-outside-stave');
		const lines = e.lines(1);
		const top = must(lines[0], 'top stave line');
		const bottom = must(lines[4], 'bottom stave line');
		const accents = marks(e, 'accent', 1);
		expect(accents).toHaveLength(4);
		const outside = accents.map((accent, i) => {
			markBox(e, accent.box, `Accent ${i + 1}`);
			return bottomEdge(accent.box) < top || accent.box.y > bottom;
		});
		expect(e.check(outside)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('artic-stacc-with-marks-centre (p. 118): centres a staccato dot on the notehead when combined with another mark', async () => {
		const e = await engrave(
			'articulation-marks',
			'artic-stacc-with-marks-centre',
		);
		const heads = e.headsIn(2);
		const dots = marks(e, 'staccato-dot', 2);
		const accents = marks(e, 'accent', 2);
		const limit = 0.25 * e.space(2);
		const centred = heads.map((note, i) => {
			const dot = must(dots[i], 'staccato dot');
			const accent = must(accents[i], 'accent');
			markBox(e, dot.box, `Dot ${i + 1}`);
			markBox(e, accent.box, `Accent ${i + 1}`);
			const headCx = centre(note.head);
			return (
				Math.abs(centre(dot.box) - headCx) <= limit &&
				Math.abs(centre(accent.box) - headCx) <= limit
			);
		});
		expect(e.check(centred)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('artic-extra-mark-own-space (p. 120): gives a second articulation mark its own stave-space further from the note', async () => {
		const e = await engrave('articulation-marks', 'artic-extra-mark-own-space');
		const heads = e.headsIn(2);
		const dots = marks(e, 'staccato-dot', 2);
		const accents = marks(e, 'accent', 2);
		const space = e.space(2);
		const separate = heads.map((note, i) => {
			const dot = must(dots[i], 'staccato dot');
			const accent = must(accents[i], 'accent');
			markBox(e, dot.box, `Dot ${i + 1}`);
			markBox(e, accent.box, `Accent ${i + 1}`);
			const dotCy = dot.box.y + dot.box.h / 2;
			const accentCy = accent.box.y + accent.box.h / 2;
			const gap = Math.max(
				accent.box.y - bottomEdge(dot.box),
				dot.box.y - bottomEdge(accent.box),
			);
			return (
				gap > 0 &&
				Math.abs(accentCy - dotCy) >= 0.75 * space &&
				Math.abs(accentCy - note.cy) > Math.abs(dotCy - note.cy)
			);
		});
		expect(e.check(separate)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('artic-tenuto-ledger-distance (p. 121): keeps tenuto lines further from ledger lines than other marks', async () => {
		const e = await engrave(
			'articulation-marks',
			'artic-tenuto-ledger-distance',
		);
		const heads = e.headsIn(3);
		const tenutos = marks(e, 'tenuto', 3);
		const ledgers = e.inMeasure('stavenote', 3);
		const space = e.space(3);
		const clear = heads.map((note, i) => {
			const tenuto = must(tenutos[i], 'tenuto');
			markBox(e, tenuto.box, `Tenuto ${i + 1}`);
			const headCx = centre(note.head);
			const ledgerRows = ledgers.flatMap((ink) =>
				ink
					.rowYs()
					.filter((y) =>
						ink.segmentsAt(y).some(([x0, x1]) => x0 <= headCx && x1 >= headCx),
					),
			);
			const lowestLedger = Math.max(...ledgerRows);
			const tenutoCy = tenuto.box.y + tenuto.box.h / 2;
			return (
				tenuto.box.y - lowestLedger >= 0.75 * space &&
				tenutoCy - note.cy >= space
			);
		});
		expect(e.check(clear)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('slur-artic-accent-outside (pp. 121–122): puts accents on the first and last notes of a slur outside it', async () => {
		const e = await engrave('articulation-marks', 'slur-artic-accent-outside');
		const slur = must(onStave(e, 'slur', 4, 8, 8)[0], 'slur');
		const accents = marks(e, 'accent', 4);
		expect(accents).toHaveLength(2);
		markBox(e, slur.box, 'Slur');
		const outside = accents.map((accent, i) => {
			markBox(e, accent.box, `Accent ${i + 1}`);
			const cx = Math.round(centre(accent.box));
			const slurBand = must(column(slur, cx), `slur column at accent ${i + 1}`);
			return (
				bottomEdge(accent.box) < slurBand[0] && accent.overlaps(slur) === 0
			);
		});
		expect(e.check(outside)).toMatchMeasurements([true, true]);
	});

	it.concurrent('slur-tenuto-centre-head (p. 122): centres a slur on the notehead when a tenuto line sits between slur and stem', async () => {
		const e = await engrave('articulation-marks', 'slur-tenuto-centre-head');
		const heads = e.headsIn(5);
		const tenutos = marks(e, 'tenuto', 5);
		const slur = must(onStave(e, 'slur', 5, 8, 8)[0], 'slur');
		const space = e.space(5);
		const tol = 0.25 * space;
		expect(tenutos).toHaveLength(4);
		markBox(e, slur.box, 'Slur');
		const marksBetween = heads.map((note, i) => {
			const tenuto = must(tenutos[i], 'tenuto');
			markBox(e, tenuto.box, `Tenuto ${i + 1}`);
			const cx = Math.min(
				Math.max(Math.round(centre(tenuto.box)), slur.box.x + 1),
				rightEdge(slur.box) - 2,
			);
			const slurBand = must(column(slur, cx), `slur column at tenuto ${i + 1}`);
			return (
				bottomEdge(tenuto.box) < note.head.y &&
				tenuto.box.y > slurBand[1] &&
				tenuto.overlaps(slur) === 0
			);
		});
		const first = must(heads[0], 'first note');
		const last = must(heads[heads.length - 1], 'last note');
		const centredOnHeads = [
			Math.abs(slur.box.x - centre(first.head)) <= tol,
			Math.abs(rightEdge(slur.box) - centre(last.head)) <= tol,
		];
		expect(e.check([...marksBetween, ...centredOnHeads])).toMatchMeasurements([
			true,
			true,
			true,
			true,
			true,
			true,
		]);
	});
});

/** A measure's articulation marks of one kind, left to right. */
function marks(e: Engraving, kind: string, measure: number): Ink[] {
	return e
		.inMeasure(kind, measure)
		.sort((a, b) => a.box.x - b.box.x || a.box.y - b.box.y);
}
