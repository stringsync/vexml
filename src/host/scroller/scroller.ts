import type { Rect } from '../../geometry';

/* How a rect is brought into view. `behavior` matches the DOM's: 'smooth' tweens, 'instant'
 * jumps, 'auto' leaves it to the scroller (vexml's tweens it). */
export interface ScrollerOptions {
	behavior?: ScrollBehavior;
}

/* Scrolls a score-space rect into the viewport. vexml's Stage provides one (Score.scroller); a caller
 * may pass their own to follow(). */
export interface Scroller {
	scrollIntoView(rect: Rect, opts?: ScrollerOptions): void;
}
