import type { StaveNote, TabNote, TieNotes } from 'vexflow/core';

/*
 * The vexflow TieNotes spec(s) for a tie/slur from firstNote to lastNote on the given
 * notehead/position indexes. Normally one spec spanning both notes; but when the stop note
 * wraps onto a later system, a single tie would draw as one long diagonal across the page,
 * so it is split into two partial ties: one bowing off the right edge of the start note's
 * stave ("tie to nothing") and one bowing in from the left edge of the stop note's ("tie
 * from nothing"). vexflow renders a tie given only a firstNote (or only a lastNote) exactly
 * so. Shared by TieBuilder and HammerPullBuilder.
 *
 * Callers that know each stave's system pass `wraps` directly so a cross-staff tie on the
 * same system (where staff 2 has a greater Y than staff 1) stays a single tie; without it,
 * a greater stop-stave Y is treated as a wrap.
 */
export function tieSpecs(
	firstNote: StaveNote | TabNote,
	lastNote: StaveNote | TabNote,
	firstIndexes: number[],
	lastIndexes: number[],
	wraps = (lastNote.getStave()?.getY() ?? 0) >
		(firstNote.getStave()?.getY() ?? 0),
): TieNotes[] {
	return wraps
		? [
				{ firstNote, firstIndexes, lastIndexes: firstIndexes },
				{ lastNote, firstIndexes: lastIndexes, lastIndexes },
			]
		: [{ firstNote, lastNote, firstIndexes, lastIndexes }];
}
