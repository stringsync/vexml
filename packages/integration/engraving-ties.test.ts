import { describe, expect, it } from 'bun:test';
import type { Box, Ink } from './engraving-ink';
import type { Engraving } from './engraving-model';
import { draw, engrave, must, quarters } from './engraving-render';
import { barX, centre, markBox } from './engraving-spacing-measures';
import {
	apexY,
	chordHeads,
	column,
	columnMid,
	curve,
	markTie,
	right,
	symmetric,
	tapered,
	ties,
	tiesByX,
	touches,
	verticalGap,
} from './engraving-tie-arcs';

describe('Behind Bars ties', () => {
	it.concurrent('draws ties on single notes, chords and over a system break', async () => {
		expect(await draw('ties')).toMatchScreenshot('engraving_ties.png');
	});

	it.concurrent('tie-shape-symmetric (p. 60): draws a symmetrical arc, thicker in the middle than at its tips', async () => {
		const e = await engrave('ties', 'tie-shape-symmetric');
		const tie = only(e, 0);
		markTie(e, tie, 'Tie');
		expect(e.check([symmetric(tie), tapered(tie)])).toMatchMeasurements([
			true,
			true,
		]);
	});

	it.concurrent('tie-near-heads (pp. 60–61): starts and ends the tie almost touching each head', async () => {
		const e = await engrave('ties', 'tie-near-heads');
		const tie = only(e, 0);
		const [first, second] = e.headsIn(0).map((n) => n.head);
		const ends: [Box, number][] = [
			[must(first, 'first head'), tie.box.x + 1],
			[must(second, 'second head'), right(tie.box) - 2],
		];
		const gaps = ends.map(([head, x]) => {
			const end = must(column(tie, x), 'tie end');
			return (
				verticalGap(e, 0, x, head.y + head.h, end[0], 'Head to tie end') <= 0.5
			);
		});
		expect(e.check(gaps)).toMatchMeasurements([true, true]);
	});

	// The user's call (decisions.md, 2026-11-26): keep vexml's original slur bow, about ½ stave-space deeper than the tie.
	it.concurrent('tie-flatter-than-slur (p. 60): draws a tie at least ½ stave-space flatter than a slur over the same notes', async () => {
		const e = await engrave('ties', 'tie-flatter-than-slur');
		const tie = only(e, 1);
		const slur = must(e.inMeasure('slur', 2)[0], 'slur');
		markTie(e, tie, 'Tie');
		markBox(e, slur.box, 'Slur');
		const flatter = quarters(slur.box.h - tie.box.h, e.space(1));
		expect(e.check(flatter >= 0.5)).toMatchMeasurements(true);
	});

	it.concurrent('tie-enharmonic (p. 60): ties two enharmonically equal notes', async () => {
		const e = await engrave('ties', 'tie-enharmonic');
		for (const tie of ties(e, 3)) {
			markTie(e, tie, 'Tie');
		}
		expect(e.check(ties(e, 3).length)).toMatchMeasurements(1);
	});

	// The user's call (rules/tie-depth.md): about ¾ space, shallower than the book's 1 to 1½.
	it.concurrent('tie-depth (p. 61): bows a shallow tie ½ to 1 stave-space deep', async () => {
		const e = await engrave('ties', 'tie-depth');
		const tie = only(e, 0);
		const depth = verticalGap(
			e,
			0,
			right(tie.box) + 4,
			tie.box.y,
			tie.box.y + tie.box.h,
			'Tie depth',
		);
		expect(e.check(depth >= 0.5 && depth <= 1)).toMatchMeasurements(true);
	});

	it.concurrent('tie-short-confined (p. 61): keeps a very short tie within one stave-space', async () => {
		const e = await engrave('ties', 'tie-short-confined');
		const tie = only(e, 4);
		markTie(e, tie, 'Short tie');
		const crossed = e
			.lines(4)
			.some((line) => line > tie.box.y + 1 && line < tie.box.y + tie.box.h - 1);
		expect(e.check(!crossed)).toMatchMeasurements(true);
	});

	it.concurrent('tie-long-flattened (p. 61): keeps a long tie about as deep as a short one', async () => {
		const e = await engrave('ties', 'tie-long-flattened');
		const short = only(e, 0);
		const long = must(
			[...ties(e, 5), ...ties(e, 6)].sort((a, b) => b.box.w - a.box.w)[0],
			'long tie',
		);
		markTie(e, long, 'Long tie');
		const extra = quarters(long.box.h - short.box.h, e.space(5));
		expect(e.check(extra <= 0.5)).toMatchMeasurements(true);
	});

	it.concurrent('tie-flag-clear (p. 61): keeps ties clear of a tied chord’s flag', async () => {
		const e = await engrave('ties', 'tie-flag-clear');
		const flags = e.inMeasure('flag', 7);
		for (const flag of flags) {
			markBox(e, flag.box, 'Flag');
		}
		const hit = ties(e, 7).reduce((n, tie) => n + touches(tie, flags), 0);
		expect(e.check(hit === 0)).toMatchMeasurements(true);
	});

	it.concurrent('tie-ends-centre (p. 62): starts and ends a tie between each head’s centre and its inner edge', async () => {
		const e = await engrave('ties', 'tie-ends-centre');
		const tie = only(e, 0);
		const first = must(e.headsIn(0)[0], 'first head').head;
		const second = must(e.headsIn(0)[1], 'second head').head;
		markTie(e, tie, 'Tie');
		expect(
			e.check([
				tie.box.x >= centre(first) + first.w / 8 && tie.box.x <= right(first),
				right(tie.box) >= second.x &&
					right(tie.box) <= centre(second) - second.w / 8,
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('tie-articulation-clear (p. 62): keeps a tie clear of articulations on its notes', async () => {
		const e = await engrave('ties', 'tie-articulation-clear');
		const tie = only(e, 8);
		markTie(e, tie, 'Tie');
		// vexml paints articulations in the notehead's group: the ink outside the heads.
		const heads = e.headsIn(8).map((n) => n.head);
		let hit = 0;
		for (const y of tie.rowYs()) {
			for (const [l, r] of tie.segmentsAt(y)) {
				for (let x = l; x < r; x++) {
					const inHead = heads.some(
						(h) => x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h,
					);
					if (!inHead && e.inMeasure('notehead', 8).some((i) => i.has(x, y))) {
						hit++;
					}
				}
			}
		}
		expect(e.check(hit === 0)).toMatchMeasurements(true);
	});

	it.concurrent('tie-tight-long (p. 62): stretches a tie between close notes over their heads', async () => {
		const e = await engrave('ties', 'tie-tight-long');
		const tie = only(e, 4);
		const [first, second] = e.headsIn(4).map((n) => n.head);
		markTie(e, tie, 'Tie');
		expect(
			e.check(
				tie.box.x <= right(must(first, 'first head')) &&
					right(tie.box) >= must(second, 'second head').x,
			),
		).toMatchMeasurements(true);
	});

	it.concurrent('tie-short-of-stem (p. 63): stops a tie short of the next stem', async () => {
		const e = await engrave('ties', 'tie-short-of-stem');
		const stems = e.inMeasure('stem', 9);
		const hit = ties(e, 9).reduce((n, tie) => {
			markTie(e, tie, 'Tie');
			return n + touches(tie, stems);
		}, 0);
		expect(e.check(hit === 0)).toMatchMeasurements(true);
	});

	it.concurrent('tie-chord-inner-short (p. 63): starts inner chord ties after the heads and ends them before the next', async () => {
		const e = await engrave('ties', 'tie-chord-inner-short');
		const from = Math.max(
			...chordHeads(e, 10, 'first').map((n) => right(n.head)),
		);
		const to = Math.min(...chordHeads(e, 10, 'second').map((n) => n.head.x));
		const inner = ties(e, 10).slice(1, -1);
		expect(
			e.check(
				inner.map((tie) => {
					markTie(e, tie, 'Inner tie');
					return tie.box.x >= from - 1 && right(tie.box) <= to + 1;
				}),
			),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('tie-chord-same-space (p. 63): starts each tie of a close chord in its head’s space', async () => {
		const e = await engrave('ties', 'tie-chord-same-space');
		const heads = chordHeads(e, 11, 'first');
		const lines = e.lines(11);
		const space = e.space(11);
		const all = ties(e, 11);
		expect(
			e.check(
				heads.map((note, i) => {
					const tie = all[i];
					if (!tie) {
						return false;
					}
					markTie(e, tie, note.pitch ?? 'tie');
					const above = Math.max(
						...[...lines, (lines[0] ?? 0) - space].filter((l) => l < note.cy),
					);
					const end = columnMid(tie, tie.box.x + 1);
					return end > above && end < above + space;
				}),
			),
		).toMatchMeasurements([true, true, true, true, true]);
	});

	it.concurrent('tie-adjacent-close (p. 63): starts each tie of a second close to its own head', async () => {
		const e = await engrave('ties', 'tie-adjacent-close');
		const heads = chordHeads(e, 12, 'first');
		const all = ties(e, 12);
		expect(
			e.check(
				heads.map((note, i) => {
					const tie = all[i];
					if (!tie) {
						return false;
					}
					markTie(e, tie, note.pitch ?? 'tie');
					return tie.box.x <= right(note.head) + note.space / 2;
				}),
			),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('tie-dot-inside (p. 63): starts a dotted note’s tie before its dot without touching it', async () => {
		const e = await engrave('ties', 'tie-dot-inside');
		const dots = e
			.inMeasure('augmentation-dot', 13)
			.sort((a, b) => a.box.x - b.box.x);
		expect(
			e.check(
				tiesByX(e, 13).flatMap((tie, i) => {
					const dot = must(dots[i], 'dot');
					markTie(e, tie, 'Tie');
					markBox(e, dot.box, 'Dot');
					return [tie.box.x < dot.box.x, tie.overlaps(dot) === 0];
				}),
			),
		).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('tie-chord-dots-clear (p. 64): keeps a dotted chord’s ties off every dot', async () => {
		const e = await engrave('ties', 'tie-chord-dots-clear');
		const dots = e.inMeasure('augmentation-dot', 14);
		const hit = ties(e, 14).reduce((n, tie) => n + touches(tie, dots), 0);
		expect(e.check(hit === 0)).toMatchMeasurements(true);
	});

	it.concurrent('tie-away-from-stems (p. 64): curves a tie away from its notes’ stems', async () => {
		const e = await engrave('ties', 'tie-away-from-stems');
		expect(
			e.check([only(e, 0), ...tiesByX(e, 15)].map(marked(e))),
		).toMatchMeasurements(['down', 'down', 'up']);
	});

	it.concurrent('tie-stemless (p. 64): curves a tie between whole notes as if they had stems', async () => {
		const e = await engrave('ties', 'tie-stemless');
		expect(
			e.check([only(e, 16), only(e, 18)].map(marked(e))),
		).toMatchMeasurements(['down', 'up']);
	});

	it.concurrent('tie-mixed-stems-middle-line (p. 64): curves both ties between opposite stems down, clear of a flag', async () => {
		const e = await engrave('ties', 'tie-mixed-stems-middle-line');
		const [high, low] = tiesByX(e, 20);
		const flags = e.inMeasure('flag', 20);
		expect(
			e.check([
				marked(e)(must(high, 'C5 tie')),
				marked(e)(must(low, 'A4 tie')),
				touches(must(low, 'A4 tie'), flags) === 0,
			]),
		).toMatchMeasurements(['down', 'down', true]);
	});

	it.concurrent('tie-system-break-ends (p. 65): stops a broken tie before the barline and resumes it after the signatures', async () => {
		const e = await engrave('ties', 'tie-system-break-ends');
		const [before, after] = brokenTie(e);
		const time = must(e.inMeasure('timesignature', 22)[0], 'time signature');
		markBox(e, time.box, 'Time signature');
		expect(
			e.check([right(before.box) < barX(e, 21), after.box.x > right(time.box)]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('tie-system-break-direction (p. 65): keeps a broken tie’s direction over the break', async () => {
		const e = await engrave('ties', 'tie-system-break-direction');
		expect(e.check(brokenTie(e).map(marked(e)))).toMatchMeasurements([
			'down',
			'down',
		]);
	});

	it.concurrent('tie-system-break-symmetric (p. 65): keeps each half of a broken tie symmetrical', async () => {
		const e = await engrave('ties', 'tie-system-break-symmetric');
		expect(
			e.check(
				brokenTie(e).map((tie) => {
					markTie(e, tie, 'Tie half');
					return symmetric(tie);
				}),
			),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('tie-chord-two-notes (p. 65): curves a two-note chord’s ties in opposite directions', async () => {
		const e = await engrave('ties', 'tie-chord-two-notes');
		expect(e.check(ties(e, 23).map(marked(e)))).toMatchMeasurements([
			'up',
			'down',
		]);
	});

	it.concurrent('tie-chord-even (p. 65): splits an even chord’s ties equally up and down', async () => {
		const e = await engrave('ties', 'tie-chord-even');
		expect(e.check(ties(e, 10).map(marked(e)))).toMatchMeasurements([
			'up',
			'up',
			'down',
			'down',
		]);
	});

	it.concurrent('tie-chord-odd (p. 65): curves most of an odd chord’s ties away from the stem', async () => {
		const e = await engrave('ties', 'tie-chord-odd');
		expect(e.check(ties(e, 24).map(marked(e)))).toMatchMeasurements([
			'up',
			'down',
			'down',
		]);
	});

	it.concurrent('tie-same-direction-apart (p. 66): spaces same-way ties at least a stave-space apart', async () => {
		const e = await engrave('ties', 'tie-same-direction-apart');
		const all = ties(e, 11);
		const gaps = all.slice(1).flatMap((tie, i) => {
			const prev = must(all[i], 'tie');
			if (curve(prev) !== curve(tie)) {
				return [];
			}
			const x = right(tie.box) + 4;
			return [
				verticalGap(e, 11, x, apexY(prev), apexY(tie), 'Tie to tie') >= 1,
			];
		});
		expect(e.check(gaps)).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('tie-ledger-clear (p. 66): keeps ties off ledger lines', async () => {
		const e = await engrave('ties', 'tie-ledger-clear');
		const ledgers = e.inMeasure('stavenote', 25);
		const hit = ties(e, 25).reduce((n, tie) => {
			markTie(e, tie, 'Tie');
			return n + touches(tie, ledgers);
		}, 0);
		expect(e.check(hit === 0)).toMatchMeasurements(true);
	});

	it.concurrent('tie-adjacent-away (p. 66): curves the ties of a second away from each other, and the rest with them', async () => {
		const e = await engrave('ties', 'tie-adjacent-away');
		expect(e.check(ties(e, 26).map(marked(e)))).toMatchMeasurements([
			'up',
			'up',
			'down',
		]);
	});

	it.concurrent('tie-adjacent-pairs (p. 66): keeps the middle ties of two seconds from touching', async () => {
		const e = await engrave('ties', 'tie-adjacent-pairs');
		const all = ties(e, 27);
		const hit = all.reduce(
			(n, tie, i) => n + touches(tie, all.slice(i + 1)),
			0,
		);
		for (const tie of all) {
			markTie(e, tie, 'Tie');
		}
		expect(e.check([all.length, hit === 0])).toMatchMeasurements([4, true]);
	});

	it.concurrent('tie-adjacent-consecutive (p. 66): spreads a cluster’s ties outward, one per stave-space', async () => {
		const e = await engrave('ties', 'tie-adjacent-consecutive');
		const all = ties(e, 28);
		const top = must(all[0], 'top tie');
		const bottom = must(all[all.length - 1], 'bottom tie');
		const apart = all
			.slice(1)
			.every(
				(tie, i) =>
					quarters(apexY(tie) - apexY(must(all[i], 'tie')), e.space(28)) >= 1,
			);
		expect(
			e.check([all.length, marked(e)(top), marked(e)(bottom), apart]),
		).toMatchMeasurements([3, 'up', 'down', true]);
	});
});

function only(e: Engraving, measure: number): Ink {
	return must(ties(e, measure)[0], `tie in measure ${measure + 1}`);
}

function marked(e: Engraving): (tie: Ink) => string {
	return (tie) => {
		markTie(e, tie, 'Tie');
		return curve(tie);
	};
}

/** The tie from measure 22 over the system break into measure 23. */
function brokenTie(e: Engraving): [Ink, Ink] {
	return [only(e, 21), only(e, 22)];
}
