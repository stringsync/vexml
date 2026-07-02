import type { Bounded, Element } from './elements/element';
import type { Note } from './elements/note';

/* A pointer interaction over the score: the element under the pointer (null on empty space), the
 * pointer position in score space, and the raw DOM event for everything else (buttons, modifier
 * keys, preventDefault). */
export interface PointerTargetEvent {
	readonly target: Element | null;
	readonly point: { x: number; y: number };
	readonly native: PointerEvent;
}

/* The element under the pointer changed: entered, left, or moved between elements. `target` is null
 * when nothing is under the pointer (empty space, or the pointer left the score); `point` is the
 * pointer in score space, or null once the pointer is off the score. Unlike pointermove, this also
 * fires when scrolling slides a different element under a stationary pointer — so it fires at most
 * once per change, not once per pixel. */
export interface HoverEvent {
	readonly target: Element | null;
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

/* What changed entering the current cursor position. `started` are (re)attacks (a re-struck pitch
 * shows in both `started` and `stopped`); `sustained` are notes held or tied through (do not
 * re-press); `stopped` are releases (a note tied into this step is excluded — it keeps ringing).
 * `active` is the full sounding set (onset-based — use for audio). `highlighted` is `active` plus any
 * notes tied into them, so a tie chain stays lit until it releases — use for visual highlighting.
 * `position` is the bar in score space, mappable to the page. */
export interface CursorChangeEvent {
	readonly timeMs: number;
	readonly timeBeats: number;
	readonly index: number;
	readonly position: Bounded;
	readonly active: readonly Note[];
	readonly highlighted: readonly Note[];
	readonly started: readonly Note[];
	readonly sustained: readonly Note[];
	readonly stopped: readonly Note[];
	readonly done: boolean;
}

/* The cursor's bar crossed the viewport edge: `fullyVisible` is true when the whole bar sits inside
 * the viewport, false when any part is off-screen. Fires on a transition only — driven by the
 * cursor's own moves and by viewport scroll/resize, so it also fires while paused if the user
 * scrolls the bar away. */
export interface CursorVisibilityEvent {
	readonly fullyVisible: boolean;
}

/* The events a CursorController dispatches, keyed by name. */
export interface CursorEventMap {
	change: CursorChangeEvent;
	visibility: CursorVisibilityEvent;
}
