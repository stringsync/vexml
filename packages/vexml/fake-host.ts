import { Dispatcher, type Events } from 'webappwiz/events';
import type { Rect } from 'webappwiz/geometry';
import { FakeLayer } from './fake-layer';
import { FakeScroller } from './fake-scroller';
import type { Host, HostEventMap } from './host';
import type { Layer, LayerKind } from './layer';

/* Fake fulfilling the Host seam (preferred over mocks); records the layers it made, the listeners
 * it was given and the relayouts/disposal it was told about. Client coords are score coords
 * (identity transform), so a test asserts on the point it passed in. Test-only — excluded from the
 * published package via package.json "files". */
export class FakeHost implements Host {
	private readonly dispatcher = new Dispatcher<HostEventMap>();
	/* Live listeners per event type, so a test can assert a subscription was released — a
	 * Dispatcher doesn't report its own. */
	readonly listeners = new Map<keyof HostEventMap, number>();
	readonly events: Events<HostEventMap> = {
		on: (type, listener, opts) => {
			this.count(type, 1);
			const unlisten = this.dispatcher.events.on(type, listener, opts);
			return () => {
				this.count(type, -1);
				unlisten();
			};
		},
		all: (listener, opts) => this.dispatcher.events.all(listener, opts),
	};
	readonly dom = new EventTarget();
	readonly created: FakeLayer[] = [];
	readonly scroller = new FakeScroller();
	scroll = { left: 0, top: 0 };
	relayoutLayersCalls = 0;
	maxHeight: number | null = null;
	disposed = false;

	private count(type: keyof HostEventMap, delta: number): void {
		this.listeners.set(type, (this.listeners.get(type) ?? 0) + delta);
	}

	toScoreSpace(clientX: number, clientY: number): { x: number; y: number } {
		return { x: clientX, y: clientY };
	}

	/* Test hook: fire a host resize the way a real ResizeObserver would. */
	resize(size: { width: number; height: number }): void {
		this.dispatcher.dispatch('resize', size);
	}

	/* Test hook: fire a host scroll the way the real window listener would. */
	scrolled(): void {
		this.dispatcher.dispatch('scroll');
	}

	createLayer(kind: LayerKind, zIndex?: number): Layer {
		const layer = new FakeLayer({ kind, zIndex });
		this.created.push(layer);
		return layer;
	}

	clientRectOf(rect: Rect): DOMRect {
		return { x: rect.x, y: rect.y, width: rect.w, height: rect.h } as DOMRect;
	}

	viewportRect(): DOMRect {
		return { x: 0, y: 0, width: 0, height: 0 } as DOMRect;
	}

	relayoutLayers(): void {
		this.relayoutLayersCalls++;
	}

	setMaxHeight(px: number | null): void {
		this.maxHeight = px;
	}

	dispose(): void {
		this.disposed = true;
	}
}
