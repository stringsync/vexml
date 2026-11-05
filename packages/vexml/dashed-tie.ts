import { Rect } from 'core/geometry';
import { StaveNote, StaveTie, type TieNotes } from 'vexflow/core';
import type { DocumentBezier } from './score-reader';

export type DashedTieOptions = {
	dash?: number[] | null;
	/** How wide a solid tie is at its ends (`<line-width type="tie tip">`); null tapers it
	 * to a point the way vexflow does. */
	tip?: number | null;
	bezier?: DocumentBezier | null;
	/** Draw a solid tie to the engraved shape below rather than vexflow's two parabolas. */
	fit?: boolean;
};

/* A solid tie's engraved shape, in staff spaces. The arc stands off its ends by
 * TIE_RISE * sqrt(length), up to TIE_MAX_RISE, so it deepens slowly as it lengthens. */
const TIE_RISE = 0.255;
const TIE_MAX_RISE = 1.35;
/* Width at the middle and at the blunt ends; the ribbon barely thins along its length. */
const TIE_MIDDLE = 0.215;
const TIE_TIP = 0.125;
/* Where the control points sit along the tie, as a fraction of its length from each end. */
const TIE_SHOULDER = 0.24;
/* How far a lone note's tie stands off the notehead's centre, wherever that falls on the stave. */
const TIE_OFF_HEAD = 0.91;
/* A chord's ties sit in the spaces: each end this far past the staff line (real or implied) on
 * the tie's side of the head, at least TIE_CHORD_MIN off its centre. */
const TIE_OFF_LINE = 0.32;
const TIE_CHORD_MIN = 0.3;
/* How far a free end tucks in under its notehead, from the edge it faces. */
const TIE_TUCK = 0.37;
/* The gap to whatever a blocked end must start beside: a head level with it, or else a stem or
 * another head of the chord. */
const TIE_GAP_LEVEL = 0.05;
const TIE_GAP_BLOCKED = 0.2;

/*
 * A tie that can be dashed or dotted (<tied line-type>). vexflow fills a tie as a lens between
 * two quadratic curves, which a dash cannot show, so a dashed tie strokes the lens's midline
 * instead: one quadratic bow whose control point is the average of the lens's two. A solid tie
 * with `fit` draws the engraved shape above, fitted to its notehead and any chord neighbours.
 * One whose document gives its line widths draws as vexflow's does, its ends cut square when
 * it gives a tie tip width.
 */
export class DashedTie extends StaveTie {
	/* The document cubic's control hull, registered as a fixed collision obstacle. */
	inkBounds: Rect | null = null;
	private readonly dash: number[] | null;
	private readonly tip: number | null;
	private readonly bezier: DocumentBezier | null;
	private readonly fit: boolean;
	constructor(notes: TieNotes, opts: DashedTieOptions = {}) {
		super(notes);
		this.dash = opts.dash ?? null;
		this.tip = opts.tip ?? null;
		this.bezier = opts.bezier ?? null;
		this.fit = opts.fit ?? false;
	}

