import type { RenderContext, Stave, StaveNote } from 'vexflow/core';
import { Rect } from 'webappwiz/geometry';
import {
	HAIRPIN_HEIGHT,
	HAIRPIN_NIENTE_RADIUS,
	HAIRPIN_STAVE_GAP,
} from './constants';

// MusicXML's default <wedge spread>, in tenths.
const DEFAULT_SPREAD = 15;

export type HairpinOptions = {
	dash?: number[] | null;
	niente?: boolean;
	spread?: number | null;
};

/*
 * A crescendo/diminuendo hairpin between two notes, drawn at a fixed gap from the staff on
 * the side its <wedge> placement names. vexflow's own StaveHairpin derives its y from the
 * stave box and a pair of hardcoded 20/30px constants that, for an ABOVE hairpin, land the
 * wedge inside the staff: the offset needed to correct it is more code (and more coupling
 * to those constants) than the three lines the shape actually is. Drawn via
 * setContext().draw() like the other spanners.
 *
 * A <wedge spread> sets the mouth's height; the band keeps its center where the
 * default height puts it, so a wider or narrower wedge still lines up with its neighbours.
 */
export class Hairpin {
	private context?: RenderContext;
	private readonly dash: number[] | null;
	private readonly niente: boolean;
	private readonly spread: number | null;
	constructor(
		private readonly from: StaveNote,
		private readonly to: StaveNote,
		private readonly crescendo: boolean,
		private readonly placement: 'above' | 'below',
		opts: HairpinOptions = {},
	) {
		this.dash = opts.dash ?? null;
		this.niente = opts.niente ?? false;
		this.spread = opts.spread ?? null;
	}
	/*
	 * Extra distance from the staff, set by the caller when the fixed gap would put the wedge
	 * through something already drawn there (a slur bowing the same way). Signed in the
	 * direction the hairpin sits: positive is further from the staff.
	 */
	private offset = 0;
	private startInset = 0;
	private endInset = 0;
	/* The wedge's stroke width (`<line-width type="wedge">`); null strokes at the context's. */
	private lineWidth: number | null = null;
	setContext(context: RenderContext): this {
		this.context = context;
		return this;
	}
	setOffset(offset: number): this {
		this.offset = offset;
		return this;
	}
	getOffset(): number {
		return this.offset;
	}
	setHorizontalInsets(start: number, end: number): this {
		this.startInset = start;
		this.endInset = end;
		return this;
	}
	setLineWidth(lineWidth: number | null): this {
		this.lineWidth = lineWidth;
		return this;
	}
	get stave(): Stave {
		return this.from.checkStave();
	}
	get above(): boolean {
		return this.placement === 'above';
	}
	get opens(): boolean {
		return this.crescendo;
	}
	/** The band the wedge occupies, for the caller's page crop and clearance check. */
	get bounds(): { top: number; bottom: number } {
		const stave = this.stave;
		const center =
			this.placement === 'above'
				? stave.getYForLine(0) -
					HAIRPIN_STAVE_GAP -
					HAIRPIN_HEIGHT / 2 -
					this.offset
				: stave.getBottomLineY() +
					HAIRPIN_STAVE_GAP +
					HAIRPIN_HEIGHT / 2 +
					this.offset;
		// vexml's default mouth stands for MusicXML's default spread, so a score that writes
		// 15 tenths everywhere keeps it and other spreads scale from there.
		const height =
			this.spread === null
				? HAIRPIN_HEIGHT
				: (this.spread / DEFAULT_SPREAD) * HAIRPIN_HEIGHT;
		return { top: center - height / 2, bottom: center + height / 2 };
	}
	/** The box the wedge is drawn in: the band above, over the notes it spans. */
	get rect(): Rect {
		const { top, bottom } = this.bounds;
		const x1 = this.from.getAbsoluteX() + this.startInset;
		const x2 = this.to.getAbsoluteX() - this.endInset;
		return new Rect(Math.min(x1, x2), top, Math.abs(x2 - x1), bottom - top);
	}
	draw(): void {
		const ctx = this.context;
		if (!ctx) {
			return;
		}
		const { top, bottom } = this.bounds;
		const mid = (top + bottom) / 2;
		// The wedge spans notehead to notehead. A crescendo opens rightward (its point sits
		// at the first note), a diminuendo closes rightward (its point sits at the last).
		const x1 = this.from.getAbsoluteX() + this.startInset;
		const x2 = this.to.getAbsoluteX() - this.endInset;
		const [pointX, mouthX] = this.crescendo ? [x1, x2] : [x2, x1];
		// A niente point is a small circle the two arms run up to, not a shared vertex.
		const radius = this.niente ? HAIRPIN_NIENTE_RADIUS : 0;
		const run = Math.abs(mouthX - pointX);
		const circleX = pointX + (mouthX > pointX ? radius : -radius);
		const armY = (y: number) => mid + (y - mid) * (run ? radius / run : 0);
		ctx.save();
		if (this.lineWidth !== null) {
			ctx.setLineWidth(this.lineWidth);
		}
		if (this.dash) {
			ctx.setLineDash(this.dash);
		}
		ctx.beginPath();
		ctx.moveTo(mouthX, top);
		ctx.lineTo(circleX, armY(top));
		if (radius) {
			ctx.moveTo(circleX, armY(bottom));
		}
		ctx.lineTo(mouthX, bottom);
		ctx.stroke();
		ctx.restore();
		if (radius) {
			ctx.save();
			if (this.lineWidth !== null) {
				ctx.setLineWidth(this.lineWidth);
			}
			ctx.beginPath();
			ctx.arc(circleX, mid, radius, 0, Math.PI * 2, false);
			ctx.stroke();
			ctx.restore();
		}
	}
}
