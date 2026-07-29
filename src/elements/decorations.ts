import { HALO_MARGIN } from '../constants';
import { Rect } from '../geometry';
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
	/* The score-space region draw() can touch for this target, padding included — the region a
	 * repaint clears and clips to when this target changes. */
	bounds(target: Decoratable): Rect;
}

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

/*
 * The production Decoration: an active set (which elements are decorated, in what color) painted
 * onto one score-space overlay layer in the style's placement.
 *
 * A change repaints only the changed target's bounds, not the whole layer. The layer spans the
 * entire engraved score, so a full-bitmap clear per toggle is O(score area) — ~100ms on a long
 * multi-part score, which made hover halos visibly lag. Overlapping neighbors still survive an
 * off(): every active decoration intersecting the cleared region is redrawn into it, clipped to
 * the region so nothing outside it is double-painted. The layer is created lazily on the first
 * decoration, so an undecorated score never allocates an overlay.
 */
export class DefaultDecoration implements Decoration {
	private readonly active = new Map<Decoratable, string>();
	private layer: Layer | null = null;

	constructor(
		private readonly host: LayerHost,
		private readonly style: DecorationStyle,
	) {}

	set(target: Decoratable, color: string | null): void {
		// No-op sets (same color again, or off() while already off) skip the repaint.
		if ((this.active.get(target) ?? null) === color) {
			return;
		}
		if (color === null) {
			this.active.delete(target);
		} else {
			this.active.set(target, color);
		}
		this.repaint(this.style.bounds(target));
	}

	has(target: Decoratable): boolean {
		return this.active.has(target);
	}

	dispose(): void {
		this.layer?.dispose();
		this.layer = null;
		this.active.clear();
	}

	// Clear the dirty region and redraw the active decorations that intersect it, clipped to it.
	// The region is snapped outward to whole CSS px so the clear and the clip cut on full pixels
	// (a fractional edge would leave antialiasing seams where a neighbor crosses the boundary).
	private repaint(dirty: Rect): void {
		this.layer ??= this.host.createLayer(this.style.placement);
		const ctx = this.layer.ctx;
		const x = Math.floor(dirty.x) - 1;
		const y = Math.floor(dirty.y) - 1;
		const w = Math.ceil(dirty.right) + 1 - x;
		const h = Math.ceil(dirty.bottom) + 1 - y;
		const region = new Rect(x, y, w, h);
		ctx.save();
		ctx.beginPath();
		ctx.rect(x, y, w, h);
		ctx.clip();
		ctx.clearRect(x, y, w, h);
		for (const [target, color] of this.active) {
			if (this.style.bounds(target).intersects(region)) {
				this.style.draw(ctx, target, color);
			}
		}
		ctx.restore();
	}
}
