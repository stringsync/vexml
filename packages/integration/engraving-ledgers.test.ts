import { describe, expect, it } from 'bun:test';
import {
	bandHeight,
	type EngravedNote,
	type Engraving,
} from './engraving-model';
import { draw, engrave, must } from './engraving-render';

// Behind Bars, pp. 26–27: ledger lines (ENGRAVING.md). ledgers.musicxml, treble, 4/4:
// - M1: C6 D6 A3 C4. M2: eight C6 sixteenths. M3: grace C6 and A3 before their notes.
// - M4: second chords C6-D6 (C6 displaced, on a line) and B5-C6 (B5 displaced, in a
//   space). M5: V1 E6 halves over V2 A5 and C6 (shared ledgers, judged by eye).

describe('Behind Bars ledger lines (pp. 26–27)', () => {
	it.concurrent('draws ledgers', async () => {
		expect(await draw('ledgers')).toMatchScreenshot('engraving_ledgers.png');
	});

	// Ledger lines are visibly thicker than stave lines.
	it.concurrent('ledger-thickness (p. 26): draws ledgers thicker than stave lines', async () => {
		expect(await ledgerThicknessRatios()).toMatchMeasurements(['thicker']);
	});

	// A ledger reaches a little past the head on each side; neighbours' ledgers never join.
	it.concurrent('ledger-length (p. 26): extends ledgers past the head, apart', async () => {
		expect(await ledgerReach()).toMatchMeasurements({
			pastBothSides: [true],
			joined: 0,
		});
	});

	// A grace note's ledger lines are shorter, in proportion to its head.
	it.concurrent('ledger-grace (p. 26): draws shorter ledgers for grace notes', async () => {
		expect(await graceLedgers()).toMatchMeasurements(['shorter', 'shorter']);
	});

	// Ledgers between the stave and a second span both heads; the last one spans both
	// when the displaced head is on a line and one head when it is in a space.
	it.concurrent('ledger-second-chord (p. 27): sizes ledgers under seconds by the displaced head', async () => {
		expect(await secondChordLedgers()).toMatchMeasurements([
			'both heads',
			'both heads',
			'both heads',
			'one head',
		]);
	});
});

/** A measure's ledger-line ink as [left, right) segments, each with its row. */
function ledgerSegments(
	e: Engraving,
	measure: number,
): { y: number; x0: number; x1: number }[] {
	return e
		.inMeasure('stavenote', measure)
		.flatMap((ink) =>
			ink
				.rowYs()
				.flatMap((y) => ink.segmentsAt(y).map(([x0, x1]) => ({ y, x0, x1 }))),
		);
}

/** The widest ledger segment near row y that overlaps [x0, x1), or null. */
function widestLedgerSegment(
	e: Engraving,
	measure: number,
	y: number,
	x0: number,
	x1: number,
): { y: number; x0: number; x1: number } | null {
	let best: { y: number; x0: number; x1: number } | null = null;
	for (const s of ledgerSegments(e, measure)) {
		if (Math.abs(s.y - y) <= 2 && s.x0 < x1 && s.x1 > x0) {
			if (!best || s.x1 - s.x0 > best.x1 - best.x0) {
				best = s;
			}
		}
	}
	return best;
}

/** Ledger thickness over stave-line thickness, for each ledger line in M1. */
async function ledgerThicknessRatios() {
	const e = await engrave('ledgers', 'ledger-thickness');
	const staveThickness = e.lineThickness();
	const verdicts: string[] = [];
	for (const l of e.inMeasure('stavenote', 0)) {
		const sampleX = Math.floor(l.box.x + 2);
		for (const band of l.bandsAt(sampleX)) {
			const t = bandHeight(band);
			const ratio = staveThickness > 0 ? t / staveThickness : 0;
			const pass = ratio >= 1.6;
			verdicts.push(pass ? 'thicker' : 'as thin');
			e.marks.measure({
				kind: 'box',
				from: { x: l.box.x - 2, y: band[0] - 2 },
				to: { x: l.box.x + l.box.w + 2, y: band[1] + 2 },
				label: `${ratio.toFixed(1)}×`,
				note: `M1 ledger line is ${t}px thick vs ${staveThickness}px stave line (${ratio.toFixed(1)}×, expected ≥1.6×)`,
				pass,
			});
		}
	}
	return e.check([...new Set(verdicts)]);
}

/** Whether each M1 ledger reaches past both sides of its head, and M2's stay apart. */
async function ledgerReach() {
	const e = await engrave('ledgers', 'ledger-length');
	const m1Segs = ledgerSegments(e, 0);
	const past: boolean[] = [];
	for (const n of e.headsIn(0)) {
		const segs = m1Segs.filter(
			(s) => s.x0 < n.head.x + n.head.w && s.x1 > n.head.x,
		);
		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;
		let allPast = segs.length > 0;
		for (const s of segs) {
			const ok = s.x0 <= n.head.x - 1 && s.x1 >= n.head.x + n.head.w + 1;
			past.push(ok);
			if (!ok) {
				allPast = false;
			}
			minX = Math.min(minX, s.x0);
			maxX = Math.max(maxX, s.x1);
			minY = Math.min(minY, s.y);
			maxY = Math.max(maxY, s.y + 1);
		}
		if (segs.length > 0) {
			const leftExt = Math.round(n.head.x - minX);
			const rightExt = Math.round(maxX - (n.head.x + n.head.w));
			e.marks.measure({
				kind: 'bracket',
				from: { x: minX, y: minY - 4 },
				to: { x: maxX, y: minY - 4 },
				label: `+${leftExt}/+${rightExt}px`,
				note: `M1 ${n.pitch} ledger extends ${leftExt}px left and ${rightExt}px right of head (expected ≥1px each side)`,
				pass: allPast,
			});
		}
	}

	const head = must(e.headsIn(1)[0], 'sixteenth');
	const m2Segs = ledgerSegments(e, 1);
	const joinedSegs = m2Segs.filter((s) => s.x1 - s.x0 > 1.6 * head.head.w);
	const m2Ledgers = e.inMeasure('stavenote', 1);
	if (m2Ledgers.length > 0) {
		const x0 = Math.min(...m2Ledgers.map((l) => l.box.x));
		const y0 = Math.min(...m2Ledgers.map((l) => l.box.y));
		const x1 = Math.max(...m2Ledgers.map((l) => l.box.x + l.box.w));
		const y1 = Math.max(...m2Ledgers.map((l) => l.box.y + l.box.h));
		e.marks.measure({
			kind: 'box',
			from: { x: x0 - 2, y: y0 - 2 },
			to: { x: x1 + 2, y: y1 + 2 },
			label: joinedSegs.length === 0 ? 'apart' : `${joinedSegs.length} joined`,
			note: `M2 adjacent 16th-note ledgers: ${joinedSegs.length} joined segments (expected 0)`,
			pass: joinedSegs.length === 0,
		});
	}

	return e.check({
		pastBothSides: [...new Set(past)],
		joined: joinedSegs.length,
	});
}

