import { Rect } from 'webappwiz/geometry';
import { CURSOR_COLOR, CURSOR_WIDTH_PX } from './constants';
import type { CursorView } from './cursor-view';
import type { CursorChangeEvent } from './events';
import type { Marker } from './marker';

/*
 * vexml's built-in CursorView: a thin vertical bar spanning the system at the cursor's position.
 * The bar is a Marker, not ink on a layer: a layer spans the whole engraved score, and repainting
 * a score-sized canvas every animation frame drops it off WebKit's GPU canvas budget on iOS, which
 * visibly stutters playback of a long score. Moving a marker is a compositor-only transform.
 * Callers who want something else implement CursorView themselves; this is what
 * Score.createPlayhead returns.
 */

export interface PlayheadOptions {
	color?: string;
	widthPx?: number;
}

export class Playhead implements CursorView {
	private readonly color: string;
	private readonly widthPx: number;
	private visible = true;
	private event: CursorChangeEvent | null = null;

	constructor(
		private readonly marker: Marker,
		options?: PlayheadOptions,
	) {
		this.color = options?.color ?? CURSOR_COLOR;
		this.widthPx = options?.widthPx ?? CURSOR_WIDTH_PX;
		this.marker.hide();
	}

	/** Hide the bar without detaching its cursor or changing playback position. */
	setVisible(visible: boolean): void {
		if (this.visible === visible) {
			return;
		}
		this.visible = visible;
		if (this.event) {
			this.render(this.event);
		}
	}

	render(event: CursorChangeEvent): void {
		this.event = event;
		if (!this.visible) {
			this.marker.hide();
			return;
		}
		const rect = event.position.rect;
		// Straddle the onset x so the bar sits on the note it marks.
		this.marker.show(
			new Rect(rect.x - this.widthPx / 2, rect.y, this.widthPx, rect.h),
			this.color,
		);
	}

	dispose(): void {
		this.marker.dispose();
	}
}
