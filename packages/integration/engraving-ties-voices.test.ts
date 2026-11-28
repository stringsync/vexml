import { describe, expect, it } from 'bun:test';
import type { Ink } from './engraving-ink';
import type { Engraving } from './engraving-model';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';
import {
	column,
	columnMid,
	curve,
	markTie,
	right,
	ties,
	tiesByX,
	touches,
	verticalGap,
} from './engraving-tie-arcs';

describe('Behind Bars ties: voices, unisons, moving chords and open ties', () => {
	it.concurrent('draws double-stemmed, overlapping, unison, moving-chord and open ties', async () => {
		expect(await draw('ties-voices')).toMatchScreenshot(
			'engraving_ties-voices.png',
		);
	});

	it.concurrent('tie-double-stem-direction (p. 67): curves upper-part ties up and lower-part ties down', async () => {
		const e = await engrave('ties-voices', 'tie-double-stem-direction');
		expect(e.check(tiesByStartY(e, 0).map(marked(e)))).toMatchMeasurements([
			'up',
			'down',
		]);
	});

	it.concurrent('tie-double-stem-chords (p. 67): curves every tie on a chord in its part’s direction', async () => {
		const e = await engrave('ties-voices', 'tie-double-stem-chords');
		expect(e.check(tiesByStartY(e, 1).map(marked(e)))).toMatchMeasurements([
			'up',
			'up',
			'down',
			'down',
		]);
	});

	it.concurrent('tie-overlap-one-part (p. 67): curves a single tied overlapping part towards its stem', async () => {
		const e = await engrave('ties-voices', 'tie-overlap-one-part');
		expect(e.check(ties(e, 2).map(marked(e)))).toMatchMeasurements(['up']);
	});

	it.concurrent('tie-overlap-no-stem-between (p. 67): keeps the other part’s stem out from between a note and its tie', async () => {
		const e = await engrave('ties-voices', 'tie-overlap-no-stem-between');
		const tie = only(e, 3);
		markTie(e, tie, 'Tie');
		const beat1 = e
			.headsIn(3)
			.filter((h) => h.head.x < tie.box.x + tie.box.w / 2);
		const v1 = beat1.find((h) => h.voice === '1');
		const v2 = beat1.find((h) => h.voice === '2');
		const hit = v1?.stem ? touches(tie, [v1.stem]) : 0;
		expect(
			e.check([Boolean(v1 && v2 && v2.head.x > v1.head.x), hit === 0]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('tie-overlap-both-parts (p. 67): reverses overlapping ties so they never intersect', async () => {
		const e = await engrave('ties-voices', 'tie-overlap-both-parts');
		const all = ties(e, 4);
		const hit = all.reduce(
			(n, tie, i) => n + touches(tie, all.slice(i + 1)),
			0,
		);
		expect(e.check([all.map(marked(e)), hit === 0])).toMatchMeasurements([
			['up', 'down'],
			true,
		]);
	});

	it.concurrent('tie-overlap-cut-stem (p. 68): keeps the tie close to its heads rather than arching over the other stem', async () => {
		const e = await engrave('ties-voices', 'tie-overlap-cut-stem');
		const tie = only(e, 5);
		const depth = verticalGap(
			e,
			5,
			right(tie.box) + 4,
			tie.box.y,
			tie.box.y + tie.box.h,
			'Tie depth',
		);
		expect(e.check(depth <= 1.5)).toMatchMeasurements(true);
	});

	it.concurrent('tie-stem-not-end-on-tie (p. 68): keeps the other part’s stem tips from ending right on the tie', async () => {
		const e = await engrave('ties-voices', 'tie-stem-not-end-on-tie');
		const tie = only(e, 6);
		markTie(e, tie, 'Tie');
		const v1Notes = e.headsIn(6).filter((h) => h.voice === '1' && h.stem);
		const tol = e.space(6) * 0.25;
		const endsOnTie = v1Notes.some((note) => {
			const stem = must(note.stem, 'stem');
			const sx = Math.round(stem.box.x + stem.box.w / 2);
			if (sx < tie.box.x || sx >= right(tie.box)) {
				return false;
			}
			const span = column(tie, sx);
			if (!span) {
				return false;
			}
			// Up-stem tip is the top of the stem box.
			const tip = stem.box.y;
			return tip >= span[0] - tol && tip <= span[1] + tol;
		});
		expect(e.check(!endsOnTie)).toMatchMeasurements(true);
	});

	it.concurrent('tie-ledger-no-intersect (p. 68): keeps a tie from intersecting the other part’s ledger lines', async () => {
		const e = await engrave('ties-voices', 'tie-ledger-no-intersect');
		const tie = only(e, 7);
		markTie(e, tie, 'Tie');
		const ledgers = e.inMeasure('stavenote', 7);
		expect(e.check(touches(tie, ledgers) === 0)).toMatchMeasurements(true);
	});

	it.concurrent('tie-unison-single-each-head (p. 69): gives each head of a single-stemmed unison its own tie', async () => {
		const e = await engrave('ties-voices', 'tie-unison-single-each-head');
		expect(e.check(ties(e, 8).map(marked(e)))).toMatchMeasurements([
			'up',
			'down',
		]);
	});

	it.concurrent('tie-unison-stem-clear (p. 69): keeps a tied unison’s stem clear of its ties', async () => {
		const e = await engrave('ties-voices', 'tie-unison-stem-clear');
		const stems = e.inMeasure('stem', 8);
		const all = ties(e, 8);
		const hit = all.reduce((n, tie) => {
			markTie(e, tie, 'Tie');
			return n + touches(tie, stems);
		}, 0);
		expect(e.check([all.length, hit === 0])).toMatchMeasurements([2, true]);
	});

	it.concurrent('tie-unison-no-cross (p. 69): keeps ties on a chord with a unison from overlapping or crossing', async () => {
		const e = await engrave('ties-voices', 'tie-unison-no-cross');
		const all = ties(e, 9);
		const hit = all.reduce(
			(n, tie, i) => n + touches(tie, all.slice(i + 1)),
			0,
		);
		for (const tie of all) {
			markTie(e, tie, 'Tie');
		}
		expect(e.check([all.length, hit === 0])).toMatchMeasurements([4, true]);
	});

	it.concurrent('tie-unison-altered (p. 69): draws a tie for each head of a tied altered unison', async () => {
		const e = await engrave('ties-voices', 'tie-unison-altered');
		expect(e.check(ties(e, 10).map(marked(e)))).toMatchMeasurements([
			'up',
			'down',
		]);
	});

	it.concurrent('tie-unison-double-both (p. 69): draws a tie for each voice on a shared unison notehead', async () => {
		const e = await engrave('ties-voices', 'tie-unison-double-both');
		expect(e.check(ties(e, 11).map(marked(e)))).toMatchMeasurements([
			'up',
			'down',
		]);
	});

	it.concurrent('tie-unison-double-one (p. 69): curves voice 1’s single unison tie up on a shared notehead', async () => {
		const e = await engrave('ties-voices', 'tie-unison-double-one');
		expect(e.check(ties(e, 12).map(marked(e)))).toMatchMeasurements(['up']);
	});

	it.concurrent('tie-unison-diff-durations (p. 70): keeps voice 1 left and curves its unison tie up', async () => {
		const e = await engrave('ties-voices', 'tie-unison-diff-durations');
		expect(e.check(ties(e, 13).map(marked(e)))).toMatchMeasurements(['up']);
	});

	it.concurrent('tie-unison-dotted-right (p. 70): keeps a dotted tied unison head clear of the other head', async () => {
		const e = await engrave('ties-voices', 'tie-unison-dotted-right');
		expect(e.check(ties(e, 14).map(marked(e)))).toMatchMeasurements([
			'up',
			'down',
		]);
	});

	// The user's call (rules/tie-moving-away-from-change.md): split each pair opposite ways.
	it.concurrent('tie-moving-away-from-change (p. 70): splits chord ties opposite ways when a note is added', async () => {
		const e = await engrave('ties-voices', 'tie-moving-away-from-change');
		const all = tiesByX(e, 15);
		expect(e.check(all.map(marked(e)))).toMatchMeasurements([
			'down',
			'up',
			'down',
			'up',
		]);
	});

	// The user's call (rules/tie-moving-alternate-sides.md): first tie up, second down.
	it.concurrent('tie-moving-alternate-sides (p. 70): curves ties away from stems when notes change on alternate sides', async () => {
		const e = await engrave('ties-voices', 'tie-moving-alternate-sides');
		expect(e.check(tiesByX(e, 16).map(marked(e)))).toMatchMeasurements([
			'up',
			'down',
		]);
	});

	// The user's call (rules/tie-moving-passage-consistent.md): alternate up, down, up.
	it.concurrent('tie-moving-passage-consistent (p. 71): alternates tie directions across a moving-chord passage', async () => {
		const e = await engrave('ties-voices', 'tie-moving-passage-consistent');
		expect(e.check(tiesByX(e, 17).map(marked(e)))).toMatchMeasurements([
			'up',
			'down',
			'up',
		]);
	});

	it.concurrent('tie-moving-both-sides (p. 71): uses conventional tie directions when notes are added on both sides', async () => {
		const e = await engrave('ties-voices', 'tie-moving-both-sides');
		expect(e.check(ties(e, 18).map(marked(e)))).toMatchMeasurements([
			'up',
			'down',
		]);
	});

	it.concurrent('tie-moving-clear-accidental (p. 71): curves a tie away from an added note’s accidental', async () => {
		const e = await engrave('ties-voices', 'tie-moving-clear-accidental');
		const tie = only(e, 19);
		const accs = e.inMeasure('accidental', 19);
		for (const acc of accs) {
			markBox(e, acc.box, 'Accidental');
		}
		expect(
			e.check([marked(e)(tie), touches(tie, accs) === 0]),
		).toMatchMeasurements(['up', true]);
	});

	it.concurrent('tie-chord-with-slur (p. 71): curves a chord tie and its slur both down, the slur below the tie', async () => {
		const e = await engrave('ties-voices', 'tie-chord-with-slur');
		const tie = only(e, 20);
		const slur = must(e.inMeasure('slur', 20)[0], 'slur');
		markBox(e, slur.box, 'Slur');
		const slurCurve =
			columnMid(slur, slur.box.x + Math.floor(slur.box.w / 2)) <
			(columnMid(slur, slur.box.x + 2) + columnMid(slur, right(slur.box) - 3)) /
				2
				? 'up'
				: 'down';
		expect(
			e.check([
				marked(e)(tie),
				slurCurve,
				slur.box.y + slur.box.h > tie.box.y + tie.box.h,
			]),
		).toMatchMeasurements(['down', 'down', true]);
	});

	it.concurrent('tie-moving-unchanging-revert (p. 71): reverts an unchanging chord’s ties to conventional directions', async () => {
		const e = await engrave('ties-voices', 'tie-moving-unchanging-revert');
		const all = tiesByX(e, 21);
		const secondPair = all.slice(1).sort((a, b) => a.box.y - b.box.y);
		expect(e.check(secondPair.map(marked(e)))).toMatchMeasurements([
			'up',
			'down',
		]);
	});

	it.concurrent('tie-open-lv (p. 72): draws an open tie for a laissez vibrer note', async () => {
		const e = await engrave('ties-voices', 'tie-open-lv');
		const all = ties(e, 22);
		for (const tie of all) {
			markTie(e, tie, 'Open tie');
		}
		expect(e.check(all.length)).toMatchMeasurements(1);
	});
});

function only(e: Engraving, measure: number): Ink {
	return must(ties(e, measure)[0], `tie in measure ${measure + 1}`);
}

/** A measure's ties ordered top-to-bottom by their left endpoint y, matching notehead order. */
function tiesByStartY(e: Engraving, measure: number): Ink[] {
	return ties(e, measure).sort(
		(a, b) =>
			columnMid(a, a.box.x + 2) - columnMid(b, b.box.x + 2) ||
			a.box.x - b.box.x,
	);
}

function marked(e: Engraving): (tie: Ink) => string {
	return (tie) => {
		markTie(e, tie, 'Tie');
		return curve(tie);
	};
}
