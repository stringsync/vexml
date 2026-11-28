import { describe, expect, it } from 'bun:test';
import type { Ink } from './engraving-ink';
import type { Engraving } from './engraving-model';
import { draw, engrave, must, quarters } from './engraving-render';
import { centre, markBox } from './engraving-spacing-measures';
import {
	bottomEdge,
	onStave,
	opening,
	openingMid,
	rightEdge,
	stroke,
} from './engraving-spanners';

describe('Behind Bars dynamics and hairpins', () => {
	it.concurrent('draws dynamics, hairpins and their qualifying words', async () => {
		expect(await draw('dynamics')).toMatchScreenshot('engraving_dynamics.png');
	});

	it.concurrent('draws hairpins across system breaks', async () => {
		expect(await draw('hairpin-breaks')).toMatchScreenshot(
			'engraving_hairpin-breaks.png',
		);
	});

	it.concurrent("dyn-below-single-stave (p. 101): places a single-stave part's dynamics below the stave", async () => {
		const e = await engrave('dynamics', 'dyn-below-single-stave');
		const bottom = must(e.lines(0).at(-1), 'bottom stave line');
		const dynamics = words(e, 0);
		for (const [i, d] of dynamics.entries()) {
			markBox(e, d.box, `Dynamic ${i + 1}`);
		}
		expect(e.check(dynamics.map((d) => d.box.y >= bottom))).toMatchMeasurements(
			[true, true],
		);
	});

	it.concurrent('dyn-centre-on-notehead (p. 102): centres each dynamic on its notehead', async () => {
		const e = await engrave('dynamics', 'dyn-centre-on-notehead');
		const heads = e.headsIn(1);
		const dynamics = words(e, 1);
		const centred = dynamics.map((d, i) => {
			const head = must(heads[i], `note ${i + 1}`).head;
			markBox(e, d.box, `Dynamic ${i + 1}`);
			return Math.abs(centre(d.box) - centre(head)) <= 0.75 * e.space(1);
		});
		expect(e.check(centred)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('dyn-multi-char-align-last (p. 103): centres ppp and leaves room before the following ff', async () => {
		const e = await engrave('dynamics', 'dyn-multi-char-align-last');
		const head = must(e.headsIn(2)[0], 'first note').head;
		const [soft, loud] = words(e, 2);
		const ppp = must(soft, 'ppp').box;
		const ff = must(loud, 'ff').box;
		markBox(e, ppp, 'ppp');
		markBox(e, ff, 'ff');
		expect(
			e.check([
				Math.abs(centre(ppp) - centre(head)) <= 0.75 * e.space(2),
				rightEdge(ppp) < ff.x,
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('dyn-left-not-right (p. 103): never starts a dynamic to the right of its note', async () => {
		const e = await engrave('dynamics', 'dyn-left-not-right');
		const heads = e.headsIn(2);
		const dynamics = words(e, 2);
		const early = dynamics.map((d, i) => {
			markBox(e, d.box, `Dynamic ${i + 1}`);
			return d.box.x <= centre(must(heads[i], `note ${i + 1}`).head);
		});
		expect(e.check(early)).toMatchMeasurements([true, true]);
	});

	it.concurrent('hairpin-clear-of-lines (p. 102): keeps a hairpin off the stave lines', async () => {
		const e = await engrave('dynamics', 'hairpin-clear-of-lines');
		const hairpin = only(e, 3);
		const bottom = must(e.lines(3).at(-1), 'bottom stave line');
		markBox(e, hairpin.box, 'Hairpin');
		expect(e.check(hairpin.box.y >= bottom)).toMatchMeasurements(true);
	});

	it.concurrent('hairpin-thickness (p. 103): draws a hairpin as thick as a stave line', async () => {
		const e = await engrave('dynamics', 'hairpin-thickness');
		const hairpin = only(e, 3);
		const stave = must(e.inMeasure('stave', 3)[0], 'stave');
		const x = hairpin.box.x + hairpin.box.w * 0.75;
		const line = stave.bandsAt(Math.round(stave.box.x + stave.box.w / 2))[0];
		const lineThickness = line ? line[1] - line[0] : 0;
		markBox(e, hairpin.box, 'Hairpin');
		const ratio = stroke(hairpin, x) / lineThickness;
		expect(e.check(ratio >= 0.7 && ratio <= 1.5)).toMatchMeasurements(true);
	});

	it.concurrent('hairpin-open-end-max (p. 103): opens a hairpin no wider than two stave-spaces', async () => {
		const e = await engrave('dynamics', 'hairpin-open-end-max');
		const hairpin = only(e, 3);
		markBox(e, hairpin.box, 'Hairpin');
		expect(
			e.check(quarters(opening(hairpin, 'right'), e.space(3)) <= 2),
		).toMatchMeasurements(true);
	});

	it.concurrent("hairpin-start-end-heads (p. 104): starts a hairpin at the first note's left edge and ends it no later than the following note's right edge", async () => {
		const e = await engrave('dynamics', 'hairpin-start-end-heads');
		const hairpin = only(e, 3);
		const heads = e.headsIn(3).map((n) => n.head);
		const first = must(heads[0], 'first note');
		const covered = must(heads[2], 'third note');
		const following = must(heads[3], 'fourth note');
		const end = rightEdge(hairpin.box);
		markBox(e, hairpin.box, 'Hairpin');
		expect(
			e.check([
				Math.abs(hairpin.box.x - first.x) <= e.space(3),
				end >= rightEdge(covered) - 0.5 * e.space(3) &&
					end <= rightEdge(following) + 0.5 * e.space(3),
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('hairpin-complementary-match (p. 103): matches the open ends of a crescendo and diminuendo and aligns them', async () => {
		const e = await engrave('dynamics', 'hairpin-complementary-match');
		const [cresc, dim] = onStave(e, 'hairpin', 4);
		const a = must(cresc, 'crescendo');
		const b = must(dim, 'diminuendo');
		markBox(e, a.box, 'Crescendo');
		markBox(e, b.box, 'Diminuendo');
		expect(
			e.check([
				Math.abs(opening(a, 'right') - opening(b, 'left')) <= 1,
				Math.abs(openingMid(a, 'right') - openingMid(b, 'left')) <= 1,
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('hairpin-width-constant (p. 103): opens a hairpin the same width whatever its dynamics', async () => {
		const e = await engrave('dynamics', 'hairpin-width-constant');
		const loud = only(e, 5);
		const soft = only(e, 6);
		markBox(e, loud.box, 'pp to ff');
		markBox(e, soft.box, 'p to mf');
		expect(
			e.check(Math.abs(opening(loud, 'right') - opening(soft, 'right')) <= 1),
		).toMatchMeasurements(true);
	});

	it.concurrent('hairpin-barline-ends (p. 105): keeps hairpin ends clear of barlines except the reviewed downbeat-dynamic crescendo', async () => {
		const e = await engrave('dynamics', 'hairpin-barline-ends');
		const hairpin = only(e, 7);
		const barline = e.measureRect(8).x;
		const dynamic = must(words(e, 8)[0], 'f');
		markBox(e, hairpin.box, 'Hairpin');
		markBox(e, dynamic.box, 'f');
		// Measures 8–9 are the reviewed hairpin-stop-short-of-barline exception: a crescendo into
		// a nearby downbeat dynamic stops at the barline while staying clear of the opening barline.
		expect(
			e.check([
				Math.abs(hairpin.box.x - e.measureRect(7).x) > 0.5 * e.space(7),
				Math.abs(rightEdge(hairpin.box) - barline) <= 0.25 * e.space(7) &&
					rightEdge(hairpin.box) < dynamic.box.x,
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('hairpin-stop-short-of-barline (p. 105): stops a crescendo at the barline before a nearby downbeat dynamic', async () => {
		const e = await engrave('dynamics', 'hairpin-stop-short-of-barline');
		const hairpin = only(e, 7);
		const barline = e.measureRect(8).x;
		const dynamic = must(words(e, 8)[0], 'f');
		markBox(e, hairpin.box, 'Hairpin');
		markBox(e, dynamic.box, 'f');
		expect(
			e.check([
				Math.abs(rightEdge(hairpin.box) - barline) <= 0.25 * e.space(7),
				rightEdge(hairpin.box) < dynamic.box.x,
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('hairpin-system-break (p. 104): leaves a crescendo open at the start of the new system and a diminuendo open at the end of the old one', async () => {
		const e = await engrave('hairpin-breaks', 'hairpin-system-break');
		const incomingCresc = only(e, 1);
		const firstHead = must(e.headsIn(1)[0], 'first note of measure 2').head;
		const outgoingDim = only(e, 2);
		markBox(e, incomingCresc.box, 'Incoming crescendo');
		markBox(e, outgoingDim.box, 'Outgoing diminuendo');
		expect(
			e.check([
				opening(incomingCresc, 'left') >= 0.35 * e.space(1),
				opening(incomingCresc, 'left') < opening(incomingCresc, 'right'),
				rightEdge(incomingCresc.box) <= rightEdge(firstHead) + 0.5 * e.space(1),
				opening(outgoingDim, 'right') >= 0.35 * e.space(2),
				opening(outgoingDim, 'right') < opening(outgoingDim, 'left'),
			]),
		).toMatchMeasurements([true, true, true, true, true]);
	});

	it.concurrent('dyn-horizontal-alignment (p. 105): keeps a run of dynamics and hairpins on one horizontal line', async () => {
		const e = await engrave('dynamics', 'dyn-horizontal-alignment');
		const dynamics = words(e, 9);
		const hairpins = onStave(e, 'hairpin', 9);
		const baseline = bottomEdge(must(dynamics[0], 'first dynamic').box);
		const level = must(hairpins[0], 'first hairpin');
		for (const [i, d] of dynamics.entries()) {
			markBox(e, d.box, `Dynamic ${i + 1}`);
		}
		for (const [i, h] of hairpins.entries()) {
			markBox(e, h.box, `Hairpin ${i + 1}`);
		}
		expect(
			e.check([
				dynamics.every((d) => Math.abs(bottomEdge(d.box) - baseline) <= 2),
				hairpins.every(
					(h) =>
						Math.abs(openingMid(h, 'right') - openingMid(level, 'right')) <= 2,
				),
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('dyn-cresc-dashes (p. 106): continues cresc. with dashes that start after the word', async () => {
		const e = await engrave('dynamics', 'dyn-cresc-dashes');
		const [cresc, finalDynamic] = words(e, 10);
		const word = must(cresc, 'cresc.');
		const dyn = must(finalDynamic, 'final dynamic');
		const dashes = must(onStave(e, 'dashes', 10)[0], 'dashes');
		markBox(e, word.box, 'cresc.');
		markBox(e, dashes.box, 'Dashes');
		markBox(e, dyn.box, 'f');
		const dashMidY = dashes.box.y + dashes.box.h / 2;
		expect(
			e.check([
				dashes.box.x >= rightEdge(word.box),
				dashMidY >= word.box.y && dashMidY <= bottomEdge(word.box),
				rightEdge(dashes.box) >= dyn.box.x - e.space(10),
			]),
		).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('dyn-text-outside-hairpin (p. 106): keeps qualifying words clear of the hairpin', async () => {
		const e = await engrave('dynamics', 'dyn-text-outside-hairpin');
		const hairpin = only(e, 11);
		const qualifying = must(
			onStave(e, 'words', 11).find((w) => w.box.w > 50),
			'qualifying words',
		);
		markBox(e, hairpin.box, 'Hairpin');
		markBox(e, qualifying.box, 'poco a poco');
		expect(
			e.check(
				qualifying.box.y >= bottomEdge(hairpin.box) ||
					bottomEdge(qualifying.box) <= hairpin.box.y,
			),
		).toMatchMeasurements(true);
	});

	it.concurrent('dyn-interim-hairpin-angle (p. 107): keeps the same angle either side of an interim dynamic', async () => {
		const e = await engrave('dynamics', 'dyn-interim-hairpin-angle');
		const [before, after] = onStave(e, 'hairpin', 12);
		const a = must(before, 'first hairpin');
		const b = must(after, 'second hairpin');
		const slopeA = opening(a, 'right') / a.box.w;
		const slopeB = opening(b, 'right') / b.box.w;
		markBox(e, a.box, 'Before');
		markBox(e, b.box, 'After');
		expect(
			e.check(Math.abs(slopeA - slopeB) / slopeA <= 0.1),
		).toMatchMeasurements(true);
	});

	it.concurrent("dyn-subito-placement (p. 107): sets sub. on the dynamic's line", async () => {
		const e = await engrave('dynamics', 'dyn-subito-placement');
		const [, sudden, qualifier] = words(e, 13);
		const dynamic = must(sudden, 'p');
		const subito = must(qualifier, 'sub.');
		markBox(e, dynamic.box, 'p');
		markBox(e, subito.box, 'sub.');
		expect(
			e.check(
				subito.box.y < bottomEdge(dynamic.box) &&
					dynamic.box.y < bottomEdge(subito.box),
			),
		).toMatchMeasurements(true);
	});

	it.concurrent('hairpin-niente-circle (p. 108): draws a small circle at the closed end of a hairpin', async () => {
		const e = await engrave('dynamics', 'hairpin-niente-circle');
		const hairpin = only(e, 14);
		markBox(e, hairpin.box, 'Hairpin with circle');
		expect(
			e.check(opening(hairpin, 'left') >= 0.4 * e.space(14)),
		).toMatchMeasurements(true);
	});
});

/** A measure's dynamics and words, on its own stave, left to right. */
function words(e: Engraving, measure: number): Ink[] {
	return onStave(e, 'words', measure, 4, 10);
}

/** The lone hairpin drawn in a measure. */
function only(e: Engraving, measure: number): Ink {
	const found = onStave(e, 'hairpin', measure);
	if (found.length !== 1) {
		throw new Error(`measure ${measure} holds ${found.length} hairpins, not 1`);
	}
	return must(found[0], 'hairpin');
}
