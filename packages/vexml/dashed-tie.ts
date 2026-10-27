import { StaveTie, type TieNotes } from 'vexflow/core';
import { Rect } from 'webappwiz/geometry';
import type { DocumentBezier } from './score-reader';

export type DashedTieOptions = {
	dash?: number[] | null;
	/** How wide a solid tie is at its ends (`<line-width type="tie tip">`); null tapers it
	 * to a point the way vexflow does. */
	tip?: number | null;
	bezier?: DocumentBezier | null;
};

/*
 * A tie that can be dashed or dotted (<tied line-type>). vexflow fills a tie as a lens between
 * two quadratic curves, which a dash cannot show, so a dashed tie strokes the lens's midline
 * instead: one quadratic bow whose control point is the average of the lens's two. A solid tie
 * draws as vexflow's does, its ends cut square when the document gives a tie tip width.
 */
export class DashedTie extends StaveTie {
	/* The document cubic's control hull, registered as a fixed collision obstacle. */
	inkBounds: Rect | null = null;
	private readonly dash: number[] | null;
	private readonly tip: number | null;
	private readonly bezier: DocumentBezier | null;
	constructor(notes: TieNotes, opts: DashedTieOptions = {}) {
		super(notes);
		this.dash = opts.dash ?? null;
		this.tip = opts.tip ?? null;
		this.bezier = opts.bezier ?? null;
	}

	override renderTie(params: {
		firstX: number;
		lastX: number;
		firstYs: number[];
		lastYs: number[];
		direction: number;
	}): void {
		if (!this.dash && !this.bezier) {
			if (this.tip === null) {
				super.renderTie(params);
			} else {
				this.renderTipped(params, this.tip);
			}
			return;
		}
		this.inkBounds = null;
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
		ctx.setLineDash(this.dash ?? []);
		for (let i = 0; i < firstIndexes.length; i++) {
			const firstY = (params.firstYs[firstIndexes[i] as number] ?? 0) + yShift;
			const lastY = (params.lastYs[lastIndexes[i] as number] ?? 0) + yShift;
			ctx.beginPath();
			ctx.moveTo(firstX, firstY);
			if (this.bezier) {
				// A quadratic bow converted to a cubic gives the automatic fallback for
				// each unspecified axis. Explicit axes are offsets from their own end.
				const middle = (firstY + lastY) / 2 + cp * params.direction;
				const start = this.bezier.start;
				const end = this.bezier.end;
				const x0 =
					start.x === null ? firstX + (lastX - firstX) / 3 : firstX + start.x;
				const x1 =
					end.x === null ? lastX - (lastX - firstX) / 3 : lastX + end.x;
				const y0 =
					start.y === null
						? firstY + (2 * (middle - firstY)) / 3
						: firstY - start.y;
				const y1 =
					end.y === null ? lastY + (2 * (middle - lastY)) / 3 : lastY - end.y;
				const thickness = this.dash
					? 0
					: (2 *
							Math.abs(
								short
									? options.cp2Short - options.cp1Short
									: options.cp2 - options.cp1,
							)) /
						3;
				const tip = this.dash ? 0 : (this.tip ?? 0);
				const shift = (thickness - tip / 3) * params.direction;
				ctx.bezierCurveTo(x0, y0, x1, y1, lastX, lastY);
				if (this.dash) {
					ctx.stroke();
				} else {
					ctx.lineTo(lastX, lastY + tip * params.direction);
					ctx.bezierCurveTo(
						x1,
						y1 + shift,
						x0,
						y0 + shift,
						firstX,
						firstY + tip * params.direction,
					);
					ctx.closePath();
					ctx.fill();
				}
				const xs = [firstX, lastX, x0, x1];
				const ys = [
					firstY,
					lastY,
					firstY + tip * params.direction,
					lastY + tip * params.direction,
					y0,
					y1,
					y0 + shift,
					y1 + shift,
				];
				const bounds = new Rect(
					Math.min(...xs),
					Math.min(...ys),
					Math.max(...xs) - Math.min(...xs),
					Math.max(...ys) - Math.min(...ys),
				);
				this.inkBounds = this.inkBounds ? this.inkBounds.union(bounds) : bounds;
				continue;
			}
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
