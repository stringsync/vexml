import { Stave } from 'vexflow/core';

/* One staff line's `<line-detail>` override: its thickness, color and dash style. */
export interface LineStyle {
	/** Stave row, 0 at the top, as vexflow counts. */
	row: number;
	/** Thickness in px; null keeps vexflow's default. */
	width: number | null;
	color: string | null;
	/** Dash pattern in px; empty draws a solid line. */
	dash: number[];
}

/*
 * A Stave whose styled lines are drawn here instead of by vexflow, which strokes every line
 * the same way. The caller hides those rows in the stave's line config; they are painted
 * just before vexflow draws the rest, so the clef, key and barlines still land on top.
 */
export class DetailedStave extends Stave {
	constructor(
		x: number,
		y: number,
		width: number,
		options: ConstructorParameters<typeof Stave>[3],
		private readonly styledLines: LineStyle[],
	) {
		super(x, y, width, options);
	}

	override draw(): void {
		const ctx = this.checkContext();
		for (const { row, width, color, dash } of this.styledLines) {
			const thickness = width ?? 1;
			const y = this.getYForLine(row) + (thickness % 2 === 0 ? 0 : 0.5);
			ctx.save();
			ctx.setLineWidth(thickness);
			if (color) {
				ctx.setStrokeStyle(color);
			}
			ctx.setLineDash(dash);
			ctx.beginPath();
			ctx.moveTo(this.x, y);
			ctx.lineTo(this.x + this.width, y);
			ctx.stroke();
			ctx.restore();
		}
		super.draw();
	}
}
