import { Modifier, type RenderContext, type StaveNote } from 'vexflow';
import { SLIDE_MIN_SLANT, SLIDE_PADDING } from './constants';

/*
 * A standard-notation slide/glissando line, tilted by the slide direction: it runs from just
 * clear of the start notehead into the target notehead, rising for an up-slide and falling for
 * a down-slide. The tilt is
 * floored at SLIDE_MIN_SLANT so a near-unison slide still reads instead of going flat (and a
 * chord's near-equal slides stay ~parallel like the tab), and capped to the horizontal run so
 * a wide interval over a short grace-to-main gap doesn't spike near-vertical. (vexflow's
 * StaveLine can't do either — it just connects the heads flatly.) Drawn like the other
 * spanners via setContext().draw().
 */
export class NotationSlide {
	private context?: RenderContext;
	constructor(
		private readonly from: StaveNote,
		private readonly fromIndex: number,
		private readonly to: StaveNote,
		private readonly toIndex: number,
	) {}
	setContext(context: RenderContext): this {
		this.context = context;
		return this;
	}
	draw(): void {
		const ctx = this.context;
		if (!ctx) {
			return;
		}
		// getModifierStartXY(...).y is each note's notehead Y (ys[index]). Start the line clear
		// of the start notehead's outer edge plus a gap (its center plus half its glyph width
		// plus 2*SLIDE_PADDING — the extra clears its stem so the line doesn't look like it grows
		// out of the note), and end it just into the target notehead (its center minus
		// SLIDE_PADDING) so the slide reads as running into the note. The start note is always
		// left of the target, so x1 < x2 holds.
		const startY = this.from.getModifierStartXY(
			Modifier.Position.RIGHT,
			this.fromIndex,
		).y;
		const endY = this.to.getModifierStartXY(
			Modifier.Position.LEFT,
			this.toIndex,
		).y;
		const x1 =
			this.from.getAbsoluteX() +
			this.from.getGlyphWidth() / 2 +
			2 * SLIDE_PADDING;
		const x2 = this.to.getAbsoluteX() - SLIDE_PADDING;
		const width = Math.max(x2 - x1, 1);
		// Rise from the start head to the target head; the target lower (larger y) is a
		// down-slide. Floor the tilt so a near-unison slide still reads, but cap it to the
		// horizontal width so a wide interval over a short grace-to-main run doesn't spike
		// near-vertical. A true unison defaults to a down tilt.
		const rise = endY - startY;
		const sign = rise < 0 ? -1 : 1;
		const dy =
			sign * Math.min(Math.max(Math.abs(rise), SLIDE_MIN_SLANT), width);
		ctx.beginPath();
		ctx.moveTo(x1, startY);
		ctx.lineTo(x2, startY + dy);
		ctx.stroke();
	}
}
