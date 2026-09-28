import type { Marker, MarkerOptions, MarkerRect } from './marker';
import type { Stage } from './stage';

/* Where score space lands inside the container: the base canvas's offset and its CSS scale. */
export interface MarkerFrame {
	left: number;
	top: number;
	sx: number;
	sy: number;
}

/*
 * The production Marker: an absolutely positioned <div> over the base canvas. The Stage hands it
 * the score-to-container frame on every relayout, so show() never reads layout — a per-frame
 * getBoundingClientRect after the page has changed would force a synchronous reflow. Position
 * rides on `transform` so a move is composited without layout; width/height and the corner radius
 * are only written when they change (a playhead's height changes once per system).
 */
export class ManagedMarker implements Marker {
	private rect: MarkerRect | null = null;
	private color = '';
	private radius = 0;
	private size = '';
	private corners = '';

	constructor(
		private readonly el: HTMLDivElement,
		private frame: MarkerFrame,
		private readonly stage: Stage,
		// Where the marker stacks: its z-index (0 when unset) and its creation order, which is its
		// DOM order among the stage's overlays. A loupe paints overlays in the same order.
		readonly zIndex: number,
		readonly order: number,
	) {}

	show(rect: MarkerRect, color: string, options?: MarkerOptions): void {
		this.rect = rect;
		this.radius = options?.radius ?? 0;
		if (color !== this.color) {
			this.color = color;
			this.el.style.backgroundColor = color;
		}
		this.el.style.display = '';
		this.apply();
	}

	hide(): void {
		this.rect = null;
		this.el.style.display = 'none';
	}

	relayout(frame: MarkerFrame): void {
		this.frame = frame;
		if (this.rect) {
			this.apply();
		}
	}

	// Draw the box as it shows, into a context already mapped to score space (a loupe's).
	paint(ctx: CanvasRenderingContext2D): void {
		const rect = this.rect;
		if (!rect) {
			return;
		}
		ctx.fillStyle = this.color;
		if (this.radius > 0) {
			ctx.beginPath();
			ctx.roundRect(rect.x, rect.y, rect.w, rect.h, this.radius);
			ctx.fill();
		} else {
			ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
		}
	}

	dispose(): void {
		this.el.remove();
		this.stage.forgetMarker(this);
	}

	private apply(): void {
		const rect = this.rect;
		if (!rect) {
			return;
		}
		const { left, top, sx, sy } = this.frame;
		const size = `${rect.w * sx}px ${rect.h * sy}px`;
		if (size !== this.size) {
			this.size = size;
			this.el.style.width = `${rect.w * sx}px`;
			this.el.style.height = `${rect.h * sy}px`;
		}
		// Elliptical in CSS px so a caller CSS-stretching the score still gets the radius it drew.
		const corners =
			this.radius > 0 ? `${this.radius * sx}px / ${this.radius * sy}px` : '';
		if (corners !== this.corners) {
			this.corners = corners;
			this.el.style.borderRadius = corners;
		}
		this.el.style.transform = `translate(${left + rect.x * sx}px, ${top + rect.y * sy}px)`;
	}
}
