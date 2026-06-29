import type { PointerTarget } from './targets';

/*
 * The event seam. `EventListenable<M>` is the abstraction over add/removeEventListener that the
 * public Score implements (M maps an event name to its payload type); `EventBus<M>` is the
 * reusable production implementer the Score delegates to. Callers are coupled to the interface,
 * never the bus. Tests drive the bus directly.
 */
export interface EventListenable<M> {
	addEventListener<K extends keyof M>(
		type: K,
		listener: (event: M[K]) => void,
	): void;
	removeEventListener<K extends keyof M>(
		type: K,
		listener: (event: M[K]) => void,
	): void;
}

type Listener<M, K extends keyof M> = (event: M[K]) => void;

/* A typed multi-listener dispatcher. A per-type Set keeps registration idempotent (adding the
 * same listener twice is one entry) and `count` lets an owner bind/unbind an underlying source
 * lazily — see Score, which only attaches a DOM listener while someone is subscribed. */
export class EventBus<M> implements EventListenable<M> {
	private readonly listeners: { [K in keyof M]?: Set<Listener<M, K>> } = {};

	addEventListener<K extends keyof M>(type: K, listener: Listener<M, K>): void {
		let set = this.listeners[type];
		if (!set) {
			set = new Set();
			this.listeners[type] = set;
		}
		set.add(listener);
	}

	removeEventListener<K extends keyof M>(
		type: K,
		listener: Listener<M, K>,
	): void {
		this.listeners[type]?.delete(listener);
	}

	/* Dispatch to every listener for `type`. Iterates a copy so a listener that unsubscribes
	 * (or subscribes) mid-dispatch doesn't perturb the in-progress fan-out. */
	emit<K extends keyof M>(type: K, event: M[K]): void {
		const set = this.listeners[type];
		if (!set) {
			return;
		}
		for (const listener of [...set]) {
			listener(event);
		}
	}

	count<K extends keyof M>(type: K): number {
		return this.listeners[type]?.size ?? 0;
	}
}

/* A pointer interaction over the score: the target under the pointer (null on empty space), the
 * pointer position in score space, and the raw DOM event for everything else (buttons, modifier
 * keys, preventDefault). */
export interface PointerTargetEvent {
	readonly target: PointerTarget | null;
	readonly point: { x: number; y: number };
	readonly native: PointerEvent;
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
	scroll: ScoreScrollEvent;
	resize: ScoreResizeEvent;
}
