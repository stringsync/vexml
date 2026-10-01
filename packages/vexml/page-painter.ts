import type { Rect } from 'webappwiz/geometry';

/* What a Page draws itself with: the engraving, replayed from its recording into any context, the
 * paper it goes on, and the resolution it prints at. The Stage implements it; tests use a fake. */
export interface PagePainter {
	/* Device px per CSS px a page is drawn at. */
	readonly pixelRatio: number;
	/* The paper behind the score. */
	paperColor(): string;
	/* Paint the engraving over a score-space `region` into a context already mapped to score space,
	 * at `scale` device px per CSS px. Throws once the score is disposed. */
	paintEngraving(
		ctx: CanvasRenderingContext2D,
		region: Rect,
		scale: number,
	): void;
}
