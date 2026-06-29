import type { Decorations } from './decorations';
import { EventBus, type EventListenable, type ScoreEventMap } from './events';
import type { HitTester } from './hit';
import type { Host, Layer, LayerKind } from './stage';

/*
 * A rendered score: the handle render() returns. Owns the DOM vexml built (the Stage/Host) and
 * lets callers subscribe to pointer/scroll/resize events through the EventListenable interface,
 * and stack their own drawing layers over the score. Pointer events are hit-tested against the
 * index to the target under the pointer. dispose() tears the whole thing down so a caller can
 * re-render or unmount cleanly.
 *
 * Pointer/scroll DOM listeners are bound lazily: the underlying source is attached only while at
 * least one caller is subscribed, so an unobserved score does no per-pointer hit-testing. Resize
 * is observed from construction instead — it also resizes viewport layers, which must happen even
 * with no resize subscriber.
 */
export class Score implements EventListenable<ScoreEventMap> {
	private readonly bus = new EventBus<ScoreEventMap>();
	// The live DOM listeners (pointer/scroll), keyed by event name so unbind can remove the exact
	// reference. Resize isn't here — it's a ResizeObserver, set up once below.
	private readonly bound = new Map<string, EventListener>();
	private readonly unobserveResize: () => void;

	constructor(
		private readonly host: Host,
		private readonly index: HitTester,
		private readonly decorations: Decorations,
	) {
		// On resize: re-sync the layers (viewport layers are refit and cleared; content layers just
		// re-track the base canvas) before telling the caller, so a viewport-layer redraw in the
		// resize handler lands on a correctly sized, cleared surface.
		this.unobserveResize = host.observeResize((size) => {
			host.relayoutLayers();
			this.bus.emit('resize', size);
		});
	}

	/* The container's current scroll offset (score space and client space differ only by it and
	 * any zoom — getBoundingClientRect already folds scroll into hit-testing). */
	get scroll(): { left: number; top: number } {
		return this.host.scroll;
	}

	/* Add a caller-owned drawing layer over the score; returns it for drawing (via ctx) and removal
	 * (via dispose, or removeLayer). A content layer spans the engraved score; a viewport layer
	 * spans the visible box and is re-fit on resize. */
	addLayer(kind: LayerKind): Layer {
		return this.host.createLayer(kind);
	}

	removeLayer(layer: Layer): void {
		layer.dispose();
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
		this.unobserveResize();
		this.decorations.dispose();
		this.host.dispose();
	}

	// Attach the underlying source for a Score event on its first subscriber. Pointer events
	// hit-test the point under them; scroll carries the new offset; resize is already observed
	// from construction (for the layers), so there's nothing to bind here.
	private bind(type: keyof ScoreEventMap): void {
		switch (type) {
			case 'resize':
				return;
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

	// Detach the underlying source when the last subscriber for a Score event leaves. Resize stays
	// observed (it serves the layers), so it's a no-op here.
	private unbind(type: keyof ScoreEventMap): void {
		if (type === 'resize') {
			return;
		}
		const handler = this.bound.get(type);
		if (handler) {
			this.host.events.removeEventListener(type, handler);
			this.bound.delete(type);
		}
	}
}
