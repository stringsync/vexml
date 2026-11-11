import type { StaveNote } from 'vexflow/core';
import {
	SLUR_ACCIDENTAL_GAP,
	SLUR_BOW_ASPECT,
	SLUR_BOW_FLAT_WIDTH,
	SLUR_BOW_GROWTH,
	SLUR_BOW_MAX,
	SLUR_BOW_MIN,
	SLUR_END_ZONE,
	SLUR_GHOST_OVERLAP,
	SLUR_GRACE_CP_Y,
	SLUR_GRACE_MARGIN,
	SLUR_MARGIN,
	SLUR_MAX_ASPECT,
	SLUR_MAX_CP_Y,
	SLUR_MIN_SHOULDER,
	SLUR_SHOULDER,
} from './constants';
import type { SlurBow } from './slur-bow';

/* Where the two ends of a curve are drawn: xL/yL to xR/yR. */
export type SlurChord = { xL: number; xR: number; yL: number; yR: number };

// How the curve clears every note it passes over, given where its two ends are
// drawn (its chord). Two independent knobs, and which one does the work
// matters:
//
//   - `cpY` inflates the bow. Cheap in the middle of the span, where the bow
//     already stands 0.75*cpY off its chord; useless near the ends, where it
//     stands off almost nothing and buying clearance there means doming the
//     whole arc.
//   - `yShift` lifts both ends, sliding the whole curve off the notes without
//     changing its shape. Costs the same everywhere along the span.
//
// So: solve cpY against the notes in the middle, then lift by whatever is still
// short anywhere (the notes under the ends, and anything the aspect cap refused
// to inflate for). A steep near-end obstacle raises the slur off its first
// notehead instead of ballooning it, which is what a reference engraving does.
//
// Clearance is checked at each note's OWN x, not just at the apex: an apex-only
// test lets the arc skim a note lying under the tapering part. Solving per note
// also catches notes the old midpoint-vs-extreme comparison couldn't see at all,
// like one poking above a steeply slanted chord.
//
// For a full slur only the notes it passes *over* count: the endpoints are
// where it attaches, so their own stems must not inflate it. A note beamed up
// out of the stave has a stem taller than the stave itself, and clearing that
// from a notehead anchor turns a two-note slur into a narrow spike; with no
// interior notes the arc takes the floor. A grace curve measures against its own
// endpoint anchors (extentsOf collapses to anchorY), never a stem, so it has
// nothing to exclude.
//
// A cross-stave slur bowing over a run beamed below clears nothing at all. Its two
// ends are a stave apart, so the run it climbs through sits above its chord for
// most of the span by construction: no bow gets over that, and solving for it
// domes the arc across the hand it's leaving. The endpoints alone shape it. One
// bowing under a run beamed above passes below the run's noteheads, which a bow
// can clear, so it does.
export class SlurShape {
	/* How far each control point stands off the chord. */
	readonly cpY: number;
	/* How far both ends lift off their notes. */
	readonly yShift: number;
	/* How far along the chord the control points sit. */
	readonly shoulder: number;
	readonly width: number;
	/* Whether a note the bow passes still stands through it. */
	readonly blocked: boolean;

