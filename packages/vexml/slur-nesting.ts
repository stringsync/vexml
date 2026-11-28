import type { Note } from '@stringsync/mdom';
import { type Stave, type StaveNote, Tuplet } from 'vexflow/core';
import {
	SLUR_NESTED_END_GAP,
	SLUR_NESTED_GAP,
	SLUR_TUPLET_END_GAP,
	SLUR_TUPLET_GAP,
	TUPLET_NUMERAL_HALF_HEIGHT,
} from './constants';
import { CURVE_THICKNESS } from './crisp-curve';
import type { SlurConnector } from './curve-connectors';
import { DisplayTuplet } from './display-tuplet';
import { SlurBow, type SlurBowOptions } from './slur-bow';
import type { SlurObstaclePoint, SlurShape } from './slur-shape';

/* One slur collected by SlurBuilder before sorting shortest-first for nesting. */
export type SlurCandidate = {
	from: StaveNote;
	to: StaveNote;
	lead: Note;
	partner: Note;
	slur: SlurConnector;
	isGrace: boolean;
	span: StaveNote[];
	// vet-ignore noop-objects-over-null: a note's stave may be absent before layout
	fromStave: Stave | undefined;
	// vet-ignore noop-objects-over-null: a note's stave may be absent before layout
	toStave: Stave | undefined;
	crossStave: boolean;
	bulgeUp: boolean;
	mayGhost: boolean;
	ghost: boolean;
	wraps: boolean;
	width: number;
};

/* A slur arc already placed on a stave row, used to lift and clear longer nested slurs. */
export type PlacedArc = {
	rowY: number;
	bulgeUp: boolean;
	// vet-ignore noop-objects-over-null: a system-break half-curve has only one note end; absence is score data
	from: StaveNote | undefined;
	// vet-ignore noop-objects-over-null: a system-break half-curve has only one note end; absence is score data
	to: StaveNote | undefined;
	xL: number;
	xR: number;
	yL: number;
	yR: number;
	shape: SlurShape;
	dir: number;
};

const NESTED_SAMPLES = [0.15, 0.3, 0.5, 0.7, 0.85];

/*
 * Tracks slurs already built on each stave row (shortest first) so a longer simultaneous
 * slur on the same side lifts past shared endpoints and arches outside the shorter one
 * (Behind Bars p. 113).
 */
export class SlurNesting {
	private readonly placed: PlacedArc[] = [];

	record(arc: PlacedArc): void {
		this.placed.push(arc);
	}

	overlapping(
		rowY: number,
		bulgeUp: boolean,
		xL: number,
		xR: number,
	): PlacedArc[] {
		return this.placed.filter(
			(p) =>
				p.rowY === rowY &&
				p.bulgeUp === bulgeUp &&
				p.xR > xL + 1 &&
				p.xL < xR - 1,
		);
	}

	endLift(
		over: readonly PlacedArc[],
		note: StaveNote,
		isStart: boolean,
		baseEndY: number,
		dir: number,
	): number {
		let lift = 0;
		for (const p of over) {
			if ((isStart ? p.from : p.to) !== note) {
				continue;
			}
			const innerEndY = (isStart ? p.yL : p.yR) + p.dir * p.shape.yShift;
			lift = Math.max(lift, dir * (innerEndY - baseEndY) + SLUR_NESTED_END_GAP);
		}
		return lift;
	}

	liftBow(
		bow: SlurBow,
		fromOver: readonly PlacedArc[],
		toOver: readonly PlacedArc[],
		fromTuplets: readonly DisplayTuplet[],
		toTuplets: readonly DisplayTuplet[],
		opts: SlurBowOptions,
	): SlurBow {
		const fromBaseY = bow.endpointY(opts.from) + bow.dir * bow.baseYShift;
		const toBaseY = bow.endpointY(opts.to) + bow.dir * bow.baseYShift;
		const liftFrom = Math.max(
			this.endLift(fromOver, opts.from, true, fromBaseY, bow.dir),
			this.tupletEndLift(
				fromTuplets,
				opts.from,
				bow.bulgeUp,
				fromBaseY,
				bow.dir,
			),
		);
		const liftTo = Math.max(
			this.endLift(toOver, opts.to, false, toBaseY, bow.dir),
			this.tupletEndLift(toTuplets, opts.to, bow.bulgeUp, toBaseY, bow.dir),
		);
		return liftFrom > 0 || liftTo > 0
			? new SlurBow(bow.obstacles, {
					...opts,
					nestedLiftFrom: liftFrom,
					nestedLiftTo: liftTo,
				})
			: bow;
	}

