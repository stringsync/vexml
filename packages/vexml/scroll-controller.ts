import type { Resource } from 'webappwiz/disposable';
import type { Rect } from 'webappwiz/geometry';
import { Duration, SystemTimer } from 'webappwiz/time';
import {
	MAX_SCROLL_SPEED_PX_PER_MS,
	RESIZE_SETTLE_MS,
	SCROLL_DURATION_MS,
	SCROLL_FRAME_MS,
	SCROLL_SIDE_PADDING_PX,
	SCROLL_TOP_PADDING_PX,
} from './constants';
import type { ScrollHost } from './scroll-host';
import type { Scroller, ScrollerOptions } from './scroller';

/*
 * Scrolls the host's scroll box so score-space rects come into view (axis-aware: only an off-screen
 * axis moves). Smooth scrolls are self-driven: we tween the scroll box over a constant
 * SCROLL_DURATION_MS regardless of distance (native smooth scroll's duration is UA-defined and
 * varies), retargeting to the latest destination when a stream of follow() calls arrives mid-tween.
 * A destination far enough that the tween would fling past MAX_SCROLL_SPEED_PX_PER_MS snaps instantly
 * instead.
 */
export class ScrollController implements Scroller {
	// The in-flight smooth tween: interpolate from -> to over SCROLL_DURATION_MS starting at `start`
	// (performance.now()). Null when nothing is animating. A new smooth request retargets it (re-reads
	// the live position as `from`, restarts the clock) so following stays a constant-time chase.
	private tween: {
		from: { left: number; top: number };
		to: { left: number; top: number };
		start: number;
	} | null = null;
	private frameTimer: Resource | null = null;

	// While a resize burst is in flight, scrolling targets stale geometry, so scrollIntoView is a
	// no-op until the size holds still for RESIZE_SETTLE_MS. This timer is the debounce.
	private resizeSettleTimer: Resource | null = null;

	private readonly timer = new SystemTimer();

	constructor(private readonly host: ScrollHost) {}

	/* Suspend scrolling for a resize: cancel any in-flight scroll and drop new scrollIntoView calls
	 * until the container size stops changing. Call once per ResizeObserver callback — each call
	 * restarts the debounce, so scrolling only resumes RESIZE_SETTLE_MS after the last resize. */
	suspendForResize(): void {
		if (!this.resizeSettleTimer) {
			this.cancel();
		}
		if (this.resizeSettleTimer) {
			this.resizeSettleTimer.dispose();
		}
		this.resizeSettleTimer = this.timer.setTimeout(() => {
			this.resizeSettleTimer = null;
		}, Duration.ms(RESIZE_SETTLE_MS));
	}

	// Scroll the container so a score-space rect is visible, moving only the axis that's off-screen.
	// The rect maps to the container's scroll content through the base canvas's offset and CSS scale.
	scrollIntoView(rect: Rect, opts?: ScrollerOptions): void {
		if (this.resizeSettleTimer) {
			return;
		}
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
		// Keep an existing page turn when its destination already reveals the new target.
		if (this.tween) {
			const destination = this.tween.to;
			const pending = this.scrollOffsetFor(target, {
				...destination,
				right: destination.left + size.width,
				bottom: destination.top + size.height,
			});
			if (
				pending.left === destination.left &&
				pending.top === destination.top
			) {
				return;
			}
		}
		const offset = this.scrollOffsetFor(target, view);
		if (offset.left === scroll.left && offset.top === scroll.top) {
			// A newly focused visible target must not be carried offscreen by an old tween.
			this.stopTween();
			return;
		}
		const behavior = opts?.behavior;
		if (behavior === 'smooth' || behavior === 'auto') {
			this.smoothScrollTo(offset);
		} else {
			this.stopTween();
			this.host.scrollTo({ ...offset, behavior });
		}
	}

	// Start (or retarget) the constant-time tween toward `offset`. `from` is the live scroll position
	// so retargeting mid-tween redirects smoothly from wherever the box currently is. If the resulting
	// travel would exceed MAX_SCROLL_SPEED_PX_PER_MS over SCROLL_DURATION_MS, snap instantly instead.
	private smoothScrollTo(offset: { left: number; top: number }): void {
		const from = { ...this.host.scroll };
		const distance = Math.max(
			Math.abs(offset.left - from.left),
			Math.abs(offset.top - from.top),
		);
		if (distance > MAX_SCROLL_SPEED_PX_PER_MS * SCROLL_DURATION_MS) {
			this.stopTween();
			this.host.scrollTo({ ...offset, behavior: 'instant' });
			return;
		}
		this.tween = { from, to: offset, start: performance.now() };
		if (!this.frameTimer) {
			this.step();
		}
	}

	// One tween frame: linearly interpolate from -> to by elapsed/duration, apply it instantly, then
	// schedule the next frame until the duration elapses (landing exactly on `to`).
	private step(): void {
		if (!this.tween) {
			this.frameTimer = null;
			return;
		}
		const { from, to, start } = this.tween;
		const t = Math.min(1, (performance.now() - start) / SCROLL_DURATION_MS);
		this.host.scrollTo({
			left: from.left + (to.left - from.left) * t,
			top: from.top + (to.top - from.top) * t,
			behavior: 'instant',
		});
		if (t >= 1) {
			this.tween = null;
			this.frameTimer = null;
			return;
		}
		this.frameTimer = this.timer.setTimeout(
			() => this.step(),
			Duration.ms(SCROLL_FRAME_MS),
		);
	}

	// Stop the tween where it is, without moving the scroll box.
	private stopTween(): void {
		if (this.frameTimer) {
			this.frameTimer.dispose();
			this.frameTimer = null;
		}
		this.tween = null;
	}

	/* Halts smooth scrolling: stops the tween and pins the scroll box to wherever it currently is
	 * (a no-op scroll when nothing is animating). */
	cancel(): void {
		this.stopTween();
		const { left, top } = this.host.scroll;
		this.host.scrollTo({ left, top, behavior: 'instant' });
	}

	// Clears the timers without touching the scroll position (Stage.dispose calls it).
	dispose(): void {
		this.stopTween();
		if (this.resizeSettleTimer) {
			this.resizeSettleTimer.dispose();
			this.resizeSettleTimer = null;
		}
	}

	// Resolve each axis independently: visible targets stay put, while offscreen targets return
	// at the opposite edge, revealing the most content in the direction of travel.
	private scrollOffsetFor(
		target: Box,
		view: Box,
	): { left: number; top: number } {
		return {
			left: this.pageOffset(
				target.left,
				target.right,
				view.left,
				view.right,
				SCROLL_SIDE_PADDING_PX,
			),
			top: this.pageOffset(
				target.top,
				target.bottom,
				view.top,
				view.bottom,
				SCROLL_TOP_PADDING_PX,
			),
		};
	}

	private pageOffset(
		start: number,
		end: number,
		viewStart: number,
		viewEnd: number,
		padding: number,
	): number {
		if (start >= viewStart && end <= viewEnd) {
			return viewStart;
		}
		const size = viewEnd - viewStart;
		// Oversized targets cannot fit; consistently show their beginning without oscillating.
		if (end - start > size) {
			return start - padding;
		}
		const inset = Math.min(padding, size - (end - start));
		return start < viewStart ? end + inset - size : start - inset;
	}
}

type Box = { left: number; top: number; right: number; bottom: number };
