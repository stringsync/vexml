import {
	Element,
	Modifier,
	type RenderContext,
	type Stave,
	type StaveNote,
	Stem,
} from 'vexflow/core';
import { DEFAULT_BEAM_WIDTH } from './constants';
import { stemFromKeyLines } from './middle-line-stem';
import { StaveArticulation } from './stave-articulation';

export interface BowedTremoloOptions {
	/** Beam thickness in px; defaults to ordinary beam width (Behind Bars p. 225). */
	beamWidth?: number;
	/** Top-to-top distance between adjacent tremolo beams in px. */
	levelDistance?: number;
}

// Minimum distance from the nearest notehead centre to the innermost tremolo beam edge,
// in stave-spaces, leaving ~¾ space of white clearance past the half-space notehead radius.
const HEAD_CLEARANCE_SPACES = 1.25;
// Standard stem length in stave-spaces for notional stems on whole notes (Behind Bars p. 226).
const NOTIONAL_STEM_SPACES = 3.5;
// Minimum stem length in stave-spaces when trimming a cross-staff stem to meet the beam stack.
const MIN_CROSS_STEM_SPACES = 1.5;
// Nominal gap from each stem centre to the detached beam end, in stave-spaces (Behind Bars p. 228).
const STEM_GAP_SPACES = 0.6;
// Floor gap from each stem centre on tightly spaced quarter-note pairs.
const MIN_STEM_GAP_SPACES = 0.25;
// Maximum detached beam width in stave-spaces on widely spaced pairs (Behind Bars p. 228).
const MAX_WIDTH_SPACES = 4;

interface CrossStaffLayout {
	readonly midX: number;
	readonly midY: number;
	readonly slope: number;
	readonly stackHeight: number;
	readonly fromIsUpper: boolean;
}

/*
 * The beams BETWEEN two notes of a <tremolo type="start"> ... <tremolo type="stop"> pair
 * (a fingered or bowed tremolo), drawn at ordinary beam thickness near the stem ends with
 * symmetric clearance from each stem (Behind Bars pp. 225–228). Supports stemmed pairs,
 * whole-note pairs using notional stem geometry, and cross-staff pairs centred between
 * the two staves. The single-note form is vexflow's Tremolo modifier, through one stem.
 */
export class BowedTremolo extends Element {
	private readonly beamWidth: number;
	private readonly levelDistance: number;

	constructor(
		private readonly from: StaveNote,
		private readonly to: StaveNote,
		private readonly marks: number,
		opts: BowedTremoloOptions = {},
	) {
		super();
		this.beamWidth = opts.beamWidth ?? DEFAULT_BEAM_WIDTH;
		this.levelDistance = opts.levelDistance ?? this.beamWidth * 1.5;
	}

	/* Notes whose stems cross the inter-staff gap on a cross-staff tremolo. */
	crossStaffNotes(rowOf: ReadonlyMap<StaveNote, number>): StaveNote[] {
		const row1 = rowOf.get(this.from);
		const row2 = rowOf.get(this.to);
		if (row1 === undefined || row2 === undefined || row1 === row2) {
			return [];
		}
		const notes: StaveNote[] = [];
		const fromIsUpper = row1 < row2;
		if (
			this.from.hasStem() &&
			this.from.getStemDirection() === (fromIsUpper ? Stem.DOWN : Stem.UP)
		) {
			notes.push(this.from);
		}
		if (
			this.to.hasStem() &&
			this.to.getStemDirection() === (fromIsUpper ? Stem.UP : Stem.DOWN)
		) {
			notes.push(this.to);
		}
		return notes;
	}

	/*
	 * Lengthens (or trims, for cross-staff) either stem as needed so both stems reach
	 * the outer tremolo beam and enclose every beam with clearance from the noteheads
	 * (Behind Bars pp. 226–227). Called after formatting and before notes draw their stems.
	 */
	extendStems(): void {
		const stave1 = this.from.getStave();
		const stave2 = this.to.getStave();
		if (!stave1 || !stave2 || this.sharesBeam()) {
			return;
		}
		if (stave1 !== stave2) {
			this.extendCrossStaffStems(stave1, stave2);
			return;
		}
		if (!this.from.hasStem() || !this.to.hasStem()) {
			return;
		}
		const dir = this.from.getStemDirection();
		if (dir !== this.to.getStemDirection()) {
			return;
		}
		const layout = this.sameDirectionLayout(
			stave1,
			stave1.getSpacingBetweenLines(),
			dir,
		);
		if (!layout) {
			return;
		}
		const { outerY1, outerY2 } = layout;
		this.extendStemTo(this.from, outerY1, dir);
		this.extendStemTo(this.to, outerY2, dir);
	}