	/*
	 * Shorter bracketed tuplets on the same stave row and side that lie strictly inside
	 * [xL, xR]: Behind Bars p. 198 puts these inside the longer slur, so the slur arches
	 * cleanly over their brackets and numerals.
	 */
	shorterTuplets(
		span: readonly StaveNote[],
		rowY: number,
		bulgeUp: boolean,
		xL: number,
		xR: number,
	): DisplayTuplet[] {
		const seen = new Set<DisplayTuplet>();
		const out: DisplayTuplet[] = [];
		for (const note of span) {
			const tuplet = note.getTuplet();
			if (
				!(tuplet instanceof DisplayTuplet) ||
				seen.has(tuplet) ||
				!tuplet.isBracketed()
			) {
				continue;
			}
			seen.add(tuplet);
			if ((tuplet.getLocation() === Tuplet.LOCATION_TOP) !== bulgeUp) {
				continue;
			}
			const notes = tuplet.getNotes();
			const first = notes[0];
			const last = notes[notes.length - 1];
			if (!first || !last || first.getStave()?.getY() !== rowY) {
				continue;
			}
			const tLeft = first.getAbsoluteX();
			const tRight = last.getAbsoluteX();
			if (tLeft >= xL - 1 && tRight <= xR + 1 && tRight - tLeft < xR - xL - 1) {
				out.push(tuplet);
			}
		}
		return out;
	}

	tupletEndLift(
		tuplets: readonly DisplayTuplet[],
		note: StaveNote,
		bulgeUp: boolean,
		baseEndY: number,
		dir: number,
	): number {
		let lift = 0;
		for (const tuplet of tuplets) {
			if (note.getTuplet() !== tuplet) {
				continue;
			}
			const lineY = tupletOuterLineY(tuplet, bulgeUp);
			lift = Math.max(lift, dir * (lineY - baseEndY) + SLUR_TUPLET_END_GAP);
		}
		return lift;
	}

	tupletObstacles(
		tuplets: readonly DisplayTuplet[],
		bulgeUp: boolean,
		dir: number,
		xL: number,
		xR: number,
	): SlurObstaclePoint[] {
		const points: SlurObstaclePoint[] = [];
		for (const tuplet of tuplets) {
			const notes = tuplet.getNotes();
			const first = notes[0];
			const last = notes[notes.length - 1];
			if (!first || !last) {
				continue;
			}
			const tLeft = first.getAbsoluteX();
			const tRight = last.getAbsoluteX();
			const midX = (tLeft + tRight) / 2;
			const lineY = tupletOuterLineY(tuplet, bulgeUp);
			const numeralY = lineY + dir * TUPLET_NUMERAL_HALF_HEIGHT;
			for (const [x, y] of [
				[tLeft, lineY],
				[midX, numeralY],
				[tRight, lineY],
			] as const) {
				if (x >= xL && x <= xR) {
					points.push({ x, y, gap: SLUR_TUPLET_GAP });
				}
			}
		}
		return points;
	}

	obstacles(
		over: readonly PlacedArc[],
		xL: number,
		xR: number,
	): SlurObstaclePoint[] {
		const points: SlurObstaclePoint[] = [];
		const outerEdge = CURVE_THICKNESS * 0.75;
		for (const p of over) {
			for (const s of NESTED_SAMPLES) {
				const x = p.xL + s * (p.xR - p.xL);
				if (x < xL || x > xR) {
					continue;
				}
				const y =
					p.yL + s * (p.yR - p.yL) + p.dir * (p.shape.riseAt(s) + outerEdge);
				points.push({ x, y, gap: SLUR_NESTED_GAP });
			}
		}
		return points;
	}
}

function tupletOuterLineY(tuplet: DisplayTuplet, bulgeUp: boolean): number {
	const range = tuplet.getBracketYRange();
	if (range) {
		return bulgeUp ? range.top : range.bottom;
	}
	return tuplet.getYPosition();
}
