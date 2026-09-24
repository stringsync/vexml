import type { Rect } from 'webappwiz/geometry';

/* How a rect is brought into view. `behavior` matches the DOM's: 'smooth' tweens, 'instant'
 * jumps, 'auto' leaves it to the scroller (vexml's tweens it). `block` picks the vertical landing
 * of an offscreen rect, like the DOM's: 'nearest' (default) pages it back in at the edge it left
 * by, 'start' puts its top at the view's top from either side. A visible rect never scrolls. */
export interface ScrollerOptions {
	behavior?: ScrollBehavior;
	block?: 'nearest' | 'start';
}

/* Scrolls a score-space rect into the viewport. vexml's Stage provides one (Score.scroller); a caller
 * may pass their own to follow(). */
export interface Scroller {
	scrollIntoView(rect: Rect, opts?: ScrollerOptions): void;
}