	/*
	 * Centres any fermata attached to one note of the tremolo pair horizontally between the
	 * two notes and outside the tremolo beams (Behind Bars p. 188). Called after formatting
	 * and extendStems() so note x positions and final beam/stem extents are known.
	 */
	placeFermatas(): void {
		const stave1 = this.from.getStave();
		const stave2 = this.to.getStave();
		if (!stave1 || !stave2) {
			return;
		}
		const fromFermatas = this.fermatasOf(this.from);
		const toFermatas = this.fermatasOf(this.to);
		if (fromFermatas.length === 0 && toFermatas.length === 0) {
			return;
		}
		const x1 = this.anchorX(this.from);
		const x2 = this.anchorX(this.to);
		if (!(x2 > x1)) {
			return;
		}
		const beamMidX = (x1 + x2) / 2;
		const headMidX =
			(this.headCenterX(this.from) + this.headCenterX(this.to)) / 2;
		const space = stave1.getSpacingBetweenLines();
		const sameStave = stave1 === stave2;
		const dir = sameStave ? this.sameStaffDirection() : null;
		const layout =
			sameStave && dir !== null && !this.sharesBeam()
				? this.sameDirectionLayout(stave1, space, dir)
				: null;
		for (const side of [Modifier.Position.ABOVE, Modifier.Position.BELOW]) {
			const onFrom = fromFermatas.filter((f) => f.getPosition() === side);
			const onTo = toFermatas.filter((f) => f.getPosition() === side);
			if (
				(onFrom.length > 0 && onTo.length > 0) ||
				(onFrom.length === 0 && onTo.length === 0)
			) {
				continue;
			}
			const onBeamSide =
				sameStave &&
				((side === Modifier.Position.ABOVE && dir === Stem.UP) ||
					(side === Modifier.Position.BELOW && dir === Stem.DOWN));
			const targetX = onBeamSide ? beamMidX : headMidX;
			const boundY = sameStave
				? this.fermataBoundY(side, onBeamSide, layout, space)
				: null;
			for (const fermata of [...onFrom, ...onTo]) {
				fermata.centreOnTremolo(targetX, boundY);
			}
		}
	}

	private fermatasOf(note: StaveNote): StaveArticulation[] {
		return note
			.getModifiers()
			.filter(
				(mod): mod is StaveArticulation =>
					mod instanceof StaveArticulation && mod.fermata,
			);
	}

	private headCenterX(note: StaveNote): number {
		return (note.getNoteHeadBeginX() + note.getNoteHeadEndX()) / 2;
	}

	private fermataBoundY(
		side: number,
		onBeamSide: boolean,
		layout: { outerY1: number; outerY2: number } | null,
		space: number,
	): number | null {
		if (side === Modifier.Position.ABOVE) {
			let edge = Math.min(
				this.from.getNoteHeadBounds().yTop,
				this.to.getNoteHeadBounds().yTop,
			);
			if (this.from.hasStem()) {
				edge = Math.min(edge, this.from.getStemExtents().topY);
			}
			if (this.to.hasStem()) {
				edge = Math.min(edge, this.to.getStemExtents().topY);
			}
			if (onBeamSide && layout) {
				edge = Math.min(edge, layout.outerY1, layout.outerY2);
			}
			return edge - (onBeamSide ? 1.5 : 1) * space;
		}
		if (side === Modifier.Position.BELOW) {
			let edge = Math.max(
				this.from.getNoteHeadBounds().yBottom,
				this.to.getNoteHeadBounds().yBottom,
			);
			if (this.from.hasStem()) {
				edge = Math.max(edge, this.from.getStemExtents().topY);
			}
			if (this.to.hasStem()) {
				edge = Math.max(edge, this.to.getStemExtents().topY);
			}
			if (onBeamSide && layout) {
				edge = Math.max(edge, layout.outerY1, layout.outerY2);
			}
			return edge + (onBeamSide ? 1.5 : 1) * space;
		}
		return null;
	}

