import type { GlyphOutline } from './glyph-outline';

/* One glyph of a TextOutline: its path in font units, y up, and where it sits from the pen. */
export interface PlacedGlyph {
	readonly glyph: GlyphOutline;
	// From the pen, in px.
	readonly x: number;
	readonly y: number;
	// Px per font unit.
	readonly scale: number;
	// The slant of an italic the browser synthesizes (0 for none).
	readonly skew: number;
}

/*
 * A text as filled glyph outlines rather than through its font: what a snapshot from
 * createSnapshot draws its text with, so it paints before the font has loaded and looks the same
 * however it is painted.
 */
export class TextOutline {
	constructor(private readonly glyphs: readonly PlacedGlyph[]) {}

	/* Add it to the context's current path with its pen at (x, y), for a caller to fill or
	 * stroke: a decoration restamping a note in color. */
	trace(ctx: CanvasRenderingContext2D, x: number, y: number): void {
		for (const { glyph, x: gx, y: gy, scale, skew } of this.glyphs) {
			// A transform changes how later points map, not the path traced so far.
			ctx.save();
			ctx.transform(scale, 0, skew * scale, -scale, x + gx, y + gy);
			glyph.trace(ctx);
			ctx.restore();
		}
	}

	/* Fill it with its pen at (x, y), in the context's current fill style and transform. */
	fill(ctx: CanvasRenderingContext2D, x: number, y: number): void {
		for (const { glyph, x: gx, y: gy, scale, skew } of this.glyphs) {
			ctx.save();
			ctx.transform(scale, 0, skew * scale, -scale, x + gx, y + gy);
			ctx.fill(glyph.path());
			ctx.restore();
		}
	}
}
