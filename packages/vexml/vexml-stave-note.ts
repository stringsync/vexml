import { StaveNote } from 'vexflow/core';
import {
	drawVisibleNoteHeads,
	NO_HIDDEN_NOTE_HEADS,
	trimFormatterRightShiftOverlap,
	type VexmlNoteOverrides,
} from './vexml-overrides';

/* A StaveNote carrying vexml's dot gap, ledger-line, and hidden-notehead choices. */
export class VexmlStaveNote extends StaveNote implements VexmlNoteOverrides {
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
}
