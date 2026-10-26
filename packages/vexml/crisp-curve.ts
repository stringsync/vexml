import { Curve, type CurveOptions, type Note as VexNote } from 'vexflow/core';

import type { DocumentBezier } from './score-reader';

/* The offset of the second bezier pass that gives a solid slur its lens shape, so the ink
 * reaches this far past the arc's midpoint. Larger than vexflow's default 2 because CrispCurve
 * drops the stroke that used to widen the shape: the lens alone is only 0.75 of this deep. */
export const CURVE_THICKNESS = 4;

/* The thickness that makes a solid curve's lens `middle` px deep at its midpoint. */
export function curveThickness(middle: number): number {
	return middle / LENS_DEPTH;
}

/* How deep the filled lens is at its midpoint, as a fraction of the thickness. */
const LENS_DEPTH = 0.75;

/*
 * A curve painted once instead of twice. vexflow strokes the outline of the lens shape AND
 * then fills it (curve.ts renderCurve). Canvas composites the two passes independently, so
 * along every edge the antialiased stroke and the antialiased fill each contribute partial
 * coverage that never adds up to solid: the arc reads soft, with a lighter seam running
 * inside it. Filling alone gives a crisp edge, at CURVE_THICKNESS, which is raised to make
 * up for the stroke that no longer widens the shape. Every curve vexml draws goes through
 * this, so slurs and tab arcs stay the same weight, unless the caller passes a thickness of its
 * own (a document's `<line-width type="slur middle">`, see curveThickness).
 */
export class CrispCurve extends Curve {
	/* How wide the lens is at its ends (`<line-width type="slur tip">`); null tapers it to a
	 * point the way vexflow does. */
	private tip: number | null = null;

	private readonly bezier: DocumentBezier | null;
	constructor(
		from: VexNote | undefined,
		to: VexNote | undefined,
		opts: CurveOptions & { bezier?: DocumentBezier | null },
	) {
		super(from, to, { ...opts, thickness: opts.thickness ?? CURVE_THICKNESS });
		this.bezier = opts.bezier ?? null;
	}

	setTip(tip: number | null): this {
		this.tip = tip;
		return this;
	}

	override renderCurve(params: {
		firstX: number;
		lastX: number;
		firstY: number;
		lastY: number;
		direction: number;
	}): void {
		const original = this.renderOptions.cps;
		const bezier = this.bezier;
		if (bezier) {
			const spacing =
				(params.lastX - params.firstX - 2 * this.renderOptions.xShift) / 4;
			this.renderOptions.cps = original.map((point, i) => {
				const offset = i === 0 ? bezier.start : bezier.end;
				return {
					x:
						offset.x === null
							? point.x
							: offset.x + (i === 0 ? -spacing : spacing),
					y: offset.y === null ? point.y : -offset.y / params.direction,
				};
			});
		}
		try {
			this.paintCurve(params);
		} finally {
			this.renderOptions.cps = original;
		}
	}

	private paintCurve(params: {
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
		if (this.tip !== null) {
			this.renderTipped(params, this.tip);
			return;
		}
		const ctx = this.checkContext();
		ctx.save();
		ctx.setStrokeStyle('rgba(0,0,0,0)');
		super.renderCurve(params);
		ctx.restore();
	}

	/*
	 * vexflow's lens with its ends cut square, `tip` px across: the far bow starts and ends
	 * that far out from the near one instead of at the note. The far bow's control points come
	 * in by a third of the tip, which a cubic weighs three quarters at its middle, so the
	 * lens stays as deep there as its thickness says.
	 */
	private renderTipped(
		params: {
			firstX: number;
			lastX: number;
			firstY: number;
			lastY: number;
			direction: number;
		},
		tip: number,
	): void {
		const ctx = this.checkContext();
		const options = this.renderOptions;
		const dir = params.direction;
		const yShift = options.yShift * dir;
		const firstX = params.firstX + options.xShift;
		const firstY = params.firstY + yShift;
		const lastX = params.lastX - options.xShift;
		const lastY = params.lastY + yShift;
		const [cp0 = { x: 0, y: 0 }, cp1 = { x: 0, y: 0 }] = options.cps;
		const spacing = (lastX - firstX) / (options.cps.length + 2);
		const far = options.thickness - tip / 3;
		ctx.beginPath();
		ctx.moveTo(firstX, firstY);
		ctx.bezierCurveTo(
			firstX + spacing + cp0.x,
			firstY + cp0.y * dir,
			lastX - spacing + cp1.x,
			lastY + cp1.y * dir,
			lastX,
			lastY,
		);
		ctx.lineTo(lastX, lastY + tip * dir);
		ctx.bezierCurveTo(
			lastX - spacing + cp1.x,
			lastY + (cp1.y + far) * dir,
			firstX + spacing + cp0.x,
			firstY + (cp0.y + far) * dir,
			firstX,
			firstY + tip * dir,
		);
		ctx.closePath();
		ctx.fill();
	}
}
