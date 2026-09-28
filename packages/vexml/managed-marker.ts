import type { Rect } from 'webappwiz/geometry';
import type { Marker } from './marker';
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
 * rides on `transform` so a move is composited without layout; width/height are only written
 * when they change (a playhead's height changes once per system).
 */
export class ManagedMarker implements Marker {
	private rect: Rect | null = null;
	private color = '';
	private size = '';

	constructor(
		private readonly el: HTMLDivElement,
		private frame: MarkerFrame,
		private readonly stage: Stage,
	) {}

	show(rect: Rect, color: string): void {
		this.rect = rect;
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
		this.el.style.transform = `translate(${left + rect.x * sx}px, ${top + rect.y * sy}px)`;
	}
}
