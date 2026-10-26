import { StaveTie, type TieNotes } from 'vexflow/core';

/*
 * A tie that can be dashed or dotted (<tied line-type>). vexflow fills a tie as a lens between
 * two quadratic curves, which a dash cannot show, so a dashed tie strokes the lens's midline
 * instead: one quadratic bow whose control point is the average of the lens's two. A solid tie
 * draws as vexflow's does, its ends cut square when the document gives a tie tip width.
 */
export class DashedTie extends StaveTie {
	constructor(
		notes: TieNotes,
		private readonly dash: number[] | null,
		/* How wide a solid tie is at its ends (`<line-width type="tie tip">`); null tapers it
		 * to a point the way vexflow does. */
		private readonly tip: number | null = null,
	) {
		super(notes);
	}

	override renderTie(params: {
		firstX: number;
		lastX: number;
		firstYs: number[];
		lastYs: number[];
		direction: number;
	}): void {
		if (!this.dash) {
			if (this.tip === null) {
				super.renderTie(params);
			} else {
				this.renderTipped(params, this.tip);
			}
			return;
		}
		const ctx = this.checkContext();
		const options = this.renderOptions;
		const short =
			Math.abs(params.lastX - params.firstX) < options.shortTieCutoff;
		const cp =
			((short ? options.cp1Short : options.cp1) +
				(short ? options.cp2Short : options.cp2)) /
			2;
		const firstX = params.firstX + options.firstXShift;
		const lastX = params.lastX + options.lastXShift;
		const yShift = options.yShift * params.direction;
		const notes = this.getNotes();
		const firstIndexes = notes.firstIndexes ?? [];
		const lastIndexes = notes.lastIndexes ?? [];
		ctx.save();
		ctx.setLineDash(this.dash);
		for (let i = 0; i < firstIndexes.length; i++) {
			const firstY = (params.firstYs[firstIndexes[i] as number] ?? 0) + yShift;
			const lastY = (params.lastYs[lastIndexes[i] as number] ?? 0) + yShift;
			ctx.beginPath();
			ctx.moveTo(firstX, firstY);
			ctx.quadraticCurveTo(
				(firstX + lastX) / 2,
				(firstY + lastY) / 2 + cp * params.direction,
				lastX,
				lastY,
			);
			ctx.stroke();
		}
		ctx.restore();
	}

	/*
	 * vexflow's lens with its ends cut square, `tip` px across: the far bow starts and ends
	 * that far out from the near one. A quadratic weighs its ends a quarter each at its middle,
	 * so the far control point comes in by the tip to keep the lens as deep there as cp1 and cp2
	 * make it.
	 */
	private renderTipped(
		params: {
			firstX: number;
			lastX: number;
			firstYs: number[];
			lastYs: number[];
			direction: number;
		},
		tip: number,
	): void {
		const ctx = this.checkContext();
		const options = this.renderOptions;
		const dir = params.direction;
		const short =
			Math.abs(params.lastX - params.firstX) < options.shortTieCutoff;
		const near = short ? options.cp1Short : options.cp1;
		const far = (short ? options.cp2Short : options.cp2) - tip;
		const firstX = params.firstX + options.firstXShift;
		const lastX = params.lastX + options.lastXShift;
		const cpX = (firstX + lastX) / 2;
		const yShift = options.yShift * dir;
		const notes = this.getNotes();
		const firstIndexes = notes.firstIndexes ?? [];
		const lastIndexes = notes.lastIndexes ?? [];
		for (let i = 0; i < firstIndexes.length; i++) {
			const firstY = (params.firstYs[firstIndexes[i] as number] ?? 0) + yShift;
			const lastY = (params.lastYs[lastIndexes[i] as number] ?? 0) + yShift;
			const midY = (firstY + lastY) / 2;
			ctx.beginPath();
			ctx.moveTo(firstX, firstY);
			ctx.quadraticCurveTo(cpX, midY + near * dir, lastX, lastY);
			ctx.lineTo(lastX, lastY + tip * dir);
			ctx.quadraticCurveTo(cpX, midY + far * dir, firstX, firstY + tip * dir);
			ctx.closePath();
			ctx.fill();
		}
	}
}
