import { Volta } from 'vexflow/core';
import type { VoltaDecoration } from './barline-translator';

/** How far vexflow insets a volta's label from the start of its line, in px. */
const DEFAULT_TEXT_X = 5;

/** How far below the line vexflow hangs a volta's label baseline, in px. */
const TEXT_DROP = 15;

export type EndingVoltaOptions = {
	/** The bracket's line width (`<line-width type="ending">`); vexflow's 1px when null. */
	lineWidth?: number | null;
};

/*
 * A volta (ending) bracket drawn with the document's own geometry: vexflow's Volta draws
 * both jogs at a fixed 1.5 staff spaces and the label at a fixed inset, so this redraws
 * the same bracket with `<ending end-length>` as each jog's length and `<ending text-x>`
 * as the label's offset from the line's start, at the document's ending line width. Absent
 * attributes keep vexflow's look.
 */
export class EndingVolta extends Volta {
	private readonly lineWidth: number | null;
	constructor(
		private readonly decoration: VoltaDecoration,
		x: number,
		yShift: number,
		opts: EndingVoltaOptions = {},
	) {
		super(decoration.type, decoration.label, x, yShift);
		this.lineWidth = opts.lineWidth ?? null;
	}

	override draw(): void {
		this.checkStave().checkContext().openGroup('vexml-volta');
		try {
			const stave = this.checkStave();
			const x = stave.getModifierXShift(this.getPosition());
			const ctx = stave.checkContext();
			this.setRendered();
			const space = stave.getSpacingBetweenLines();
			const px = (tenths: number | null, fallback: number) =>
				tenths === null ? fallback : (tenths * space) / 10;
			const defaultJog = 1.5 * space;
			const left = this.x + x;
			const topY = stave.getYForTopText(stave.getNumLines()) + this.yShift;
			const { type, startJog, endJog, textX } = this.decoration;
			const line = this.lineWidth ?? 1;
			const begins = type === Volta.type.BEGIN || type === Volta.type.BEGIN_END;
			// vexflow pulls a closing jog in off the barline so it doesn't merge into it.
			let width = stave.getWidth() - x;
			if (type === Volta.type.END) {
				width -= 5;
			} else if (type === Volta.type.BEGIN_END) {
				width -= 3;
			}
			if (begins) {
				ctx.fillRect(left, topY, line, px(startJog, defaultJog));
			}
			if (type === Volta.type.END || type === Volta.type.BEGIN_END) {
				ctx.fillRect(left + width, topY, line, px(endJog, defaultJog));
			}
			if (begins) {
				this.renderText(
					ctx,
					x + px(textX, DEFAULT_TEXT_X),
					topY - this.yShift + TEXT_DROP,
				);
			}
			ctx.fillRect(left, topY, width, line);
		} finally {
			this.checkStave().checkContext().closeGroup();
		}
	}
}