	constructor(bow: SlurBow, spanNotes: StaveNote[], chord: SlurChord) {
		const { xL, xR, yL, yR } = chord;
		const width = Math.abs(xR - xL);
		// A grace bow stays tight: it takes the clearance it needs and no more,
		// where a full slur also widens with its span.
		const bowDepth = Math.min(
			SLUR_BOW_MAX,
			SLUR_BOW_MIN + SLUR_BOW_GROWTH * Math.max(0, width - SLUR_BOW_FLAT_WIDTH),
			width * SLUR_BOW_ASPECT,
		);
		const floor = bow.isGrace ? SLUR_GRACE_CP_Y : bowDepth / 0.75;
		const margin = bow.isGrace ? SLUR_GRACE_MARGIN : SLUR_MARGIN;
		// How far above the base chord (the line joining the two lifted ends) each
		// note the curve passes over reaches, plus its margin. Only the overshoot
		// past the CHORD counts. Measured against a single Y instead, a note well
		// below an upward-bowing slur (the other voice on the stave, the next
		// measure's lower neighbour) asks the arc to rise by however far below it
		// sits, which turns a two-note bow across a barline into a tall narrow
		// spike.
		const needAt = (x: number, y: number, gap = margin) => {
			const s = width ? (x - xL) / (xR - xL) : 0.5;
			const chordY = yL + bow.dir * bow.baseYShift + s * (yR - yL);
			return { s, need: Math.max(0, bow.dir * (y - chordY) + gap) };
		};
		const clearances = [
			...clearanceOf(bow, spanNotes).map((n) => {
				const extents = bow.extentsOf(n);
				return needAt(
					n.getAbsoluteX(),
					bow.bulgeUp ? extents.top : extents.bottom,
				);
			}),
			// Every accidental the bow passes, the cautionary flat of the note it
			// arrives at included, sits left of its head where the notes' own extents
			// don't reach. The slur's own start has none behind it.
			...(bow.isGrace
				? []
				: spanNotes
						.filter((n) => n !== bow.from)
						.flatMap((n) => bow.obstacles.accidentalBoxes(n))
						.map((box) =>
							needAt(
								box.getX() + box.getW() / 2,
								bow.bulgeUp ? box.getY() : box.getY() + box.getH(),
								SLUR_ACCIDENTAL_GAP,
							),
						)),
		];
		// Only the notes clear of both ends set the bow's depth. Math.max seeded
		// with 0, not spread bare: with no mid-span notes an unseeded Math.min
		// against the cap would return the cap itself.
		const inflation = Math.max(
			0,
			...clearances
				.filter((c) => c.s >= SLUR_END_ZONE && c.s <= 1 - SLUR_END_ZONE)
				.map(
					(c) => c.need / riseFactor(c.s, bow.isGrace ? 0.25 : SLUR_SHOULDER),
				),
		);
		// One ceiling for both knobs: how far past its base lift the curve may stand
		// off the chord at all. Beyond this it stops reading as a bow, whether it
		// got there by inflating or by rising, so it stops trying: a slur can't
		// clear everything a span might hold (a second voice, the stem of a run
		// beamed into the other hand) and shouldn't deform itself pretending to.
		const reach = width * SLUR_MAX_ASPECT;
		const cpY = Math.max(
			floor,
			Math.min(reach, inflation, bow.isGrace ? Infinity : SLUR_MAX_CP_Y),
		);
		// A bow held under the ceiling flattens instead: its control points slide
		// toward the ends, as little as clears the notes the depth was for. Only the
		// ceiling does this: a short slur the aspect cap stopped keeps its shape.
		const capped = cpY === SLUR_MAX_CP_Y && inflation > cpY;
		const middle = clearances.filter(
			(c) => c.s >= SLUR_END_ZONE && c.s <= 1 - SLUR_END_ZONE,
		);
		let shoulder = bow.isGrace ? 0.25 : SLUR_SHOULDER;
		while (
			capped &&
			shoulder > SLUR_MIN_SHOULDER &&
			middle.some((c) => c.need > riseFactor(c.s, shoulder) * cpY)
		) {
			shoulder = Math.max(SLUR_MIN_SHOULDER, shoulder - 0.01);
		}
		// Whatever that bow still doesn't reach, the endpoints make up by rising,
		// out of what's left of the same budget.
		const shortfall = Math.max(
			0,
			...clearances.map((c) => c.need - riseFactor(c.s, shoulder) * cpY),
		);
		const yShift =
			bow.baseYShift + Math.min(shortfall, Math.max(0, reach - 0.75 * cpY));
		const blocked = clearances.some(
			(c) =>
				c.need - riseFactor(c.s, shoulder) * cpY - (yShift - bow.baseYShift) >
				SLUR_GHOST_OVERLAP,
		);
		this.cpY = cpY;
		this.yShift = yShift;
		this.shoulder = shoulder;
		this.width = width;
		this.blocked = blocked;
	}
}

/* The notes of a span whose clearance shapes the bow. */
function clearanceOf(bow: SlurBow, spanNotes: StaveNote[]): StaveNote[] {
	if (bow.crossStave && bow.bulgeUp && !bow.mayGhost) {
		return [];
	}
	if (bow.isGrace) {
		return spanNotes;
	}
	return spanNotes.filter((n) => n !== bow.from && n !== bow.to);
}

// How far the bow stands off its chord (the straight line joining the two
// drawn ends) at horizontal fraction `s` of the span, per unit of cpY. vexflow
// lifts both control points off the chord by the same cpY, so at bezier
// parameter t the bow stands 3t(1-t) off it: 0.75 at the midpoint, tapering to
// nothing at either end. But t is not s: the control points sit at `shoulder`
// (vexflow's quarter, or nearer the ends for a flattened bow, see SlurShape), so
// x runs along the curve unevenly. x(t) only climbs, so solve x(t) = s for t.
function riseFactor(s: number, shoulder = SLUR_SHOULDER): number {
	const xAt = (t: number) =>
		3 * t * (1 - t) * ((1 - t) * shoulder + t * (1 - shoulder)) + t ** 3;
	let lo = 0;
	let hi = 1;
	for (let i = 0; i < 30; i++) {
		const mid = (lo + hi) / 2;
		if (xAt(mid) < s) {
			lo = mid;
		} else {
			hi = mid;
		}
	}
	const t = (lo + hi) / 2;
	return 3 * t * (1 - t);
}
