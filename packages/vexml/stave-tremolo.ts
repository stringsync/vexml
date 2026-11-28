import {
	type Beam,
	Metrics,
	type Stave,
	StaveNote,
	Stem,
	type StemmableNote,
	Tremolo,
} from 'vexflow/core';
import { STAVE_LINE_DISTANCE } from './constants';

// VexFlow's five-line stave line numbers (C4 in treble = 0, E4 = 1, F5 = 5).
const BOTTOM_LINE = 1;
const TOP_LINE = 5;

// Notehead half-height and Bravura tremolo1 half-height at fontScale = 1 (in px, i.e. 10 px/space).
const NOTEHEAD_HALF_PX = 5;
const STROKE_HALF_PX = 3.75;

// Behind Bars pp. 221–222 clearance thresholds, in stave-spaces.
const SINGLE_HEAD_CLEAR_SPACES = 0.5;
const MULTI_HEAD_CLEAR_SPACES = 1.05;
const STAVE_EDGE_MARGIN_SPACES = 0.05;
const TIP_CLEAR_SPACES = 0.5;
const BEAM_GAP_SPACES = 0.35;
// Bravura's 8th/16th flag spans ~3.28 spaces from the stem tip; 32nd+ adds stemBeamExtension.
const FLAG_BASE_SPACES = 3.3;
const FLAG_GAP_SPACES = 0.25;

/*
 * Single-note tremolo strokes placed by Behind Bars pp. 221–222:
 * - A single stroke intersects a stave line clear of both notehead and stem end.
 * - Two or more strokes stay at least one stave-space clear of the notehead.
 * - The stem extends past the outermost stroke (lengthened for 3+ strokes, flags, and beams).
 * - Strokes on ledger-line notes stay within the stave, clear of ledger lines.
 * - On stemless notes (whole notes), strokes centre horizontally on the non-displaced
 *   notehead (the notional-stem-side head in an adjacent-second chord), above below the
 *   middle line and below on or above it.
 */
export class StaveTremolo extends Tremolo {
	readonly strokeCount: number;

	constructor(num: number) {
		super(num);
		this.strokeCount = num;
	}

	/*
	 * Extend an unbeamed stemmed note's stem so its tremolo strokes clear the notehead,
	 * ledger lines, and stem tip or flag (Behind Bars pp. 221–222). Beamed notes are
	 * sized by SpacedBeam instead, once the beam's slope and thickness are known.
	 */
	static extendStem(
		note: StaveNote,
		num: number,
		staffSpace = STAVE_LINE_DISTANCE,
	): void {
		if (!note.hasStem()) {
			return;
		}
		const target = requiredStemLength(note, num, staffSpace, null);
		const current = note.getStemLength();
		if (target <= current) {
			return;
		}
		// StaveNote.getStemExtension() adds middle-line reach on top of stemExtensionOverride,
		// so subtract any overshoot so the final stem lands at `target`.
		note.setStemLength(target);
		const overshoot = note.getStemLength() - target;
		if (overshoot > 0) {
			note.setStemLength(target - overshoot);
		}
		note.getStem()?.setExtension(note.getStemExtension());
	}

	/*
	 * Minimum distance (in px) from `note`'s beam-side notehead to the outer edge of `beam`
	 * so its tremolo strokes clear the notehead, ledger lines, and all beam lines.
	 * Returns null when `note` has no StaveTremolo or no stem.
	 */
	static minBeamReach(note: StemmableNote, beamDepth: number): number | null {
		if (!(note instanceof StaveNote) || !note.hasStem()) {
			return null;
		}
		const tremolo = note
			.getModifiers()
			.find((mod): mod is StaveTremolo => mod instanceof StaveTremolo);
		if (!tremolo) {
			return null;
		}
		const space =
			note.getStave()?.getSpacingBetweenLines() ?? STAVE_LINE_DISTANCE;
		return requiredStemLength(note, tremolo.strokeCount, space, beamDepth);
	}

