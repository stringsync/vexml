import { SCROLL_TOP_PADDING_PX, SMOOTH_SCROLL_SETTLE_MS } from '../constants';
import type { Rect } from '../geometry';

/* Scrolls a score-space rect into the viewport. vexml's Stage provides one (Score.scroller); a caller
 * may pass their own to follow(). */
export interface Scroller {
	scrollIntoView(rect: Rect, opts?: { behavior?: ScrollBehavior }): void;
}

/* The minimal seam a ScrollController needs from its stage: the score->rendered CSS scale, the
 * base canvas's offset within the scroll content, the container's current scroll offsets and
 * visible client size, and the scrollTo that moves the scroll box. Stage implements it; a unit
 * test injects a fake. */
export interface ScrollHost {
	frame(): { sx: number; sy: number };
	baseOffset(): { left: number; top: number };
	readonly scroll: { left: number; top: number };
	clientSize(): { width: number; height: number };
	scrollTo(options: ScrollToOptions): void;
}

/*
 * Scrolls the host's scroll box so score-space rects come into view (axis-aware: only an
 * off-screen axis moves). Owns the smooth-scroll conflation: while a smooth/auto scroll is
 * animating, further requests are held and only the latest target flushes once the settle window
 * elapses, so a stream of follow() calls doesn't restart the animation on every step.
 */
export class ScrollController implements Scroller {
	// While a smooth/auto scroll is animating, conflate further requests: hold the timer and remember
	// only the latest target, then flush it once the animation has had time to settle.
	private smoothScrollTimer: ReturnType<typeof setTimeout> | null = null;
	private pendingSmoothScroll: {
		offset: { left: number; top: number };
		behavior: ScrollBehavior;
	} | null = null;
	// The target the current animation was issued toward — what dedupe compares against while
	// nothing newer is pending.
	private inFlightSmoothScroll: {
		offset: { left: number; top: number };
		behavior: ScrollBehavior;
	} | null = null;

	constructor(private readonly host: ScrollHost) {}

	// Scroll the container so a score-space rect is visible, moving only the axis that's off-screen.
	// The rect maps to the container's scroll content through the base canvas's offset and CSS scale.
	scrollIntoView(rect: Rect, opts?: { behavior?: ScrollBehavior }): void {
		const { sx, sy } = this.host.frame();
		const base = this.host.baseOffset();
		const left = base.left + rect.x * sx;
		const top = base.top + rect.y * sy;
		const target = {
			left,
			top,
			right: left + rect.w * sx,
			bottom: top + rect.h * sy,
		};
		const scroll = this.host.scroll;
		const size = this.host.clientSize();
		const view = {
			left: scroll.left,
			top: scroll.top,
			right: scroll.left + size.width,
			bottom: scroll.top + size.height,
		};
		const offset = scrollOffsetFor(target, view);
		const behavior = opts?.behavior;
		if (behavior === 'smooth' || behavior === 'auto') {
			this.smoothScrollTo(offset, behavior);
		} else {
			this.host.scrollTo({ ...offset, behavior });
		}
	}

	// Issue a smooth/auto scroll, conflating any calls that arrive while one is animating: keep only
	// the latest target and apply it once the settle window elapses, so a stream of follow() calls
	// doesn't restart the animation on every step.
	private smoothScrollTo(
		offset: { left: number; top: number },
		behavior: ScrollBehavior,
	): void {
		if (this.smoothScrollTimer) {
			// Dedupe: re-requesting the target already pending (or in flight, when nothing newer is
			// pending) would only re-issue the same scroll, so drop it. A genuinely different target
			// still retargets exactly as before.
			const current = this.pendingSmoothScroll ?? this.inFlightSmoothScroll;
			if (
				current &&
				current.offset.left === offset.left &&
				current.offset.top === offset.top &&
				current.behavior === behavior
			) {
				return;
			}
			this.pendingSmoothScroll = { offset, behavior };
			return;
		}
		this.host.scrollTo({ ...offset, behavior });
		this.inFlightSmoothScroll = { offset, behavior };
		this.smoothScrollTimer = setTimeout(() => {
			this.smoothScrollTimer = null;
			this.inFlightSmoothScroll = null;
			const pending = this.pendingSmoothScroll;
			this.pendingSmoothScroll = null;
			if (pending) {
				this.smoothScrollTo(pending.offset, pending.behavior);
			}
		}, SMOOTH_SCROLL_SETTLE_MS);
	}

	/* Halts smooth scrolling: clears the settle timer and any pending target, then stops an
	 * in-flight smooth animation by issuing an instant scroll to wherever the scroll box currently
	 * is. A native smooth scroll has no handle to stop it; scrolling to the current offsets halts
	 * it in place, and is a no-op scroll when nothing is animating. */
	cancel(): void {
		if (this.smoothScrollTimer) {
			clearTimeout(this.smoothScrollTimer);
			this.smoothScrollTimer = null;
		}
		this.pendingSmoothScroll = null;
		this.inFlightSmoothScroll = null;
		const { left, top } = this.host.scroll;
		this.host.scrollTo({ left, top, behavior: 'instant' });
	}

	// Clears the settle timer without touching the scroll position (Stage.dispose calls it).
	dispose(): void {
		if (this.smoothScrollTimer) {
			clearTimeout(this.smoothScrollTimer);
			this.smoothScrollTimer = null;
		}
	}
}

type Box = { left: number; top: number; right: number; bottom: number };

/*
 * The scroll offset that brings `target` into `view`, both in the container's scroll-content
 * coordinates. Horizontal is minimal: if the target's near edge is off the near side, align to it; if
 * its far edge is off the far side, scroll just enough to show it; otherwise leave it. So scrolling a
 * horizontally-off-screen bar in a panoramic score never disturbs the vertical position. Vertical
 * pins the target's top to the viewport top (scrollTo clamps to the max scroll height near the end of
 * the content). Pure — the DOM application lives in ScrollController.scrollIntoView.
 */
export function scrollOffsetFor(
	target: Box,
	view: Box,
): { left: number; top: number } {
	const axis = (tLo: number, tHi: number, vLo: number, vHi: number): number => {
		if (tLo < vLo) {
			return tLo;
		}
		if (tHi > vHi) {
			return vLo + (tHi - vHi);
		}
		return vLo;
	};
	return {
		left: axis(target.left, target.right, view.left, view.right),
		// Leave breathing room above the target instead of pinning it flush to the top. scrollTo
		// clamps negatives to 0.
		top: target.top - SCROLL_TOP_PADDING_PX,
	};
}
