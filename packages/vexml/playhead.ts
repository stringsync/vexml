import { Rect } from 'webappwiz/geometry';
import { CURSOR_COLOR, CURSOR_WIDTH_PX } from './constants';
import type { CursorView } from './cursor-view';
import type { CursorChangeEvent } from './events';
import type { Layer } from './layer';

/*
 * vexml's built-in CursorView: a thin vertical bar spanning the system at the cursor's position,
 * drawn on its own content layer (so it scrolls and scales with the engraving). Each change erases
 * just the previous bar and paints the new one — the layer spans the whole engraved score, so a
 * full-bitmap clear per change would be O(score area) every animation frame, which visibly lags
 * playback on a long score. Callers who want something else implement CursorView themselves; this
 * is what Score.createPlayhead returns.
 */

export interface PlayheadOptions {
	color?: string;
	widthPx?: number;
}

export class Playhead implements CursorView {
	private readonly color: string;
	private readonly widthPx: number;
	// The bar as last drawn, so the next render erases exactly it (the only ink on the layer).
	private last: Rect | null = null;
	private visible = true;
	private event: CursorChangeEvent | null = null;

	constructor(
		private readonly layer: Layer,
		options?: PlayheadOptions,
	) {
		this.color = options?.color ?? CURSOR_COLOR;
		this.widthPx = options?.widthPx ?? CURSOR_WIDTH_PX;
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
		const ctx = this.layer.ctx;
		// 1px pad covers the antialiased edge of a fractionally-positioned bar.
		if (this.last) {
			ctx.clearRect(
				this.last.x - 1,
				this.last.y - 1,
				this.last.w + 2,
				this.last.h + 2,
			);
		}
		this.last = null;
		if (!this.visible) {
			return;
		}
		const rect = event.position.rect;
		// Straddle the onset x so the bar sits on the note it marks.
		const bar = new Rect(
			rect.x - this.widthPx / 2,
			rect.y,
			this.widthPx,
			rect.h,
		);
		ctx.save();
		ctx.fillStyle = this.color;
		ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
		ctx.restore();
		this.last = bar;
	}

	dispose(): void {
		this.layer.dispose();
	}
}
