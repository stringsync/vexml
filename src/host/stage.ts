import type { Rect } from '../geometry';
import {
	ScrollController,
	type Scroller,
	type ScrollHost,
} from './scroll-controller';

/* Where a custom drawing layer sits. A `content` layer covers the whole engraved score (score
 * space, scrolls with the content) — what decorations draw on. A `background` layer is a content
 * layer placed *behind* the base canvas (z-index -1), so it shows through the score's transparent
 * pixels — e.g. a halo glowing behind the noteheads. A `viewport` layer covers only the visible box
 * (client space) and is resized as the container resizes. */
export type LayerKind = 'content' | 'background' | 'viewport';

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
	createLayer(kind: LayerKind, zIndex?: number): Layer;
}

/*
 * The coordinate authority: converts between score space (where rects live) and client/page
 * space (where pointer events and DOM popups live). Stage implements it for real; tests
 * inject a fake.
 */
export interface Viewport {
	clientRectOf(rect: Rect): DOMRect;
	toScoreSpace(clientX: number, clientY: number): { x: number; y: number };
}

/*
 * What a Score needs from its host: the score<-client transform (toScoreSpace), a raw event
 * source to bind pointer/scroll listeners on, the current scroll offset, a resize subscription,
 * custom-layer creation/resizing, and teardown. Stage is the production implementer; a Score unit
 * test injects a fake. Kept separate from Viewport (the targets' coordinate seam) so each consumer
 * depends only on what it uses, even though Stage satisfies both.
 */
export interface Host extends LayerHost, Viewport {
	readonly events: EventTarget;
	readonly scroll: { left: number; top: number };
	/* The visible scrollport box in client coords — what a cursor's visibility check compares against. */
	viewportRect(): DOMRect;
	/* Scrolls a score-space rect into view (axis-aware); a cursor's follow()/scrollIntoView() use it. */
	readonly scroller: Scroller;
	observeResize(
		onResize: (size: { width: number; height: number }) => void,
	): () => void;
	/* Subscribe to any scroll that slides the score within the viewport — the container's own, or
	 * any ancestor's (scroll doesn't bubble, so the real host listens on window in the capture
	 * phase). Returns an unsubscribe. Drives hover: content can move under a stationary pointer with
	 * no pointer event. */
	observeScroll(onScroll: () => void): () => void;
	/* Re-sync every layer to the container's current geometry (called on resize). Viewport layers
	 * are refit to the visible box (clearing them); content layers keep their score-resolution bitmap
	 * (no clear) but re-track the base canvas's rendered box, so they stay aligned however the
	 * caller's CSS has scaled the score. */
	relayoutLayers(): void;
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

	// Position and stretch the element's on-screen box, independent of the bitmap resolution resize()
	// set. For a content layer this lets a fixed score-resolution bitmap be displayed at the base
	// canvas's (possibly CSS-scaled) rendered size, so the overlay tracks it without a clearing resize.
	place(left: number, top: number, width: number, height: number): void {
		this.canvas.style.left = `${left}px`;
		this.canvas.style.top = `${top}px`;
		this.canvas.style.width = `${width}px`;
		this.canvas.style.height = `${height}px`;
	}

	dispose(): void {
		this.canvas.remove();
		this.stage.forget(this);
	}
}

/* The caller's height/width caps from config. A set cap turns the container into a scroll box on that
 * axis; null leaves the axis to size to its content. */
export interface ScrollBox {
	height?: number | null;
	maxHeight?: number | null;
	width?: number | null;
	maxWidth?: number | null;
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
export class Stage implements Viewport, Host, ScrollHost {
	readonly base: HTMLCanvasElement;
	private readonly prevPosition: string;
	private readonly prevIsolation: string;
	// Inline styles this stage set on the container, with their prior values, restored on dispose.
	private readonly restoreStyles: Array<[string, string]> = [];
	private readonly layers = new Set<ManagedLayer>();
	// Owns the smooth-scroll conflation state; created on first use of `scroller`.
	private scrollController: ScrollController | null = null;

