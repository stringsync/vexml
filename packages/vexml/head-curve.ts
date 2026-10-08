import {
	type CurveOptions,
	GraceNote,
	type Note,
	type StaveNote,
} from 'vexflow/core';
import { GRACE_START } from './constants';
import { CrispCurve } from './crisp-curve';

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
	constructor(
		from: StaveNote | undefined,
		to: StaveNote | undefined,
		private readonly fromY: number,
		private readonly toY: number,
		opts: CurveOptions,
	) {
		super(from, to, opts);
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
		this.renderCurve({
			firstX: from ? startX(from) : stave.getTieStartX(),
			lastX: to ? to.getTieLeftX() : stave.getTieEndX(),
			firstY: this.fromY,
			lastY: this.toY,
			direction: this.renderOptions.openingDirection === 'down' ? -1 : 1,
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
