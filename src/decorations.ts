import { HALO_MARGIN } from './constants';
import type { Rect } from './geometry';
import type { Layer, LayerHost } from './stage';
import type { Decoratable, Decorator } from './targets';

/*
 * The decoration store and painter — the production `Decorator`. A target's color/halo toggles
 * delegate here. Decorations are retained as active sets (which targets are colored/haloed) and
 * drawn on two score-space overlay layers: colors on a `content` layer over the engraving (they
 * recolor the notehead, so they sit on top), halos on a `background` layer behind the base canvas
 * (so they glow through the score's transparent pixels, under the notes).
 *
 * Every change repaints a whole layer from its active set rather than erasing one rect. That's the
 * answer to "how does off() work without disturbing neighbors": clearing one decoration's box could
 * wipe part of an overlapping one, so instead the lot is cleared and redrawn. Each layer is created
 * lazily on its first decoration, so an undecorated score never allocates an overlay.
 */
export class Decorations implements Decorator {
	private readonly colors = new Map<Decoratable, string>();
	private readonly halos = new Map<Decoratable, string>();
	private colorLayer: Layer | null = null;
	private haloLayer: Layer | null = null;

	constructor(private readonly host: LayerHost) {}

	setColor(target: Decoratable, color: string | null): void {
		if (color === null) {
			this.colors.delete(target);
		} else {
			this.colors.set(target, color);
		}
		this.repaintColors();
	}

	setHalo(target: Decoratable, color: string | null): void {
		if (color === null) {
			this.halos.delete(target);
		} else {
			this.halos.set(target, color);
		}
		this.repaintHalos();
	}

	isColored(target: Decoratable): boolean {
		return this.colors.has(target);
	}

	isHaloed(target: Decoratable): boolean {
		return this.halos.has(target);
	}

	dispose(): void {
		this.colorLayer?.dispose();
		this.haloLayer?.dispose();
		this.colorLayer = null;
		this.haloLayer = null;
		this.colors.clear();
		this.halos.clear();
	}

	private repaintColors(): void {
		if (this.colors.size === 0) {
			if (this.colorLayer) {
				this.clear(this.colorLayer.ctx);
			}
			return;
		}
		this.colorLayer ??= this.host.createLayer('content');
		const ctx = this.colorLayer.ctx;
		this.clear(ctx);
		for (const [target, color] of this.colors) {
			// The target knows what to stamp (a notehead glyph, a fret number, a box); we just
			// hand it the overlay and the color. See Decoratable.drawColor.
			target.drawColor(ctx, color);
		}
	}

	private repaintHalos(): void {
		if (this.halos.size === 0) {
			if (this.haloLayer) {
				this.clear(this.haloLayer.ctx);
			}
			return;
		}
		this.haloLayer ??= this.host.createLayer('background');
		const ctx = this.haloLayer.ctx;
		this.clear(ctx);
		for (const [target, color] of this.halos) {
			this.drawHalo(ctx, target.rect, color);
		}
	}

	// Clear the whole bitmap regardless of the dpr transform the layer applied.
	private clear(ctx: CanvasRenderingContext2D): void {
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.restore();
	}

	private drawHalo(
		ctx: CanvasRenderingContext2D,
		rect: Rect,
		color: string,
	): void {
		// A circle centered on the notehead box, a fixed margin larger than its half-extent, so it
		// encircles the note evenly regardless of the notehead's width.
		const radius = Math.max(rect.w, rect.h) / 2 + HALO_MARGIN;
		ctx.save();
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(rect.x + rect.w / 2, rect.y + rect.h / 2, radius, 0, 2 * Math.PI);
		ctx.fill();
		ctx.restore();
	}
}
