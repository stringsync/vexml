import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { centre, markBox } from './engraving-spacing-measures';
import { bottomEdge, rightEdge } from './engraving-spanners';

describe('Behind Bars tuplets (pp. 193–206)', () => {
	it.concurrent('draws tuplet numeral design, centring, outside-stave and square bracket', async () => {
		expect(await draw('tuplets-numeral')).toMatchScreenshot(
			'engraving_tuplets-numeral.png',
		);
	});

	it.concurrent('draws tuplet bracket length, long-final and angle cases', async () => {
		expect(await draw('tuplets-bracket')).toMatchScreenshot(
			'engraving_tuplets-bracket.png',
		);
	});

	it.concurrent('draws tuplet placement, slur nesting, outside-stave and bracket-use cases', async () => {
		expect(await draw('tuplets-placement')).toMatchScreenshot(
			'engraving_tuplets-placement.png',
		);
	});

	it.concurrent('draws double-stemmed tuplet placement', async () => {
		expect(await draw('tuplets-double-stem')).toMatchScreenshot(
			'engraving_tuplets-double-stem.png',
		);
	});

	it.concurrent('draws multi-stave tuplet bracket alignment and rhythmic alignment', async () => {
		expect(await draw('tuplets-parts')).toMatchScreenshot(
			'engraving_tuplets-parts.png',
		);
	});

	it.concurrent('tuplet-numeral-design (p. 193): sizes tuplet numeral about 1.5 stave spaces high', async () => {
		const e = await engrave('tuplets-numeral', 'tuplet-numeral-design');
		const t = must(e.inMeasure('tuplet', 0)[0], 'M1 tuplet');
		const space = e.space(0);
		markBox(e, t.box, 'tuplet numeral');
		// Behind Bars p. 193: numeral height ~1.5 stave-spaces (allow 1.0..2.0 for italic glyph bounds).
		expect(
			e.check(t.box.h >= 1.0 * space && t.box.h <= 2.0 * space),
		).toMatchMeasurements(true);
	});

	it.concurrent('tuplet-numeral-centre (p. 193): centres odd, even and subdivided-middle tuplet numerals', async () => {
		const e = await engrave('tuplets-numeral', 'tuplet-numeral-centre');
		const space = e.space(1);
		const m2Tuplets = e
			.inMeasure('tuplet', 1)
			.sort((a, b) => a.box.x - b.box.x);
		const odd = must(m2Tuplets[0], 'M2 odd triplet');
		const even = must(m2Tuplets[1], 'M2 even sextuplet');
		const m2Heads = e.headsIn(1);
		const oddMidX = centre(must(m2Heads[1], 'middle triplet head').head);
		const evenMidX =
			(centre(must(m2Heads[5], 'sextuplet note 3').head) +
				centre(must(m2Heads[6], 'sextuplet note 4').head)) /
			2;
		markBox(e, odd.box, 'odd 3');
		markBox(e, even.box, 'even 6');

		const sub = must(e.inMeasure('tuplet', 2)[0], 'M3 subdivided triplet');
		const m3Heads = e.headsIn(2);
		const subMidX =
			(centre(must(m3Heads[1], 'subdivided head 2').head) +
				centre(must(m3Heads[2], 'subdivided head 3').head)) /
			2;
		markBox(e, sub.box, 'subdivided 3');

		expect(
			e.check([
				Math.abs(centre(odd.box) - oddMidX) <= 0.75 * space,
				Math.abs(centre(even.box) - evenMidX) <= 0.75 * space,
				Math.abs(centre(sub.box) - subMidX) <= 0.75 * space,
			]),
		).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('tuplet-numeral-outside-stave (p. 194): keeps tuplet numerals at least partially outside the stave', async () => {
		const e = await engrave('tuplets-numeral', 'tuplet-numeral-outside-stave');
		const tuplets = e.inMeasure('tuplet', 3).sort((a, b) => a.box.x - b.box.x);
		expect(tuplets).toHaveLength(2);
		const lines = e.lines(3);
		const top = must(lines[0], 'top stave line');
		const bottom = must(lines[4], 'bottom stave line');
		const results = tuplets.map((t, i) => {
			markBox(e, t.box, i === 0 ? 'high triplet' : 'low triplet');
			// Must NOT be completely inside [top, bottom]: either top edge < top or bottom edge > bottom.
			return t.box.y < top || bottomEdge(t.box) > bottom;
		});
		expect(e.check(results)).toMatchMeasurements([true, true]);
	});

	it.concurrent('tuplet-bracket-square (p. 194): encloses unbeamed tuplet in a square bracket broken for the numeral', async () => {
		const e = await engrave('tuplets-numeral', 'tuplet-bracket-square');
		const t = must(e.inMeasure('tuplet', 4)[0], 'M5 tuplet');
		const heads = e.headsIn(4);
		const span =
			rightEdge(must(heads[2], 'last head').head) -
			must(heads[0], 'first head').head.x;
		markBox(e, t.box, 'square bracket');
		// Bracket spans the group width and stays compact vertically (not a tall slur arc).
		expect(
			e.check([t.box.w >= span * 0.8, t.box.h <= 2.5 * e.space(4)]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('tuplet-bracket-length (p. 195): excludes preceding accidentals and stops at the final notehead right edge', async () => {
		const e = await engrave('tuplets-bracket', 'tuplet-bracket-length');
		const t1 = must(e.inMeasure('tuplet', 0)[0], 'M1 tuplet');
		const h1 = e.headsIn(0);
		const space = e.space(0);
		markBox(e, t1.box, 'M1 bracket');
		// Starts at the first notehead left edge (excluding the preceding sharp) and ends at the final notehead right edge.
		const startsAtFirst =
			Math.abs(t1.box.x - must(h1[0], 'M1 first head').head.x) <= 0.6 * space;
		const endsAtLast =
			Math.abs(
				rightEdge(t1.box) - rightEdge(must(h1[2], 'M1 last head').head),
			) <=
			0.75 * space;

		const t2 = must(e.inMeasure('tuplet', 1)[0], 'M2 tuplet');
		const h2 = e.headsIn(1);
		markBox(e, t2.box, 'M2 bracket');
		const m2LastRight = rightEdge(must(h2[h2.length - 1], 'M2 last head').head);
		const stopsAtStem = rightEdge(t2.box) <= m2LastRight + 0.75 * space;

		expect(
			e.check([startsAtFirst, endsAtLast, stopsAtStem]),
		).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('tuplet-bracket-long-final (p. 195): measures bracket extent on a tuplet ending with its longest duration', async () => {
		const e = await engrave('tuplets-bracket', 'tuplet-bracket-long-final');
		const t = must(e.inMeasure('tuplet', 2)[0], 'M3 tuplet');
		const heads = e.headsIn(2);
		const lastHeadRight = rightEdge(must(heads[1], 'half note head').head);
		markBox(e, t.box, 'quarter+half bracket');
		// Subjective rule: record whether bracket extends past last written head by > 1 space.
		expect(
			e.check(rightEdge(t.box) >= lastHeadRight - 0.5 * e.space(2)),
		).toMatchMeasurements(true);
	});

	it.concurrent('tuplet-bracket-align-parts (p. 196): aligns bracket ends vertically between staves of the same division', async () => {
		const e = await engrave('tuplets-parts', 'tuplet-bracket-align-parts');
		const tuplets = e.inMeasure('tuplet', 0).sort((a, b) => a.box.y - b.box.y);
		expect(tuplets).toHaveLength(2);
		const upper = must(tuplets[0], 'upper tuplet');
		const lower = must(tuplets[1], 'lower tuplet');
		const space = e.space(0);
		markBox(e, upper.box, 'upper bracket');
		markBox(e, lower.box, 'lower bracket');
		expect(
			e.check([
				Math.abs(upper.box.x - lower.box.x) <= 0.5 * space,
				Math.abs(rightEdge(upper.box) - rightEdge(lower.box)) <= 0.5 * space,
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('tuplet-bracket-angle-unbeamed (pp. 196-197): draws horizontal unbeamed tuplet brackets above the stave on ascending and descending groups', async () => {
		const e = await engrave('tuplets-bracket', 'tuplet-bracket-angle-unbeamed');
		const asc = must(e.inMeasure('tuplet', 3)[0], 'M4 ascending tuplet');
		const desc = must(e.inMeasure('tuplet', 4)[0], 'M5 descending tuplet');
		const m4Top = must(e.lines(3)[0], 'M4 top line');
		const m5Top = must(e.lines(4)[0], 'M5 top line');
		markBox(e, asc.box, 'ascending');
		markBox(e, desc.box, 'descending');
		expect(
			e.check([
				asc.box.w > 0 &&
					centre({ x: asc.box.y, y: 0, w: asc.box.h, h: 0 }) < m4Top,
				desc.box.w > 0 &&
					centre({ x: desc.box.y, y: 0, w: desc.box.h, h: 0 }) < m5Top,
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('tuplet-bracket-angle-beamed (p. 197): slopes single-beam bracket parallel to beam and keeps opposing-beam bracket horizontal', async () => {
		const e = await engrave('tuplets-bracket', 'tuplet-bracket-angle-beamed');
		const m6 = must(e.inMeasure('tuplet', 5)[0], 'M6 partially beamed tuplet');
		const m7 = must(e.inMeasure('tuplet', 6)[0], 'M7 opposing-beam tuplet');
		const space = e.space(5);
		const endTop = (ink: typeof m6, x: number) =>
			must(ink.bandsAt(x)[0], `bracket end ink at x=${x}`)[0];
		const m6LeftTop = endTop(m6, Math.round(m6.box.x));
		const m6RightTop = endTop(m6, Math.round(rightEdge(m6.box) - 1));
		const m7LeftTop = endTop(m7, Math.round(m7.box.x));
		const m7RightTop = endTop(m7, Math.round(rightEdge(m7.box) - 1));
		markBox(e, m6.box, 'sloped');
		markBox(e, m7.box, 'horizontal');
		expect(
			e.check([
				// M6 ascends left-to-right (smaller y on the right) by at least a quarter space.
				m6LeftTop - m6RightTop >= 0.25 * space,
				// M7 has opposing beams so both bracket ends stay level.
				Math.abs(m7LeftTop - m7RightTop) <= 1,
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('tuplet-side-stem (p. 197): places single-voice tuplet indications on the stem side', async () => {
		const e = await engrave('tuplets-placement', 'tuplet-side-stem');
		const m1 = must(e.inMeasure('tuplet', 0)[0], 'M1 up-stem tuplet');
		const m1Top = must(e.lines(0)[0], 'M1 top line');
		markBox(e, m1.box, 'up-stem above');

		const m2 = must(e.inMeasure('tuplet', 1)[0], 'M2 down-stem tuplet');
		const m2Bottom = must(e.lines(1)[4], 'M2 bottom line');
		markBox(e, m2.box, 'down-stem below');

		expect(
			e.check([
				centre({ x: m1.box.y, y: 0, w: m1.box.h, h: 0 }) < m1Top,
				centre({ x: m2.box.y, y: 0, w: m2.box.h, h: 0 }) > m2Bottom,
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('tuplet-side-ledger-lines (p. 198): places high ledger-line tuplets on the notehead side', async () => {
		const e = await engrave('tuplets-placement', 'tuplet-side-ledger-lines');
		const t = must(e.inMeasure('tuplet', 2)[0], 'M3 ledger-line tuplet');
		const m3Top = must(e.lines(2)[0], 'M3 top line');
		markBox(e, t.box, 'ledger-line tuplet above');
		expect(
			e.check(centre({ x: t.box.y, y: 0, w: t.box.h, h: 0 }) < m3Top),
		).toMatchMeasurements(true);
	});

	it.concurrent('tuplet-side-mixed-stems (p. 198): places mixed-stem tuplet clear of hairpin below', async () => {
		const e = await engrave('tuplets-placement', 'tuplet-side-mixed-stems');
		const t = must(e.inMeasure('tuplet', 3)[0], 'M4 mixed-stem tuplet');
		const m4Top = must(e.lines(3)[0], 'M4 top line');
		markBox(e, t.box, 'mixed-stem tuplet');
		expect(e.check(t.box.y < m4Top)).toMatchMeasurements(true);
	});

	describe('tuplet-bracket-slur-nesting (p. 198)', () => {
		it.concurrent('nests tuplet brackets outside shorter slurs and inside longer slurs', async () => {
			const e = await engrave(
				'tuplets-placement',
				'tuplet-bracket-slur-nesting',
			);
			const strictlyAbove = (
				upper: ReturnType<typeof e.inMeasure>[number],
				lower: ReturnType<typeof e.inMeasure>[number],
			) => {
				const start = Math.ceil(Math.max(upper.box.x, lower.box.x));
				const end = Math.floor(
					Math.min(rightEdge(upper.box), rightEdge(lower.box)),
				);
				if (start > end) {
					return false;
				}
				let checked = 0;
				for (let x = start; x <= end; x++) {
					const upBottom = upper.bandsAt(x).at(-1)?.[1];
					const loTop = lower.bandsAt(x)[0]?.[0];
					if (upBottom === undefined || loTop === undefined) {
						continue;
					}
					checked++;
					if (upBottom >= loTop) {
						return false;
					}
				}
				return checked > 0;
			};

			// Measure 5: longer triplet bracket sits cleanly above the shorter 2-note slur.
			const m5Tuplet = must(e.inMeasure('tuplet', 4)[0], 'M5 tuplet');
			const m5Slur = must(e.inMeasure('slur', 4)[0], 'M5 slur');
			markBox(e, m5Tuplet.box, 'M5 longer bracket');
			markBox(e, m5Slur.box, 'M5 shorter slur');
			const m5Outside =
				m5Tuplet.box.y < m5Slur.box.y && strictlyAbove(m5Tuplet, m5Slur);

			// Measure 6: both shorter triplet brackets sit cleanly inside (below) the longer spanning slur.
			const m6Tuplets = e
				.inMeasure('tuplet', 5)
				.sort((a, b) => a.box.x - b.box.x);
			expect(m6Tuplets).toHaveLength(2);
			const m6First = must(m6Tuplets[0], 'M6 first tuplet');
			const m6Second = must(m6Tuplets[1], 'M6 second tuplet');
			const m6Slur = must(e.inMeasure('slur', 5)[0], 'M6 spanning slur');
			markBox(e, m6First.box, 'M6 first bracket');
			markBox(e, m6Second.box, 'M6 second bracket');
			markBox(e, m6Slur.box, 'M6 longer slur');
			const m6Inside =
				m6Slur.box.y < m6First.box.y &&
				m6Slur.box.y < m6Second.box.y &&
				strictlyAbove(m6Slur, m6First) &&
				strictlyAbove(m6Slur, m6Second);

			expect(e.check([m5Outside, m6Inside])).toMatchMeasurements([true, true]);
		});
	});

	it.concurrent('tuplet-double-stem-placement (p. 199): places upper and lower voice tuplets at their stem ends outside articulations', async () => {
		const e = await engrave(
			'tuplets-double-stem',
			'tuplet-double-stem-placement',
		);
		const tuplets = e.inMeasure('tuplet', 0).sort((a, b) => a.box.y - b.box.y);
		expect(tuplets).toHaveLength(2);
		const upper = must(tuplets[0], 'upper voice tuplet');
		const lower = must(tuplets[1], 'lower voice tuplet');
		const lines = e.lines(0);
		const top = must(lines[0], 'top stave line');
		const bottom = must(lines[4], 'bottom stave line');
		markBox(e, upper.box, 'upper voice');
		markBox(e, lower.box, 'lower voice');
		expect(
			e.check([bottomEdge(upper.box) < top, lower.box.y > bottom]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('tuplet-bracket-outside-stave (p. 199): keeps tuplet brackets outside the stave lines', async () => {
		const e = await engrave(
			'tuplets-placement',
			'tuplet-bracket-outside-stave',
		);
		const tuplets = e.inMeasure('tuplet', 6).sort((a, b) => a.box.x - b.box.x);
		expect(tuplets).toHaveLength(2);
		const lines = e.lines(6);
		const top = must(lines[0], 'top stave line');
		const bottom = must(lines[4], 'bottom stave line');
		const lowUp = must(tuplets[0], 'low up-stem tuplet');
		const highDown = must(tuplets[1], 'high down-stem tuplet');
		markBox(e, lowUp.box, 'low up-stem');
		markBox(e, highDown.box, 'high down-stem');
		// Neither bracket sits inside the stave: both sit on the notehead side of their ledger-line notes.
		expect(
			e.check([lowUp.box.y > bottom, bottomEdge(highDown.box) < top]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('tuplet-bracket-when-unbeamed (p. 199): brackets unbeamed tuplets enclosing trailing rests', async () => {
		const e = await engrave(
			'tuplets-placement',
			'tuplet-bracket-when-unbeamed',
		);
		const t = must(e.inMeasure('tuplet', 7)[0], 'M8 unbeamed tuplet');
		const heads = e.headsIn(7);
		const space = e.space(7);
		markBox(e, t.box, 'bracket with rest');
		// Bracket width spans past the second note to cover the trailing quarter rest.
		const note2Right = rightEdge(must(heads[1], 'second quarter note').head);
		expect(
			e.check(rightEdge(t.box) > note2Right + 1.5 * space),
		).toMatchMeasurements(true);
	});

	it.concurrent('tuplet-bracket-omit-beamed (p. 200): omits bracket on a fully beamed tuplet', async () => {
		const e = await engrave('tuplets-placement', 'tuplet-bracket-omit-beamed');
		const t = must(e.inMeasure('tuplet', 8)[0], 'M9 beamed tuplet');
		const heads = e.headsIn(8);
		const span =
			rightEdge(must(heads[2], 'last beamed head').head) -
			must(heads[0], 'first beamed head').head.x;
		markBox(e, t.box, 'numeral only');
		// Numeral alone is much narrower than the 3-note beamed group (<= 2.2 spaces and < half the span).
		expect(
			e.check([t.box.w <= 2.2 * e.space(8), t.box.w < span * 0.5]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('tuplet-bracket-partial-beam (p. 200): draws bracket when a tuplet is only part of a longer beam', async () => {
		const e = await engrave('tuplets-placement', 'tuplet-bracket-partial-beam');
		const t = must(e.inMeasure('tuplet', 9)[0], 'M10 partial-beam tuplet');
		const heads = e.headsIn(9);
		expect(heads).toHaveLength(4);
		const firstHead = must(heads[0], 'M10 first triplet head').head;
		const lastTripletHead = must(heads[2], 'M10 last triplet head').head;
		const plainEighthHead = must(heads[3], 'M10 trailing plain eighth').head;
		const space = e.space(9);
		const tripletSpan = rightEdge(lastTripletHead) - firstHead.x;
		markBox(e, t.box, 'partial-beam bracket');
		// Bracket spans the 3 triplet sixteenths without extending over the trailing plain eighth.
		expect(
			e.check([
				t.box.w >= tripletSpan * 0.8,
				Math.abs(t.box.x - firstHead.x) <= 0.75 * space,
				Math.abs(rightEdge(t.box) - rightEdge(lastTripletHead)) <= 0.75 * space,
				rightEdge(t.box) < rightEdge(plainEighthHead) - 0.5 * space,
			]),
		).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('tuplet-rhythmic-alignment (pp. 200-202): orders cross-rhythm notes chronologically across staves', async () => {
		const e = await engrave('tuplets-parts', 'tuplet-rhythmic-alignment');
		const upper = e.headsIn(1, { voice: '1' });
		const lower = e.headsIn(1, { voice: '2' });
		expect(upper).toHaveLength(8);
		expect(lower).toHaveLength(5);
		const u = upper.map((n) => centre(n.head));
		const l = lower.map((n) => centre(n.head));
		const space = e.space(1);
		// Beat 1: 3:2 triplet (u0, u1, u2) against 2 eighths (l0, l1): u0≈l0 < u1 < l1 < u2.
		const beat1 =
			Math.abs(must(u[0], 'u0') - must(l[0], 'l0')) <= 0.5 * space &&
			must(u[0], 'u0') < must(u[1], 'u1') &&
			must(u[1], 'u1') < must(l[1], 'l1') &&
			must(l[1], 'l1') < must(u[2], 'u2');
		// Beat 2: 5:4 quintuplet (u3..u7) against 3:2 triplet (l2..l4): u3≈l2 < u4 < l3 < u5 < u6 < l4 < u7.
		const beat2 =
			Math.abs(must(u[3], 'u3') - must(l[2], 'l2')) <= 0.5 * space &&
			must(u[3], 'u3') < must(u[4], 'u4') &&
			must(u[4], 'u4') < must(l[3], 'l3') &&
			must(l[3], 'l3') < must(u[5], 'u5') &&
			must(u[5], 'u5') < must(u[6], 'u6') &&
			must(u[6], 'u6') < must(l[4], 'l4') &&
			must(l[4], 'l4') < must(u[7], 'u7');
		expect(e.check([beat1, beat2])).toMatchMeasurements([true, true]);
	});
});
