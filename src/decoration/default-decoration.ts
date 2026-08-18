import type { DecorationStyle } from '../decoration-style/decoration-style';
import { Rect } from '../geometry';
import type { Layer } from '../layer/layer';
import type { LayerHost } from '../layer-host/layer-host';
import type { Decoratable, Decoration } from './decoration';

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
