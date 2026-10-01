import { Dispatcher } from 'webappwiz/events';
import { Rect } from 'webappwiz/geometry';
import { CanvasPaintProbe } from './canvas-paint-probe';
import { FOLD_SHADOW_WIDTH, TILE_BUDGET, TILE_SIZE } from './constants';
import type { Fold } from './fold';
import type { Host, HostEventMap } from './host';
import type { Layer, LayerKind } from './layer';
import type { LoupeOptions } from './loupe';
import { ManagedLayer } from './managed-layer';
import { ManagedLoupe } from './managed-loupe';
import { ManagedMarker, type MarkerFrame } from './managed-marker';
import type { PagePainter } from './page-painter';
import type { PaintProbe } from './paint-probe';
import type { Engraving } from './score-drawer';
import { ScrollController } from './scroll-controller';
import type { ScrollHost } from './scroll-host';
import { TiledLayer } from './tiled-layer';
import { TiledSurface, type TiledSurfaceOptions } from './tiled-surface';
import type { Viewport } from './viewport';

/* The caller's container options from config. A set height/width cap turns the container into a
 * scroll box on that axis; null leaves the axis to size to its content. backgroundColor paints the
 * container behind the score. `fit` scales the score down to fit the container width (never up past
 * its engraved size) and centers it — the default for a system-stacked layout that isn't a
 * horizontal scroll box (render() derives it). `scrollContainer` names a caller-owned ancestor that
 * does the scrolling instead of the container (see Stage.scrollElement). */
export interface ScrollBox {
	height?: number | null;
	maxHeight?: number | null;
	width?: number | null;
	maxWidth?: number | null;
	backgroundColor?: string | null;
	// Device px per CSS px the score is painted at; null follows window.devicePixelRatio.
	pixelRatio?: number | null;
	fit?: boolean;
	scrollContainer?: HTMLElement | null;
}

/*
 * The host: the DOM vexml builds inside the caller's container, and the coordinate authority
 * between score space (where target rects live) and client/page space (where pointer events and
 * DOM popups live). The caller hands render() a <div>; the Stage owns the element the score is
 * shown in and never exposes it to callers: they see only the Score.
 *
 * The base element (`.vexml-canvas`) is an in-flow inline box, top-aligned so the container sizes
 * to the engraving exactly, with no empty descender strip under it. The engraving is painted into
 * it as a tiled surface (see TiledSurface): one canvas can't hold a long score. Custom layers stack
 * over it as absolute overlays. The transform falls out of the base element's own
 * getBoundingClientRect: score space is its CSS-pixel space with the origin at its top-left.
 * Reading the live rect each call means page scroll and any CSS scaling of it are handled for free.
 */

export class Stage implements Viewport, Host, ScrollHost, PagePainter {
	// At most one Stage owns a container's styles at a time. A re-render can mount the new Stage
	// before disposing the old (to avoid a blank flash), leaving two bound to one container; the
	// constructor uses this to tear the prior one down first, so each Stage captures the truly
	// restored styles and disposes unwind LIFO instead of stomping the newer Stage's setup.
	private static readonly byContainer = new WeakMap<HTMLDivElement, Stage>();