	constructor(
		readonly container: HTMLDivElement,
		scroll: ScrollBox = {},
	) {
		// A positioned container is the containing block the overlay layers anchor to. Only set it
		// when the caller left position static, and remember it so dispose restores.
		this.prevPosition = container.style.position;
		if (!container.style.position) {
			container.style.position = 'relative';
		}
		// Isolate the container into its own stacking context so the background layer's z-index:-1
		// stays trapped here — above the container's (possibly opaque) background but below the base
		// canvas — rather than escaping behind an ancestor's background, where it'd be invisible.
		this.prevIsolation = container.style.isolation;
		if (!container.style.isolation) {
			container.style.isolation = 'isolate';
		}
		// Turn the container into a scroll box on whichever axes have a cap: set the size/cap and
		// overflow:auto so the content (the in-flow base canvas) scrolls within it. A cursor's
		// follow()/scrollIntoView() then scroll this same box. overflow per axis is set once.
		const overflowY = scroll.height != null || scroll.maxHeight != null;
		const overflowX = scroll.width != null || scroll.maxWidth != null;
		if (scroll.height != null) {
			this.setStyle('height', `${scroll.height}px`);
		}
		if (scroll.maxHeight != null) {
			this.setStyle('max-height', `${scroll.maxHeight}px`);
		}
		if (scroll.width != null) {
			this.setStyle('width', `${scroll.width}px`);
		}
		if (scroll.maxWidth != null) {
			this.setStyle('max-width', `${scroll.maxWidth}px`);
		}
		if (overflowY) {
			this.setStyle('overflow-y', 'auto');
		}
		if (overflowX) {
			this.setStyle('overflow-x', 'auto');
		}
		this.base = document.createElement('canvas');
		// `vexml-canvas` is the stable hook callers style to size/scale the rendered score. They style
		// this class (or the container), never the bare element — that keeps the overlay canvases
		// (`vexml-layer`) out of their selectors. vexml leaves `display` to the caller so the engraved
		// output stays byte-identical to a hand-placed canvas.
		this.base.className = 'vexml-canvas';
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

	// The visible scrollport box: the container's own client box (the same box overflow scrolls within).
	viewportRect(): DOMRect {
		return this.container.getBoundingClientRect();
	}

	// The Stage owns the container that scrolls; a lazily-created controller does the scrolling.
	get scroller(): ScrollController {
		this.scrollController ??= new ScrollController(this);
		return this.scrollController;
	}

	// The rest of the ScrollHost seam (frame() below completes it): the base canvas's offset within
	// the scroll content, the container's visible client size, and the scrollTo that moves the
	// scroll box.
	baseOffset(): { left: number; top: number } {
		return { left: this.base.offsetLeft, top: this.base.offsetTop };
	}

	clientSize(): { width: number; height: number } {
		return {
			width: this.container.clientWidth,
			height: this.container.clientHeight,
		};
	}

	scrollTo(options: ScrollToOptions): void {
		this.container.scrollTo(options);
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

	observeScroll(onScroll: () => void): () => void {
		// Capture phase on window catches every scroll container (the score's own or any ancestor),
		// since scroll events don't bubble. passive: we only read positions, never preventDefault.
		const handler = () => onScroll();
		window.addEventListener('scroll', handler, {
			capture: true,
			passive: true,
		});
		return () =>
			window.removeEventListener('scroll', handler, { capture: true });
	}

	createLayer(kind: LayerKind, zIndex?: number): Layer {
		const canvas = document.createElement('canvas');
		// Overlay absolutely positioned within the (positioned) container. Purely visual: pointer
		// events pass through to the container, where the Score hit-tests them — layers never capture
		// input. `vexml-layer` marks it as vexml-owned so caller `vexml-canvas` styles skip it.
		canvas.className = 'vexml-layer';
		canvas.style.position = 'absolute';
		canvas.style.pointerEvents = 'none';
		// The base canvas is in-flow at z-index 0. An explicit zIndex orders the layer against it
		// (negative drops behind, where it shows through the score's transparent pixels); otherwise a
		// background layer defaults behind and everything else stacks over it. Equal z-indexes fall
		// back to DOM order, which is creation order since layers are appended as created.
		if (zIndex !== undefined) {
			canvas.style.zIndex = String(zIndex);
		} else if (kind === 'background') {
			canvas.style.zIndex = '-1';
		}
		const layer = new ManagedLayer(kind, canvas, this);
		this.container.appendChild(canvas);
		this.layers.add(layer);
		this.sizeBitmap(layer);
		this.placeLayer(layer);
		return layer;
	}

	relayoutLayers(): void {
		for (const layer of this.layers) {
			// Viewport layers are tied to the visible box, so refit the bitmap (which clears them —
			// callers redraw in their resize handler). Content layers keep their fixed score-resolution
			// bitmap; only their on-screen box is re-placed, so the drawing scales without clearing.
			if (layer.kind === 'viewport') {
				this.sizeBitmap(layer);
			}
			this.placeLayer(layer);
		}
	}

	// Deregister a layer disposing itself (called from ManagedLayer.dispose).
	forget(layer: ManagedLayer): void {
		this.layers.delete(layer);
	}

	dispose(): void {
		this.scrollController?.dispose();
		for (const layer of [...this.layers]) {
			layer.dispose();
		}
		this.base.remove();
		this.container.style.position = this.prevPosition;
		this.container.style.isolation = this.prevIsolation;
		for (const [prop, value] of this.restoreStyles) {
			this.container.style.setProperty(prop, value);
		}
	}

	// Set a container style, remembering its prior value so dispose restores it (each prop set once).
	private setStyle(prop: string, value: string): void {
		this.restoreStyles.push([
			prop,
			this.container.style.getPropertyValue(prop),
		]);
		this.container.style.setProperty(prop, value);
	}

	// Size a layer's drawing bitmap. A content layer's bitmap is fixed to the engraved score (the
	// base canvas's intrinsic CSS box), so the caller always draws in score px — its element is then
	// stretched over the base's rendered box by placeLayer. A viewport bitmap matches the visible box.
	private sizeBitmap(layer: ManagedLayer): void {
		if (layer.kind !== 'viewport') {
			layer.resize(
				parseFloat(this.base.style.width) || 0,
				parseFloat(this.base.style.height) || 0,
			);
		} else {
			layer.resize(this.container.clientWidth, this.container.clientHeight);
		}
	}

	// Position and stretch a layer's on-screen box over the base canvas. A content layer covers the
	// base's *rendered* box (base.offset*, which reflect whatever CSS scaling the caller applied), so
	// a score-resolution bitmap lines up 1:1 with the engraving at any size. A viewport layer is
	// anchored at the base's offset but spans the container's visible box.
	private placeLayer(layer: ManagedLayer): void {
		const left = this.base.offsetLeft;
		const top = this.base.offsetTop;
		if (layer.kind !== 'viewport') {
			layer.place(left, top, this.base.offsetWidth, this.base.offsetHeight);
		} else {
			layer.place(
				left,
				top,
				this.container.clientWidth,
				this.container.clientHeight,
			);
		}
	}

	/*
	 * The live score-space -> client-space mapping: the canvas's page offset plus the scale
	 * between its rendered size and its score-space (CSS-px) size. Scale is 1 unless the caller
	 * stretched the canvas with CSS; the `|| 1` guards an unsized (empty-score) canvas so it
	 * maps 1:1 instead of dividing by zero. Public: it's part of the ScrollHost seam.
	 */
	frame(): { left: number; top: number; sx: number; sy: number } {
		const r = this.base.getBoundingClientRect();
		const w = parseFloat(this.base.style.width) || r.width || 1;
		const h = parseFloat(this.base.style.height) || r.height || 1;
		return { left: r.left, top: r.top, sx: r.width / w, sy: r.height / h };
	}
}
