import type { NoteGlyph } from '../../engraving/score-drawer';
import type { Rect } from '../../geometry';
import type { Decoratable } from './decoration';

export const HALO = 'fill:arc:rgba(41, 98, 255, 0.35)';
export const GLYPH: NoteGlyph = {
	text: 'q',
	font: '30px Bravura',
	x: 12,
	y: 20,
};

// A fake target standing in for a real Note/Measure: drawColor stamps the glyph (a notehead) in
// the color, or falls back to a filled ellipse over the box when there's none — mirroring the
// production elements, which own their own color stamping (see Decoratable.drawColor).
export const decoratable = (
	rect: Rect,
	glyph: NoteGlyph | null = null,
): Decoratable => ({
	rect,
	getBoundingClientRect: () => ({}) as DOMRect,
	drawColor(ctx: CanvasRenderingContext2D, color: string): void {
		ctx.fillStyle = color;
		if (glyph) {
			ctx.font = glyph.font;
			ctx.fillText(glyph.text, glyph.x, glyph.y);
		} else {
			ctx.beginPath();
			ctx.ellipse(
				rect.x + rect.w / 2,
				rect.y + rect.h / 2,
				rect.w / 2,
				rect.h / 2,
				0,
				0,
				2 * Math.PI,
			);
			ctx.fill();
		}
	},
});

// The marks (fills/texts) recorded since the last clear — i.e., the result of the latest repaint.
export function marksSinceLastClear(ops: string[]): string[] {
	return ops.slice(ops.lastIndexOf('clear') + 1).filter((o) => o !== 'clear');
}