	override draw(): void {
		const ctx: RenderContext = this.checkContext();
		ctx.openGroup('vexml-beam');
		try {
			this.setRendered();
			const stave1 = this.from.getStave();
			const stave2 = this.to.getStave();
			if (!stave1 || !stave2) {
				return;
			}
			const x1 = this.anchorX(this.from);
			const x2 = this.anchorX(this.to);
			if (!(x2 > x1)) {
				return;
			}
			const space = stave1.getSpacingBetweenLines();
			const bounds = this.horizontalBounds(x1, x2, space);
			if (!bounds) {
				return;
			}
			const { left, right } = bounds;
			if (stave1 !== stave2) {
				this.drawCrossStaff(ctx, stave1, stave2, x1, x2, left, right, space);
				return;
			}
			const dir = this.sameStaffDirection();
			if (dir !== null) {
				this.drawSameDirection(ctx, stave1, x1, x2, left, right, dir, space);
			} else {
				this.drawOpposing(ctx, x1, x2, left, right, space);
			}
		} finally {
			ctx.closeGroup();
		}
	}

	private sharesBeam(): boolean {
		const beam = this.from.getBeam();
		return beam !== null && beam !== undefined && beam === this.to.getBeam();
	}

	/* Horizontal anchor: real stem centre, or notehead centre for stemless (whole) notes. */
	private anchorX(note: StaveNote): number {
		if (note.hasStem()) {
			return note.getStemX();
		}
		return (note.getNoteHeadBeginX() + note.getNoteHeadEndX()) / 2;
	}

	private sameStaffDirection(): number | null {
		const has1 = this.from.hasStem();
		const has2 = this.to.hasStem();
		if (has1 && has2) {
			const dir = this.from.getStemDirection();
			return dir === this.to.getStemDirection() ? dir : null;
		}
		if (has1) {
			return this.from.getStemDirection();
		}
		if (has2) {
			return this.to.getStemDirection();
		}
		const lines = [
			...this.from.getKeyProps().map((k) => k.line),
			...this.to.getKeyProps().map((k) => k.line),
		];
		if (lines.length === 0) {
			return Stem.UP;
		}
		return stemFromKeyLines(lines) === 'up' ? Stem.UP : Stem.DOWN;
	}

	private headNearestBeam(note: StaveNote, dir: number): number {
		const ys = note.getYs();
		return dir === Stem.DOWN ? Math.max(...ys) : Math.min(...ys);
	}

	/* Real stem tip, or notional stem tip (3.5 spaces, reaching at least the middle line). */
	private tipY(
		note: StaveNote,
		stave: Stave,
		dir: number,
		space: number,
	): number {
		if (note.hasStem()) {
			return note.getStemExtents().topY;
		}
		const head = this.headNearestBeam(note, dir);
		const notional = head - dir * NOTIONAL_STEM_SPACES * space;
		const midLine = stave.getYForLine(Math.floor(stave.getNumLines() / 2));
		return dir === Stem.UP
			? Math.min(notional, midLine)
			: Math.max(notional, midLine);
	}

	private sameDirectionLayout(
		stave: Stave,
		space: number,
		dir: number,
	): { outerY1: number; outerY2: number } | null {
		const head1 = this.headNearestBeam(this.from, dir);
		const head2 = this.headNearestBeam(this.to, dir);
		if (!Number.isFinite(head1) || !Number.isFinite(head2)) {
			return null;
		}
		const rawRise = head2 - head1;
		const rise = Math.sign(rawRise) * Math.min(Math.abs(rawRise) * 0.5, space);
		const stackHeight = this.beamWidth + (this.marks - 1) * this.levelDistance;
		const minReach = stackHeight + HEAD_CLEARANCE_SPACES * space;
		const tip1 = this.tipY(this.from, stave, dir, space);
		const tip2 = this.tipY(this.to, stave, dir, space);
		const req1 =
			dir === Stem.UP
				? Math.min(tip1, head1 - minReach)
				: Math.max(tip1, head1 + minReach);
		const req2 =
			dir === Stem.UP
				? Math.min(tip2, head2 - minReach)
				: Math.max(tip2, head2 + minReach);
		const outerY1 =
			dir === Stem.UP
				? Math.min(req1, req2 - rise)
				: Math.max(req1, req2 - rise);
		return { outerY1, outerY2: outerY1 + rise };
	}

