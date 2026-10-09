import { Disposer, type Resource } from 'webappwiz/disposable';
import type { Ink } from './ink';
import { SNAPSHOT_VERSION } from './score-snapshot';

/* The container options a score box is built with: render's, from config (see Stage). */
export interface ScoreBoxOptions {
	height?: number | null;
	maxHeight?: number | null;
	width?: number | null;
	maxWidth?: number | null;
	backgroundColor?: string | null;
	fit?: boolean;
}

/* Tiles `paint` drew in a box, and the key that says what they show (see Stage.engrave). */
export interface PaintedTiles {
	readonly key: string;
	readonly plane: HTMLElement;
}

/*
 * The box a score is shown in: the styles set on the caller's container (each prior value
 * remembered, so dispose restores it), and the base element (`.vexml-canvas`) the tiles sit in,
 * with its strut and the stylesheet that sizes it. render's Stage and `paint` build the same one.
 * A box `paint` marked is taken over by the next one opened in its container, base, tiles and
 * all, so a render after a paint shows no blank frame.
 */
export class ScoreBox implements Resource {
	// Inline styles set on the container, with their prior values, for a paint to hand on.
	private readonly priors: Array<[string, string]> = [];
	private painted: PaintedTiles | null = null;
	// Puts each style back and removes the base and any paint's tiles.
	private readonly disposer = new Disposer();

	private constructor(
		readonly container: HTMLDivElement,
		readonly base: HTMLDivElement,
	) {
		this.disposer.defer(() => this.base.remove());
	}

	static open(container: HTMLDivElement, opts: ScoreBoxOptions): ScoreBox {
		const marked = container.querySelector<HTMLDivElement>(
			`:scope > .vexml-canvas[${PAINT_KEY}]`,
		);
		const box = new ScoreBox(
			container,
			marked ?? document.createElement('div'),
		);
		if (marked) {
			box.takeOver(marked);
		}
		box.build(opts);
		return box;
	}

	/* What a box's tiles show: a snapshot's engraving (its fingerprint) at a density and in an
	 * ink. A box painted under another key holds tiles the engraving can't use. */
	static paintKey(fingerprint: string, density: number, ink: Ink): string {
		return JSON.stringify([
			SNAPSHOT_VERSION,
			fingerprint,
			density,
			ink.notation,
			ink.text,
		]);
	}

	/* Whether the box is still as `paint` left it, not yet taken over by a render's. */
	get isPainted(): boolean {
		return this.base.hasAttribute(PAINT_KEY);
	}

	/* The tiles a paint left here, handed out once. */
	takePainted(): PaintedTiles | null {
		const painted = this.painted;
		this.painted = null;
		return painted;
	}

	/* Mark the box as painted with tiles showing `key`, for the box that takes it over. */
	mark(key: string): void {
		this.base.setAttribute(PAINT_KEY, key);
		this.base.setAttribute(PAINT_PRIORS, JSON.stringify(this.priors));
	}

	// Set a container style, remembering its prior value so dispose restores it (each prop set once).
	setStyle(prop: string, value: string): void {
		// Record the caller's original once per property: a second entry for the same prop would
		// restore this box's own value instead of theirs.
		if (!this.priors.some(([p]) => p === prop)) {
			const prior = this.container.style.getPropertyValue(prop);
			this.priors.push([prop, prior]);
			this.disposer.defer(() => this.container.style.setProperty(prop, prior));
		}
		this.container.style.setProperty(prop, value);
	}

	/* Size the base to an engraving in score px, shown `scale` times as large. */
	size(width: number, height: number, scale: number): void {
		// Published as custom properties rather than inline width/height: the stylesheet's
		// `:where(.vexml-canvas)` rule reads them at zero specificity, so a caller's own
		// `.vexml-canvas { width: 100% }` overrides it without `!important`. --vexml-aspect is the
		// exact ratio, so a height:auto box keeps exactly the intrinsic size at full width yet still
		// scales proportionally when narrowed. The scale sizes the box as a caller's CSS stretching
		// it would.
		const style = this.base.style;
		style.setProperty('--vexml-width', `${width}px`);
		style.setProperty('--vexml-height', `${height}px`);
		style.setProperty('--vexml-aspect', `${width / height}`);
		style.setProperty('--vexml-scale', `${scale}`);
	}

