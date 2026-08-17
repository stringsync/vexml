import { disposables, type Resource } from 'webappwiz/disposable';
import type { Rect } from '../../geometry';
import type { Layer, LayerKind } from '../layer/layer';
import { ManagedLayer } from '../layer/managed-layer';
import type { ScrollHost } from '../scroll-host/scroll-host';
import { ScrollController } from '../scroller/scroll-controller';
import type { Viewport } from '../viewport/viewport';
import type { Host } from './host';

/* The managed canvas's default on-screen size, injected once per document. Both rules are wrapped
 * in `:where()` so they carry zero specificity: a caller's own `.vexml-canvas { … }` overrides them
 * with no `!important`. The per-score intrinsic dimensions ride on the --vexml-width/height custom
 * properties the drawer sets.
 *
 * Base rule: render the score at its intrinsic size — what a hand-placed canvas would show, so
 * output stays byte-identical. `.vexml-fit` (added when the layout should scale to fit its
 * container — see Stage) then caps the canvas at the container width and lets its height follow via
 * the exact score aspect ratio (--vexml-aspect, not the rounded bitmap ratio), so a narrow viewport
 * shrinks the score to fit while a wide one lands on a pixel-identical box (the score<->client scale
 * stays exactly 1) and never blows it up past its engraved resolution. The canvas stays `inline`
 * throughout (no `display` set), so `text-align: center` on the container centers it. */
function ensureCanvasStyles(): void {
	if (document.head.querySelector('style[data-vexml-canvas-style]')) {
		return;
	}
	const style = document.createElement('style');
	style.setAttribute('data-vexml-canvas-style', '');
	style.textContent =
		':where(.vexml-canvas){width:var(--vexml-width);height:var(--vexml-height)}' +
		':where(.vexml-canvas.vexml-fit){max-width:100%;height:auto;aspect-ratio:var(--vexml-aspect)}';
	document.head.appendChild(style);
}

/* The caller's container options from config. A set height/width cap turns the container into a
 * scroll box on that axis; null leaves the axis to size to its content. backgroundColor paints the
 * container behind the score. `fit` scales the score down to fit the container width (never up past
 * its engraved size) and centers it — the default for a system-stacked layout that isn't a
 * horizontal scroll box (render() derives it). */
export interface ScrollBox {
	height?: number | null;
	maxHeight?: number | null;
	width?: number | null;
	maxWidth?: number | null;
	backgroundColor?: string | null;
	fit?: boolean;
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
	// At most one Stage owns a container's styles at a time. A re-render can mount the new Stage
	// before disposing the old (to avoid a blank flash), leaving two bound to one container; the
	// constructor uses this to tear the prior one down first, so each Stage captures the truly
	// restored styles and disposes unwind LIFO instead of stomping the newer Stage's setup.
	private static readonly byContainer = new WeakMap<HTMLDivElement, Stage>();

	readonly base: HTMLCanvasElement;
	private readonly prevPosition: string;
	private readonly prevIsolation: string;
	// Inline styles this stage set on the container, with their prior values, restored on dispose.
	private readonly restoreStyles: Array<[string, string]> = [];
	private readonly layers = new Set<ManagedLayer>();
	// Owns the smooth-scroll conflation state; created on first use of `scroller`.
	private scrollController: ScrollController | null = null;
	private disposed = false;

	constructor(
		readonly container: HTMLDivElement,
		scroll: ScrollBox = {},
	) {
		// Tear down any Stage still bound to this container before capturing prior styles, so this
		// Stage sees the container's true restored state (not the outgoing Stage's applied styles) and
		// re-owns the properties it needs.
		Stage.byContainer.get(container)?.dispose();
		Stage.byContainer.set(container, this);
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
		// setProperty ignores an invalid color, so an untrusted value can't break out of the style.
		if (scroll.backgroundColor) {
			this.setStyle('background-color', scroll.backgroundColor);
		}
		// Center the inline canvas in the container when fitting (text-align steers inline boxes; the
		// canvas stays inline so its intrinsic box is untouched). Absolutely-positioned overlay layers
		// ignore text-align, so only the score is centered.
		if (scroll.fit) {
			this.setStyle('text-align', 'center');
		}
		this.base = document.createElement('canvas');
		// `vexml-canvas` is the stable hook callers style to size/scale the rendered score. They style
		// this class (or the container), never the bare element — that keeps the overlay canvases
		// (`vexml-layer`) out of their selectors. The default on-screen size comes from the injected
		// zero-specificity `:where(.vexml-canvas)` rule, so a caller's own `.vexml-canvas` rule overrides
		// it without `!important`. `vexml-fit` adds the scale-to-container behavior (see ensureCanvasStyles).
		this.base.className = scroll.fit
			? 'vexml-canvas vexml-fit'
			: 'vexml-canvas';
		ensureCanvasStyles();
		container.appendChild(this.base);
	}

