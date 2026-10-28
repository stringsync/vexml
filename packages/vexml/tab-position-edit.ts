import type { Note } from '@stringsync/mdom';
import type { PitchInput } from './pitch-edit';

export interface TabPositionInput {
	string: number;
	fret: number;
	pitch: PitchInput;
}

/** Atomic pitch and fingering command for tab notes. Run inside an mdom transaction. */
export class TabPositionEdit {
	constructor(private readonly notes: readonly Note[]) {}

	apply(spec: TabPositionInput): boolean {
		const pitch = spec.pitch;
		if (
			!['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(pitch.step) ||
			!Number.isInteger(pitch.octave) ||
			pitch.octave < 0 ||
			pitch.octave > 9 ||
			!Number.isFinite(pitch.alter ?? 0)
		) {
			throw new RangeError('editing: invalid pitch');
		}
		if (
			!Number.isInteger(spec.string) ||
			spec.string < 1 ||
			!Number.isInteger(spec.fret) ||
			spec.fret < 0
		) {
			throw new RangeError('editing: invalid tab position');
		}
		for (const note of this.notes) {
			if (!note.pitch) {
				throw new Error('editing: tab positions require pitched notes');
			}
			if (note.ties.length > 0 || note.childrenNamed('tie').length > 0) {
				throw new Error(
					'editing: tied tab positions require a tie-aware command',
				);
			}
		}
		let changed = false;
		for (const note of new Set(this.notes)) {
			const before = note.pitch;
			if (!before) {
				continue;
			}
			const pitchChanged =
				before.step !== pitch.step ||
				before.octave !== pitch.octave ||
				before.alter !== (pitch.alter ?? 0);
			if (
				!pitchChanged &&
				note.string === spec.string &&
				note.fret === spec.fret
			) {
				continue;
			}
			if (pitchChanged) {
				note.setPitch(pitch);
				note.child('accidental')?.remove();
			}
			note.setStringFret({ string: spec.string, fret: spec.fret });
			changed = true;
		}
		return changed;
	}
}
