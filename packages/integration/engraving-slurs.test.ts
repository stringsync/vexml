import { describe, expect, it } from 'bun:test';
import type { Ink } from './engraving-ink';
import type { Engraving } from './engraving-model';
import { draw, engrave, must, quarters } from './engraving-render';
import { markBox } from './engraving-spacing-measures';
import { onStave } from './engraving-spanners';
import { apexY, column, columnMid, tapered } from './engraving-tie-arcs';

describe('Behind Bars slurs', () => {
	it.concurrent('draws slurs over level, rising, stemless and beamed notes', async () => {
		expect(await draw('slurs')).toMatchScreenshot('engraving_slurs.png');
	});

	it.concurrent('slur-tapered-arc (p. 109): draws a slur as a tapered arc, thicker in the middle than at its tips', async () => {
		const e = await engrave('slurs', 'slur-tapered-arc');
		const slur = only(e, 0);
		markBox(e, slur.box, 'Slur');
		expect(e.check(tapered(slur))).toMatchMeasurements(true);
	});

	it.concurrent('slur-tilts-with-pitch (p. 109): tilts a slur between different pitches towards the higher end', async () => {
		const e = await engrave('slurs', 'slur-tilts-with-pitch');
		const slur = only(e, 1);
		markBox(e, slur.box, 'Slur');
		expect(
			e.check(endY(slur, 'right') < endY(slur, 'left')),
		).toMatchMeasurements(true);
	});

	it.concurrent('slur-long-flat (p. 109): flattens a long slur, keeping it close to the stave', async () => {
		const e = await engrave('slurs', 'slur-long-flat');
		const short = only(e, 2);
		const long = only(e, 3);
		markBox(e, short.box, 'Short slur');
		markBox(e, long.box, 'Long slur');
		expect(
			e.check([
				long.box.h / long.box.w < short.box.h / short.box.w,
				quarters(long.box.h, e.space(3)) <= 2,
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('slur-in-space (p. 110): places the slur arc in a stave-space, not on a line', async () => {
		const e = await engrave('slurs', 'slur-in-space');
		const slur = only(e, 4);
		const apex = apexY(slur);
		const clearance = Math.min(...e.lines(4).map((l) => Math.abs(l - apex)));
		markBox(e, slur.box, 'Slur');
		expect(e.check(clearance >= 0.25 * e.space(4))).toMatchMeasurements(true);
	});

	it.concurrent('slur-same-direction (p. 110): puts a slur on the notehead side when all stems point one way', async () => {
		const e = await engrave('slurs', 'slur-same-direction');
		const up = only(e, 5);
		const down = only(e, 6);
		markBox(e, up.box, 'Stems up');
		markBox(e, down.box, 'Stems down');
		expect(
			e.check([
				apexY(up) > Math.max(...e.headsIn(5).map((n) => n.cy)),
				apexY(down) < Math.min(...e.headsIn(6).map((n) => n.cy)),
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('slur-mixed-stems-above (p. 110): puts a slur over mixed stem directions above the stave', async () => {
		const e = await engrave('slurs', 'slur-mixed-stems-above');
		const slur = only(e, 7);
		markBox(e, slur.box, 'Slur');
		expect(
			e.check(apexY(slur) < must(e.lines(7)[0], 'top line')),
		).toMatchMeasurements(true);
	});

	it.concurrent('slur-stemless-as-stemmed (p. 110): places a slur over stemless notes as if they had stems', async () => {
		const e = await engrave('slurs', 'slur-stemless-as-stemmed');
		const low = only(e, 8);
		const centreLine = only(e, 9);
		markBox(e, low.box, 'Low whole notes');
		markBox(e, centreLine.box, 'Centre-line whole notes');
		expect(
			e.check([
				apexY(low) > Math.max(...e.headsIn(8).map((n) => n.cy)),
				apexY(centreLine) < Math.min(...e.headsIn(9).map((n) => n.cy)),
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('slur-end-near-heads (pp. 110–111): ends a slur between half and one-and-a-half spaces from the notehead centres', async () => {
		const e = await engrave('slurs', 'slur-end-near-heads');
		const slur = only(e, 10);
		const heads = e.headsIn(10);
		const first = must(heads[0], 'first note');
		const last = must(heads[3], 'last note');
		const gaps = [
			(column(slur, slur.box.x + 1)?.[0] ?? 0) - first.cy,
			(column(slur, slur.box.x + slur.box.w - 2)?.[0] ?? 0) - last.cy,
		].map((px) => quarters(px, e.space(10)));
		markBox(e, slur.box, 'Slur');
		expect(e.check(gaps.map((g) => g >= 0.5 && g <= 1.5))).toMatchMeasurements([
			true,
			true,
		]);
	});

	it.concurrent('slur-clear-articulation (p. 111): keeps a slur clear of the staccato dots it spans', async () => {
		const e = await engrave('slurs', 'slur-clear-articulation');
		const slur = only(e, 11);
		const dots = onStave(e, 'staccato-dot', 11, 8, 8);
		markBox(e, slur.box, 'Slur');
		const clear = dots.map((dot) => {
			const cx = Math.floor(dot.box.x + dot.box.w / 2);
			const top = column(slur, cx)?.[0];
			return top !== undefined && top >= dot.box.y + dot.box.h;
		});
		expect(e.check(clear)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('slur-opposite-stems-tilt (p. 111): keeps a slur from tilting against the pitches when outer stems point opposite ways', async () => {
		const e = await engrave('slurs', 'slur-opposite-stems-tilt');
		const slur = only(e, 12);
		markBox(e, slur.box, 'Slur');
		expect(
			e.check(endY(slur, 'right') < endY(slur, 'left')),
		).toMatchMeasurements(true);
	});

	it.concurrent('slur-outside-beam (p. 111): keeps a slur at the stem end outside the beam', async () => {
		const e = await engrave('slurs', 'slur-outside-beam');
		const slur = only(e, 13);
		const beams = onStave(e, 'beam', 13, 8, 8);
		markBox(e, slur.box, 'Slur');
		const clear = beams.map((beam) => {
			const bottom = column(slur, Math.round(beam.box.x + beam.box.w / 2))?.[1];
			return bottom !== undefined && bottom <= beam.box.y;
		});
		expect(e.check(clear)).toMatchMeasurements([true, true]);
	});
});

/** The lone slur drawn on a measure's stave. */
function only(e: Engraving, measure: number): Ink {
	const found = onStave(e, 'slur', measure, 8, 8);
	if (found.length !== 1) {
		throw new Error(`measure ${measure} holds ${found.length} slurs, not 1`);
	}
	return must(found[0], 'slur');
}

/** The middle of the slur's stroke at one end. */
function endY(slur: Ink, end: 'left' | 'right'): number {
	const { x, w } = slur.box;
	return columnMid(slur, end === 'left' ? x + 1 : x + w - 2);
}
