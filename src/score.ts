import type { Decorations } from './decorations';
import { EventBus, type EventListenable, type ScoreEventMap } from './events';
import type { HitTester } from './hit';
import type { Host, Layer, LayerKind } from './stage';
import type { PointerTarget } from './targets';

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
	// The live DOM listeners backing each Score event, so unbind can remove the exact references.
	// Most events map to one DOM listener; hover maps to several (move/down/leave). Resize isn't
	// here — it's a ResizeObserver, set up once below.
	private readonly bound = new Map<
		keyof ScoreEventMap,
		Array<[string, EventListener]>
	>();
	private readonly unobserveResize: () => void;
	// Hover state: the target last reported and the last pointer position (client coords) to
	// re-hit-test on scroll. unobserveScroll is hover's window-scroll subscription.
	private hovered: PointerTarget | null = null;
	private lastClient: { x: number; y: number } | null = null;
	private unobserveScroll: (() => void) | null = null;

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

	/* Remove a layer added with addLayer (a shorthand for layer.dispose()). */
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
		for (const handlers of this.bound.values()) {
			for (const [domType, handler] of handlers) {
				this.host.events.removeEventListener(domType, handler);
			}
		}
		this.bound.clear();
		this.unobserveScroll?.();
		this.unobserveScroll = null;
		this.unobserveResize();
		this.decorations.dispose();
		this.host.dispose();
	}

	// Attach the underlying source for a Score event on its first subscriber. Pointer events
	// hit-test the point under them; scroll carries the new offset; hover tracks the target under
	// the pointer (recomputed on move/down/leave and scroll); resize is already observed from
	// construction (for the layers), so there's nothing to bind here.
	private bind(type: keyof ScoreEventMap): void {
		switch (type) {
			case 'resize':
				return;
			case 'scroll': {
				this.listen(type, 'scroll', (native) => {
					this.bus.emit('scroll', { ...this.host.scroll, native });
				});
				return;
			}
			case 'hover': {
				const track: EventListener = (native) => {
					const pointer = native as PointerEvent;
					this.lastClient = { x: pointer.clientX, y: pointer.clientY };
					this.recomputeHover();
				};
				this.listen(type, 'pointermove', track);
				this.listen(type, 'pointerdown', track);
				// Clear on leave and on cancel: a touch pointer ceases to exist on lift (pointerleave
				// follows pointerup) or when the UA steals the gesture to scroll (pointercancel) — drop
				// the stale position so a momentum-scroll recompute doesn't relight a phantom target.
				const clear: EventListener = () => {
					this.lastClient = null;
					this.recomputeHover();
				};
				this.listen(type, 'pointerleave', clear);
				this.listen(type, 'pointercancel', clear);
				this.unobserveScroll = this.host.observeScroll(() =>
					this.recomputeHover(),
				);
				return;
			}
			default: {
				this.listen(type, type, (native) => {
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
				});
			}
		}
	}

	// Detach the underlying source when the last subscriber for a Score event leaves. Resize stays
	// observed (it serves the layers), so it's a no-op here.
	private unbind(type: keyof ScoreEventMap): void {
		if (type === 'resize') {
			return;
		}
		const handlers = this.bound.get(type);
		if (handlers) {
			for (const [domType, handler] of handlers) {
				this.host.events.removeEventListener(domType, handler);
			}
			this.bound.delete(type);
		}
		if (type === 'hover') {
			this.unobserveScroll?.();
			this.unobserveScroll = null;
			this.hovered = null;
			this.lastClient = null;
		}
	}

	// Bind a DOM listener for a Score event and record it for later removal.
	private listen(
		type: keyof ScoreEventMap,
		domType: string,
		handler: EventListener,
	): void {
		this.host.events.addEventListener(domType, handler);
		const handlers = this.bound.get(type) ?? [];
		handlers.push([domType, handler]);
		this.bound.set(type, handlers);
	}

	// Re-hit-test the last pointer position and emit hover only when the target changes — so a
	// scroll or a move within the same target stays quiet, but sliding onto/off a target fires.
	private recomputeHover(): void {
		const point = this.lastClient
			? this.host.toScoreSpace(this.lastClient.x, this.lastClient.y)
			: null;
		const target = point ? this.index.hitTest(point) : null;
		if (target !== this.hovered) {
			this.hovered = target;
			this.bus.emit('hover', { target, point });
		}
	}
}
