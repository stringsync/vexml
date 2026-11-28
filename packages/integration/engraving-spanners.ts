import type { Box, Ink } from './engraving-ink';
import type { Engraving } from './engraving-model';
import { column } from './engraving-tie-arcs';

/** The kind's ink on a measure's own stave and the spaces just around it, left to right. */
export function onStave(
	e: Engraving,
	kind: string,
	measure: number,
	above = 4,
	below = 10,
): Ink[] {
	const lines = e.lines(measure);
	const space = e.space(measure);
	const top = (lines[0] ?? 0) - above * space;
	const bottom = (lines[lines.length - 1] ?? 0) + below * space;
	return e
		.inMeasure(kind, measure)
		.filter((ink) => {
			const cy = ink.box.y + ink.box.h / 2;
			return cy >= top && cy <= bottom;
		})
		.sort((a, b) => a.box.x - b.box.x);
}

/** A hairpin's opening in px at one end: the height of its ink there. */
export function opening(ink: Ink, end: 'left' | 'right'): number {
	const { x, w } = ink.box;
	const span = column(ink, end === 'left' ? x + 1 : x + w - 2);
	return span ? span[1] - span[0] : 0;
}

/** The vertical middle of a hairpin's ink at one end. */
export function openingMid(ink: Ink, end: 'left' | 'right'): number {
	const { x, w } = ink.box;
	const span = column(ink, end === 'left' ? x + 1 : x + w - 2);
	return span ? (span[0] + span[1]) / 2 : Number.NaN;
}

/** The thickness in px of the first stroke in the column at x. */
export function stroke(ink: Ink, x: number): number {
	const band = ink.bandsAt(Math.round(x))[0];
	return band ? band[1] - band[0] : 0;
}

export function rightEdge(box: Box): number {
	return box.x + box.w;
}

export function bottomEdge(box: Box): number {
	return box.y + box.h;
}
