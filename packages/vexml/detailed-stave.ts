import { Stave } from 'vexflow/core';

/* One staff line's `<line-detail>` override: its thickness, color and dash style. */
export interface LineStyle {
	/** Stave row, 0 at the top, as vexflow counts. */
	row: number;
	/** Thickness in px; null keeps the stave's own. */
	width: number | null;
	color: string | null;
	/** Dash pattern in px; empty draws a solid line. */
	dash: number[];
}

/*
 * A Stave whose styled lines are drawn here instead of by vexflow, which strokes every line
 * the same way. The caller hides those rows in the stave's line config; they are painted
 * just before vexflow draws the rest, so the clef, key and barlines still land on top. A width
 * in the stave's style (the document's staff line width) strokes every line.
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
		ctx.openGroup('stave');
		try {
			for (const { row, width, color, dash } of this.styledLines) {
				const thickness = width ?? this.getStyle().lineWidth ?? 1;
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
		} finally {
			ctx.closeGroup();
		}
		// vexflow reads a styled line width only to align the lines on the pixel grid, and
		// strokes them at the context's: a document's staff width goes on the context here.
		const lineWidth = this.getStyle().lineWidth;
		if (lineWidth === undefined) {
			super.draw();
			return;
		}
		ctx.save();
		ctx.setLineWidth(lineWidth);
		super.draw();
		ctx.restore();
	}
}