	// The base's laid-out size, unrounded: offsetWidth rounds to whole px, and a score 932.4px wide
	// stretched to 932 would blur every tile under a scale of 0.9996.
	renderedSize(): { width: number; height: number } {
		const style = getComputedStyle(this.base);
		return {
			width: parseFloat(style.width) || 0,
			height: parseFloat(style.height) || 0,
		};
	}

	dispose(): void {
		this.disposer.dispose();
	}

	// Put the container back as it was before the paint, so this box records the caller's own
	// styles, and keep the paint's tiles for the engraving to adopt or drop.
	private takeOver(base: HTMLDivElement): void {
		const key = base.getAttribute(PAINT_KEY) ?? '';
		const priors = parsePriors(base.getAttribute(PAINT_PRIORS));
		base.removeAttribute(PAINT_KEY);
		base.removeAttribute(PAINT_PRIORS);
		for (const [prop, value] of priors) {
			this.container.style.setProperty(prop, value);
		}
		const plane = base.querySelector<HTMLElement>(':scope > .vexml-tiles');
		if (plane) {
			this.painted = { key, plane };
			this.disposer.defer(() => plane.remove());
		}
	}

	private build(opts: ScoreBoxOptions): void {
		const container = this.container;
		// A positioned container is the containing block the overlay layers anchor to. Only set it
		// when the caller left position static.
		if (!container.style.position) {
			this.setStyle('position', 'relative');
		}
		// Isolate the container into its own stacking context so the background layer's z-index:-1
		// stays trapped here, above the container's (possibly opaque) background but below the base
		// canvas, rather than escaping behind an ancestor's background, where it'd be invisible.
		if (!container.style.isolation) {
			this.setStyle('isolation', 'isolate');
		}
		// The score is a picture to point at, not text: a press held on it (the start of a drag on a
		// touch screen) must not start a native text selection or the iOS callout. Set on the
		// container so it covers the canvas and every overlay vexml stacks in it. Only the prefixed
		// name: Safari needs it, the others alias it to user-select, and setting both would record
		// the alias's already-changed value as the one to restore.
		this.setStyle('-webkit-user-select', 'none');
		this.setStyle('-webkit-touch-callout', 'none');
		// Turn the container into a scroll box on whichever axes have a cap: set the size/cap and
		// overflow:auto so the content (the in-flow base) scrolls within it. A cursor's
		// follow()/scrollIntoView() then scroll this same box. overflow per axis is set once.
		if (opts.height != null) {
			this.setStyle('height', `${opts.height}px`);
		}
		if (opts.maxHeight != null) {
			this.setStyle('max-height', `${opts.maxHeight}px`);
		}
		if (opts.width != null) {
			this.setStyle('width', `${opts.width}px`);
		}
		if (opts.maxWidth != null) {
			this.setStyle('max-width', `${opts.maxWidth}px`);
		}
		if (opts.height != null || opts.maxHeight != null) {
			this.setStyle('overflow-y', 'auto');
		}
		if (opts.width != null || opts.maxWidth != null) {
			this.setStyle('overflow-x', 'auto');
		}
		// setProperty ignores an invalid color, so an untrusted value can't break out of the style.
		if (opts.backgroundColor) {
			this.setStyle('background-color', opts.backgroundColor);
		}
		// Center the inline base in the container when fitting (text-align steers inline boxes).
		// Absolutely-positioned overlay layers ignore text-align, so only the score is centered.
		if (opts.fit) {
			this.setStyle('text-align', 'center');
		}
		const base = this.base;
		// `vexml-canvas` is the stable hook callers style to size/scale the rendered score. They style
		// this class (or the container), never the bare element, which keeps the overlays
		// (`vexml-layer`) out of their selectors. `vexml-fit` adds the scale-to-container behavior
		// (see ensureStylesheet). The name predates the tiles: it was one canvas, and callers'
		// stylesheets still select it.
		base.className = opts.fit ? 'vexml-canvas vexml-fit' : 'vexml-canvas';
		// Inline, not in the overridable rule: the tiles inside are laid out against this box.
		base.style.display = 'inline-block';
		base.style.position = 'relative';
		base.style.overflow = 'hidden';
		ensureStylesheet();
		if (base.parentNode !== container) {
			container.appendChild(base);
		}
		if (!base.querySelector(':scope > .vexml-strut')) {
			base.appendChild(strut());
		}
	}
}