	readonly base: HTMLDivElement;
	readonly probe: PaintProbe;
	// The engraving, painted into the base element.
	private readonly engraving: TiledSurface;
	// The score-px region tiled surfaces paint, from the last measure of the view (see updateView).
	private view: Rect | null = null;
	// A view update waiting on the next frame, so a scroll measures and paints once per frame.
	private viewRequest: number | null = null;
	// The element whose scrollport a cursor measures and scrolls: the caller's scrollContainer when
	// they render into a box inside their own scroller, else the container itself.
	private readonly scrollElement: HTMLElement;
	private readonly dispatcher = new Dispatcher<HostEventMap>();
	readonly events = this.dispatcher.events;
	// Watches the container and the base canvas; created with the Stage, disconnected on dispose.
	private readonly resizeObserver: ResizeObserver;
	// The window scroll listener behind the `scroll` event, removed on dispose.
	private readonly onWindowScroll = () => {
		// A viewport layer over a caller's scroller tracks its visible box, which slides across the
		// container as the scroller moves (a container that scrolls itself keeps it where it is).
		if (this.scrollElement !== this.container) {
			for (const layer of this.layers) {
				if (layer.kind === 'viewport') {
					this.placeLayer(layer);
				}
			}
		}
		this.updateFold();
		this.requestView();
		this.dispatcher.dispatch('scroll');
	};
	// The part of the score in view follows the window's size too, so a resize repaints like a scroll.
	private readonly onWindowResize = () => {
		this.requestView();
	};
	private readonly prevPosition: string;
	private readonly prevIsolation: string;
	// Inline styles this stage set on the container, with their prior values, restored on dispose.
	private readonly restoreStyles: Array<[string, string]> = [];
	private readonly layers = new Set<ManagedLayer | TiledLayer>();
	private readonly markers = new Set<ManagedMarker>();
	private readonly loupes = new Set<ManagedLoupe>();
	// Counts overlays (layers and markers) as they're appended, so a loupe can paint equal z-indexes
	// in the DOM order the browser stacks them in.
	private overlays = 0;
	// Owns the smooth-scroll conflation state; created on first use of `scroller`.
	private scrollController: ScrollController | null = null;
	// The sticky panoramic fold (see setFold), or null when the score has none. `track` wraps the
	// base canvas so the fold's sticky range spans the whole score; `index` is the strip painted.
	private fold: {
		fold: Fold;
		track: HTMLDivElement;
		element: HTMLDivElement;
		canvas: HTMLCanvasElement;
		index: number;
		shown: boolean;
		// The scroller's left padding, which the fold's paper reaches back over (see placeFold).
		pad: number;
	} | null = null;
	// The paper color a fold is painted on when the config sets no backgroundColor.
	private readonly backgroundColor: string | null;
	// The configured pixel ratio, or null to follow the screen's.
	private readonly fixedPixelRatio: number | null;
	private disposed = false;

