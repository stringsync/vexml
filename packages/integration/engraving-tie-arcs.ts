/*
 * Tie arcs for the Behind Bars tie checks (ENGRAVING.md). vexml paints each tie as its own
 * element, so each `tie` ink mask is one arc: these read its direction, apex, ends and taper
 * off the mask's pixels.
 */
import type { Box, Ink } from './engraving-ink';
import { formatSpaces } from './engraving-marks';
import type { EngravedNote, Engraving } from './engraving-model';
import { quarters } from './engraving-render';

export type Curve = 'up' | 'down';

/** A measure's ties (0-based measure), top to bottom, then left to right. */
export function ties(e: Engraving, measure: number): Ink[] {
	return e
		.inMeasure('tie', measure)
		.sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
}

/** A measure's ties, left to right. */
export function tiesByX(e: Engraving, measure: number): Ink[] {
	return e.inMeasure('tie', measure).sort((a, b) => a.box.x - b.box.x);
}

/** The ink's vertical extent in column x, or null when the column is empty. */
export function column(ink: Ink, x: number): [number, number] | null {
	const bands = ink.bandsAt(x);
	const first = bands[0];
	const last = bands[bands.length - 1];
	return first && last ? [first[0], last[1]] : null;
}

/** The middle of the ink's column at x. */
export function columnMid(ink: Ink, x: number): number {
	const span = column(ink, x);
	return span ? (span[0] + span[1]) / 2 : Number.NaN;
}

/** Inked pixels in column x: the stroke's thickness there. */
export function thickness(ink: Ink, x: number): number {
	return ink.bandsAt(x).reduce((n, [top, bottom]) => n + bottom - top, 0);
}

/** Which way the arc bows: its middle against its two ends. */
export function curve(ink: Ink): Curve {
	const { x, w } = ink.box;
	const ends = (columnMid(ink, x + 1) + columnMid(ink, x + w - 2)) / 2;
	return columnMid(ink, x + Math.floor(w / 2)) < ends ? 'up' : 'down';
}

/** The x of the arc's outermost point, averaged over the columns that reach it. */
export function apexX(ink: Ink): number {
	const { x, w } = ink.box;
	const up = curve(ink) === 'up';
	let best = up ? Infinity : -Infinity;
	let xs: number[] = [];
	for (let cx = x; cx < x + w; cx++) {
		const span = column(ink, cx);
		if (!span) {
			continue;
		}
		const edge = up ? span[0] : span[1];
		if (edge === best) {
			xs.push(cx);
		} else if (up ? edge < best : edge > best) {
			best = edge;
			xs = [cx];
		}
	}
	return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** The middle of the stroke at the apex. */
export function apexY(ink: Ink): number {
	return columnMid(ink, Math.round(apexX(ink)));
}

/** The apex sits within a tenth of the arc's width of its centre. */
export function symmetric(ink: Ink): boolean {
	const { x, w } = ink.box;
	return Math.abs(apexX(ink) - (x + w / 2)) <= w / 10;
}

/** The stroke is thicker at the middle than near its ends. */
export function tapered(ink: Ink): boolean {
	const { x, w } = ink.box;
	const band = Math.max(1, Math.round(w / 10));
	const mid = x + Math.floor(w / 2);
	const avg = (from: number, count: number): number => {
		let sum = 0;
		for (let i = 0; i < count; i++) {
			sum += thickness(ink, from + i);
		}
		return sum / count;
	};
	const middle = avg(mid - Math.floor(band / 2), band);
	return middle > avg(x, band) && middle > avg(x + w - band, band);
}

/** Pixels two inks share, so a tie that touches a dot, flag or ledger counts. */
export function touches(a: Ink, others: Ink[]): number {
	return others.reduce((n, other) => n + a.overlaps(other), 0);
}

/** A tie's bounding box and direction, as a reference mark. */
export function markTie(e: Engraving, ink: Ink, label: string): void {
	const { x, y, w, h } = ink.box;
	e.marks.measure({
		kind: 'box',
		from: { x, y },
		to: { x: x + w, y: y + h },
		label,
		note: `${label}: curves ${curve(ink)}`,
	});
}

/** A vertical gap in stave-spaces, with its bracket. */
export function verticalGap(
	e: Engraving,
	measure: number,
	x: number,
	top: number,
	bottom: number,
	label: string,
): number {
	const spaces = quarters(bottom - top, e.space(measure));
	e.marks.measure({
		kind: 'bracket',
		from: { x, y: top },
		to: { x, y: bottom },
		label: formatSpaces(spaces),
		note: `${label}: ${formatSpaces(spaces)} stave spaces`,
	});
	return spaces;
}

/** A chord's heads at its first attack (left) or its tied continuation (right). */
export function chordHeads(
	e: Engraving,
	measure: number,
	which: 'first' | 'second',
): EngravedNote[] {
	const heads = e.headsIn(measure);
	const starts = [...new Set(heads.map((h) => h.head.x))].sort((a, b) => a - b);
	// A displaced second head sits a head's width right of its chord: group by gaps wider
	// than two head widths, which separate the two chords.
	const width = Math.max(...heads.map((h) => h.head.w));
	const split = starts.findIndex(
		(x, i) => i > 0 && x - (starts[i - 1] ?? x) > 2 * width,
	);
	const boundary = starts[split] ?? Infinity;
	return heads
		.filter((h) =>
			which === 'first' ? h.head.x < boundary : h.head.x >= boundary,
		)
		.sort((a, b) => a.cy - b.cy);
}

export function right(box: Box): number {
	return box.x + box.w;
}