	override renderTie(params: {
		firstX: number;
		lastX: number;
		firstYs: number[];
		lastYs: number[];
		direction: number;
	}): void {
		this.inkBounds = null;
		if (!this.dash && !this.bezier) {
			if (this.fit) {
				this.renderFitted(params);
				return;
			}
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
	 * A solid tie as a ribbon of two cubics. A lone note's tie stands a set distance off its head
	 * and tucks in under it. A chord's ties sit in the staff's spaces, since a neighbouring head
	 * leaves no room to tuck, and an end starts beside whatever blocks it.
	 */
	private renderFitted(params: {
		firstX: number;
		lastX: number;
		firstYs: number[];
		lastYs: number[];
		direction: number;
	}): void {
		const notes = this.getNotes();
		const first = notes.firstNote;
		const last = notes.lastNote;
		const firstIndexes = notes.firstIndexes ?? [];
		const lastIndexes = notes.lastIndexes ?? [];
		const stave = (first ?? last)?.checkStave();
		if (!stave) {
			return;
		}
		const space = stave.getSpacingBetweenLines();
		const dir = params.direction;
		const ctx = this.checkContext();
		for (let i = 0; i < firstIndexes.length; i++) {
			const firstIndex = firstIndexes[i] as number;
			const lastIndex = lastIndexes[i] as number;
			const firstHead = params.firstYs[firstIndex] ?? 0;
			const lastHead = params.lastYs[lastIndex] ?? 0;
			const firstOff = this.offHead(first, firstHead, dir, stave);
			const lastOff = this.offHead(last, lastHead, dir, stave);
			const firstX = first
				? this.startX(first, firstIndex, firstOff, dir, params.firstX, space)
				: params.firstX;
			const lastX = last
				? this.endX(last, lastIndex, lastOff, dir, params.lastX, space)
				: params.lastX;
			const firstY = firstHead + dir * firstOff * space;
			const lastY = lastHead + dir * lastOff * space;
			const length = Math.abs(lastX - firstX);
			const rise =
				space * Math.min(TIE_MAX_RISE, TIE_RISE * Math.sqrt(length / space));
			// A cubic reaches three quarters of its controls' lift at its middle. Each edge starts
			// half the tip off the centreline and reaches half the middle off it.
			const tip = (TIE_TIP * space) / 2;
			const middle = (TIE_MIDDLE * space) / 2;
			const nearLift = (rise - middle + tip) / 0.75;
			const farLift = (rise + middle - tip) / 0.75;
			const x0 = firstX + length * TIE_SHOULDER;
			const x1 = lastX - length * TIE_SHOULDER;
			ctx.beginPath();
			ctx.moveTo(firstX, firstY - dir * tip);
			ctx.bezierCurveTo(
				x0,
				firstY - dir * tip + dir * nearLift,
				x1,
				lastY - dir * tip + dir * nearLift,
				lastX,
				lastY - dir * tip,
			);
			ctx.lineTo(lastX, lastY + dir * tip);
			ctx.bezierCurveTo(
				x1,
				lastY + dir * tip + dir * farLift,
				x0,
				firstY + dir * tip + dir * farLift,
				firstX,
				firstY + dir * tip,
			);
			ctx.closePath();
			ctx.fill();
			const ys = [
				firstY - dir * tip,
				lastY + dir * tip,
				(firstY + lastY) / 2 + dir * (rise + middle),
			];
			const bounds = new Rect(
				Math.min(firstX, lastX),
				Math.min(...ys),
				length,
				Math.max(...ys) - Math.min(...ys),
			);
			this.inkBounds = this.inkBounds ? this.inkBounds.union(bounds) : bounds;
		}
	}

	/* How many spaces a tie's end stands off its notehead's centre. */
	private offHead(
		note: TieNotes['firstNote'],
		headY: number,
		dir: number,
		stave: {
			getYForLine(line: number): number;
			getSpacingBetweenLines(): number;
		},
	): number {
		if (!(note instanceof StaveNote) || note.getKeys().length < 2) {
			return TIE_OFF_HEAD;
		}
		const space = stave.getSpacingBetweenLines();
		const position = (headY - stave.getYForLine(0)) / space;
		const line =
			dir > 0
				? Math.ceil(position + TIE_CHORD_MIN - TIE_OFF_LINE)
				: Math.floor(position - TIE_CHORD_MIN + TIE_OFF_LINE);
		return Math.abs(line + dir * TIE_OFF_LINE - position);
	}

	/* An end must start beside its head, not under it, when it sits level with the head, when
	 * the chord has another head on the tie's side, or when the tie passes the stem. */
	private blocked(
		note: StaveNote,
		index: number,
		off: number,
		dir: number,
		stemDirection: number,
	): boolean {
		const heads = note.getKeys().length;
		const inner = dir > 0 ? index > 0 : index < heads - 1;
		return (
			off < 0.5 ||
			inner ||
			(note.hasStem() && note.getStemDirection() === stemDirection)
		);
	}

	private startX(
		note: NonNullable<TieNotes['firstNote']>,
		index: number,
		off: number,
		dir: number,
		fallback: number,
		space: number,
	): number {
		if (!(note instanceof StaveNote)) {
			return fallback;
		}
		// A head's right side holds the stem when it points up, which a tie above must clear.
		if (this.blocked(note, index, off, dir, dir < 0 ? 1 : 0)) {
			return fallback + (off < 0.5 ? TIE_GAP_LEVEL : TIE_GAP_BLOCKED) * space;
		}
		return note.getNoteHeadEndX() - TIE_TUCK * space;
	}

	private endX(
		note: NonNullable<TieNotes['lastNote']>,
		index: number,
		off: number,
		dir: number,
		fallback: number,
		space: number,
	): number {
		if (!(note instanceof StaveNote)) {
			return fallback;
		}
		// A head's left side holds the stem when it points down, which a tie below must clear.
		if (this.blocked(note, index, off, dir, dir > 0 ? -1 : 0)) {
			return fallback - (off < 0.5 ? TIE_GAP_LEVEL : TIE_GAP_BLOCKED) * space;
		}
		return note.getNoteHeadBeginX() + TIE_TUCK * space;
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
