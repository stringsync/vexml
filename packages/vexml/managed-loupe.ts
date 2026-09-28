import { Rect } from 'webappwiz/geometry';
import { LOUPE_ENTER_MS, LOUPE_EXIT_MS, LOUPE_MIN_SCALE } from './constants';
import { type Loupe, type LoupeOptions, resolveLoupeOptions } from './loupe';
import { placeLoupe } from './loupe-placement';
import type { MarkerRect } from './marker';
import type { Stage } from './stage';

/*
 * The production Loupe: a fixed-position canvas on the document body, so it floats over the page
 * whatever the container clips or scrolls, and a transformed ancestor can't re-anchor it. The Stage
 * paints the score into it; the loupe owns only its placement, which it works out in client px
 * from the stage's live score-to-client frame. show() only records where to go: the paint and the
 * layout read behind it run once on the next animation frame, however many times a drag calls
 * show() in between (a pointer move and the cursor change it causes both do). Like the platform
 * magnifiers, it grows out of the magnified point when it appears and shrinks back into it when
 * hidden, unless the reader asks for reduced motion. The animation rides on the `scale` and
 * `opacity` properties, so it composes with the `transform` each paint moves it by.
 */
export class ManagedLoupe implements Loupe {
	private readonly ctx: CanvasRenderingContext2D;
	// The bitmap's device pixel ratio, 0 to force a resize on the next paint.
	private dpr = 0;
	// The paper under the magnified score, read once per showing: the engraving itself is
	// transparent, and resolving the page's background walks computed styles. Null while hidden.
	private paper: string | null = null;
	// What the latest show() asked for, painted on the next frame; null once hidden.
	private shown: {
		anchor: MarkerRect;
		at: { x: number; y: number } | undefined;
	} | null = null;
	// The pending paint's animation frame.
	private frame: number | null = null;
	// The hide animation still playing, so a show() during it can take the loupe back.
	private exit: Animation | null = null;

	constructor(
		private readonly canvas: HTMLCanvasElement,
		private options: Required<LoupeOptions>,
		private readonly stage: Stage,
	) {
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error('vexml: 2D context unavailable for loupe');
		}
		this.ctx = ctx;
		this.style();
	}

	show(anchor: MarkerRect, at?: { x: number; y: number }): void {
		this.shown = { anchor, at };
		this.frame ??= requestAnimationFrame(() => this.paint());
	}

	hide(): void {
		this.shown = null;
		if (this.frame !== null) {
			cancelAnimationFrame(this.frame);
			this.frame = null;
		}
		if (this.paper === null) {
			return;
		}
		this.paper = null;
		const exit = this.animate(false);
		if (!exit) {
			this.canvas.style.display = 'none';
			return;
		}
		this.exit = exit;
		exit.onfinish = () => {
			this.exit = null;
			this.canvas.style.display = 'none';
		};
	}

	configure(options: LoupeOptions): void {
		this.options = resolveLoupeOptions(this.options, options);
		this.style();
		this.dpr = 0;
		if (this.shown) {
			this.frame ??= requestAnimationFrame(() => this.paint());
		}
	}

	dispose(): void {
		if (this.frame !== null) {
			cancelAnimationFrame(this.frame);
		}
		this.exit?.cancel();
		this.canvas.remove();
		// Free the bitmap now rather than at the next GC (see Stage.dispose).
		this.canvas.width = 0;
		this.canvas.height = 0;
		this.stage.forgetLoupe(this);
	}

	// Draw the latest show() and move there, growing in if the loupe was hidden.
	private paint(): void {
		this.frame = null;
		if (!this.shown) {
			return;
		}
		const { anchor, at } = this.shown;
		const center = at ?? {
			x: anchor.x + anchor.w / 2,
			y: anchor.y + anchor.h / 2,
		};
		const { width, height, zoom, gap } = this.options;
		const dpr = window.devicePixelRatio || 1;
		if (dpr !== this.dpr) {
			this.dpr = dpr;
			this.canvas.width = Math.round(width * dpr);
			this.canvas.height = Math.round(height * dpr);
		}
		const entering = this.paper === null;
		const paper = this.paper ?? this.stage.paperColor();
		if (entering) {
			this.paper = paper;
			this.exit?.cancel();
			this.exit = null;
			this.canvas.style.display = '';
		}
		const frame = this.stage.frame();
		const ctx = this.ctx;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.fillStyle = paper;
		ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		// Device px per score px: the score's on-screen scale, magnified.
		const kx = dpr * zoom * frame.sx;
		const ky = dpr * zoom * frame.sy;
		const region = new Rect(
			center.x - this.canvas.width / kx / 2,
			center.y - this.canvas.height / ky / 2,
			this.canvas.width / kx,
			this.canvas.height / ky,
		);
		ctx.setTransform(kx, 0, 0, ky, -region.x * kx, -region.y * ky);
		this.stage.paintScore(ctx, region);

		const doc = document.documentElement;
		const point = {
			x: frame.left + center.x * frame.sx,
			y: frame.top + center.y * frame.sy,
		};
		const { left, top } = placeLoupe(
			{ width, height, gap },
			{
				left: frame.left + anchor.x * frame.sx,
				top: frame.top + anchor.y * frame.sy,
				right: frame.left + (anchor.x + anchor.w) * frame.sx,
			},
			point,
			{ width: doc.clientWidth, height: doc.clientHeight },
		);
		this.canvas.style.transform = `translate(${left}px, ${top}px)`;
		// Scale about the magnified point, so the loupe grows out of (and shrinks into) what it shows.
		this.canvas.style.transformOrigin = `${point.x - left}px ${point.y - top}px`;
		if (entering) {
			this.animate(true);
		}
	}

	// Grow in or shrink out, or null where there's no animating: a reader who asked for reduced
	// motion, or a browser without the Web Animations API.
	private animate(entering: boolean): Animation | null {
		if (
			typeof this.canvas.animate !== 'function' ||
			window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
		) {
			return null;
		}
		const small = { scale: String(LOUPE_MIN_SCALE), opacity: 0 };
		const full = { scale: '1', opacity: 1 };
		return this.canvas.animate(entering ? [small, full] : [full, small], {
			duration: entering ? LOUPE_ENTER_MS : LOUPE_EXIT_MS,
			easing: entering ? 'ease-out' : 'ease-in',
		});
	}

	private style(): void {
		const { width, height, radius } = this.options;
		this.canvas.style.width = `${width}px`;
		this.canvas.style.height = `${height}px`;
		this.canvas.style.borderRadius = `${radius}px`;
	}
}
