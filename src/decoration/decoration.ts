import type { Rect } from '../geometry';

/* Something with a known box. `rect` is in score space; getBoundingClientRect() maps it to the
 * page through the live scroll/zoom transform (mirrors DOM Element.getBoundingClientRect). */
export interface Bounded {
	readonly rect: Rect;
	getBoundingClientRect(): DOMRect;
}

/* What a decoration paints. HaloStyle draws from the element's box alone, but the color is the
 * element's own job: only it knows what it is — a notehead glyph (Note), a fret number
 * (TabPosition), or a plain box (the filled-ellipse fallback). So ColorStyle hands over the
 * overlay ctx and the chosen color and the element stamps itself recolored. */
export interface Decoratable extends Bounded {
	drawColor(ctx: CanvasRenderingContext2D, color: string): void;
}

/*
 * One decoration kind's store — the seam an element's toggle delegates to, so the drawing surface
 * stays out of the model. Production: DefaultDecoration (paints its overlay layer from the active
 * set). Tests: FakeDecoration, which records state.
 */
export interface Decoration {
	set(target: Decoratable, color: string | null): void;
	has(target: Decoratable): boolean;
}

/* The decoration stores an element wires its toggles to, one per kind. */
export interface Decorations {
	readonly color: Decoration;
	readonly halo: Decoration;
}
