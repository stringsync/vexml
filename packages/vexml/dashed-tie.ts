import { StaveTie, type TieNotes } from 'vexflow/core';

/*
 * A tie that can be dashed or dotted (<tied line-type>). vexflow fills a tie as a lens between
 * two quadratic curves, which a dash cannot show, so a dashed tie strokes the lens's midline
 * instead: one quadratic bow whose control point is the average of the lens's two. A solid tie
 * draws exactly as vexflow's does.
 */
export class DashedTie extends StaveTie {
	constructor(
		notes: TieNotes,
		private readonly dash: number[] | null,
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
			super.renderTie(params);
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
}
