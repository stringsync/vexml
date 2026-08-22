import {
	Modifier,
	type RenderContext,
	type StaveNote,
	type TabNote,
} from 'vexflow';
import {
	SINGLE_SLIDE_LEN,
	SINGLE_SLIDE_RISE,
	SLIDE_PADDING,
} from './constants';

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
		private readonly extraPad: number,
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
