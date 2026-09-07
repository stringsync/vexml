import type { Note } from '@stringsync/mdom';

/** Chord members from top to bottom: staff, then written line/space.
 * Accidentals do not move a note on the staff. Equal positions retain document
 * order; a note without a displayed position sorts below positioned notes. */
export class ChordNoteOrder {
	of(focus: Note): readonly Note[] {
		const chord = focus.measure.chords.find((chord) =>
			chord.notes.includes(focus),
		);
		return [...(chord?.notes ?? [])].sort(
			(a, b) =>
				Number(a.staff) - Number(b.staff) ||
				this.position(b) - this.position(a),
		);
	}

	private position(note: Note): number {
		const position = note.pitch ?? note.unpitched ?? note.restPosition;
		if (!position) {
			return -1;
		}
		return position.octave * 7 + 'CDEFGAB'.indexOf(position.step);
	}
}
