import {
	Modifier,
	type RenderContext,
	type StaveNote,
	type TabNote,
	TabSlide,
} from 'vexflow';
import {
	SINGLE_SLIDE_LEN,
	SINGLE_SLIDE_RISE,
	SLIDE_MIN_SLANT,
	SLIDE_PADDING,
} from './constants';

/* The height of the band vexflow's TabNote clears around a fret digit to punch a hole in the
 * string line it sits on (tabnote.ts drawPositions clears y-3 by 6). TabSlideLine reuses it to
 * erase the stretch of line a slide runs along. */
const TAB_LINE_CLEAR_HEIGHT = 6;

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

/*
 * A slide into or out of a single note, where the other end is indeterminate (an unpaired
 * <slide>/<glissando> — a stop with no start, or a start with no stop). There's no partner
 * notehead, so it draws a short "/" tick beside the head instead of a line between two: a
 * slide-in ('in') sits just left of the head and rises up into it; a slide-out ('out') sits
 * just right and rises up out of it. Works for both a StaveNote (notation) and a TabNote (tab)
 * — both expose getAbsoluteX/getGlyphWidth/getModifierStartXY. Drawn via setContext().draw()
 * like the other spanners. (vexflow's TabSlide/StaveTie render a partial only by running the
 * line to the stave edge, which is right for a system-break wrap but not a mid-measure gesture.)
 */
export class SingleSlide {
	private context?: RenderContext;
	constructor(
		private readonly note: StaveNote | TabNote,
		private readonly index: number,
		private readonly kind: 'in' | 'out',
		// Extra gap between the note glyph and the near (head-touching) end of the tick, on top
		// of SLIDE_PADDING. The default padding hugs a notehead well, but a bare tab fret digit
		// wants more air, so callers widen it per case.
		private readonly extraPad = 0,
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
		const side =
			this.kind === 'in' ? Modifier.Position.LEFT : Modifier.Position.RIGHT;
		const y = this.note.getModifierStartXY(side, this.index).y;
		const half = this.note.getGlyphWidth() / 2;
		const pad = SLIDE_PADDING + this.extraPad;
		// The end touching the notehead sits at its Y; the far end drops SINGLE_SLIDE_RISE so the
		// tick always leans up-right ("/"), like the tab "/8" slide-in in the reference image. A
		// slide-in tucks just left of the head (running up into it); a slide-out just right.
		const near = this.note.getAbsoluteX();
		const [x1, y1, x2, y2] =
			this.kind === 'in'
				? [
						near - half - pad - SINGLE_SLIDE_LEN,
						y + SINGLE_SLIDE_RISE,
						near - half - pad,
						y,
					]
				: [
						near + half + pad,
						y,
						near + half + pad + SINGLE_SLIDE_LEN,
						y - SINGLE_SLIDE_RISE,
					];
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
	}
}

/*
 * vexflow's TabSlide strokes its two-point line with a closePath() in between (tabslide.ts
 * renderTie), which walks the segment back to where it started — so the rasterizer strokes it
 * twice and the two antialiased passes composite into a line that reads fat and blurry next to
 * the pixel-crisp string lines. Same geometry, stroked once.
 */
export class CrispTabSlide extends TabSlide {
	override renderTie(params: {
		direction: number;
		firstX: number;
		lastX: number;
		firstYs: number[];
		lastYs: number[];
	}): void {
		const ctx = this.checkContext();
		for (const index of this.getNotes().firstIndexes ?? []) {
			const y = params.firstYs[index];
			if (typeof y !== 'number' || Number.isNaN(y)) {
				continue;
			}
			// vexflow's geometry: the line pivots on the first note's string y (plus the
			// half-pixel renderOptions.yShift its constructor sets), rising 3px on each side of
			// it for a slide up and falling for a slide down.
			const slideY = y + this.renderOptions.yShift;
			ctx.beginPath();
			ctx.moveTo(params.firstX, slideY + 3 * params.direction);
			ctx.lineTo(params.lastX, slideY - 3 * params.direction);
			ctx.stroke();
		}
		this.setRendered();
	}
}

/*
 * A tab slide, plus the erasure of the string line it runs along. vexflow draws a TabStave's
 * string lines edge to edge and the slide's diagonal on top of them, so the two frets end up
 * joined by a straight line *and* a slanted one, which reads as two gestures instead of one.
 * Clearing the line between the frets first — the same trick TabNote uses to punch a hole for
 * its fret digit — leaves just the slide. Tab only: a notation glissando runs through the gaps
 * between staff lines, not along one, so it has nothing to erase.
 */
export class TabSlideLine {
	private context?: RenderContext;
	constructor(private readonly slide: TabSlide) {}
	setContext(context: RenderContext): this {
		this.context = context;
		this.slide.setContext(context);
		return this;
	}
	draw(): void {
		const ctx = this.context;
		if (!ctx) {
			return;
		}
		const x = this.slide.getFirstX();
		const width = this.slide.getLastX() - x;
		const ys = this.slide.getFirstYs();
		// vexflow slants the slide around the *first* note's string y (tabslide.ts renderTie
		// ignores lastYs), so that line is the only one it can double up on. A non-positive
		// width means the two ends aren't on the same system — nothing sensible to erase.
		if (width > 0) {
			for (const index of this.slide.getNotes().firstIndexes ?? []) {
				const y = ys[index];
				if (typeof y === 'number') {
					ctx.clearRect(
						x,
						y - TAB_LINE_CLEAR_HEIGHT / 2,
						width,
						TAB_LINE_CLEAR_HEIGHT,
					);
				}
			}
		}
		this.slide.draw();
	}
}
