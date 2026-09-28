import type { Resource } from 'webappwiz/disposable';
import type { Rect } from 'webappwiz/geometry';

/* A solid box over the score, placed in score space. Unlike a Layer it owns no bitmap: moving it
 * is a compositor-only transform, so something that moves every animation frame (the playhead)
 * costs the same on a long score as on a short one. WebKit on iOS keeps only a small budget of
 * canvas area GPU-backed, and a score-sized canvas repainted per frame falls off it. */
export interface Marker extends Resource {
	/* Show the box at `rect` (score px) in `color`. */
	show(rect: Rect, color: string): void;
	hide(): void;
}

/* The seam for making markers: Stage satisfies it; a unit test injects a fake. */
export interface MarkerHost {
	createMarker(): Marker;
}