	constructor(
		readonly container: HTMLDivElement,
		scroll: ScrollBox,
	) {
		// Tear down any Stage still bound to this container before capturing prior styles, so this
		// Stage sees the container's true restored state (not the outgoing Stage's applied styles) and
		// re-owns the properties it needs.
		Stage.byContainer.get(container)?.dispose();
		Stage.byContainer.set(container, this);
		this.scrollElement = scroll.scrollContainer ?? container;
		this.backgroundColor = scroll.backgroundColor ?? null;
		this.fixedPixelRatio = scroll.pixelRatio ?? null;
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
		// The score is a picture to point at, not text: a press held on it (the start of a drag on a
		// touch screen) must not start a native text selection or the iOS callout. Set on the
		// container so it covers the canvas and every overlay vexml stacks in it. Only the prefixed
		// name: Safari needs it, the others alias it to user-select, and setting both would record
		// the alias's already-changed value as the one to restore.
		this.setStyle('-webkit-user-select', 'none');
		this.setStyle('-webkit-touch-callout', 'none');
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
		this.base = document.createElement('div');
		// `vexml-canvas` is the stable hook callers style to size/scale the rendered score. They style
		// this class (or the container), never the bare element, which keeps the overlays
		// (`vexml-layer`) out of their selectors. The default on-screen size comes from the injected
		// zero-specificity `:where(.vexml-canvas)` rule, so a caller's own `.vexml-canvas` rule overrides
		// it without `!important`. `vexml-fit` adds the scale-to-container behavior (see ensureCanvasStyles).
		// The name predates the tiles: it was one canvas, and callers' stylesheets still select it.
		this.base.className = scroll.fit
			? 'vexml-canvas vexml-fit'
			: 'vexml-canvas';
		// Inline, not in the overridable rule: the tiles inside are laid out against this box.
		this.base.style.display = 'inline-block';
		this.base.style.position = 'relative';
		this.base.style.overflow = 'hidden';
		this.ensureCanvasStyles();
		container.appendChild(this.base);
		this.probe = new CanvasPaintProbe();
		this.engraving = new TiledSurface(
			this.base,
			this.probe,
			surfaceOptions(this.pixelRatio),
		);

		// Observe BOTH the container and the base canvas. Placement (placeLayer and the score<->client
		// frame) is derived from the base canvas's rendered box, which can change *without* the
		// container's box changing — e.g. the Bravura web font finishing load and reflowing the
		// engraving taller, or content-height settling inside a fixed-size scroll box. Observing only
		// the container misses those, leaving overlays and the cursor placed against a stale base box.
		// Observing the base can't self-trigger: listeners only move absolutely-positioned overlay
		// canvases (relayoutLayers) or reposition the cursor, none of which affect the base or
		// container layout, so there's no feedback loop.
		//
		// Report the scroll element's visible (client) box regardless of which target fired — that's
		// the size a viewport layer is given and the "rendered area" a caller cares about (the container
		// itself unless the caller named a scrollContainer). A base-only change reports the unchanged
		// size; the listener dedupes its public 'resize' on it.
		this.resizeObserver = new ResizeObserver(() => {
			this.dispatcher.dispatch('resize', {
				width: this.scrollElement.clientWidth,
				height: this.scrollElement.clientHeight,
			});
		});
		this.resizeObserver.observe(container);
		this.resizeObserver.observe(this.base);
		// A caller-owned scroller can resize on its own (a window resize): the cursor re-tests visibility
		// against it and viewport layers refit to it.
		if (this.scrollElement !== container) {
			this.resizeObserver.observe(this.scrollElement);
		}

		// Capture phase on window catches every scroll container (the score's own or any ancestor),
		// since scroll events don't bubble. passive: we only read positions, never preventDefault.
		window.addEventListener('scroll', this.onWindowScroll, {
			capture: true,
			passive: true,
		});
		window.addEventListener('resize', this.onWindowResize);
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
	get dom(): EventTarget {
		return this.container;
	}

	// The native scroll event doesn't bubble, so it's bound on whichever element scrolls.
	get scrollTarget(): EventTarget {
		return this.scrollElement;
	}

	get scroll(): { left: number; top: number } {
		return {
			left: this.scrollElement.scrollLeft,
			top: this.scrollElement.scrollTop,
		};
	}

	// The visible scrollport box: the scroll element's own box (the same box overflow scrolls within),
	// less the strip a sticky fold covers at its left edge — music under the fold isn't visible.
	viewportRect(): DOMRect {
		const box = this.scrollElement.getBoundingClientRect();
		const inset = this.fold
			? this.scrollElement.clientLeft + this.leftInset()
			: 0;
		return new DOMRect(
			box.left + inset,
			box.top,
			Math.max(0, box.width - inset),
			box.height,
		);
	}

	// How much of the scrollport's left edge a sticky fold covers, in client px from its padding
	// edge (0 without one).
	leftInset(): number {
		return this.fold
			? this.fold.pad + this.fold.fold.width * this.frame().sx
			: 0;
	}

	// Whether a client point lands on the fold, where the music it covers can't be pointed at.
	obscures(clientX: number, clientY: number): boolean {
		if (!this.fold?.shown) {
			return false;
		}
		const r = this.fold.element.getBoundingClientRect();
		return (
			clientX >= r.left &&
			clientX < r.right &&
			clientY >= r.top &&
			clientY < r.bottom
		);
	}

	/*
	 * Pin a fold at the scroll box's left edge. The base canvas moves into a max-content wrapper
	 * beside a `position: sticky` strip: sticky is what keeps the fold still while the browser
	 * scrolls (a script-moved overlay lags a compositor scroll), and it can only travel as far as
	 * its parent is wide — the container is only as wide as its scrollport, the wrapper as wide as
	 * the score. It stays hidden while any of the system's own opening is still in view, then
	 * paints whichever strip is in effect.
	 */
	setFold(fold: Fold): void {
		this.clearFold();
		const track = document.createElement('div');
		track.className = 'vexml-fold-track';
		track.style.display = 'flex';
		track.style.alignItems = 'flex-start';
		track.style.width = 'max-content';
		const element = document.createElement('div');
		element.className = 'vexml-fold';
		element.style.position = 'sticky';
		element.style.left = '0';
		// Over the score and every auto-stacked layer and marker, so a cursor slides under it.
		element.style.zIndex = '1';
		element.style.flex = 'none';
		// Sized as its strip plus the padding it reaches over, whatever the page's box-sizing.
		element.style.boxSizing = 'content-box';
		element.style.pointerEvents = 'none';
		element.style.visibility = 'hidden';
		// Paper and crease are CSS variables so a caller's stylesheet can restyle them from the
		// container or any ancestor; the fallbacks are what vexml picks on its own.
		element.style.backgroundColor = `var(--vexml-fold-background, ${this.paperColor()})`;
		const canvas = document.createElement('canvas');
		canvas.style.display = 'block';
		canvas.style.width = '100%';
		canvas.style.height = '100%';
		// The fold's shadow on the music beside it: the crease where the page turns under.
		const shadow = document.createElement('div');
		shadow.className = 'vexml-fold-shadow';
		shadow.style.position = 'absolute';
		shadow.style.top = '0';
		shadow.style.bottom = '0';
		shadow.style.left = '100%';
		shadow.style.width = `var(--vexml-fold-shadow-width, ${FOLD_SHADOW_WIDTH}px)`;
		shadow.style.background =
			'var(--vexml-fold-shadow, linear-gradient(to right, rgba(0, 0, 0, 0.14), rgba(0, 0, 0, 0)))';
		element.append(canvas, shadow);
		this.container.insertBefore(track, this.base);
		track.append(element, this.base);
		this.fold = {
			fold,
			track,
			element,
			canvas,
			index: -1,
			shown: false,
			pad: 0,
		};
		this.placeFold();
	}

	/* Device px per CSS px everything vexml paints is drawn at: the configured pixelRatio, else the
	 * screen's. */
	get pixelRatio(): number {
		return this.fixedPixelRatio ?? (window.devicePixelRatio || 1);
	}

	// The Stage owns the container that scrolls; a lazily-created controller does the scrolling.
	get scroller(): ScrollController {
		this.scrollController ??= new ScrollController(this);
		return this.scrollController;
	}

	// The rest of the ScrollHost seam (frame() below completes it): the base canvas's offset within
	// the scroll content, the scroll element's visible client size, and the scrollTo that moves it.
	baseOffset(): { left: number; top: number } {
		if (this.scrollElement === this.container) {
			return { left: this.base.offsetLeft, top: this.base.offsetTop };
		}
		// The container isn't the scroll content's origin, and the scroller needn't be the base's
		// offsetParent, so measure: the base's client offset from the scroller's padding edge (inside
		// its border), shifted by how far the scroller has already scrolled.
		const base = this.base.getBoundingClientRect();
		const el = this.scrollElement;
		const box = el.getBoundingClientRect();
		return {
			left: base.left - box.left - el.clientLeft + el.scrollLeft,
			top: base.top - box.top - el.clientTop + el.scrollTop,
		};
	}

	clientSize(): { width: number; height: number } {
		return {
			width: this.scrollElement.clientWidth,
			height: this.scrollElement.clientHeight,
		};
	}

	scrollTo(options: ScrollToOptions): void {
		this.scrollElement.scrollTo(options);
	}

	createLayer(kind: LayerKind, zIndex?: number): Layer {
		// A viewport layer is only as big as the visible box, so one canvas holds it. A content or
		// background layer spans the score, so it tiles like the engraving does.
		const element = document.createElement(
			kind === 'viewport' ? 'canvas' : 'div',
		);
		// Overlay absolutely positioned within the (positioned) container. Purely visual: pointer
		// events pass through to the container, where the Score hit-tests them; layers never capture
		// input. `vexml-layer` marks it as vexml-owned so caller `vexml-canvas` styles skip it.
		element.className = 'vexml-layer';
		element.style.position = 'absolute';
		element.style.pointerEvents = 'none';
		// The base element sits at z-index 0. An explicit zIndex orders the layer against it
		// (negative drops behind, where it shows through the score's transparent pixels); otherwise a
		// background layer defaults behind and everything else stacks over it. Equal z-indexes fall
		// back to DOM order, which is creation order since layers are appended as created.
		const z = zIndex ?? (kind === 'background' ? -1 : undefined);
		if (z !== undefined) {
			element.style.zIndex = String(z);
		}
		const layer =
			element instanceof HTMLCanvasElement
				? new ManagedLayer(kind, element, this, z ?? 0, this.overlays++)
				: new TiledLayer(
						kind,
						element as HTMLDivElement,
						new TiledSurface(
							element,
							this.probe,
							surfaceOptions(this.pixelRatio),
						),
						this,
						z ?? 0,
						this.overlays++,
					);
		this.container.appendChild(element);
		this.layers.add(layer);
		this.sizeBitmap(layer);
		this.placeLayer(layer);
		if (layer instanceof TiledLayer && this.view) {
			layer.surface.show(this.view);
		}
		return layer;
	}

	/* Show the recorded engraving in the base element. */
	engrave(engraving: Engraving): void {
		const { ops, width, height, origin } = engraving;
		// Publish the score-space (intrinsic) CSS size as custom properties rather than as inline
		// width/height. The stage's default `:where(.vexml-canvas)` rule consumes them for the
		// on-screen size, but at zero specificity, so a caller's own `.vexml-canvas { width: 100% }`
		// overrides it without `!important`, letting the score scale to its container.
		// frame()/sizeBitmap read these same properties for the intrinsic dimensions the
		// score<->client transform needs.
		//
		// --vexml-aspect is the exact score-space width/height ratio. The rules use it as
		// `aspect-ratio` so a height:auto box keeps exactly the intrinsic size at full width (the
		// score<->client scale stays exactly 1) yet still scales proportionally when narrowed.
		this.base.style.setProperty('--vexml-width', `${width}px`);
		this.base.style.setProperty('--vexml-height', `${height}px`);
		this.base.style.setProperty('--vexml-aspect', `${width / height}`);
		this.engraving.load(ops, width, height, origin);
		this.fitEngraving();
		this.updateView();
	}

	createMarker(zIndex?: number): ManagedMarker {
		const el = document.createElement('div');
		// Anchored at the container's top-left and moved by transform, so a move never lays out.
		// Purely visual, like a layer: pointer events pass through to the container.
		el.className = 'vexml-marker';
		el.style.position = 'absolute';
		el.style.left = '0';
		el.style.top = '0';
		el.style.pointerEvents = 'none';
		el.style.willChange = 'transform';
		// Ordered against the base canvas like a layer: negative sits behind the engraving.
		if (zIndex !== undefined) {
			el.style.zIndex = String(zIndex);
		}
		const marker = new ManagedMarker(
			el,
			this.markerFrame(),
			this,
			zIndex ?? 0,
			this.overlays++,
		);
		this.container.appendChild(el);
		this.markers.add(marker);
		return marker;
	}

	createLoupe(options: Required<LoupeOptions>): ManagedLoupe {
		const canvas = document.createElement('canvas');
		// On the body, not in the container: fixed to the viewport over the whole page, so neither
		// the container's overflow nor a transformed ancestor can clip or re-anchor it. A manual
		// popover goes in the top layer when shown, above every z-index on the page and any modal
		// dialog; the popover's own box styles are undone. Without popovers, the highest z-index.
		canvas.className = 'vexml-loupe';
		if ('popover' in canvas) {
			canvas.popover = 'manual';
			canvas.style.margin = '0';
			canvas.style.padding = '0';
			canvas.style.border = 'none';
			canvas.style.background = 'transparent';
		}
		canvas.style.position = 'fixed';
		canvas.style.inset = '0 auto auto 0';
		canvas.style.zIndex = '2147483647';
		canvas.style.pointerEvents = 'none';
		canvas.style.willChange = 'transform';
		canvas.style.display = 'none';
		canvas.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.3)';
		const loupe = new ManagedLoupe(canvas, options, this);
		document.body.appendChild(canvas);
		this.loupes.add(loupe);
		return loupe;
	}

