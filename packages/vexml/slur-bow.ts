import { Curve, type StaveNote } from 'vexflow/core';
import {
	SLUR_GRACE_ANCHOR,
	SLUR_GRACE_Y_SHIFT,
	SLUR_MARK_GAP,
	SLUR_STEM_TIP_SLANT,
	SLUR_Y_SHIFT,
} from './constants';
import type { SlurObstacles } from './slur-obstacles';

/* What SlurBuilder settled about one slur before its bow is shaped. */
export type SlurBowOptions = {
	from: StaveNote;
	to: StaveNote;
	isGrace: boolean;
	/* Whether the two ends sit on different staves of one system. */
	crossStave: boolean;
	/* Whether the slur may end on a ghost note when it cannot read as a bow. */
	mayGhost: boolean;
	bulgeUp: boolean;
	ghost: boolean;
};

/*
 * One slur between two drawn notes: which side it bows on, whether it ends on a ghost note,
 * and where its two ends anchor. The side and the ghost end can change while the bow is
 * being solved (see SlurBuilder), and every anchor follows them.
 */
export class SlurBow {
	readonly from: StaveNote;
	readonly to: StaveNote;
	readonly isGrace: boolean;
	readonly crossStave: boolean;
	readonly mayGhost: boolean;
	bulgeUp: boolean;
	/* The bulge as a sign on Y: -1 up the page, 1 down. */
	dir: number;
	ghost: boolean;
	// Chosen once, for the side the slur starts on: only a cross-stave slur changes side
	// afterwards, and it never takes the stem tips.
	private readonly useStemTips: boolean;

	constructor(
		readonly obstacles: SlurObstacles,
		opts: SlurBowOptions,
	) {
		this.from = opts.from;
		this.to = opts.to;
		this.isGrace = opts.isGrace;
		this.crossStave = opts.crossStave;
		this.mayGhost = opts.mayGhost;
		this.bulgeUp = opts.bulgeUp;
		this.dir = opts.bulgeUp ? -1 : 1;
		this.ghost = opts.ghost;
		this.useStemTips = this.stemTipsAreLevel();
	}

	takeSide(up: boolean): void {
		this.bulgeUp = up;
		this.dir = up ? -1 : 1;
	}

	/* The note an end is drawn on: a ghost end stands at the start's own height. */
	ghostOf(n: StaveNote): StaveNote {
		return this.ghost && n === this.to ? this.from : n;
	}

	towardBulge(note: StaveNote): boolean {
		return (note.getStemDirection() === 1) === this.bulgeUp;
	}

	// Anchor each endpoint on the bulge side of its own note: NEAR_TOP (the stem
	// tip) when that stem points toward the bulge, else NEAR_HEAD (the outer
	// notehead). This keeps an "above" slur on stem-down notes pinned to the
	// noteheads instead of the stem tips below them.
	//
	// Applied per note that rule can pin one end to a notehead and the other to a
	// stem tip, which is fine when the stems are short but not when they aren't: a
	// low note beamed up out of the stave has a stem taller than the stave, so a
	// slur joining it to its neighbour's notehead comes out as a near-vertical
	// whip. A slur is a bow between two points at comparable heights, so choose
	// per slur rather than per note: take the stem tips only while they leave the
	// two ends at least as level as the noteheads would.
	//
	// Unless an end is BEAMED on the bulge side, where the notehead is the worse anchor
	// however level it is: the beam is a bar lying between that notehead and the bow, so
	// a curve leaving the notehead climbs out through it. Such a slur takes the stem
	// tips (the beam's own outer edge), as long as its span is wide enough to carry the
	// drop as a slant (SLUR_STEM_TIP_SLANT). That budget is what still holds the whip
	// case above to the noteheads: its far stem is a stave tall over two adjacent notes.
	metric(note: StaveNote): number {
		return this.useStemTips && this.towardBulge(note)
			? Curve.Position.NEAR_TOP
			: Curve.Position.NEAR_HEAD;
	}

	// Where a grace curve's ends land, per SLUR_GRACE_ANCHOR. Neither vexflow
	// position metric works here: on a stem-down chord NEAR_HEAD is the *top*
	// note (the wrong end of the chord entirely), so resolve the Y explicitly
	// and hand it to HeadCurve. Always the bulge side, so an above-bulging
	// curve mirrors the same rule upward.
	anchorY(note: StaveNote): number {
		const bulgeSide = (top: number, bottom: number) =>
			this.bulgeUp ? Math.min(top, bottom) : Math.max(top, bottom);
		const { yTop, yBottom } = note.getNoteHeadBounds();
		if (SLUR_GRACE_ANCHOR === 'notehead' || !note.hasStem()) {
			return bulgeSide(yTop, yBottom);
		}
		// vexflow names these backwards from how they read: baseY is the notehead
		// the stem grows out of, topY its free tip. The bulge-side extreme of the
		// two is the end of the stem the curve should meet.
		const { topY, baseY } = note.getStemExtents();
		return bulgeSide(topY, baseY);
	}