	/* Compute the canvas Y coordinate of each tremolo stroke on a stemmed note. */
	strokeYs(note: StaveNote, stave: Stave): number[] {
		const dir = note.getStemDirection();
		const scale = note.getFontScale();
		const space = stave.getSpacingBetweenLines();
		const spacing = Metrics.get('Tremolo.spacing') * scale;
		const halfStroke = STROKE_HALF_PX * scale;
		const blockSpan = (this.strokeCount - 1) * spacing + 2 * halfStroke;

		const ys = note.getYs();
		const headY = dir === Stem.UP ? Math.min(...ys) : Math.max(...ys);
		const tipY = note.getStemExtents().topY;
		// Signed coordinate `s`: distance from `headY` toward the stem tip (positive outward).
		const sTip = (headY - tipY) * dir;

		const topLine = stave.getYForLine(0);
		const bottomLine = stave.getYForLine(stave.getNumLines() - 1);
		const sStaveNear = dir === Stem.UP ? headY - bottomLine : topLine - headY;
		const sStaveFar = dir === Stem.UP ? headY - topLine : bottomLine - headY;

		const headClear =
			NOTEHEAD_HALF_PX * scale +
			(this.strokeCount >= 2
				? MULTI_HEAD_CLEAR_SPACES
				: SINGLE_HEAD_CLEAR_SPACES) *
				space;
		const staveFloor =
			sStaveNear > 0 ? sStaveNear + STAVE_EDGE_MARGIN_SPACES * space : 0;
		const sInnerMin = Math.max(headClear, staveFloor);

		const tipClear = tipClearanceOf(note, space, scale, beamDepthOf(note));
		let sOuterMax = sTip - tipClear;
		// On ledger-line notes whose stem enters the stave, keep strokes inside the stave
		// when the stave has room for the block.
		if (sStaveNear > 0) {
			const staveCeiling = sStaveFar - STAVE_EDGE_MARGIN_SPACES * space;
			if (staveCeiling - sInnerMin >= blockSpan) {
				sOuterMax = Math.min(sOuterMax, staveCeiling);
			}
		}

		let sInner: number;
		if (this.strokeCount === 1) {
			const sCenterMin = sInnerMin + halfStroke;
			const sCenterMax = Math.max(sCenterMin, sOuterMax - halfStroke);
			const target = (sCenterMin + sCenterMax) / 2;
			const bestLine = pickStaveLine(
				stave,
				headY,
				dir,
				sCenterMin,
				sCenterMax,
				target,
			);
			const sCenter = bestLine ?? target;
			sInner = sCenter - halfStroke;
		} else {
			const sInnerMax = Math.max(sInnerMin, sOuterMax - blockSpan);
			sInner = (sInnerMin + sInnerMax) / 2;
		}

		const out: number[] = [];
		for (let i = 0; i < this.strokeCount; i++) {
			const sCenter = sInner + halfStroke + i * spacing;
			out.push(headY - sCenter * dir);
		}
		return out;
	}

	/*
	 * Horizontal centre of the tremolo strokes: the stem centre on stemmed notes,
	 * or the centre of the non-displaced (notional-stem-side) notehead on stemless notes.
	 */
	strokeX(note: StaveNote): number {
		if (!note.hasStem()) {
			return note.getNoteHeadBeginX() + note.getGlyphWidth() / 2;
		}
		const dir = note.getStemDirection();
		return (
			note.getAbsoluteX() +
			(dir === Stem.UP ? note.getGlyphWidth() - Stem.WIDTH / 2 : Stem.WIDTH / 2)
		);
	}

	override draw(): void {
		const ctx = this.checkContext();
		const note = this.checkAttachedNote();
		if (!(note instanceof StaveNote)) {
			super.draw();
			return;
		}
		const stave = note.getStave();
		if (!stave) {
			super.draw();
			return;
		}
		// Voices draw before beams, so ensure a beamed note's stem extensions are settled first.
		const beam = note.getBeam();
		if (beam) {
			beam.postFormat();
		}
		this.setRendered();
		const scale = note.getFontScale();
		const x = this.strokeX(note);
		this.fontInfo.size = Metrics.get('Tremolo.fontSize') * scale;
		for (const y of this.strokeYs(note, stave)) {
			this.renderText(ctx, x, y);
		}
	}
}

