import {
	Curve,
	type CurveOptions,
	StaveNote,
	type Note as VexNote,
} from 'vexflow/core';

import type { DocumentBezier } from './score-reader';

/* The offset of the second bezier pass that gives a solid curve its weight, so the ink is
 * 2.2 px deep at the arc's midpoint (see LENS_DEPTH). */
export const CURVE_THICKNESS = 2.93;

/* How wide a solid curve is at its ends, in px. The ends are blunt, not points, so the weight
 * holds along the curve: it thins by under half from the middle to the tips. */
export const CURVE_TIP = 1.25;

/* How far past its notehead's centre a slur's end reaches, in px. */
const HEAD_REACH = 0.7;

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
	/* How wide the lens is at its ends (`<line-width type="slur tip">`); null takes CURVE_TIP,
	 * or the lens's own depth when a document's middle is thinner than that. */
	private tip: number | null = null;

	private readonly bezier: DocumentBezier | null;
	private readonly reach: { start: boolean; end: boolean };
	private readonly openX: number | null;
	constructor(
		from: VexNote | undefined,
		to: VexNote | undefined,
		opts: CurveOptions & {
			bezier?: DocumentBezier | null;
			/** Which ends run to their notehead's centre instead of stopping at its edge. */
			reach?: { start: boolean; end: boolean };
			/** Where a missing end lands, when it is not its stave's own edge: the system's. */
			openX?: number;
		},
	) {
		super(from, to, { ...opts, thickness: opts.thickness ?? CURVE_THICKNESS });
		this.openX = opts.openX ?? null;
		this.bezier = opts.bezier ?? null;
		this.reach = opts.reach ?? { start: false, end: false };
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
		const reached = this.reachedEnds(params);
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
			this.paintCurve(reached);
		} finally {
			this.renderOptions.cps = original;
		}
	}

	private reachedEnds<T extends { firstX: number; lastX: number }>(
		params: T,
	): T {
		// vet-ignore noop-objects-over-null: vexflow's Curve takes an undefined end to mean an open one, and a stand-in note would draw as a real end
		const centre = (note: VexNote | undefined) =>
			note instanceof StaveNote
				? note.getNoteHeadBeginX() + note.getGlyphWidth() / 2
				: null;
		const first = this.reach.start ? centre(this.from) : null;
		const last = this.reach.end ? centre(this.to) : null;
		const open = this.openX;
		const openFirst = open !== null && !this.from ? open : params.firstX;
		const openLast = open !== null && !this.to ? open : params.lastX;
		return {
			...params,
			firstX: first === null ? openFirst : first - HEAD_REACH,
			lastX: last === null ? openLast : last + HEAD_REACH,
		};
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
		this.renderTipped(
			params,
			this.tip ??
				Math.min(CURVE_TIP, this.renderOptions.thickness * LENS_DEPTH),
		);
	}

	/*
	 * A lens with its ends cut square, `tip` px across: the far bow starts and ends
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
