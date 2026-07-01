import type { PointerTarget } from '../targets';

/* A pointer interaction over the score: the target under the pointer (null on empty space), the
 * pointer position in score space, and the raw DOM event for everything else (buttons, modifier
 * keys, preventDefault). */
export interface PointerTargetEvent {
	readonly target: PointerTarget | null;
	readonly point: { x: number; y: number };
	readonly native: PointerEvent;
}

/* The target under the pointer changed: entered, left, or moved between targets. `target` is null
 * when nothing is under the pointer (empty space, or the pointer left the score); `point` is the
 * pointer in score space, or null once the pointer is off the score. Unlike pointermove, this also
 * fires when scrolling slides a different target under a stationary pointer — so it fires at most
 * once per change, not once per pixel. */
export interface HoverEvent {
	readonly target: PointerTarget | null;
	readonly point: { x: number; y: number } | null;
}

/* The container scrolled: its new scroll offset plus the raw event. */
export interface ScoreScrollEvent {
	readonly left: number;
	readonly top: number;
	readonly native: Event;
}

/* The rendered area changed size (the caller's container resized): its new content-box size. */
export interface ScoreResizeEvent {
	readonly width: number;
	readonly height: number;
}

/* The events a Score dispatches, keyed by name. Pointer events hit-test; scroll/resize don't. */
export interface ScoreEventMap {
	pointermove: PointerTargetEvent;
	pointerdown: PointerTargetEvent;
	pointerup: PointerTargetEvent;
	click: PointerTargetEvent;
	hover: HoverEvent;
	scroll: ScoreScrollEvent;
	resize: ScoreResizeEvent;
}