const PAINT_KEY = 'data-vexml-paint';
const PAINT_PRIORS = 'data-vexml-priors';

function parsePriors(json: string | null): Array<[string, string]> {
	try {
		const priors: unknown = JSON.parse(json ?? '[]');
		return Array.isArray(priors)
			? priors.filter(
					(p): p is [string, string] =>
						Array.isArray(p) &&
						typeof p[0] === 'string' &&
						typeof p[1] === 'string',
				)
			: [];
	} catch {
		return [];
	}
}

// The box's only in-flow child, giving it the intrinsic sizes the single canvas it once was had:
// a canvas is a replaced element, so under a percentage max-width it contributes its width to a
// max-content size but nothing to a min-content one. A grid's auto track or a shrink-to-fit parent
// then holds the score at its engraved width when there's room and lets it shrink when there
// isn't; a sized div would force its full width on them. The tile plane goes in ahead of it (see
// TiledSurface), so a caller's `querySelector('canvas')` still finds the first tile.
function strut(): HTMLCanvasElement {
	const strut = document.createElement('canvas');
	strut.className = 'vexml-strut';
	strut.width = 0;
	strut.height = 0;
	strut.style.display = 'block';
	strut.style.width = 'calc(var(--vexml-width) * var(--vexml-scale, 1))';
	strut.style.maxWidth = '100%';
	strut.style.height = '0';
	return strut;
}

/* The base's default on-screen size, injected once per document. Both rules are wrapped in
 * `:where()` so they carry zero specificity: a caller's own `.vexml-canvas { … }` overrides them
 * with no `!important`. The per-score intrinsic dimensions ride on the --vexml-width/height custom
 * properties (see size).
 *
 * Base rule: render the score at its intrinsic size times --vexml-scale (a panoramic scale or
 * fitHeight, else 1). `.vexml-fit` then caps the base at the container width and lets its height
 * follow via the exact score aspect ratio (--vexml-aspect, not the rounded bitmap ratio), so a
 * narrow viewport shrinks the score to fit while a wide one lands on a pixel-identical box (the
 * score<->client scale stays exactly 1) and never blows it up past its engraved resolution. Its
 * width is auto, taken from the strut, so it shrinks in a grid track or a flex row as a canvas
 * would. The base rule carries the aspect ratio too: the box has no intrinsic ratio of its own (it
 * was a canvas once), so a caller's `height: auto` needs it to follow their width. The box is
 * `inline-block`, so `text-align: center` on the container centers it; top-aligning it drops the
 * descender strip a baseline-aligned inline box leaves under it, so the container is exactly as
 * tall as the engraving. */
function ensureStylesheet(): void {
	if (document.head.querySelector('style[data-vexml-canvas-style]')) {
		return;
	}
	const style = document.createElement('style');
	style.setAttribute('data-vexml-canvas-style', '');
	style.textContent =
		':where(.vexml-canvas){width:calc(var(--vexml-width) * var(--vexml-scale, 1));height:calc(var(--vexml-height) * var(--vexml-scale, 1));aspect-ratio:var(--vexml-aspect);vertical-align:top}' +
		':where(.vexml-canvas.vexml-fit){width:auto;max-width:100%;height:auto;aspect-ratio:var(--vexml-aspect)}';
	document.head.appendChild(style);
}
