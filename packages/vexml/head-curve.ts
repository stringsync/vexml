import {
	type CurveOptions,
	GraceNote,
	type Note,
	StaveNote,
} from 'vexflow/core';
import { GRACE_END_STEM_GAP, GRACE_START } from './constants';
import { CrispCurve, type CurveReach } from './crisp-curve';
import type { DocumentBezier } from './score-reader';

/*
 * A slur whose endpoints are pinned to explicit Ys. vexflow's Curve can only anchor an
 * end at getStemExtents(): NEAR_TOP is the stem tip, NEAR_HEAD the notehead *opposite*
 * the stem. On a stem-down chord neither names the notehead a bow should touch.
 * NEAR_HEAD lands on the chord's topmost note (so a grace slur shoots up over the
 * chord's accidentals as a near-straight diagonal instead of bowing under it) and
 * NEAR_TOP lands below the beam. Take the endpoint Ys as given; the X, the bezier and
 * the fill still come from vexflow.
 */
export class HeadCurve extends CrispCurve {
	private readonly fromY: number;
	private readonly toY: number;

	constructor(
		opts: CurveOptions & {
			from: StaveNote | undefined;
			// vet-ignore noop-objects-over-null: a curve end can lack a note; absence is score data, and the other end decides the stave
			to: StaveNote | undefined;
			fromY: number;
			toY: number;
			bezier?: DocumentBezier | null;
			reach?: { start: CurveReach; end: CurveReach };
			openX?: number;
		},
	) {
		super(opts.from, opts.to, opts);
		this.fromY = opts.fromY;
		this.toY = opts.toY;
	}

	override draw(): boolean {
		this.checkContext();
		this.setRendered();
		const { from, to } = this;
		// One of the two is always set (Curve's constructor rejects neither), so this
		// picks the stave of whichever end exists on a system-break half-curve.
		const stave = (from ?? to)?.checkStave();
		if (!stave) {
			return false;
		}
		const above = this.renderOptions.openingDirection === 'down';
		this.renderCurve({
			firstX: from ? startX(from) : stave.getTieStartX(),
			lastX: to ? endX(to, from, above) : stave.getTieEndX(),
			firstY: this.fromY,
			lastY: this.toY,
			direction: above ? -1 : 1,
		});
		return true;
	}
}

/*
 * Where the curve leaves its first note. A grace note's curve tucks in under its notehead,
 * a little left of centre, so it reads as growing out of the grace rather than flicking off
 * its right edge; any other note lets go at its tie edge as usual.
 */
function startX(note: Note): number {
	if (!(note instanceof GraceNote)) {
		return note.getTieRightX();
	}
	const left = note.getNoteHeadBeginX();
	return left + (note.getNoteHeadEndX() - left) * GRACE_START;
}

/*
 * Where the curve lands on its target note. An above-curving grace slur centres on the
 * target notehead so it clears any accidental to the note's left and reads as landing on
 * the resolving pitch (Behind Bars p. 130). A below-curving grace slur into a down-stem
 * note stops short of the left-edge stem so the tip keeps clear space before the anchor.
 */
function endX(note: Note, from: Note | undefined, above: boolean): number {
	if (from instanceof GraceNote && note instanceof StaveNote) {
		if (above) {
			return (note.getNoteHeadBeginX() + note.getNoteHeadEndX()) / 2;
		}
		if (note.hasStem() && note.getStemDirection() === -1) {
			return note.getTieLeftX() - GRACE_END_STEM_GAP;
		}
	}
	return note.getTieLeftX();
}