	// The cap is pure container CSS — the engraving doesn't depend on it — so this is a style write,
	// not a re-layout. The resize observer picks up the new container box and relayouts the overlays.
	// Once capped the container keeps overflow-y:auto; with no cap there's nothing to overflow.
	setMaxHeight(px: number | null): void {
		this.setStyle('max-height', px == null ? '' : `${px}px`);
		if (px != null) {
			this.setStyle('overflow-y', 'auto');
		}
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
	): Resource {
		// Observe BOTH the container and the base canvas. Placement (placeLayer and the score<->client
		// frame) is derived from the base canvas's rendered box, which can change *without* the
		// container's box changing — e.g. the Bravura web font finishing load and reflowing the
		// engraving taller, or content-height settling inside a fixed-size scroll box. Observing only
		// the container misses those, leaving overlays and the cursor placed against a stale base box.
		// Observing the base can't self-trigger: consumers only move absolutely-positioned overlay
		// canvases (relayoutLayers) or reposition the cursor, none of which affect the base or
		// container layout, so there's no feedback loop.
		//
		// Report the container's visible (client) box regardless of which target fired — that's the
		// size a viewport layer is given and the "rendered area" a caller cares about. A base-only
		// change reports the (unchanged) container size; the consumer dedupes its public 'resize' on it.
		const observer = new ResizeObserver(() => {
			onResize({
				width: this.container.clientWidth,
				height: this.container.clientHeight,
			});
		});
		observer.observe(this.container);
		observer.observe(this.base);
		return disposables.callback(() => observer.disconnect());
	}

	observeScroll(onScroll: () => void): Resource {
		// Capture phase on window catches every scroll container (the score's own or any ancestor),
		// since scroll events don't bubble. passive: we only read positions, never preventDefault.
		const handler = () => onScroll();
		window.addEventListener('scroll', handler, {
			capture: true,
			passive: true,
		});
		return disposables.callback(() =>
			window.removeEventListener('scroll', handler, { capture: true }),
		);
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
		// Idempotent: a re-render disposes this Stage from the new Stage's constructor, so the caller's
		// own later dispose() must be a no-op rather than re-restoring stale styles over the new Stage.
		if (this.disposed) {
			return;
		}
		this.disposed = true;
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
		// Only deregister if still the owner: a newer Stage may have already claimed this container.
		if (Stage.byContainer.get(this.container) === this) {
			Stage.byContainer.delete(this.container);
		}
	}

	// Set a container style, remembering its prior value so dispose restores it (each prop set once).
	private setStyle(prop: string, value: string): void {
		// Record the caller's original once per property: restoreStyles replays forward on dispose, so
		// a second entry for the same prop would restore this Stage's own value instead of theirs.
		if (!this.restoreStyles.some(([p]) => p === prop)) {
			this.restoreStyles.push([
				prop,
				this.container.style.getPropertyValue(prop),
			]);
		}
		this.container.style.setProperty(prop, value);
	}

	// Size a layer's drawing bitmap. A content layer's bitmap is fixed to the engraved score (the
	// base canvas's intrinsic CSS box), so the caller always draws in score px — its element is then
	// stretched over the base's rendered box by placeLayer. A viewport bitmap matches the visible box.
	private sizeBitmap(layer: ManagedLayer): void {
		if (layer.kind !== 'viewport') {
			const { width, height } = this.intrinsicSize();
			layer.resize(width, height);
		} else {
			layer.resize(this.container.clientWidth, this.container.clientHeight);
		}
	}

	// The score-space (intrinsic) CSS size of the engraving, read from the --vexml-width/height custom
	// properties the drawer publishes. This is the fixed layout size the score was drawn at, distinct
	// from the base canvas's on-screen box (which the caller's CSS may have scaled). 0 before a draw.
	private intrinsicSize(): { width: number; height: number } {
		const style = this.base.style;
		return {
			width: parseFloat(style.getPropertyValue('--vexml-width')) || 0,
			height: parseFloat(style.getPropertyValue('--vexml-height')) || 0,
		};
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
		const intrinsic = this.intrinsicSize();
		const w = intrinsic.width || r.width || 1;
		const h = intrinsic.height || r.height || 1;
		return { left: r.left, top: r.top, sx: r.width / w, sy: r.height / h };
	}
}
