import type { Resource } from 'webappwiz/disposable';

/** Where a marker's box sits, in score px. A `Rect` is one; so is any plain `{ x, y, w, h }`. */
export interface MarkerRect {
	x: number;
	y: number;
	w: number;
	h: number;
}

/** How a marker's box is drawn beyond its rect and color. */
export interface MarkerOptions {
	/** Corner radius in score px; `w / 2` on a square draws a circle. Defaults to 0 (square). */
	radius?: number;
}

/* A solid box over the score, placed in score space. Unlike a Layer it owns no bitmap: moving it
 * is a compositor-only transform, so something that moves every animation frame (the playhead)
 * costs the same on a long score as on a short one. WebKit on iOS keeps only a small budget of
 * canvas area GPU-backed, and a score-sized canvas repainted per frame falls off it. */
export interface Marker extends Resource {
	/* Show the box at `rect` (score px) in `color`, which may carry alpha. */
	show(rect: MarkerRect, color: string, options?: MarkerOptions): void;
	hide(): void;
}

/* The seam for making markers: Stage satisfies it; a unit test injects a fake. zIndex orders the
 * marker against the base canvas the way a layer's does (negative sits behind the engraving). */
export interface MarkerHost {
	createMarker(zIndex?: number): Marker;
}
