import type { Chord, Note } from '@stringsync/mdom';
import type { TabNote } from 'vexflow/core';
import type { CurveConnectors } from './curve-connectors';
import { type SpanScope, WHOLE_SCORE } from './span-scope';
import { TabCurve } from './tab-curve';
import { tieSpecs } from './tie-specs';

/* Builds the arcs of hammer-ons and pull-offs on a tab stave. */
export class HammerPullBuilder {
	constructor(private readonly connectors: CurveConnectors) {}

	/*
	 * Hammer-ons and pull-offs on a TAB stave. Both are notated with a plain <slur> and draw
	 * as a TabCurve: the same bow the notation stave's slurs get, rather than vexflow's
	 * flatter TabTie arc. Which of the two it is doesn't change the drawing: the arc plus the
	 * fret motion says it (higher target = hammer-on, lower = pull-off), so the "H"/"P" letters
	 * vexflow prints are left off. Reads the same slurConnectors SlurBuilder does, so a
	 * <hammer-on>/<pull-off> written WITHOUT a companion <slur> draws on the tab stave too;
	 * otherwise the notation stave shows an arc the tab is missing.
	 */
	build(
		chords: Chord[],
		byTabLead: Map<Note, TabNote>,
		scope: SpanScope = WHOLE_SCORE,
	): TabCurve[] {
		const ties: TabCurve[] = [];
		const spans = this.connectors.slurSpans(chords);
		for (const chord of chords) {
			const firstNote = byTabLead.get(chord.lead);
			if (!firstNote) {
				continue;
			}
			for (const slur of this.connectors.slurConnectors(chord.lead, spans)) {
				if (slur.slurType !== 'start') {
					continue;
				}
				const partner = slur.partner?.note ?? null;
				const lastNote = partner && byTabLead.get(partner);
				// An unclosed slur (no resolved partner) isn't a real hammer-on/pull-off;
				// skip it rather than drawing a dangling tie.
				if (!partner || !lastNote || !scope.owns(firstNote, lastNote)) {
					continue;
				}
				const { firstIndexes, lastIndexes } = this.pairByString(
					firstNote,
					lastNote,
				);
				const specs = tieSpecs(firstNote, lastNote, firstIndexes, lastIndexes);
				for (const notes of specs) {
					// One arc per shared string: a two-string chord hammering into another draws
					// two. (TabTie took the whole index list and looped internally; a Curve is a
					// single bow, so the loop is here.)
					notes.firstIndexes?.forEach((firstIndex, i) => {
						const lastIndex = notes.lastIndexes?.[i] ?? firstIndex;
						ties.push(new TabCurve(notes, firstIndex, lastIndex));
					});
				}
			}
		}
		return ties;
	}

	/*
	 * The position indexes a hammer-on/pull-off arc connects: each string played by both
	 * notes, paired up. A hammer-on runs along one string, so a two-string chord hammering
	 * into another draws one arc per shared string. Positions with no counterpart drop out;
	 * that's how an arpeggiated chord hammering into a single note stays drawable: the two
	 * lists have to stay the same length to pair up. Falls back to the lead position on both sides
	 * when the two share no string at all (a slur across strings isn't really a hammer-on,
	 * but it still has to draw something).
	 */
	private pairByString(
		firstNote: TabNote,
		lastNote: TabNote,
	): { firstIndexes: number[]; lastIndexes: number[] } {
		const lastPositions = lastNote.getPositions();
		const firstIndexes: number[] = [];
		const lastIndexes: number[] = [];
		firstNote.getPositions().forEach((position, i) => {
			const j = lastPositions.findIndex((other) => other.str === position.str);
			if (j >= 0) {
				firstIndexes.push(i);
				lastIndexes.push(j);
			}
		});
		return firstIndexes.length > 0
			? { firstIndexes, lastIndexes }
			: { firstIndexes: [0], lastIndexes: [0] };
	}
}
