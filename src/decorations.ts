import type { Rect } from './geometry';
import type { Layer, LayerHost } from './stage';
import type { Decoratable, Decorator } from './targets';

// A soft round highlight drawn behind a note to denote activity. Fixed (the halo toggle takes no
// argument); the color toggle is what carries a caller-chosen color. HALO_MARGIN is how far the
// circle extends past the notehead's half-extent, so the note sits evenly inside it.
const HALO_COLOR = 'rgba(41, 98, 255, 0.35)';
const HALO_MARGIN = 4;

/*
 * The decoration store and painter — the production `Decorator`. A target's color/halo toggles
 * delegate here. Decorations are retained as an active set (which targets are colored/haloed) and
 * drawn on a single `content` overlay layer that sits in score space over the engraving.
 *
 * Every change repaints the whole layer from the active set rather than erasing one rect. That's
 * the answer to "how does off() work without disturbing neighbors": clearing one decoration's box
 * could wipe part of an overlapping one, so instead the lot is cleared and redrawn — halos first
 * (under), colors on top. The layer is created lazily on the first decoration, so an undecorated
 * score never allocates an overlay.
 */
export class Decorations implements Decorator {
	private readonly colors = new Map<Decoratable, string>();
	private readonly halos = new Set<Decoratable>();
	private layer: Layer | null = null;

	constructor(private readonly host: LayerHost) {}

	setColor(target: Decoratable, color: string | null): void {
		if (color === null) {
			this.colors.delete(target);
		} else {
			this.colors.set(target, color);
		}
		this.repaint();
	}

	setHalo(target: Decoratable, on: boolean): void {
		if (on) {
			this.halos.add(target);
		} else {
			this.halos.delete(target);
		}
		this.repaint();
	}

	isColored(target: Decoratable): boolean {
		return this.colors.has(target);
	}

	isHaloed(target: Decoratable): boolean {
		return this.halos.has(target);
	}

	dispose(): void {
		this.layer?.dispose();
		this.layer = null;
		this.colors.clear();
		this.halos.clear();
	}

	// Repaint from the retained active set: clear, then halos (under) then colors (over).
	private repaint(): void {
		if (this.colors.size === 0 && this.halos.size === 0) {
			// Nothing active: clear an existing layer, but don't allocate one just to clear it.
			if (this.layer) {
				this.clear(this.layer.ctx);
			}
			return;
		}
		const ctx = this.ensureLayer().ctx;
		this.clear(ctx);
		for (const target of this.halos) {
			this.drawHalo(ctx, target.rect);
		}
		for (const [target, color] of this.colors) {
			this.drawColor(ctx, target, color);
		}
	}

	private ensureLayer(): Layer {
		if (!this.layer) {
			this.layer = this.host.createLayer('content');
		}
		return this.layer;
	}

	// Clear the whole bitmap regardless of the dpr transform the layer applied.
	private clear(ctx: CanvasRenderingContext2D): void {
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.restore();
	}

	// Recolor the note: replay vexflow's own notehead render (same glyph text, font, and baseline)
	// in the chosen color, so the actual notehead is recolored and hollow heads stay hollow. A
	// glyph-less target (a rest, or a non-note) falls back to a filled ellipse over its box.
	private drawColor(
		ctx: CanvasRenderingContext2D,
		target: Decoratable,
		color: string,
	): void {
		ctx.save();
		ctx.fillStyle = color;
		const glyph = target.glyph;
		if (glyph) {
			ctx.font = glyph.font;
			ctx.textAlign = 'left';
			ctx.textBaseline = 'alphabetic';
			ctx.fillText(glyph.text, glyph.x, glyph.y);
		} else {
			const r = target.rect;
			ctx.beginPath();
			ctx.ellipse(
				r.x + r.w / 2,
				r.y + r.h / 2,
				r.w / 2,
				r.h / 2,
				0,
				0,
				2 * Math.PI,
			);
			ctx.fill();
		}
		ctx.restore();
	}

	private drawHalo(ctx: CanvasRenderingContext2D, rect: Rect): void {
		// A circle centered on the notehead box, a fixed margin larger than its half-extent, so it
		// encircles the note evenly regardless of the notehead's width.
		const radius = Math.max(rect.w, rect.h) / 2 + HALO_MARGIN;
		ctx.save();
		ctx.fillStyle = HALO_COLOR;
		ctx.beginPath();
		ctx.arc(rect.x + rect.w / 2, rect.y + rect.h / 2, radius, 0, 2 * Math.PI);
		ctx.fill();
		ctx.restore();
	}
}
