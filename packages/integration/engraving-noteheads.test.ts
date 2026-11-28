import { describe, expect, it } from 'bun:test';
import { formatSpaces } from './engraving-marks';
import type { EngravedNote } from './engraving-model';
import { draw, engrave, quarters } from './engraving-render';

// Behind Bars, pp. 9–13: noteheads (ENGRAVING.md). noteheads.musicxml, treble, 4/4:
// - M1: F4 G4 A4 B4 quarters (space, line, space, line). M2: F4 G4 halves. M3: F4 whole.
// - M4: diamond heads, C5 and A4 quarters, C5 half.
// - M5: x heads, C5 and A4 quarters, C5 half. M6: x-head A4 whole.

describe('Behind Bars noteheads (pp. 9–13)', () => {
	it.concurrent('draws noteheads', async () => {
		expect(await draw('noteheads')).toMatchScreenshot(
			'engraving_noteheads.png',
		);
	});

	// A head is a stave-space tall: it fills a space, or centres on a line.
	it.concurrent('notehead-size (p. 10): fills a space and centres on a line', async () => {
		expect(await headFit()).toMatchMeasurements({
			heights: [1, 1, 1, 1, 1, 1, 1],
			offLine: [0.5, 0, 0.5, 0, 0.5, 0, 0.5],
		});
	});

	// A stem joins a diamond head at its side, not its centre point.
	it.concurrent('notehead-diamond (p. 11): joins stems to the side of diamonds', async () => {
		expect(await stemJoins(3, 'notehead-diamond')).toMatchMeasurements([
			'edge',
			'edge',
			'edge',
		]);
	});

	// A stem joins a cross head at its edge, not its centre.
	it.concurrent('notehead-cross (pp. 11–12): joins stems to the edge of crosses', async () => {
		expect(await stemJoins(4, 'notehead-cross')).toMatchMeasurements([
			'edge',
			'edge',
			'edge',
		]);
	});

	// Half and whole cross heads are a cross inside a thin circle.
	it.concurrent('notehead-cross-white (p. 12): circles half and whole cross heads', async () => {
		expect(await crossCircles()).toMatchMeasurements(['circled', 'circled']);
	});
});

/** How far y is from the nearest of the lines, in px. */
function offLine(y: number, lines: number[]): number {
	return Math.min(...lines.map((line) => Math.abs(line - y)));
}

/** Each plain head's height, and its centre's distance from the nearest line. */
async function headFit() {
	const e = await engrave('noteheads', 'notehead-size');
	const heads = [0, 1, 2].flatMap((m) =>
		e.headsIn(m).map((n) => ({ n, lines: e.lines(m), s: e.space(m) })),
	);
	const expectedOff = [0.5, 0, 0.5, 0, 0.5, 0, 0.5];
	const heights: number[] = [];
	const offsets: number[] = [];

	heads.forEach(({ n, lines, s }, i) => {
		const h = quarters(n.head.h, s);
		const off = quarters(offLine(n.cy, lines), s);
		heights.push(h);
		offsets.push(off);
		const wantOff = expectedOff[i] ?? 0;
		const ok = h === 1 && off === wantOff;
		const bracketX = n.head.x - 5;
		e.marks.measure({
			kind: 'bracket',
			from: { x: bracketX, y: n.head.y },
			to: { x: bracketX, y: n.head.y + n.head.h },
			label: formatSpaces(h),
			note: `${n.pitch ?? 'note'}: height ${formatSpaces(h)} spaces, ${formatSpaces(off)} from nearest line (expected 1 height, ${formatSpaces(wantOff)} off-line)`,
			pass: ok,
		});
	});

	return e.check({ heights, offLine: offsets });
}

function stemJoin(n: EngravedNote): string {
	const stem = n.stem?.box;
	if (!stem) {
		return 'no stem';
	}
	const atEdge =
		stem.x <= n.head.x + 1.5 || stem.x + stem.w >= n.head.x + n.head.w - 1.5;
	return atEdge ? 'edge' : 'inside';
}

async function stemJoins(measure: number, rule: string) {
	const e = await engrave('noteheads', rule);
	const stemmed = e.headsIn(measure).filter((n) => (n.beats ?? 0) < 4);
	const joins = stemmed.map((n, i) => {
		const join = stemJoin(n);
		const cx = n.head.x + n.head.w / 2;
		e.marks.reference(`head-centre-${i}`, {
			kind: 'line',
			from: { x: cx, y: n.head.y - 4 },
			to: { x: cx, y: n.head.y + n.head.h + 4 },
			label: '',
			note: `${n.pitch ?? 'note'} head horizontal centre`,
		});
		const stem = n.stem?.box;
		const box = stem
			? {
					x: stem.x - 2,
					y: n.head.y - 2,
					w: stem.w + 4,
					h: n.head.h + 4,
				}
			: n.head;
		e.marks.measure({
			kind: 'box',
			from: { x: box.x, y: box.y },
			to: { x: box.x + box.w, y: box.y + box.h },
			label: join,
			note: `${n.pitch ?? 'note'} stem joins at ${join} (expected edge)`,
		});
		return join;
	});
	return e.check(joins);
}

/** Whether each half and whole cross head is circled: ink above and below its crossing. */
async function crossCircles() {
	const e = await engrave('noteheads', 'notehead-cross-white');
	const white = [
		...e.headsIn(4).filter((n) => (n.beats ?? 0) >= 2),
		...e.headsIn(5),
	];
	const shapes = white.map((n, i) => {
		const ink = e
			.of('notehead')
			.find(
				(h) =>
					Math.abs(h.box.y + h.box.h / 2 - n.cy) < 3 &&
					Math.abs(h.box.x - n.head.x) < 4,
			);
		const probeX = ink
			? Math.floor(ink.box.x + ink.box.w / 2)
			: Math.floor(n.head.x + n.head.w / 2);
		const bands = ink?.bandsAt(probeX) ?? [];
		const shape = bands.length >= 3 ? 'circled' : 'bare';
		const box = ink?.box ?? n.head;
		e.marks.reference(`probe-${i}`, {
			kind: 'line',
			from: { x: probeX, y: box.y - 4 },
			to: { x: probeX, y: box.y + box.h + 4 },
			label: '',
			note: 'Centre column probed for circle bands',
		});
		e.marks.measure({
			kind: 'box',
			from: { x: box.x, y: box.y },
			to: { x: box.x + box.w, y: box.y + box.h },
			label: shape,
			note: `${n.pitch ?? 'note'} ${(n.beats ?? 0) >= 4 ? 'whole' : 'half'} cross head has ${bands.length} vertical ink band(s) at centre (${shape}, expected circled)`,
		});
		return shape;
	});
	return e.check(shapes);
}