	// Lift the control points so the arc midpoint clears the most extreme note
	// in the span and bows well off the noteheads. yShift raises the endpoints
	// off the notes; 0.75*cps.y is the extra rise the cubic bezier gains at its
	// midpoint. The arc height also grows with the slur's width so long slurs get
	// a rounder, taller bow instead of a flat line skimming the noteheads. A grace
	// curve measures against its own anchors instead, so the bow it draws is the
	// one its endpoints ask for; change SLUR_GRACE_ANCHOR and the depth follows.
	extentsOf(n: StaveNote): { top: number; bottom: number } {
		if (this.isGrace) {
			const y = this.anchorY(this.ghostOf(n));
			return { top: y, bottom: y };
		}
		const extents = this.obstacles.noteExtents(n);
		const marks = this.obstacles.marksOnSide(n, this.bulgeUp);
		return marks
			? {
					top: Math.min(extents.top, marks.top),
					bottom: Math.max(extents.bottom, marks.bottom),
				}
			: extents;
	}

	// A grace-to-main curve hugs directly under the two noteheads with a small
	// tight bow instead of the fuller slur arc (see the SLUR_GRACE_* constants).
	get baseYShift(): number {
		return this.isGrace ? SLUR_GRACE_Y_SHIFT : SLUR_Y_SHIFT;
	}

	// Where vexflow's Curve puts an end on its own: the anchor `metric` picked.
	noteEndY(note: StaveNote): number {
		const { topY, baseY } = note.getStemExtents();
		return this.metric(note) === Curve.Position.NEAR_TOP ? topY : baseY;
	}

	// How much further out an end has to start to clear its own note's marks on the
	// bow's side: a staccato or tenuto sits inside the slur, so the end leaves from
	// just past the mark rather than from the notehead, cutting through it. Each
	// end takes only its own lift, so a mark on one end doesn't float the other
	// off its note. A cross-stave bow over a beamed run keeps its ends, like it
	// keeps its shape (see SlurShape).
	markLift(note: StaveNote): number {
		if (this.isGrace || (this.crossStave && this.bulgeUp)) {
			return 0;
		}
		const marks = this.obstacles.marksOnSide(note, this.bulgeUp);
		if (!marks) {
			return 0;
		}
		const edge = this.bulgeUp ? marks.top : marks.bottom;
		const end = this.noteEndY(note) + this.dir * this.baseYShift;
		return Math.max(0, this.dir * (edge - end) + SLUR_MARK_GAP);
	}

	// The exact Y each end of the curve will be drawn at: what HeadCurve was handed
	// for a grace, and what vexflow reads off getStemExtents() for everything else.
	endpointY(note: StaveNote): number {
		if (this.isGrace) {
			return this.anchorY(this.ghostOf(note));
		}
		const end = this.ghostOf(note);
		return this.noteEndY(end) + this.dir * this.markLift(end);
	}

	private stemTipsAreLevel(): boolean {
		// vexflow's getStemExtents() names these backwards from how they read: baseY is
		// the notehead the stem grows out of, topY its free tip (see anchorY below).
		const stemAnchorY = (note: StaveNote) => {
			const { topY, baseY } = note.getStemExtents();
			return this.towardBulge(note) ? topY : baseY;
		};
		const headAnchorY = (note: StaveNote) => note.getStemExtents().baseY;
		// Measure both candidates against their own stave. On a slur that wraps onto a
		// later system the two ends sit a system apart, so raw Ys differ by the row gap
		// and that would swamp the comparison; stave-relative heights are what "level"
		// means for the two halves it splits into. Same-stave slurs are unaffected: the
		// offsets cancel.
		const relative = (note: StaveNote, y: number) =>
			y - (note.getStave()?.getY() ?? 0);
		const spread = (anchorY: (note: StaveNote) => number) =>
			Math.abs(
				relative(this.from, anchorY(this.from)) -
					relative(this.to, anchorY(this.to)),
			);
		const beamedOnBulgeSide = [this.from, this.to].some(
			(note) => note.hasBeam() && this.towardBulge(note),
		);
		const slantBudget = beamedOnBulgeSide
			? Math.abs(this.to.getAbsoluteX() - this.from.getAbsoluteX()) *
				SLUR_STEM_TIP_SLANT
			: 0;
		// A cross-stave slur takes the noteheads whatever that comparison says. Its two
		// ends are a stave apart, so neither anchor makes them level and the test is
		// really measuring the gap between the staves; meanwhile the stem tip of a note
		// beamed WITHIN its own stave is the beam's outer edge, which leaves the curve
		// starting in the white space beside a beam it then crosses anyway. The
		// notehead is the only end that reads as attached to its note.
		return (
			!this.crossStave &&
			spread(stemAnchorY) <= Math.max(spread(headAnchorY), slantBudget)
		);
	}
}
