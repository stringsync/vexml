import type { Rect } from './geometry';
import type { Viewport } from './targets';

/*
 * The host: the DOM vexml builds inside the caller's container, and the coordinate authority
 * between score space (where target rects live) and client/page space (where pointer events and
 * DOM popups live). The caller hands render() a <div>; the Stage owns the canvas it draws the
 * score onto and never exposes it to callers — they see only the Score.
 *
 * The base canvas is a plain in-flow child, so the container sizes to it exactly as a
 * hand-placed <canvas> did — output stays pixel-identical. The transform falls out of that
 * canvas's own getBoundingClientRect: score space is its CSS-pixel space with the origin at its
 * top-left. Reading the live rect each call means page scroll and any CSS scaling of the canvas
 * are handled for free.
 */
export class Stage implements Viewport {
	readonly base: HTMLCanvasElement;
	private readonly prevPosition: string;

	constructor(private readonly container: HTMLDivElement) {
		// A positioned container is the containing block the overlay layers (later phases) anchor
		// to. Only set it when the caller left position static, and remember it so dispose restores.
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

	dispose(): void {
		this.base.remove();
		this.container.style.position = this.prevPosition;
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
