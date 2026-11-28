import { Rect } from 'core/geometry';
import { Dot, StaveNote, StaveTie, type TieNotes } from 'vexflow/core';
import type { DocumentBezier } from './score-reader';

export type DashedTieOptions = {
	dash?: number[] | null;
	/** Width of a solid tie at its ends, from `<line-width type="tie tip">`; null tapers it to a point. */
	tip?: number | null;
	bezier?: DocumentBezier | null;
	/** Draw a solid tie in the engraved shape rather than vexflow's two parabolas. */
	fit?: boolean;
	/** Extra stave-spaces to push a chord tie outward when an inner tie curving the same way claims its space. */
	extraOff?: number;
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
/* A chord's ties sit in the spaces: a line note's end sits this far past its line into the
 * adjacent space; a space note's end stays in its own space, this far shy of the line on the
 * tie's side (0.5 - TIE_OFF_LINE off its centre). */
export const TIE_OFF_LINE = 0.32;
/* A displaced second's tie curving away from its partner into another same-direction tie
 * starts clear of its own head in the space between the heads, pushing the outer tie clear
 * of its own head as well. */
export const TIE_OFF_DISPLACED = 1 - TIE_OFF_LINE;
/* How far a free end tucks in under its notehead, from the inner edge (between centre and edge). */
const TIE_TUCK = 0.24;
/* The gap to whatever a blocked end must start beside: a head level with it, or else a stem or
 * another head of the chord. */
const TIE_GAP_LEVEL = 0.05;
const TIE_GAP_BLOCKED = 0.2;
/* White space between an incoming system-break tie and a repeated accidental it curves past. */
const TIE_ACCIDENTAL_CLEARANCE = 0.25;
/* White space left between an outgoing system-break tie and the system's closing barline
 * (Behind Bars p. 65). */
const TIE_BARLINE_GAP = 0.4;
/* Horizontal span of a short open laissez-vibrer tie (<tied type="let-ring"/>), in staff spaces
 * (Behind Bars p. 72). */
export const TIE_LV_LENGTH = 2;

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
	private readonly extraOff: number;
	constructor(notes: TieNotes, opts: DashedTieOptions = {}) {
		super(notes);
		this.dash = opts.dash ?? null;
		this.tip = opts.tip ?? null;
		this.bezier = opts.bezier ?? null;
		this.fit = opts.fit ?? false;
		this.extraOff = opts.extraOff ?? 0;
	}

	override getLastX(): number {
		const x = super.getLastX();
		const notes = this.getNotes();
		if (
			!notes.lastNote &&
			notes.firstNote &&
			notes.laissezVibrer === undefined
		) {
			const stave = notes.firstNote.getStave();
			if (stave) {
				return x - TIE_BARLINE_GAP * stave.getSpacingBetweenLines();
			}
		}
		return x;
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
		const lv = notes.laissezVibrer !== undefined;
		const ctx = this.checkContext();
		for (let i = 0; i < firstIndexes.length; i++) {
			const firstIndex = firstIndexes[i] as number;
			const lastIndex = lastIndexes[i] as number;
			const firstHead = params.firstYs[firstIndex] ?? 0;
			const lastHead = params.lastYs[lastIndex] ?? 0;
			const firstOff = this.offHead(first, firstHead, dir, stave);
			const lastOff = lv
				? firstOff
				: this.offHead(last, lastHead, dir, last?.getStave() ?? stave);
			const firstX = first
				? this.startX(first, firstIndex, firstOff, dir, params.firstX, space)
				: params.firstX;
			let lastX = params.lastX;
			if (last) {
				lastX = this.endX(last, lastIndex, lastOff, dir, params.lastX, space);
			} else if (lv) {
				lastX = firstX + (notes.laissezVibrer as number);
			}
			let firstY = firstHead + dir * firstOff * space;
			let lastY = lastHead + dir * lastOff * space;
			const length = Math.abs(lastX - firstX);
			const rise =
				space * Math.min(TIE_MAX_RISE, TIE_RISE * Math.sqrt(length / space));
			// A cubic reaches three quarters of its controls' lift at its middle. Each edge starts
			// half the tip off the centreline and reaches half the middle off it.
			const tip = (TIE_TIP * space) / 2;
			const middle = (TIE_MIDDLE * space) / 2;
			const nearLift = (rise - middle + tip) / 0.75;
			const farLift = (rise + middle - tip) / 0.75;
			if (!first && last instanceof StaveNote) {
				const shift = this.accidentalClearance(
					last,
					firstX,
					lastX,
					firstY,
					lastY,
					nearLift,
					dir,
					space,
				);
				firstY += dir * shift;
				lastY += dir * shift;
			}
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
		const nearestLine = Math.round(position);
		const onSpace = Math.abs(position - nearestLine) > 0.25;
		const base = onSpace
			? 0.5 - TIE_OFF_LINE
			: Math.abs(nearestLine + dir * TIE_OFF_LINE - position);
		return base + this.extraOff;
	}

	/*
	 * Whether a tie end is blocked from tucking over/under its own head, and the outer edge it
	 * must clear when blocked. A notehead on the tie's side blocks `start` when it sits in the
	 * same column or to the right, and blocks `end` when it sits in the same column or to the
	 * left; a stem blocks only when it stands on that side of the head (a displaced head sits
	 * outside the stem).
	 */
	private endObstacle(
		note: StaveNote,
		index: number,
		off: number,
		dir: number,
		side: 'start' | 'end',
		fallback: number,
	): { blocked: boolean; edge: number } {
		const props = note.getKeyProps();
		const myLine = props[index]?.line;
		const head = note.noteHeads[index];
		const begin = note.getNoteHeadBeginX();
		const myDisp = head?.getDisplacementX() ?? 0;
		const myLeft = head ? begin + myDisp : fallback;
		const myRight = head ? myLeft + head.getWidth() : fallback;
		let edge =
			side === 'start'
				? this.lineRightEdge(note, index, fallback)
				: this.lineLeftEdge(note, index, fallback);
		let inner = false;
		if (myLine !== undefined) {
			for (let i = 0; i < props.length; i++) {
				const line = props[i]?.line;
				if (line === undefined || !(dir > 0 ? line < myLine : line > myLine)) {
					continue;
				}
				const other = note.noteHeads[i];
				if (!other) {
					inner = true;
					continue;
				}
				const oLeft = begin + other.getDisplacementX();
				const oRight = oLeft + other.getWidth();
				if (side === 'start' ? oRight > myLeft + 1 : oLeft < myRight - 1) {
					inner = true;
					edge =
						side === 'start' ? Math.max(edge, oRight) : Math.min(edge, oLeft);
				}
			}
		} else {
			inner = dir > 0 ? index > 0 : index < note.getKeys().length - 1;
		}
		const stemBlocks =
			note.hasStem() &&
			(side === 'start'
				? dir < 0 && note.getStemDirection() === 1 && myDisp <= 0
				: dir > 0 && note.getStemDirection() === -1 && myDisp >= 0);
		return {
			blocked: off < 0.5 || inner || stemBlocks,
			edge,
		};
	}

	/* Rightmost notehead edge at `index`'s staff line, so a unison clears its displaced sibling. */
	private lineRightEdge(
		note: StaveNote,
		index: number,
		fallback: number,
	): number {
		const head = note.noteHeads[index];
		if (!head) {
			return fallback;
		}
		const begin = note.getNoteHeadBeginX();
		const myLine = note.getKeyProps()[index]?.line;
		let edge = begin + head.getDisplacementX() + head.getWidth();
		if (myLine === undefined) {
			return edge;
		}
		const props = note.getKeyProps();
		for (let i = 0; i < note.noteHeads.length; i++) {
			if (i !== index && props[i]?.line === myLine) {
				const sibling = note.noteHeads[i];
				if (sibling) {
					edge = Math.max(
						edge,
						begin + sibling.getDisplacementX() + sibling.getWidth(),
					);
				}
			}
		}
		return edge;
	}

	/* Leftmost notehead edge at `index`'s staff line, so a unison clears its displaced sibling. */
	private lineLeftEdge(
		note: StaveNote,
		index: number,
		fallback: number,
	): number {
		const head = note.noteHeads[index];
		if (!head) {
			return fallback;
		}
		const begin = note.getNoteHeadBeginX();
		const myLine = note.getKeyProps()[index]?.line;
		let edge = begin + head.getDisplacementX();
		if (myLine === undefined) {
			return edge;
		}
		const props = note.getKeyProps();
		for (let i = 0; i < note.noteHeads.length; i++) {
			if (i !== index && props[i]?.line === myLine) {
				const sibling = note.noteHeads[i];
				if (sibling) {
					edge = Math.min(edge, begin + sibling.getDisplacementX());
				}
			}
		}
		return edge;
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
		const obstacle = this.endObstacle(note, index, off, dir, 'start', fallback);
		if (obstacle.blocked) {
			// Start beside the blocking edge (plus any augmentation-dot shift) so a
			// displaced second does not push an undisplaced note's tie across both heads,
			// while a unison or blocked inner tie clears the head in its way.
			// Only shift past dots when this note itself is dotted: ModifierContext is
			// shared across voices on the same beat, so another voice's dot must not
			// push an undotted voice's tie past it.
			const rightShift =
				Dot.getDots(note).length > 0
					? (note.getModifierContext()?.getRightShiftForTie() ?? 0)
					: 0;
			const anchor = obstacle.edge + rightShift;
			return anchor + (off < 0.5 ? TIE_GAP_LEVEL : TIE_GAP_BLOCKED) * space;
		}
		return (
			Math.max(
				note.getNoteHeadEndX(),
				this.lineRightEdge(note, index, note.getNoteHeadEndX()),
			) -
			TIE_TUCK * space
		);
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
		const obstacle = this.endObstacle(note, index, off, dir, 'end', fallback);
		if (obstacle.blocked) {
			return (
				obstacle.edge - (off < 0.5 ? TIE_GAP_LEVEL : TIE_GAP_BLOCKED) * space
			);
		}
		return (
			Math.min(
				note.getNoteHeadBeginX(),
				this.lineLeftEdge(note, index, note.getNoteHeadBeginX()),
			) +
			TIE_TUCK * space
		);
	}

	/*
	 * Outward shift (in px) so an incoming system-break tie keeps its natural shallow arc
	 * while clearing any repeated accidental standing between its left edge and its notehead
	 * (Behind Bars p. 80).
	 */
	private accidentalClearance(
		last: StaveNote,
		firstX: number,
		lastX: number,
		firstY: number,
		lastY: number,
		nearLift: number,
		dir: number,
		space: number,
	): number {
		const length = lastX - firstX;
		if (length <= 0) {
			return 0;
		}
		const tip = (TIE_TIP * space) / 2;
		const pad = TIE_ACCIDENTAL_CLEARANCE * space;
		let shift = 0;
		for (const mod of last.getModifiers()) {
			if (mod.getCategory() !== 'Accidental') {
				continue;
			}
			const box = mod.getBoundingBox();
			const left = Math.max(firstX, box.getX());
			const right = Math.min(lastX, box.getX() + box.getW());
			if (right <= left) {
				continue;
			}
			const obstacleY =
				dir > 0 ? box.getY() + box.getH() + pad : box.getY() - pad;
			for (const x of [left, (left + right) / 2, right]) {
				const t = (x - firstX) / length;
				const curveY =
					firstY +
					(lastY - firstY) * t -
					dir * tip +
					dir * 3 * t * (1 - t) * nearLift;
				shift = Math.max(shift, dir * (obstacleY - curveY));
			}
		}
		return shift;
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

/* Vertical staff-line span [min, max] a fitted tie's ink covers on `line` curving in `dir`. */
export function tieLineBand(
	line: number,
	dir: number,
	chord: boolean,
	lengthInSpaces: number,
): [number, number] {
	let off = TIE_OFF_HEAD;
	if (chord) {
		off = Number.isInteger(line) ? TIE_OFF_LINE : 0.5 - TIE_OFF_LINE;
	}
	const rise = Math.min(
		TIE_MAX_RISE,
		TIE_RISE * Math.sqrt(Math.max(0, lengthInSpaces)),
	);
	const near = off - TIE_TIP / 2;
	const far = off + rise + TIE_MIDDLE / 2;
	return dir < 0 ? [line + near, line + far] : [line - far, line - near];
}
