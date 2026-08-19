import { Rect } from 'webappwiz/geometry';
import { HALO_MARGIN } from './constants';
import type { Decoratable } from './decoration';
import type { DecorationStyle } from './decoration-style';

/* A circle centered on the element's box, a fixed margin larger than its half-extent, so it
 * encircles the note evenly regardless of the notehead's width. Painted on a `background` layer
 * behind the base canvas, so it glows through the score's transparent pixels, under the notes. */
export class HaloStyle implements DecorationStyle {
	readonly placement = 'background';

	draw(
		ctx: CanvasRenderingContext2D,
		target: Decoratable,
		color: string,
	): void {
		// The circle inscribed in bounds() — one source of truth for where the halo lands.
		const b = this.bounds(target);
		const radius = b.w / 2;
		ctx.save();
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(b.x + radius, b.y + radius, radius, 0, 2 * Math.PI);
		ctx.fill();
		ctx.restore();
	}

	bounds(target: Decoratable): Rect {
		const r = target.rect;
		const radius = Math.max(r.w, r.h) / 2 + HALO_MARGIN;
		return new Rect(
			r.x + r.w / 2 - radius,
			r.y + r.h / 2 - radius,
			2 * radius,
			2 * radius,
		);
	}
}
