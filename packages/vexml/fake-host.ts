import { disposables, type Resource } from 'webappwiz/disposable';
import { Dispatcher } from 'webappwiz/events';
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
	readonly events = this.dispatcher.events;
	readonly dom = new EventTarget();
	readonly created: FakeLayer[] = [];
	readonly scroller = new FakeScroller();
	scroll = { left: 0, top: 0 };
	scrollListener: (() => void) | null = null;
	relayoutLayersCalls = 0;
	maxHeight: number | null = null;
	disposed = false;

	toScoreSpace(clientX: number, clientY: number): { x: number; y: number } {
		return { x: clientX, y: clientY };
	}

	/* Test hook: fire a host resize the way a real ResizeObserver would. */
	resize(size: { width: number; height: number }): void {
		this.dispatcher.dispatch('resize', size);
	}

	observeScroll(onScroll: () => void): Resource {
		this.scrollListener = onScroll;
		return disposables.callback(() => {
			this.scrollListener = null;
		});
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