/* Minimum stem length from the stem-side notehead to the stem tip (or outer beam edge). */
function requiredStemLength(
	note: StaveNote,
	num: number,
	space: number,
	beamDepth: number | null,
): number {
	const scale = note.getFontScale();
	const spacing = Metrics.get('Tremolo.spacing') * scale;
	const blockSpan = (num - 1) * spacing + 2 * STROKE_HALF_PX * scale;
	const headClear =
		NOTEHEAD_HALF_PX * scale +
		(num >= 2 ? MULTI_HEAD_CLEAR_SPACES : SINGLE_HEAD_CLEAR_SPACES) * space;
	const sStaveNear = staveEntryFromKeys(note, space);
	const staveFloor =
		sStaveNear > 0 ? sStaveNear + STAVE_EDGE_MARGIN_SPACES * space : 0;
	const sInnerMin = Math.max(headClear, staveFloor);
	const tipClear = tipClearanceOf(note, space, scale, beamDepth);
	return sInnerMin + blockSpan + tipClear;
}

/* Distance from the stem-side notehead to the nearest stave edge when off-stave, else 0. */
function staveEntryFromKeys(note: StaveNote, space: number): number {
	const stave = note.getStave();
	const dir = note.getStemDirection();
	if (stave) {
		const ys = note.getYs();
		if (ys.length > 0) {
			const headY = dir === Stem.UP ? Math.min(...ys) : Math.max(...ys);
			const near =
				dir === Stem.UP
					? headY - stave.getYForLine(stave.getNumLines() - 1)
					: stave.getYForLine(0) - headY;
			return Math.max(0, near);
		}
	}
	const lines = note.getKeyProps().map((k) => k.line);
	if (lines.length === 0) {
		return 0;
	}
	if (dir === Stem.UP) {
		const outer = Math.max(...lines);
		return outer < BOTTOM_LINE ? (BOTTOM_LINE - outer) * space : 0;
	}
	const outer = Math.min(...lines);
	return outer > TOP_LINE ? (outer - TOP_LINE) * space : 0;
}

function tipClearanceOf(
	note: StaveNote,
	space: number,
	scale: number,
	beamDepth: number | null,
): number {
	if (beamDepth !== null) {
		return beamDepth + BEAM_GAP_SPACES * space;
	}
	if (note.hasFlag()) {
		const extraFlagPx = (note.glyphProps.stemBeamExtension ?? 0) * scale;
		return (FLAG_BASE_SPACES + FLAG_GAP_SPACES) * space + extraFlagPx;
	}
	return TIP_CLEAR_SPACES * space;
}

function beamDepthOf(note: StaveNote): number | null {
	const beam = note.getBeam() as
		| (Beam & { levelDistance?: () => number })
		| undefined;
	if (!beam) {
		return null;
	}
	const width = beam.renderOptions.beamWidth;
	const levels = Math.max(beam.getBeamCount() - 1, 0);
	const gap =
		typeof beam.levelDistance === 'function'
			? beam.levelDistance()
			: width * 1.5;
	return width + levels * gap;
}

/* Stave line in [sMin, sMax] closest to `target` (ties prefer smaller `s`, deeper in the stave). */
function pickStaveLine(
	stave: Stave,
	headY: number,
	dir: number,
	sMin: number,
	sMax: number,
	target: number,
): number | null {
	let best: number | null = null;
	let bestDist = Infinity;
	for (let i = 0; i < stave.getNumLines(); i++) {
		const sLine = (headY - stave.getYForLine(i)) * dir;
		if (sLine < sMin - 1e-6 || sLine > sMax + 1e-6) {
			continue;
		}
		const dist = Math.abs(sLine - target);
		if (
			dist < bestDist - 1e-6 ||
			(Math.abs(dist - bestDist) <= 1e-6 && best !== null && sLine < best)
		) {
			best = sLine;
			bestDist = dist;
		}
	}
	return best;
}
