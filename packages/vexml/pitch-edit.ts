import type { Note } from '@stringsync/mdom';

export type PitchInput = Parameters<Note['setPitch']>[0];

/** Conservative pitch command for ordinary pitched notes. Run inside an mdom transaction. */
export class PitchEdit {
	constructor(private readonly notes: readonly Note[]) {}

	apply(spec: PitchInput): boolean {
		const notes = this.notes;
		if (
			!['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(spec.step) ||
			!Number.isInteger(spec.octave) ||
			spec.octave < 0 ||
			spec.octave > 9 ||
			!Number.isFinite(spec.alter ?? 0)
		) {
			throw new RangeError('editing: invalid pitch');
		}
		// Validate the whole group before changing its first member.
		for (const note of notes) {
			if (!note.pitch) {
				throw new Error('editing: pitch edits require pitched notes');
			}
			if (note.ties.length > 0 || note.childrenNamed('tie').length > 0) {
				throw new Error('editing: tied pitches require a tie-aware command');
			}
			if (note.string !== null || note.fret !== null) {
				throw new Error(
					'editing: fretted pitches require a fingering-aware command',
				);
			}
		}
		let changed = false;
		for (const note of new Set(notes)) {
			const before = note.pitch;
			if (
				!before ||
				(before.step === spec.step &&
					before.octave === spec.octave &&
					before.alter === (spec.alter ?? 0))
			) {
				continue;
			}
			note.setPitch(spec);
			// The old explicit glyph would override the new pitch spelling.
			note.child('accidental')?.remove();
			changed = true;
		}
		return changed;
	}
}
