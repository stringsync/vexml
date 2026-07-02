import { HALO_MARGIN } from '../constants';
import type { Layer, LayerHost, LayerKind } from '../host/stage';
import type { Decoratable, Decoration } from './element';

/*
 * The varying half of a decoration kind: which overlay it paints on and how one target is
 * stamped. The store/repaint machinery lives in DefaultDecoration, written once — a new kind of
 * decoration is a new style, not a new store.
 */
export interface DecorationStyle {
	readonly placement: LayerKind;
	draw(ctx: CanvasRenderingContext2D, target: Decoratable, color: string): void;
}

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
}

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
		const rect = target.rect;
		const radius = Math.max(rect.w, rect.h) / 2 + HALO_MARGIN;
		ctx.save();
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(rect.x + rect.w / 2, rect.y + rect.h / 2, radius, 0, 2 * Math.PI);
		ctx.fill();
		ctx.restore();
	}
}

/*
 * The production Decoration: an active set (which elements are decorated, in what color) painted
 * onto one score-space overlay layer in the style's placement.
 *
 * Every change repaints the whole layer from the active set rather than erasing one rect. That's
 * the answer to "how does off() work without disturbing neighbors": clearing one decoration's box
 * could wipe part of an overlapping one, so instead the lot is cleared and redrawn. The layer is
 * created lazily on the first decoration, so an undecorated score never allocates an overlay.
 */
export class DefaultDecoration implements Decoration {
	private readonly active = new Map<Decoratable, string>();
	private layer: Layer | null = null;

	constructor(
		private readonly host: LayerHost,
		private readonly style: DecorationStyle,
	) {}

	set(target: Decoratable, color: string | null): void {
		if (color === null) {
			this.active.delete(target);
		} else {
			this.active.set(target, color);
		}
		this.repaint();
	}

	has(target: Decoratable): boolean {
		return this.active.has(target);
	}

	dispose(): void {
		this.layer?.dispose();
		this.layer = null;
		this.active.clear();
	}

	private repaint(): void {
		if (this.active.size === 0) {
			if (this.layer) {
				this.clear(this.layer.ctx);
			}
			return;
		}
		this.layer ??= this.host.createLayer(this.style.placement);
		const ctx = this.layer.ctx;
		this.clear(ctx);
		for (const [target, color] of this.active) {
			this.style.draw(ctx, target, color);
		}
	}

	// Clear the whole bitmap regardless of the dpr transform the layer applied.
	private clear(ctx: CanvasRenderingContext2D): void {
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.restore();
	}
}
