import type { LayerHost } from '../layer-host/layer-host';
import type { Scroller } from '../scroller/scroller';
import type { Viewport } from '../viewport/viewport';

/*
 * What a Score needs from its host: the score<-client transform (toScoreSpace), a raw event
 * source to bind pointer/scroll listeners on, the current scroll offset, a resize subscription,
 * custom-layer creation/resizing, and teardown. Stage is the production implementer; a Score unit
 * test injects a FakeHost. Kept separate from Viewport (the targets' coordinate seam) so each
 * consumer depends only on what it uses, even though Stage satisfies both.
 */
export interface Host extends LayerHost, Viewport {
	readonly events: EventTarget;
	readonly scroll: { left: number; top: number };
	/* The visible scrollport box in client coords — what a cursor's visibility check compares against. */
	viewportRect(): DOMRect;
	/* Scrolls a score-space rect into view (axis-aware); a cursor's follow()/scrollIntoView() use it. */
	readonly scroller: Scroller;
	observeResize(
		onResize: (size: { width: number; height: number }) => void,
	): () => void;
	/* Subscribe to any scroll that slides the score within the viewport — the container's own, or
	 * any ancestor's (scroll doesn't bubble, so the real host listens on window in the capture
	 * phase). Returns an unsubscribe. Drives hover: content can move under a stationary pointer with
	 * no pointer event. */
	observeScroll(onScroll: () => void): () => void;
	/* Re-sync every layer to the container's current geometry (called on resize). Viewport layers
	 * are refit to the visible box (clearing them); content layers keep their score-resolution bitmap
	 * (no clear) but re-track the base canvas's rendered box, so they stay aligned however the
	 * caller's CSS has scaled the score. */
	relayoutLayers(): void;
	/* Change the container's vertical cap live (px, or null to remove it). */
	setMaxHeight(px: number | null): void;
	dispose(): void;
}
