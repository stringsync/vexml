import {
	GraceNote,
	type GraceNoteStruct,
	type Stave,
	Stem,
} from 'vexflow/core';
import { STAVE_LINE_DISTANCE } from './constants';
import {
	drawVisibleNoteHeads,
	NO_HIDDEN_NOTE_HEADS,
	trimFormatterRightShiftOverlap,
	type VexmlNoteOverrides,
} from './vexml-overrides';

const LEDGER_SLASH_CLEARANCE_SPACES = 0.25;
const MAX_BEAM_SLASH_STEM_RATIO = 0.72;

/*
 * A GraceNote (for grace notes and cue notes) carrying vexml's dot gap, ledger-line
 * choices, and Behind Bars p. 126 grace-slash geometry:
 * - Single slashed grace notes on ledger lines lengthen their stem so the diagonal slash
 *   clears every ledger line on the stem side.
 * - Slashed beamed grace-note groups draw a clear diagonal stroke crossing the first stem
 *   and the full beam stack at the beginning of the group.
 */
export class VexmlGraceNote extends GraceNote implements VexmlNoteOverrides {
	/* Added to vexflow's indent before the first dot. */
	extraDotGap = 0;

	/* False for print-leger="no": the head sits off the stave without its ledger lines. */
	ledgerLinesShown = true;

	/* Chord member indices with <notehead>none</notehead>: omit the head glyph while keeping modifiers. */
	hiddenNoteHeads: ReadonlySet<number> = NO_HIDDEN_NOTE_HEADS;

	/* Sounding semitone alteration per key (0 natural, 1 sharp, -1 flat), for altered-unison checks. */
	keyAlters: readonly (number | undefined)[] = [];

	/* Shift already reflected in xShift, trimmed from modRightPx so VexFlow's formatter doesn't double-count it. */
	formatterRightShiftOverlap = 0;

	constructor(noteStruct: GraceNoteStruct) {
		super(noteStruct);
		// GraceNote sets `this.slash` after StaveNote's constructor calls buildStem(), so
		// refresh the stem extension once `this.slash` and noteheads are initialized.
		this.refreshStemExtension();
	}

	override getFirstDotPx(): number {
		return super.getFirstDotPx() + this.extraDotGap;
	}

	override getMetrics() {
		return trimFormatterRightShiftOverlap(
			super.getMetrics(),
			this.formatterRightShiftOverlap,
		);
	}

	override drawLedgerLines(): void {
		if (this.ledgerLinesShown) {
			super.drawLedgerLines();
		}
	}

	override drawNoteHeads(): void {
		if (this.hiddenNoteHeads.size === 0) {
			super.drawNoteHeads();
			return;
		}
		drawVisibleNoteHeads(this, this.hiddenNoteHeads);
	}

	override setStave(stave: Stave): this {
		super.setStave(stave);
		this.refreshStemExtension();
		return this;
	}

	override getStemExtension(): number {
		const base = super.getStemExtension();
		if (!this.slash || this.beam || !this.hasStem()) {
			return base;
		}
		const ledgerLine = this.stemSideLedgerBoundary();
		if (ledgerLine === null) {
			return base;
		}
		const spacing =
			this.getStave()?.getSpacingBetweenLines() ?? STAVE_LINE_DISTANCE;
		const scale = this.getFontScale();
		const defaultOffsetY = (Stem.HEIGHT * scale) / 2;
		const headWidth = this.noteHeads[0]?.getWidth() ?? 0;
		const halfSlashY = headWidth > 0 ? headWidth : STAVE_LINE_DISTANCE * scale;
		const margin = LEDGER_SLASH_CLEARANCE_SPACES * spacing;
		const lines = this.getKeyProps().map((k) => k.line);
		const stemOriginLine =
			this.getStemDirection() === Stem.UP
				? Math.max(...lines)
				: Math.min(...lines);
		const distanceToLedger = Math.abs(ledgerLine - stemOriginLine) * spacing;
		const neededLength =
			distanceToLedger + defaultOffsetY + halfSlashY + margin;
		const currentLength = Stem.HEIGHT + base;
		return neededLength > currentLength ? neededLength - Stem.HEIGHT : base;
	}

	override getSlash():
		| { x1: number; y1: number; x2: number; y2: number }
		| undefined {
		if (!this.slash || !this.stem) {
			return undefined;
		}
		const scale = this.getFontScale();
		const beam = this.beam;
		if (beam) {
			if (!beam.postFormatted) {
				beam.postFormat();
			}
			const beamWidth = beam.renderOptions.beamWidth || 3;
			const beamCount = Math.max(1, beam.getBeamCount());
			// Beam.getStrips steps each secondary beam by 1.5 * beamWidth from the primary beam.
			const beamStack = beamWidth * (1.5 * beamCount - 0.5);
			let slashStemOffset = beamStack + 5 * scale;
			const extents = this.getStemExtents();
			const stemSpan = Math.abs(extents.baseY - extents.topY);
			if (stemSpan > 0) {
				slashStemOffset = Math.min(
					slashStemOffset,
					stemSpan * MAX_BEAM_SLASH_STEM_RATIO,
				);
			}
			const slashBeamOffset = Math.max(12 * scale, beamStack + 5 * scale);
			const slashBBox = this.calcBeamedNotesSlashBBox(
				slashStemOffset,
				slashBeamOffset,
				{
					stem: 11 * scale,
					beam: 9 * scale,
				},
			);
			return {
				x1: slashBBox.x1 ?? 0,
				y1: slashBBox.y1 ?? 0,
				x2: slashBBox.x2 ?? 0,
				y2: slashBBox.y2 ?? 0,
			};
		}
		if (this.stemSideLedgerBoundary() === null) {
			return super.getSlash();
		}
		const stemDirection = this.getStemDirection();
		const noteHeadWidth = this.noteHeads[0]?.getWidth() ?? 0;
		const x =
			stemDirection === Stem.DOWN
				? this.getAbsoluteX()
				: this.getAbsoluteX() + noteHeadWidth;
		const defaultOffsetY = (Stem.HEIGHT * scale) / 2;
		const tipY = this.getStemExtents().topY;
		const y =
			stemDirection === Stem.DOWN
				? tipY - defaultOffsetY
				: tipY + defaultOffsetY;
		if (stemDirection === Stem.DOWN) {
			return {
				x1: x - noteHeadWidth,
				y1: y - noteHeadWidth,
				x2: x + noteHeadWidth,
				y2: y + noteHeadWidth,
			};
		}
		return {
			x1: x - noteHeadWidth,
			y1: y + noteHeadWidth,
			x2: x + noteHeadWidth,
			y2: y - noteHeadWidth,
		};
	}

	private refreshStemExtension(): void {
		if (this.slash && !this.beam && this.stem) {
			this.stem.setExtension(this.getStemExtension());
		}
	}

	/*
	 * Innermost ledger line the stem crosses (0 below the stave for up-stems, 6 above for
	 * down-stems), or null when no ledger line lies on the stem side.
	 */
	private stemSideLedgerBoundary(): number | null {
		const lines = this.getKeyProps().map((k) => k.line);
		if (lines.length === 0) {
			return null;
		}
		if (this.getStemDirection() === Stem.UP) {
			return Math.min(...lines) <= 0 ? 0 : null;
		}
		return Math.max(...lines) >= 6 ? 6 : null;
	}
}
