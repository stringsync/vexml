import { disposables, type Resource } from 'webappwiz/disposable';
import type { Rect } from '../geometry';
import { FakeLayer } from '../layer/fake-layer';
import type { Layer, LayerKind } from '../layer/layer';
import { FakeScroller } from '../scroller/fake-scroller';
import type { Host } from './host';

/* Fake fulfilling the Host seam (preferred over mocks); records the layers it made, the listeners
 * it was given and the relayouts/disposal it was told about. Client coords are score coords
 * (identity transform), so a test asserts on the point it passed in. Test-only — excluded from the
 * published package via package.json "files". */
export class FakeHost implements Host {
	readonly events = new EventTarget();
	readonly created: FakeLayer[] = [];
	readonly scroller = new FakeScroller();
	scroll = { left: 0, top: 0 };
	resizeListener: ((size: { width: number; height: number }) => void) | null =
		null;
	scrollListener: (() => void) | null = null;
	resizeUnobserved = false;
	relayoutLayersCalls = 0;
	maxHeight: number | null = null;
	disposed = false;

	toScoreSpace(clientX: number, clientY: number): { x: number; y: number } {
		return { x: clientX, y: clientY };
	}

	observeResize(
		onResize: (size: { width: number; height: number }) => void,
	): Resource {
		this.resizeListener = onResize;
		return disposables.callback(() => {
			this.resizeUnobserved = true;
			this.resizeListener = null;
		});
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
