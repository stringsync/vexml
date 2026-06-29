import type { Rect } from './geometry';
import type { Viewport } from './targets';

/* Where a custom drawing layer sits. A `content` layer covers the whole engraved score (score
 * space, scrolls with the content) — what decorations draw on. A `viewport` layer covers only the
 * visible box (client space) and is resized as the container resizes. */
export type LayerKind = 'content' | 'viewport';

/* A caller-owned drawing surface stacked over the score. Only the 2D context is exposed — never
 * the canvas, its size, or a clear — so the layer's lifecycle stays vexml's. The caller draws via
 * ctx (CSS pixels; the dpr scale is applied for them) and removes the layer with dispose(). */
export interface Layer {
	readonly ctx: CanvasRenderingContext2D;
	dispose(): void;
}

/* The minimal seam for making a drawing layer — what Decorations needs from the stage (it draws
 * on its own content layer but needs nothing else). Stage satisfies it; a unit test injects a
 * fake whose layer carries a recording context. */
export interface LayerHost {
	createLayer(kind: LayerKind): Layer;
}

/*
 * What a Score needs from its host: the score<-client transform (toScoreSpace), a raw event
 * source to bind pointer/scroll listeners on, the current scroll offset, a resize subscription,
 * custom-layer creation/resizing, and teardown. Stage is the production implementer; a Score unit
 * test injects a fake. Kept separate from Viewport (the targets' coordinate seam) so each consumer
 * depends only on what it uses, even though Stage satisfies both.
 */
export interface Host extends LayerHost {
	toScoreSpace(clientX: number, clientY: number): { x: number; y: number };
	readonly events: EventTarget;
	readonly scroll: { left: number; top: number };
	observeResize(
		onResize: (size: { width: number; height: number }) => void,
	): () => void;
	/* Resize every viewport-kind layer to the current visible box (clearing them). Content layers
	 * are fixed to the engraved score, so they're left alone. Called on container resize. */
	resizeViewportLayers(): void;
	dispose(): void;
}

/*
 * A managed overlay canvas — the production Layer. Absolutely positioned over the base canvas, dpr
 * scaled so the caller's ctx draws in CSS pixels, and sized by its kind. Resizing resets the
 * bitmap (which clears it) and re-applies the dpr transform. Back-references its Stage only to
 * deregister on dispose (both live here and are disposed together).
 */
class ManagedLayer implements Layer {
	readonly ctx: CanvasRenderingContext2D;

	constructor(
		readonly kind: LayerKind,
		private readonly canvas: HTMLCanvasElement,
		private readonly stage: Stage,
	) {
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error('vexml: 2D context unavailable for layer');
		}
		this.ctx = ctx;
	}

	resize(cssWidth: number, cssHeight: number): void {
		const dpr = window.devicePixelRatio || 1;
		this.canvas.width = Math.max(0, Math.round(cssWidth * dpr));
		this.canvas.height = Math.max(0, Math.round(cssHeight * dpr));
		this.canvas.style.width = `${cssWidth}px`;
		this.canvas.style.height = `${cssHeight}px`;
		// Setting width/height cleared the bitmap and reset the transform; re-apply dpr so the
		// caller keeps drawing in CSS pixels. setTransform (not scale) stays idempotent on re-resize.
		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	dispose(): void {
		this.canvas.remove();
		this.stage.forget(this);
	}
}

/*
 * The host: the DOM vexml builds inside the caller's container, and the coordinate authority
 * between score space (where target rects live) and client/page space (where pointer events and
 * DOM popups live). The caller hands render() a <div>; the Stage owns the canvas it draws the
 * score onto and never exposes it to callers — they see only the Score.
 *
 * The base canvas is a plain in-flow child, so the container sizes to it exactly as a
 * hand-placed <canvas> did — output stays pixel-identical. Custom layers stack over it as absolute
 * overlays. The transform falls out of the base canvas's own getBoundingClientRect: score space is
 * its CSS-pixel space with the origin at its top-left. Reading the live rect each call means page
 * scroll and any CSS scaling of the canvas are handled for free.
 */
export class Stage implements Viewport, Host {
	readonly base: HTMLCanvasElement;
	private readonly prevPosition: string;
	private readonly layers = new Set<ManagedLayer>();

