import { TabSlide } from 'vexflow';

/*
 * vexflow's TabSlide strokes its two-point line with a closePath() in between (tabslide.ts
 * renderTie), which walks the segment back to where it started — so the rasterizer strokes it
 * twice and the two antialiased passes composite into a line that reads fat and blurry next to
 * the pixel-crisp string lines. Same geometry, stroked once.
 */
export class CrispTabSlide extends TabSlide {
	override renderTie(params: {
		direction: number;
		firstX: number;
		lastX: number;
		firstYs: number[];
		lastYs: number[];
	}): void {
		const ctx = this.checkContext();
		for (const index of this.getNotes().firstIndexes ?? []) {
			const y = params.firstYs[index];
			if (typeof y !== 'number' || Number.isNaN(y)) {
				continue;
			}
			// vexflow's geometry: the line pivots on the first note's string y (plus the
			// half-pixel renderOptions.yShift its constructor sets), rising 3px on each side of
			// it for a slide up and falling for a slide down.
			const slideY = y + this.renderOptions.yShift;
			ctx.beginPath();
			ctx.moveTo(params.firstX, slideY + 3 * params.direction);
			ctx.lineTo(params.lastX, slideY - 3 * params.direction);
			ctx.stroke();
		}
		this.setRendered();
	}
}