/** Whether each grace note's ledger is shorter than its main note's. */
async function graceLedgers() {
	const e = await engrave('ledgers', 'ledger-grace');
	const m3Segs = ledgerSegments(e, 2);
	const widestSeg = (n: EngravedNote) => {
		let best: { y: number; x0: number; x1: number } | null = null;
		for (const s of m3Segs) {
			if (s.x0 < n.head.x + n.head.w && s.x1 > n.head.x) {
				if (!best || s.x1 - s.x0 > best.x1 - best.x0) {
					best = s;
				}
			}
		}
		return best;
	};
	const graces = e.notes.filter((n) => n.measure === 2 && n.grace);
	const mains = e.headsIn(2);
	const results = graces.map((g, i) => {
		const m = must(mains[i], 'main note');
		const gSeg = widestSeg(g);
		const mSeg = widestSeg(m);
		const gW = gSeg ? gSeg.x1 - gSeg.x0 : 0;
		const mW = mSeg ? mSeg.x1 - mSeg.x0 : 0;
		const shorter = gW < mW;
		if (gSeg) {
			e.marks.measure({
				kind: 'bracket',
				from: { x: gSeg.x0, y: gSeg.y - 5 },
				to: { x: gSeg.x1, y: gSeg.y - 5 },
				label: `${gW}px`,
				note: `M3 grace ${g.pitch} ledger is ${gW}px vs main ${m.pitch} ledger ${mW}px (expected shorter)`,
				pass: shorter,
			});
		}
		if (mSeg) {
			e.marks.reference(`main-ledger-${i}`, {
				kind: 'bracket',
				from: { x: mSeg.x0, y: mSeg.y - 5 },
				to: { x: mSeg.x1, y: mSeg.y - 5 },
				label: `${mW}px`,
				note: `M3 main ${m.pitch} ledger width (${mW}px)`,
			});
		}
		return shorter ? 'shorter' : 'as long';
	});
	return e.check(results);
}

/** For each chord with a second: its A5 ledger and the displaced note's own ledger. */
async function secondChordLedgers() {
	const e = await engrave('ledgers', 'ledger-second-chord');
	const [c6, d6, b5, c6b] = e.headsIn(3).map((n) => must(n, 'chord note'));
	const w = must(c6, 'C6').head.w;
	const a5y = (e.lines(3)[0] ?? 0) - e.space(3);
	const span = (a: EngravedNote, b: EngravedNote) =>
		[Math.min(a.head.x, b.head.x), Math.max(a.head.x, b.head.x) + w] as const;
	const covers = (px: number) => (px >= 1.8 * w ? 'both heads' : 'one head');
	const first = span(must(c6, 'C6'), must(d6, 'D6'));
	const second = span(must(b5, 'B5'), must(c6b, 'C6'));
	const checks: {
		chord: string;
		ledger: string;
		y: number;
		range: readonly [number, number];
		expected: 'both heads' | 'one head';
	}[] = [
		{
			chord: 'C6-D6',
			ledger: 'A5',
			y: a5y,
			range: first,
			expected: 'both heads',
		},
		{
			chord: 'C6-D6',
			ledger: 'C6',
			y: must(c6, 'C6').cy,
			range: first,
			expected: 'both heads',
		},
		{
			chord: 'B5-C6',
			ledger: 'A5',
			y: a5y,
			range: second,
			expected: 'both heads',
		},
		{
			chord: 'B5-C6',
			ledger: 'C6',
			y: must(c6b, 'C6').cy,
			range: second,
			expected: 'one head',
		},
	];
	const results = checks.map((c) => {
		const seg = widestLedgerSegment(e, 3, c.y, c.range[0], c.range[1]);
		const px = seg ? seg.x1 - seg.x0 : 0;
		const actual = covers(px);
		const pass = actual === c.expected;
		const x0 = seg ? seg.x0 : c.range[0];
		const x1 = seg ? seg.x1 : c.range[1];
		const y = seg ? seg.y : c.y;
		e.marks.measure({
			kind: 'box',
			from: { x: x0 - 1, y: y - 2 },
			to: { x: x1 + 1, y: y + 3 },
			label: actual === 'both heads' ? '2×' : '1×',
			note: `M4 ${c.chord} ${c.ledger} ledger is ${px}px (${actual}, expected ${c.expected})`,
			pass,
		});
		return actual;
	});
	return e.check(results);
}
