import type { Chord, Note } from '@stringsync/mdom';
import type { StaveNote } from 'vexflow/core';
import { BowedTremolo } from './bowed-tremolo';
import type { ScoreReader } from './score-reader';

/* Builds the slashes of two-note tremolos. */
export class TremoloBuilder {
	constructor(private readonly reader: ScoreReader) {}

	/*
	 * Two-note tremolos: each <tremolo type="start"> pairs with the next "stop" in the voice's
	 * chords, and the slashes between their stems are drawn once the notes are placed.
	 */
	build(chords: Chord[], byLead: Map<Note, StaveNote>): BowedTremolo[] {
		const out: BowedTremolo[] = [];
		let open: { note: StaveNote; marks: number } | undefined;
		for (const { lead } of chords) {
			const staveNote = byLead.get(lead);
			const tremolo = this.reader
				.ornamentsOf(lead)
				.find((o) => o.ornamentType === 'tremolo');
			if (!staveNote || !tremolo) {
				continue;
			}
			if (tremolo.tremoloType === 'start') {
				open = { note: staveNote, marks: tremolo.tremoloMarks || 1 };
			} else if (tremolo.tremoloType === 'stop' && open) {
				out.push(new BowedTremolo(open.note, staveNote, open.marks));
				open = undefined;
			}
		}
		return out;
	}
}