	/*
	 * Paint what the score shows over `region` (score px) into a context already mapped to score
	 * space: the base engraving, the content and background layers, and the markers, stacked as the
	 * browser stacks them — negative z-indexes behind the in-flow base canvas, the rest over it, equal
	 * z-indexes in DOM order. Viewport layers and the fold are chrome over the view, not the score.
	 */
	paintScore(ctx: CanvasRenderingContext2D, region: Rect): void {
		const overlays: Array<TiledLayer | ManagedMarker> = [...this.markers];
		for (const layer of this.layers) {
			if (layer instanceof TiledLayer) {
				overlays.push(layer);
			}
		}
		overlays.sort((a, b) => a.zIndex - b.zIndex || a.order - b.order);
		const paint = (overlay: TiledLayer | ManagedMarker) => {
			if (overlay instanceof ManagedMarker) {
				overlay.paint(ctx);
			} else {
				overlay.surface.paintInto(ctx, region);
			}
		};
		let behind = true;
		for (const overlay of overlays) {
			if (behind && overlay.zIndex >= 0) {
				behind = false;
				this.engraving.paintInto(ctx, region);
			}
			paint(overlay);
		}
		if (behind) {
			this.engraving.paintInto(ctx, region);
		}
	}

	/* Paint the engraving alone, no overlays, over `region` (see PagePainter). */
	paintEngraving(
		ctx: CanvasRenderingContext2D,
		region: Rect,
		scale: number,
	): void {
		if (this.disposed) {
			throw new Error('vexml: the score was disposed');
		}
		this.engraving.paintInto(ctx, region, scale);
	}

