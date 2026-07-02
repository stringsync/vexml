import { CURSOR_COLOR, CURSOR_WIDTH_PX } from '../constants';
import type { Layer } from '../host/stage';
import type { CursorChangeEvent, CursorView } from './cursor-controller';

/*
 * vexml's built-in CursorView: a thin vertical bar spanning the system at the cursor's position,
 * drawn on its own content layer (so it scrolls and scales with the engraving). The whole overlay is
 * tiny, so each change just clears and repaints the bar at the interpolated position. Callers who
 * want something else implement CursorView themselves; this is what Score.createPlayhead returns.
 */

export interface PlayheadOptions {
	color?: string;
	widthPx?: number;
}

export class Playhead implements CursorView {
	private readonly color: string;
	private readonly widthPx: number;

	constructor(
		private readonly layer: Layer,
		options?: PlayheadOptions,
	) {
		this.color = options?.color ?? CURSOR_COLOR;
		this.widthPx = options?.widthPx ?? CURSOR_WIDTH_PX;
	}

	render(event: CursorChangeEvent): void {
		const ctx = this.layer.ctx;
		clear(ctx);
		const rect = event.position.rect;
		ctx.save();
		ctx.fillStyle = this.color;
		// Straddle the onset x so the bar sits on the note it marks.
		ctx.fillRect(rect.x - this.widthPx / 2, rect.y, this.widthPx, rect.h);
		ctx.restore();
	}

	dispose(): void {
		this.layer.dispose();
	}
}

// Clear the whole bitmap regardless of the dpr transform the layer applied (mirrors DefaultDecorator).
function clear(ctx: CanvasRenderingContext2D): void {
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	ctx.restore();
}
