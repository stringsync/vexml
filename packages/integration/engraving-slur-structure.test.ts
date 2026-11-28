import { describe, expect, it } from 'bun:test';
import type { Ink } from './engraving-ink';
import { type Engraving, stemX } from './engraving-model';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';
import { onStave, rightEdge } from './engraving-spanners';
import { column, columnMid } from './engraving-tie-arcs';

describe('Behind Bars slurs over breaks, nested, on chords and on stems', () => {
	it.concurrent('draws slurs over a system break, nested and on chords and stems', async () => {
		expect(await draw('slurs-structure')).toMatchScreenshot(
			'engraving_slurs-structure.png',
		);
	});

	it.concurrent('slur-break-ends (p. 112): ends a broken slur over the closing barline with visible vertical clearance', async () => {
		const e = await engrave('slurs-structure', 'slur-break-ends');
		const slur = only(e, 0);
		const barlineX = rightEdge(e.measureRect(0));
		const topLine = must(e.lines(0)[0], 'top stave line');
		const bottomLine = must(e.lines(0)[4], 'bottom stave line');
		const space = e.space(0);
		const rightSpan = must(
			column(slur, slur.box.x + slur.box.w - 2),
			'right slur tip',
		);
		markBox(e, slur.box, 'Slur');
		e.marks.reference('m1-barline', {
			kind: 'line',
			from: { x: barlineX, y: topLine - space },
			to: { x: barlineX, y: bottomLine },
			label: 'closing barline',
			note: `M1 closing barline at x=${barlineX}, top=${topLine}`,
		});
		const reachesBarline =
			Math.abs(rightEdge(slur.box) - barlineX) <= 0.25 * space;
		const clearsTop = topLine - rightSpan[1] >= 0.25 * space;
		expect(e.check([reachesBarline, clearsTop])).toMatchMeasurements([
			true,
			true,
		]);
	});

	it.concurrent('slur-break-resume (p. 112): starts the slur on a new system after its key signature and before the note', async () => {
		const e = await engrave('slurs-structure', 'slur-break-resume');
		const slur = only(e, 1);
		const key = must(e.inMeasure('keysignature', 1)[0], 'key signature');
		const head = must(e.headsIn(1)[0], 'first note').head;
		markBox(e, slur.box, 'Slur');
		markBox(e, key.box, 'Key signature');
		expect(
			e.check([slur.box.x >= rightEdge(key.box), slur.box.x <= head.x]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('slur-break-same-side (p. 112): keeps both halves of a broken slur on the same side of the stave', async () => {
		const e = await engrave('slurs-structure', 'slur-break-same-side');
		const sides = [0, 1].map((m) => {
			const slur = only(e, m);
			markBox(e, slur.box, `Slur ${m + 1}`);
			return centreY(slur) < must(e.lines(m)[0], 'top stave line');
		});
		expect(e.check(sides)).toMatchMeasurements([true, true]);
	});

	it.concurrent('slur-break-open-tilt (p. 112): draws a level open arc for a slur starting on the last note of a system', async () => {
		const e = await engrave('slurs-structure', 'slur-break-open-tilt');
		const slur = only(e, 0);
		markBox(e, slur.box, 'Slur');
		const left = columnMid(slur, slur.box.x + 1);
		const mid = columnMid(slur, Math.round(slur.box.x + slur.box.w / 2));
		const right = columnMid(slur, slur.box.x + slur.box.w - 2);
		expect(
			e.check([Math.abs(right - left) <= 0.25 * e.space(0), mid < left]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('slur-nested (p. 113): puts the shorter of two nested slurs closest to the notes', async () => {
		const e = await engrave('slurs-structure', 'slur-nested');
		const slurs = onStave(e, 'slur', 2, 8, 8).sort((a, b) => a.box.w - b.box.w);
		if (slurs.length !== 2) {
			throw new Error(`measure 2 holds ${slurs.length} slurs, not 2`);
		}
		const [short, long] = slurs;
		if (!short || !long) {
			throw new Error('expected two slurs in measure 2');
		}
		markBox(e, short.box, 'Short slur');
		markBox(e, long.box, 'Long slur');
		const samples = [0.25, 0.5, 0.75].map((f) => {
			const x = Math.round(short.box.x + short.box.w * f);
			return columnMid(long, x) < columnMid(short, x);
		});
		expect(e.check(samples)).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('slur-chord-single (p. 114): draws one slur for all the notes on a chord stem', async () => {
		const e = await engrave('slurs-structure', 'slur-chord-single');
		const slurs = onStave(e, 'slur', 3, 8, 8);
		for (const [i, slur] of slurs.entries()) {
			markBox(e, slur.box, `Slur ${i + 1}`);
		}
		expect(e.check(slurs.length)).toMatchMeasurements(1);
	});

	it.concurrent('slur-centre-stem (p. 122): centres a slur at the stem ends on the first and last stems', async () => {
		const e = await engrave('slurs-structure', 'slur-centre-stem');
		expect(e.check(endsOnStems(e, 4))).toMatchMeasurements([true, true]);
	});

	it.concurrent('slur-staccato-centre-stem (p. 122): keeps a slur centred on the stems when staccato dots sit at their ends', async () => {
		const e = await engrave('slurs-structure', 'slur-staccato-centre-stem');
		expect(e.check(endsOnStems(e, 5))).toMatchMeasurements([true, true]);
	});
});

function endsOnStems(e: Engraving, measure: number): [boolean, boolean] {
	const slur = only(e, measure);
	const heads = e.headsIn(measure);
	const first = must(heads[0], 'first note');
	const last = must(heads[heads.length - 1], 'last note');
	const tol = 0.25 * e.space(measure);
	markBox(e, slur.box, 'Slur');
	return [
		Math.abs(slur.box.x - stemX(first)) <= tol,
		Math.abs(rightEdge(slur.box) - stemX(last)) <= tol,
	];
}

function only(e: Engraving, measure: number): Ink {
	const found = onStave(e, 'slur', measure, 8, 8);
	if (found.length !== 1) {
		throw new Error(`measure ${measure} holds ${found.length} slurs, not 1`);
	}
	return must(found[0], 'slur');
}

function centreY(slur: Ink): number {
	return slur.box.y + slur.box.h / 2;
}
