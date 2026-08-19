import type { TieNotes } from 'vexflow';
import {
	TAB_CURVE_CP_Y,
	TAB_CURVE_FULL_WIDTH,
	TAB_CURVE_LINE_CLEARANCE,
	TAB_CURVE_RISE,
	TAB_CURVE_Y_SHIFT,
} from '../constants';
import { CrispCurve } from './crisp-curve';

/*
 * A tab hammer-on/pull-off arc drawn with the SLUR renderer instead of the tie one. vexflow
 * has two, and they do not draw the same bow: Curve.renderCurve is a cubic bezier whose
 * control points sit a quarter and three quarters along the span, offset by cps.y, with the
 * ends lifted yShift off the notes; StaveTie.renderTie (which TabTie extends) is a pair of
 * quadratics pinned to the span's midpoint, whose apex is only cp/2 off the notes. So the tab
 * arc came out flatter, and hugging the fret digits, next to the slur the notation stave draws
 * over the same two notes. This is the adapter: same endpoints TabTie would use (getYs()[index]
 * per shared string), shape and fill from Curve, so both staves bow alike. TabTie's "H"/"P"
 * label is dropped along with it — a player reads the gesture off the arc and the fret motion.
 */
export class TabCurve extends CrispCurve {
	constructor(
		private readonly notes: TieNotes,
		private readonly firstIndex: number,
		private readonly lastIndex: number,
	) {
		super(notes.firstNote ?? undefined, notes.lastNote ?? undefined, {
			yShift: TAB_CURVE_Y_SHIFT,
			cps: [
				{ x: 0, y: TAB_CURVE_CP_Y },
				{ x: 0, y: TAB_CURVE_CP_Y },
			],
		});
	}

	override draw(): boolean {
		this.checkContext();
		this.setRendered();
		const { firstNote, lastNote } = this.notes;
		// A wrapped arc has only one end (tieSpecs splits it in two); it bows out to the edge
		// of the stave it does have, level with the note it does have.
		const anchor = firstNote ?? lastNote;
		const stave = anchor?.checkStave();
		if (!anchor || !stave) {
			return false;
		}
		const firstY = (firstNote ?? anchor).getYs()[this.firstIndex];
		const lastY = (lastNote ?? anchor).getYs()[this.lastIndex];
		if (typeof firstY !== 'number' || typeof lastY !== 'number') {
			return false;
		}
		const firstX = firstNote ? firstNote.getTieRightX() : stave.getTieStartX();
		const lastX = lastNote ? lastNote.getTieLeftX() : stave.getTieEndX();
		// Keep the bow in proportion to its span. A grace note hammering into the note beside
		// it, or the stub half of a wrapped arc, spans a few pixels — at the full lift that
		// draws as a tall narrow spike instead of an arc. (The slurs cap on the same idea with
		// SLUR_MAX_ASPECT.) Done at draw time because the span in pixels isn't known until the
		// notes are placed.
		//
		// And keep it under the string line above. An arc on an inner string only has that
		// gap to live in; at the full lift it climbs past the line and bows over the frets of
		// the string above, so a chord hammering two strings at once draws two arcs that each
		// read as belonging to the other one's pair. A note on the top line has the open space
		// above the stave and keeps the full bow.
		const spacing = stave.getSpacingBetweenLines();
		const onTopLine = Math.min(firstY, lastY) - spacing < stave.getYForLine(0);
		const rise = TAB_CURVE_RISE;
		const scale = Math.min(
			1,
			Math.abs(lastX - firstX) / TAB_CURVE_FULL_WIDTH,
			onTopLine ? 1 : (spacing - TAB_CURVE_LINE_CLEARANCE) / rise,
		);
		this.renderOptions.yShift = TAB_CURVE_Y_SHIFT * scale;
		this.renderOptions.cps = [
			{ x: 0, y: TAB_CURVE_CP_Y * scale },
			{ x: 0, y: TAB_CURVE_CP_Y * scale },
		];
		this.renderCurve({
			firstX,
			lastX,
			firstY,
			lastY,
			// Tab hammer-ons/pull-offs always bow above the frets (TabTie hard-codes -1 too).
			direction: -1,
		});
		return true;
	}
}
