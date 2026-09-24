import type { Resource } from 'webappwiz/disposable';
import type { Eventful } from 'webappwiz/events';
import type { LayerHost } from './layer-host';
import type { Scroller } from './scroller';
import type { Viewport } from './viewport';

/* What the host raises. `resize` fires whenever the container, the base canvas, or a caller's
 * scrollContainer changes size, and carries the scrolling element's visible (client) box — see Stage
 * for why each is watched and why that box is what gets reported. `scroll` fires on any scroll that slides the score within
 * the viewport — the container's own, or any ancestor's. It's payload-free: read `scroll` or
 * `viewportRect()` for where things ended up. */
export type HostEventMap = {
	resize: { width: number; height: number };
	scroll: undefined;
};

/*
 * What a Score needs from its host: the score<-client transform (toScoreSpace), a raw event
 * source to bind pointer/scroll listeners on, the current scroll offset, resize/scroll notifications,
 * custom-layer creation/resizing, and teardown. Stage is the production implementer; a Score unit
 * test injects a FakeHost. Kept separate from Viewport (the targets' coordinate seam) so each
 * consumer depends only on what it uses, even though Stage satisfies both.
 */
export interface Host
	extends LayerHost,
		Viewport,
		Eventful<HostEventMap>,
		Resource {
	/* The raw DOM event source pointer/scroll listeners are bound on — distinct from `events`,
	 * which is the host's own typed event stream. */
	readonly dom: EventTarget;
	/* Where the native `scroll` event fires: the element that scrolls the score (the container, or
	 * the caller's scrollContainer). Scroll events don't bubble, so they can't be bound on `dom`. */
	readonly scrollTarget: EventTarget;
	readonly scroll: { left: number; top: number };
	/* The visible scrollport box in client coords — what a cursor's visibility check compares against. */
	viewportRect(): DOMRect;
	/* Scrolls a score-space rect into view (axis-aware); a cursor's follow()/scrollIntoView() use it. */
	readonly scroller: Scroller;
	/* Re-sync every layer to the container's current geometry (called on resize). Viewport layers
	 * are refit to the visible box (clearing them); content layers keep their score-resolution bitmap
	 * (no clear) but re-track the base canvas's rendered box, so they stay aligned however the
	 * caller's CSS has scaled the score. */
	relayoutLayers(): void;
	/* Change the container's vertical cap live (px, or null to remove it). */
	setMaxHeight(px: number | null): void;
}
