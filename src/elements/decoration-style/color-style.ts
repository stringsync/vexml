import { Rect } from '../../geometry';
import type { Decoratable } from '../decoration/decoration';
import type { DecorationStyle } from './decoration-style';

/* How far a color stamp may reach past its target's rect: the glyph is replayed to overlay the
 * engraved head/fret, whose box tracks it within a couple px, plus antialiasing. */
const COLOR_PAD = 4;

/* Recolors the element itself, on a `content` layer over the engraving (it recolors the notehead,
 * so it sits on top). Only the element knows what it is — a notehead glyph, a fret number, a
 * plain box — so the stamping delegates to Decoratable.drawColor. */
export class ColorStyle implements DecorationStyle {
	readonly placement = 'content';

	draw(
		ctx: CanvasRenderingContext2D,
		target: Decoratable,
		color: string,
	): void {
		target.drawColor(ctx, color);
	}

	bounds(target: Decoratable): Rect {
		const r = target.rect;
		return new Rect(
			r.x - COLOR_PAD,
			r.y - COLOR_PAD,
			r.w + 2 * COLOR_PAD,
			r.h + 2 * COLOR_PAD,
		);
	}
}
