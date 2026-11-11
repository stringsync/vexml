import type { StaveNote, TabNote, TieNotes } from 'vexflow/core';

/*
 * The vexflow TieNotes spec(s) for a tie/slur from firstNote to lastNote on the given
 * notehead/position indexes. Normally one spec spanning both notes; but when the stop note
 * wraps onto a later system its stave sits lower on the page (greater Y), so a single tie
 * would draw as one long diagonal across the page, so it is split into two partial ties, one
 * bowing off the right edge of the start note's stave ("tie to nothing") and one bowing in
 * from the left edge of the stop note's ("tie from nothing"). vexflow renders a tie given
 * only a firstNote (or only a lastNote) exactly so. Shared by TieBuilder and HammerPullBuilder.
 * Y, not X: a tie whose start note is the first in its system shares the stop note's left X
 * but not its row, so an X-compare would miss the wrap and draw the diagonal.
 * ponytail: the y-compare assumes the two ends share a system row when not wrapped (true for
 * a single-stave pitch continuation or a fretted line); a cross-staff tie on one system would
 * misfire as a wrap.
 */
export function tieSpecs(
	firstNote: StaveNote | TabNote,
	lastNote: StaveNote | TabNote,
	firstIndexes: number[],
	lastIndexes: number[],
): TieNotes[] {
	const wraps =
		(lastNote.getStave()?.getY() ?? 0) > (firstNote.getStave()?.getY() ?? 0);
	return wraps
		? [
				{ firstNote, firstIndexes, lastIndexes: firstIndexes },
				{ lastNote, firstIndexes: lastIndexes, lastIndexes },
			]
		: [{ firstNote, lastNote, firstIndexes, lastIndexes }];
}
