import {
	Curve,
	type CurveOptions,
	type StaveNote,
	type TieNotes,
	type Note as VexNote,
} from 'vexflow';
import {
	TAB_CURVE_CP_Y,
	TAB_CURVE_FULL_WIDTH,
	TAB_CURVE_LINE_CLEARANCE,
	TAB_CURVE_RISE,
	TAB_CURVE_Y_SHIFT,
} from './constants';

/* The offset of the second bezier pass that gives a solid slur its lens shape, so the ink
 * reaches this far past the arc's midpoint. Larger than vexflow's default 2 because CrispCurve
 * drops the stroke that used to widen the shape — the lens alone is only 0.75 of this deep. */
export const CURVE_THICKNESS = 4;

/*
 * A curve painted once instead of twice. vexflow strokes the outline of the lens shape AND
 * then fills it (curve.ts renderCurve). Canvas composites the two passes independently, so
 * along every edge the antialiased stroke and the antialiased fill each contribute partial
 * coverage that never adds up to solid: the arc reads soft, with a lighter seam running
 * inside it. Filling alone gives a crisp edge — at CURVE_THICKNESS, which is raised to make
 * up for the stroke that no longer widens the shape. Every curve vexml draws goes through
 * this, so slurs and tab arcs stay the same weight.
 */
export class CrispCurve extends Curve {
	constructor(
		from: VexNote | undefined,
		to: VexNote | undefined,
		options: CurveOptions,
	) {
		super(from, to, { ...options, thickness: CURVE_THICKNESS });
	}

	override renderCurve(params: {
		firstX: number;
		lastX: number;
		firstY: number;
		lastY: number;
		direction: number;
	}): void {
		// A dashed curve is a single stroked bezier with no fill (vexflow skips both the
		// second pass and the fill), so there's no seam to fix and no ink without the stroke.
		if (this.getStyle()?.lineDash) {
			super.renderCurve(params);
			return;
		}
		const ctx = this.checkContext();
		ctx.save();
		ctx.setStrokeStyle('rgba(0,0,0,0)');
		super.renderCurve(params);
		ctx.restore();
	}
}

/*
 * A slur whose endpoints are pinned to explicit Ys. vexflow's Curve can only anchor an
 * end at getStemExtents(): NEAR_TOP is the stem tip, NEAR_HEAD the notehead *opposite*
 * the stem. On a stem-down chord neither names the notehead a bow should touch —
 * NEAR_HEAD lands on the chord's topmost note (so a grace slur shoots up over the
 * chord's accidentals as a near-straight diagonal instead of bowing under it) and
 * NEAR_TOP lands below the beam. Take the endpoint Ys as given; the X, the bezier and
 * the fill still come from vexflow.
 */
export class HeadCurve extends CrispCurve {
	constructor(
		from: StaveNote | undefined,
		to: StaveNote | undefined,
		options: CurveOptions,
		private readonly fromY: number,
		private readonly toY: number,
	) {
		super(from, to, options);
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
			firstX: from ? from.getTieRightX() : stave.getTieStartX(),
			lastX: to ? to.getTieLeftX() : stave.getTieEndX(),
			firstY: this.fromY,
			lastY: this.toY,
			direction: this.renderOptions.openingDirection === 'down' ? -1 : 1,
		});
		return true;
	}
}

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
