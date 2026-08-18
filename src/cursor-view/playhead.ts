import { CURSOR_COLOR, CURSOR_WIDTH_PX } from '../constants';
import type { CursorChangeEvent } from '../events';
import { Rect } from '../geometry';
import type { Layer } from '../layer/layer';
import type { CursorView } from './cursor-view';

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

	constructor(
		private readonly layer: Layer,
		options?: PlayheadOptions,
	) {
		this.color = options?.color ?? CURSOR_COLOR;
		this.widthPx = options?.widthPx ?? CURSOR_WIDTH_PX;
	}

	render(event: CursorChangeEvent): void {
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
