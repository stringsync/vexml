import type { RenderContext, TabSlide } from 'vexflow';

/* The height of the band vexflow's TabNote clears around a fret digit to punch a hole in the
 * string line it sits on (tabnote.ts drawPositions clears y-3 by 6). TabSlideLine reuses it to
 * erase the stretch of line a slide runs along. */
const TAB_LINE_CLEAR_HEIGHT = 6;

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
