import type { RenderContext, Stave, StaveNote } from 'vexflow';
import { Rect } from 'webappwiz/geometry';
import { HAIRPIN_HEIGHT, HAIRPIN_STAVE_GAP } from './constants';

/*
 * A crescendo/diminuendo hairpin between two notes, drawn at a fixed gap from the staff on
 * the side its <wedge> placement names. vexflow's own StaveHairpin derives its y from the
 * stave box and a pair of hardcoded 20/30px constants that, for an ABOVE hairpin, land the
 * wedge inside the staff — the offset needed to correct it is more code (and more coupling
 * to those constants) than the three lines the shape actually is. Drawn via
 * setContext().draw() like the other spanners.
 */
export class Hairpin {
	private context?: RenderContext;
	constructor(
		private readonly from: StaveNote,
		private readonly to: StaveNote,
		private readonly crescendo: boolean,
		private readonly placement: 'above' | 'below',
	) {}
	/*
	 * Extra distance from the staff, set by the caller when the fixed gap would put the wedge
	 * through something already drawn there (a slur bowing the same way). Signed in the
	 * direction the hairpin sits: positive is further from the staff.
	 */
	private offset = 0;
	setContext(context: RenderContext): this {
		this.context = context;
		return this;
	}
	setOffset(offset: number): this {
		this.offset = offset;
		return this;
	}
	get stave(): Stave {
		return this.from.checkStave();
	}
	get above(): boolean {
		return this.placement === 'above';
	}
	/** The band the wedge occupies, for the caller's page crop and clearance check. */
	get bounds(): { top: number; bottom: number } {
		const stave = this.stave;
		const top =
			this.placement === 'above'
				? stave.getYForLine(0) -
					HAIRPIN_STAVE_GAP -
					HAIRPIN_HEIGHT -
					this.offset
				: stave.getBottomLineY() + HAIRPIN_STAVE_GAP + this.offset;
		return { top, bottom: top + HAIRPIN_HEIGHT };
	}
	/** The box the wedge is drawn in — the band above, over the notes it spans. */
	get rect(): Rect {
		const { top, bottom } = this.bounds;
		const x1 = this.from.getAbsoluteX();
		const x2 = this.to.getAbsoluteX();
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
		const x1 = this.from.getAbsoluteX();
		const x2 = this.to.getAbsoluteX();
		const [pointX, mouthX] = this.crescendo ? [x1, x2] : [x2, x1];
		ctx.beginPath();
		ctx.moveTo(mouthX, top);
		ctx.lineTo(pointX, mid);
		ctx.lineTo(mouthX, bottom);
		ctx.stroke();
	}
}
