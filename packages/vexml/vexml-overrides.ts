import type { StaveNote } from 'vexflow/core';

/*
 * The per-note drawing choices vexml makes on top of a stock StaveNote or GraceNote:
 * extra room before the first augmentation dot, print-leger="no" leaving the ledger
 * lines out, <notehead>none</notehead> omitting head ink while keeping stems and
 * modifiers, sounding alterations, and formatter right-shift overlap trimming.
 */
export interface VexmlNoteOverrides {
	/* Added to vexflow's indent before the first dot. */
	extraDotGap: number;
	/* False for print-leger="no": the head sits off the stave without its ledger lines. */
	ledgerLinesShown: boolean;
	/* Chord member indices with <notehead>none</notehead>: omit the head glyph while drawing modifiers. */
	hiddenNoteHeads: ReadonlySet<number>;
	/* Sounding semitone alteration per key (0 natural, 1 sharp, -1 flat), for altered-unison checks. */
	keyAlters: readonly (number | undefined)[];
	/* Shift already reflected in xShift, trimmed from modRightPx so VexFlow's formatter doesn't double-count it. */
	formatterRightShiftOverlap: number;
}

export const NO_HIDDEN_NOTE_HEADS: ReadonlySet<number> = new Set();

/*
 * Draw only the visible noteheads of `note`. Hidden heads (<notehead>none</notehead>)
 * still position themselves and invoke drawModifiers so lyrics, articulations, and dots
 * attached to that head index render normally without emitting notehead ink.
 */
export function drawVisibleNoteHeads(
	note: StaveNote,
	hidden: ReadonlySet<number>,
): void {
	const ctx = note.checkContext();
	note.noteHeads.forEach((notehead, index) => {
		if (hidden.has(index)) {
			notehead.setX(notehead.getAbsoluteX());
			note.drawModifiers(notehead);
		} else {
			notehead.setContext(ctx).drawWithStyle();
		}
	});
}

/* Trims shift already reflected in xShift from modRightPx so VexFlow's formatter doesn't double-count it. */
export function trimFormatterRightShiftOverlap<
	T extends { modRightPx: number },
>(metrics: T, overlap: number): T {
	if (overlap > 0) {
		const trim = Math.min(metrics.modRightPx, overlap);
		return { ...metrics, modRightPx: metrics.modRightPx - trim };
	}
	return metrics;
}