	relayoutLayers(): void {
		this.placeFold();
		this.fitEngraving();
		if (this.markers.size > 0) {
			const frame = this.markerFrame();
			for (const marker of this.markers) {
				marker.relayout(frame);
			}
		}
		for (const layer of this.layers) {
			// Viewport layers are tied to the visible box, so refit the bitmap (which clears them —
			// callers redraw in their resize handler). Content layers keep their fixed score-resolution
			// bitmap; only their on-screen box is re-placed, so the drawing scales without clearing.
			if (layer.kind === 'viewport') {
				this.sizeBitmap(layer);
			}
			this.placeLayer(layer);
		}
		this.updateView();
	}

	// Deregister a layer disposing itself (called from its dispose).
	forget(layer: ManagedLayer | TiledLayer): void {
		this.layers.delete(layer);
	}

	// Deregister a marker disposing itself (called from ManagedMarker.dispose).
	forgetMarker(marker: ManagedMarker): void {
		this.markers.delete(marker);
	}

	// Deregister a loupe disposing itself (called from ManagedLoupe.dispose).
	forgetLoupe(loupe: ManagedLoupe): void {
		this.loupes.delete(loupe);
	}

	dispose(): void {
		// Idempotent: a re-render disposes this Stage from the new Stage's constructor, so the caller's
		// own later dispose() must be a no-op rather than re-restoring stale styles over the new Stage.
		if (this.disposed) {
			return;
		}
		this.disposed = true;
		if (this.viewRequest !== null) {
			cancelAnimationFrame(this.viewRequest);
			this.viewRequest = null;
		}
		this.resizeObserver.disconnect();
		window.removeEventListener('scroll', this.onWindowScroll, {
			capture: true,
		});
		window.removeEventListener('resize', this.onWindowResize);
		this.dispatcher.dispose();
		this.scrollController?.dispose();
		for (const layer of [...this.layers]) {
			layer.dispose();
		}
		for (const marker of [...this.markers]) {
			marker.dispose();
		}
		for (const loupe of [...this.loupes]) {
			loupe.dispose();
		}
		this.clearFold();
		// Frees the tile bitmaps now, not at the next GC: a re-render has the outgoing and incoming
		// scores alive together, and iOS WebKit kills the page past its canvas budget.
		this.engraving.dispose();
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

	// Size the fold to the base canvas's rendered scale (a caller's CSS may stretch the score), then
	// repaint it: resizing a canvas clears it. Sticky pins inside the scroller's padding, which would
	// leave the music scrolling past in a strip beside the fold, so the paper reaches back over the
	// padding to the scroller's edge while the strip itself stays where the opening sat. It reaches
	// over the container's top and bottom padding too — and down to its bottom edge when the
	// container is taller than the score — so the fold runs the whole height of the page rather
	// than stopping where the engraving does.
	private placeFold(): void {
		if (!this.fold) {
			return;
		}
		const { fold, element, canvas } = this.fold;
		const { sx, sy } = this.frame();
		const pad =
			parseFloat(getComputedStyle(this.scrollElement).paddingLeft) || 0;
		this.fold.pad = pad;
		const box = getComputedStyle(this.container);
		const top = parseFloat(box.paddingTop) || 0;
		const bottom = Math.max(
			parseFloat(box.paddingBottom) || 0,
			this.container.clientHeight - top - fold.height * sy,
		);
		element.style.left = `${-pad}px`;
		element.style.paddingLeft = `${pad}px`;
		// Negative margins cancel the reach, so the wrapper stays exactly as tall as the score.
		element.style.paddingTop = `${top}px`;
		element.style.marginTop = `${-top}px`;
		element.style.paddingBottom = `${bottom}px`;
		element.style.marginBottom = `${-bottom}px`;
		element.style.width = `${fold.width * sx}px`;
		element.style.height = `${fold.height * sy}px`;
		// In flow the strip starts where the fold does in the score, and takes no room from it.
		element.style.marginLeft = `${fold.left * sx - pad}px`;
		element.style.marginRight = `${-(fold.left + fold.width) * sx}px`;
		const dpr = this.pixelRatio;
		canvas.width = Math.round(fold.width * sx * dpr);
		canvas.height = Math.round(fold.height * sy * dpr);
		this.fold.index = -1;
		this.updateFold();
	}

	// Show the fold only once the system's own clefs and keys have scrolled wholly out of view, so
	// the two never show at once, and paint the strip for whatever the fold now covers — the clef
	// and key in effect at its right edge. A score that barely scrolls never gets a fold.
	private updateFold(): void {
		if (!this.fold) {
			return;
		}
		const { fold, element, canvas } = this.fold;
		const el = this.scrollElement;
		const edge = el.getBoundingClientRect().left + el.clientLeft;
		const { left, sx } = this.frame();
		const pad = this.fold.pad;
		const shown = left + (fold.left + fold.width) * sx <= edge + 0.5;
		if (shown !== this.fold.shown) {
			this.fold.shown = shown;
			element.style.visibility = shown ? 'visible' : 'hidden';
		}
		if (!shown) {
			return;
		}
		const index = fold.indexAt((edge + pad - left) / sx + fold.width);
		if (index === this.fold.index) {
			return;
		}
		this.fold.index = index;
		const context = canvas.getContext('2d');
		if (!context) {
			return;
		}
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.clearRect(0, 0, canvas.width, canvas.height);
		// Score space onto the bitmap: device px per score px, with the strip's left edge at 0.
		const kx = canvas.width / fold.width;
		const ky = canvas.height / fold.height;
		context.setTransform(kx, 0, 0, ky, -fold.left * kx, 0);
		fold.paint(context, index);
	}

	// Take the fold down and put the base canvas back where it was.
	private clearFold(): void {
		if (!this.fold) {
			return;
		}
		const { track, canvas } = this.fold;
		// The caller may have emptied the container already (a re-render into it does), taking the
		// wrapper with it; then there's nowhere to put the base back.
		if (track.parentNode) {
			track.replaceWith(this.base);
		}
		canvas.width = 0;
		canvas.height = 0;
		this.fold = null;
	}

	// The paper under the fold (or a loupe): the configured background, else the nearest painted
	// background behind the container, else white. A transparent background counts as none: a page
	// that paints its own paper behind the score (e.g. from a pseudo-element, which no walk up the
	// ancestors can see) passes one. The fold has to be opaque to cover the music under it.
	paperColor(): string {
		if (this.backgroundColor && !isClear(this.backgroundColor)) {
			return this.backgroundColor;
		}
		for (
			let el: HTMLElement | null = this.container;
			el;
			el = el.parentElement
		) {
			const color = getComputedStyle(el).backgroundColor;
			if (color && !isClear(color)) {
				return color;
			}
		}
		return '#ffffff';
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

	// Size a layer's drawing surface. A content layer is fixed to the engraved score (the base
	// element's intrinsic CSS box), so the caller always draws in score px; its element is then
	// stretched over the base's rendered box by placeLayer. A viewport bitmap matches the visible box.
	private sizeBitmap(layer: ManagedLayer | TiledLayer): void {
		if (layer instanceof TiledLayer) {
			const { width, height } = this.intrinsicSize();
			layer.surface.resize(width, height);
		} else {
			layer.resize(
				this.scrollElement.clientWidth,
				this.scrollElement.clientHeight,
			);
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
	// anchored at the base's offset but spans the container's visible box; over a caller's scroller it
	// covers that scroller's visible (padding) box instead, mapped into the container's coordinates.
	private placeLayer(layer: ManagedLayer | TiledLayer): void {
		const left = this.base.offsetLeft;
		const top = this.base.offsetTop;
		if (layer.kind !== 'viewport') {
			layer.place(left, top, this.base.offsetWidth, this.base.offsetHeight);
		} else if (this.scrollElement === this.container) {
			layer.place(
				left,
				top,
				this.container.clientWidth,
				this.container.clientHeight,
			);
		} else {
			const el = this.scrollElement;
			const view = el.getBoundingClientRect();
			const box = this.container.getBoundingClientRect();
			layer.place(
				view.left + el.clientLeft - box.left - this.container.clientLeft,
				view.top + el.clientTop - box.top - this.container.clientTop,
				el.clientWidth,
				el.clientHeight,
			);
		}
	}

	// Score space -> the container's coordinates, which is what an absolutely positioned child is
	// placed in: the base canvas's offset within the container and its CSS scale (content layers are
	// stretched over the same box in placeLayer).
	private markerFrame(): MarkerFrame {
		const { width, height } = this.intrinsicSize();
		return {
			left: this.base.offsetLeft,
			top: this.base.offsetTop,
			sx: width > 0 ? this.base.offsetWidth / width : 1,
			sy: height > 0 ? this.base.offsetHeight / height : 1,
		};
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

	// The score-px region the tiled surfaces keep painted: what shows of the score through the
	// window and the scroll box, and a view's worth on every side, so a scroll lands on painted
	// tiles. A score that fits its budget is painted whole whatever this says.
	private updateView(): void {
		const { left, top, sx, sy } = this.frame();
		const port = this.viewportRect();
		const x0 = Math.max(port.left, 0);
		const y0 = Math.max(port.top, 0);
		const w = Math.max(0, Math.min(port.right, window.innerWidth) - x0);
		const h = Math.max(0, Math.min(port.bottom, window.innerHeight) - y0);
		this.view =
			sx > 0 && sy > 0
				? new Rect(
						(x0 - w - left) / sx,
						(y0 - h - top) / sy,
						(3 * w) / sx,
						(3 * h) / sy,
					)
				: Rect.zero();
		this.engraving.show(this.view);
		for (const layer of this.layers) {
			if (layer instanceof TiledLayer) {
				layer.surface.show(this.view);
			}
		}
	}

	// The base's laid-out size, unrounded: offsetWidth rounds to whole px, and a score 932.4px wide
	// stretched to 932 would blur every tile under a scale of 0.9996.
	private fitEngraving(): void {
		const style = getComputedStyle(this.base);
		this.engraving.fit(
			parseFloat(style.width) || 0,
			parseFloat(style.height) || 0,
		);
	}

	private requestView(): void {
		this.viewRequest ??= requestAnimationFrame(() => {
			this.viewRequest = null;
			this.updateView();
		});
	}

	/* The managed canvas's default on-screen size, injected once per document. Both rules are wrapped
	 * in `:where()` so they carry zero specificity: a caller's own `.vexml-canvas { … }` overrides them
	 * with no `!important`. The per-score intrinsic dimensions ride on the --vexml-width/height custom
	 * properties the drawer sets.
	 *
	 * Base rule: render the score at its intrinsic size. `.vexml-fit` (added when the layout should scale to fit its
	 * container — see Stage) then caps the canvas at the container width and lets its height follow via
	 * the exact score aspect ratio (--vexml-aspect, not the rounded bitmap ratio), so a narrow viewport
	 * shrinks the score to fit while a wide one lands on a pixel-identical box (the score<->client scale
	 * stays exactly 1) and never blows it up past its engraved resolution. The base rule carries the
	 * aspect ratio too: the box has no intrinsic ratio of its own (it was a canvas once), so a caller's
	 * `height: auto` needs it to follow their width. The box is `inline-block`, so `text-align: center`
	 * on the container centers it; top-aligning it drops the descender strip a baseline-aligned inline
	 * box leaves under it, so the container is exactly as tall as the engraving. */
	private ensureCanvasStyles(): void {
		if (document.head.querySelector('style[data-vexml-canvas-style]')) {
			return;
		}
		const style = document.createElement('style');
		style.setAttribute('data-vexml-canvas-style', '');
		style.textContent =
			':where(.vexml-canvas){width:var(--vexml-width);height:var(--vexml-height);aspect-ratio:var(--vexml-aspect);vertical-align:top}' +
			':where(.vexml-canvas.vexml-fit){max-width:100%;height:auto;aspect-ratio:var(--vexml-aspect)}';
		document.head.appendChild(style);
	}
}

// Tiles at the stage's resolution: each is small, so there's no cap to lower it for.
function surfaceOptions(scale: number): TiledSurfaceOptions {
	return {
		scale,
		tileSize: TILE_SIZE,
		budget: TILE_BUDGET,
	};
}

// A scratch pixel for reading a color's alpha, made on first use.
let probe: CanvasRenderingContext2D | null = null;

// Whether a CSS color paints nothing: fully transparent in any syntax, or not a color at all.
// Painting it into a pixel reads its alpha, which no string match over the color syntaxes can.
function isClear(color: string): boolean {
	if (!probe) {
		const canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = 1;
		probe = canvas.getContext('2d', { willReadFrequently: true });
		if (!probe) {
			return false;
		}
	}
	probe.clearRect(0, 0, 1, 1);
	// An invalid color leaves the fill style as it was: transparent, so it counts as clear.
	probe.fillStyle = 'transparent';
	probe.fillStyle = color;
	probe.fillRect(0, 0, 1, 1);
	return probe.getImageData(0, 0, 1, 1).data[3] === 0;
}