	private crossStaffLayout(
		stave1: Stave,
		stave2: Stave,
		x1: number,
		x2: number,
		space: number,
	): CrossStaffLayout | null {
		if (!(x2 > x1)) {
			return null;
		}
		const fromIsUpper = stave1.getYForLine(0) < stave2.getYForLine(0);
		const upperStave = fromIsUpper ? stave1 : stave2;
		const lowerStave = fromIsUpper ? stave2 : stave1;
		const upperNote = fromIsUpper ? this.from : this.to;
		const lowerNote = fromIsUpper ? this.to : this.from;
		const upperYs = upperNote.getYs();
		const lowerYs = lowerNote.getYs();
		if (upperYs.length === 0 || lowerYs.length === 0) {
			return null;
		}
		const upperBound = Math.max(
			upperStave.getYForLine(upperStave.getNumLines() - 1),
			Math.max(...upperYs),
		);
		const lowerBound = Math.min(
			lowerStave.getYForLine(0),
			Math.min(...lowerYs),
		);
		const midY = (upperBound + lowerBound) / 2;
		const head1 = this.from.getYs()[0] ?? midY;
		const head2 = this.to.getYs()[0] ?? midY;
		const rawRise = head2 - head1;
		const rise = Math.sign(rawRise) * Math.min(Math.abs(rawRise) * 0.5, space);
		const stackHeight = this.beamWidth + (this.marks - 1) * this.levelDistance;
		return {
			midX: (x1 + x2) / 2,
			midY,
			slope: rise / (x2 - x1),
			stackHeight,
			fromIsUpper,
		};
	}

	private extendCrossStaffStems(stave1: Stave, stave2: Stave): void {
		const x1 = this.anchorX(this.from);
		const x2 = this.anchorX(this.to);
		const space = stave1.getSpacingBetweenLines();
		const layout = this.crossStaffLayout(stave1, stave2, x1, x2, space);
		if (!layout) {
			return;
		}
		const { midX, midY, slope, stackHeight, fromIsUpper } = layout;
		const topAt = (x: number) => midY - stackHeight / 2 + slope * (x - midX);
		const bottomAt = (x: number) => topAt(x) + stackHeight;
		if (this.from.hasStem()) {
			const expected = fromIsUpper ? Stem.DOWN : Stem.UP;
			if (this.from.getStemDirection() === expected) {
				const target = expected === Stem.UP ? topAt(x1) : bottomAt(x1);
				this.fitCrossStaffStem(this.from, target, expected, space);
			}
		}
		if (this.to.hasStem()) {
			const expected = fromIsUpper ? Stem.UP : Stem.DOWN;
			if (this.to.getStemDirection() === expected) {
				const target = expected === Stem.UP ? topAt(x2) : bottomAt(x2);
				this.fitCrossStaffStem(this.to, target, expected, space);
			}
		}
	}

	private fitCrossStaffStem(
		note: StaveNote,
		targetY: number,
		dir: number,
		space: number,
	): void {
		const stem = note.getStem();
		if (!stem) {
			return;
		}
		const head = this.headNearestBeam(note, dir);
		const minTarget = head - dir * MIN_CROSS_STEM_SPACES * space;
		const clamped =
			dir === Stem.UP
				? Math.min(targetY, minTarget)
				: Math.max(targetY, minTarget);
		const tip = note.getStemExtents().topY;
		const extra = (tip - clamped) * dir;
		if (Math.abs(extra) > 0.25) {
			stem.setExtension(stem.getExtension() + extra);
		}
	}

	private extendStemTo(note: StaveNote, targetY: number, dir: number): void {
		const stem = note.getStem();
		if (!stem) {
			return;
		}
		const tip = note.getStemExtents().topY;
		const extra = (tip - targetY) * dir;
		if (extra > 0.25) {
			stem.setExtension(stem.getExtension() + extra);
		}
	}