	constructor(private readonly container: HTMLDivElement) {
		// A positioned container is the containing block the overlay layers anchor to. Only set it
		// when the caller left position static, and remember it so dispose restores.
		this.prevPosition = container.style.position;
		if (!container.style.position) {
			container.style.position = 'relative';
		}
		this.base = document.createElement('canvas');
		container.appendChild(this.base);
	}

	clientRectOf(rect: Rect): DOMRect {
		const { left, top, sx, sy } = this.frame();
		return new DOMRect(
			left + rect.x * sx,
			top + rect.y * sy,
			rect.w * sx,
			rect.h * sy,
		);
	}

	toScoreSpace(clientX: number, clientY: number): { x: number; y: number } {
		const { left, top, sx, sy } = this.frame();
		return { x: (clientX - left) / sx, y: (clientY - top) / sy };
	}

	// Bind on the container, not the canvas: canvas pointer/scroll events bubble up to it, and
	// it's where the overlay layers live too, so one source covers the whole stage.
	get events(): EventTarget {
		return this.container;
	}

	get scroll(): { left: number; top: number } {
		return { left: this.container.scrollLeft, top: this.container.scrollTop };
	}

	observeResize(
		onResize: (size: { width: number; height: number }) => void,
	): () => void {
		// Report the visible (client) box — the size a viewport layer is given and the most useful
		// "rendered area" for a caller — rather than the ResizeObserver's content-box entry.
		const observer = new ResizeObserver(() => {
			onResize({
				width: this.container.clientWidth,
				height: this.container.clientHeight,
			});
		});
		observer.observe(this.container);
		return () => observer.disconnect();
	}

	createLayer(kind: LayerKind): Layer {
		const canvas = document.createElement('canvas');
		// Overlay the base canvas at its offset within the (positioned) container, so a content
		// layer's CSS pixels line up 1:1 with score space. Purely visual: pointer events pass
		// through to the container, where the Score hit-tests them — layers never capture input.
		canvas.style.position = 'absolute';
		canvas.style.left = `${this.base.offsetLeft}px`;
		canvas.style.top = `${this.base.offsetTop}px`;
		canvas.style.pointerEvents = 'none';
		const layer = new ManagedLayer(kind, canvas, this);
		const { width, height } = this.layerSize(kind);
		layer.resize(width, height);
		this.container.appendChild(canvas);
		this.layers.add(layer);
		return layer;
	}

	resizeViewportLayers(): void {
		const { width, height } = this.layerSize('viewport');
		for (const layer of this.layers) {
			if (layer.kind === 'viewport') {
				layer.resize(width, height);
			}
		}
	}

	// Deregister a layer disposing itself (called from ManagedLayer.dispose).
	forget(layer: ManagedLayer): void {
		this.layers.delete(layer);
	}

	dispose(): void {
		for (const layer of [...this.layers]) {
			layer.dispose();
		}
		this.base.remove();
		this.container.style.position = this.prevPosition;
	}

	// A layer's CSS size by kind: content spans the engraved score (the base canvas's CSS box);
	// viewport spans the container's visible box.
	private layerSize(kind: LayerKind): { width: number; height: number } {
		if (kind === 'content') {
			return {
				width: parseFloat(this.base.style.width) || 0,
				height: parseFloat(this.base.style.height) || 0,
			};
		}
		return {
			width: this.container.clientWidth,
			height: this.container.clientHeight,
		};
	}

	/*
	 * The live score-space -> client-space mapping: the canvas's page offset plus the scale
	 * between its rendered size and its score-space (CSS-px) size. Scale is 1 unless the caller
	 * stretched the canvas with CSS; the `|| 1` guards an unsized (empty-score) canvas so it
	 * maps 1:1 instead of dividing by zero.
	 */
	private frame(): { left: number; top: number; sx: number; sy: number } {
		const r = this.base.getBoundingClientRect();
		const w = parseFloat(this.base.style.width) || r.width || 1;
		const h = parseFloat(this.base.style.height) || r.height || 1;
		return { left: r.left, top: r.top, sx: r.width / w, sy: r.height / h };
	}
}
