import type { Decorations } from './decorations';
import { EventBus, type EventListenable, type ScoreEventMap } from './events';
import type { HitTester } from './hit';
import type { Host } from './stage';

/*
 * A rendered score: the handle render() returns. Owns the DOM vexml built (the Stage/Host) and
 * lets callers subscribe to pointer/scroll/resize events through the EventListenable interface;
 * pointer events are hit-tested against the index to the target under the pointer. dispose()
 * tears the whole thing down so a caller can re-render or unmount cleanly.
 *
 * DOM listeners are bound lazily: the underlying source is attached only while at least one
 * caller is subscribed to that event, so an unobserved score does no per-pointer hit-testing.
 */
export class Score implements EventListenable<ScoreEventMap> {
	private readonly bus = new EventBus<ScoreEventMap>();
	// The live DOM listeners (pointer/scroll), keyed by event name so unbind can remove the exact
	// reference. Resize isn't here — it's a ResizeObserver, torn down via unobserveResize.
	private readonly bound = new Map<string, EventListener>();
	private unobserveResize: (() => void) | null = null;

	constructor(
		private readonly host: Host,
		private readonly index: HitTester,
		private readonly decorations: Decorations,
	) {}

	/* The container's current scroll offset (score space and client space differ only by it and
	 * any zoom — getBoundingClientRect already folds scroll into hit-testing). */
	get scroll(): { left: number; top: number } {
		return this.host.scroll;
	}

	addEventListener<K extends keyof ScoreEventMap>(
		type: K,
		listener: (event: ScoreEventMap[K]) => void,
	): void {
		const first = this.bus.count(type) === 0;
		this.bus.addEventListener(type, listener);
		if (first) {
			this.bind(type);
		}
	}

	removeEventListener<K extends keyof ScoreEventMap>(
		type: K,
		listener: (event: ScoreEventMap[K]) => void,
	): void {
		this.bus.removeEventListener(type, listener);
		if (this.bus.count(type) === 0) {
			this.unbind(type);
		}
	}

	dispose(): void {
		for (const [type, handler] of this.bound) {
			this.host.events.removeEventListener(type, handler);
		}
		this.bound.clear();
		this.unobserveResize?.();
		this.unobserveResize = null;
		this.decorations.dispose();
		this.host.dispose();
	}

	// Attach the underlying source for a Score event on its first subscriber. Resize is a
	// ResizeObserver; everything else is a DOM listener on the host's event source. Pointer
	// events hit-test the point under them; scroll carries the new offset.
	private bind(type: keyof ScoreEventMap): void {
		switch (type) {
			case 'resize': {
				this.unobserveResize = this.host.observeResize((size) =>
					this.bus.emit('resize', size),
				);
				return;
			}
			case 'scroll': {
				const handler: EventListener = (native) => {
					this.bus.emit('scroll', { ...this.host.scroll, native });
				};
				this.bound.set(type, handler);
				this.host.events.addEventListener(type, handler);
				return;
			}
			default: {
				const handler: EventListener = (native) => {
					const pointer = native as PointerEvent;
					const point = this.host.toScoreSpace(
						pointer.clientX,
						pointer.clientY,
					);
					this.bus.emit(type, {
						target: this.index.hitTest(point),
						point,
						native: pointer,
					});
				};
				this.bound.set(type, handler);
				this.host.events.addEventListener(type, handler);
			}
		}
	}

	// Detach the underlying source when the last subscriber for a Score event leaves.
	private unbind(type: keyof ScoreEventMap): void {
		if (type === 'resize') {
			this.unobserveResize?.();
			this.unobserveResize = null;
			return;
		}
		const handler = this.bound.get(type);
		if (handler) {
			this.host.events.removeEventListener(type, handler);
			this.bound.delete(type);
		}
	}
}