	/*
	 * Symmetric horizontal bounds clear of both stems (Behind Bars p. 228).
	 */
	private horizontalBounds(
		x1: number,
		x2: number,
		space: number,
	): { left: number; right: number } | null {
		const span = x2 - x1;
		const gap = Math.min(
			STEM_GAP_SPACES * space,
			Math.max(MIN_STEM_GAP_SPACES * space, span * 0.25),
		);
		const available = span - 2 * gap;
		if (available <= Stem.WIDTH) {
			return null;
		}
		const width = Math.min(available, MAX_WIDTH_SPACES * space);
		const mid = (x1 + x2) / 2;
		return { left: mid - width / 2, right: mid + width / 2 };
	}

	private drawSameDirection(
		ctx: RenderContext,
		stave: Stave,
		x1: number,
		x2: number,
		left: number,
		right: number,
		dir: number,
		space: number,
	): void {
		let outerY1: number;
		let outerY2: number;
		let startLevel = 0;
		if (this.sharesBeam()) {
			outerY1 = this.from.getStemExtents().topY;
			outerY2 = this.to.getStemExtents().topY;
			startLevel = Math.min(
				this.from.getGlyphProps().beamCount,
				this.to.getGlyphProps().beamCount,
			);
		} else {
			const layout = this.sameDirectionLayout(stave, space, dir);
			if (!layout) {
				return;
			}
			outerY1 = layout.outerY1;
			outerY2 = layout.outerY2;
		}
		const slope = (outerY2 - outerY1) / (x2 - x1);
		const thickness = this.beamWidth * dir;
		for (let i = 0; i < this.marks; i++) {
			const offset = (startLevel + i) * this.levelDistance * dir;
			const yAt = (x: number) => outerY1 + slope * (x - x1) + offset;
			ctx.beginPath();
			ctx.moveTo(left, yAt(left));
			ctx.lineTo(left, yAt(left) + thickness);
			ctx.lineTo(right, yAt(right) + thickness);
			ctx.lineTo(right, yAt(right));
			ctx.closePath();
			ctx.fill();
		}
	}

	private drawCrossStaff(
		ctx: RenderContext,
		stave1: Stave,
		stave2: Stave,
		x1: number,
		x2: number,
		left: number,
		right: number,
		space: number,
	): void {
		const layout = this.crossStaffLayout(stave1, stave2, x1, x2, space);
		if (!layout) {
			return;
		}
		const { midX, midY, slope, stackHeight } = layout;
		const top = midY - stackHeight / 2;
		for (let i = 0; i < this.marks; i++) {
			const y = top + i * this.levelDistance;
			const yAt = (x: number) => y + slope * (x - midX);
			ctx.beginPath();
			ctx.moveTo(left, yAt(left));
			ctx.lineTo(left, yAt(left) + this.beamWidth);
			ctx.lineTo(right, yAt(right) + this.beamWidth);
			ctx.lineTo(right, yAt(right));
			ctx.closePath();
			ctx.fill();
		}
	}

	/*
	 * Fallback when explicit <stem>s point in opposite directions: centre the beams vertically
	 * between the stems, slanting in the direction of the interval.
	 */
	private drawOpposing(
		ctx: RenderContext,
		x1: number,
		x2: number,
		left: number,
		right: number,
		space: number,
	): void {
		const a = this.from.getStemExtents();
		const b = this.to.getStemExtents();
		const midX = (x1 + x2) / 2;
		const midY = ((a.topY + a.baseY) / 2 + (b.topY + b.baseY) / 2) / 2;
		const head1 = this.from.getYs()[0] ?? midY;
		const head2 = this.to.getYs()[0] ?? midY;
		const rawRise = head2 - head1;
		const rise = Math.sign(rawRise) * Math.min(Math.abs(rawRise) * 0.5, space);
		const slope = rise / (x2 - x1);
		const stackHeight = this.beamWidth + (this.marks - 1) * this.levelDistance;
		const top = midY - stackHeight / 2;
		for (let i = 0; i < this.marks; i++) {
			const y = top + i * this.levelDistance;
			const yAt = (x: number) => y + slope * (x - midX);
			ctx.beginPath();
			ctx.moveTo(left, yAt(left));
			ctx.lineTo(left, yAt(left) + this.beamWidth);
			ctx.lineTo(right, yAt(right) + this.beamWidth);
			ctx.lineTo(right, yAt(right));
			ctx.closePath();
			ctx.fill();
		}
	}
}
