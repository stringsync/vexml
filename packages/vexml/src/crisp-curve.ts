import { Curve, type CurveOptions, type Note as VexNote } from 'vexflow';

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
