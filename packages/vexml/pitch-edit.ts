import type { MElement, MNode, Note } from '@stringsync/mdom';

export type PitchInput = Parameters<Note['setPitch']>[0];

interface PitchChange {
	note: Note;
	before: MElement;
	after: MElement;
	accidental: MElement | null;
	accidentalNext: MNode | null;
}

/** One undo step for a set of pitched notes. Retains the original XML nodes so undo
 * restores optional spelling and accidental attributes without a serialize/parse cycle. */
export class PitchEdit {
	private constructor(private readonly changes: readonly PitchChange[]) {}

	static apply(notes: readonly Note[], spec: PitchInput): PitchEdit {
		const changes: PitchChange[] = [];
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
			const accidental = note.child('accidental');
			const accidentalNext = accidental
				? (note.children[note.children.indexOf(accidental) + 1] ?? null)
				: null;
			note.setPitch(spec);
			const after = note.pitch;
			if (!after) {
				throw new Error('editing: mdom did not produce a pitch');
			}
			// An explicit glyph for the previous pitch would override the new spelling.
			accidental?.remove();
			changes.push({ note, before, after, accidental, accidentalNext });
		}
		return new PitchEdit(changes);
	}

	get changed(): boolean {
		return this.changes.length > 0;
	}

	undo(): void {
		this.check('after');
		for (const { note, before, after, accidental, accidentalNext } of this
			.changes) {
			note.replaceChild(after, before);
			if (accidental) {
				note.insertBefore(accidental, accidentalNext);
			}
		}
	}

	redo(): void {
		this.check('before');
		for (const { note, before, after, accidental } of this.changes) {
			note.replaceChild(before, after);
			accidental?.remove();
		}
	}

	private check(side: 'before' | 'after'): void {
		for (const change of this.changes) {
			if (
				!change.note.parent ||
				change.note.pitch !== change[side] ||
				change.note.child('accidental') !==
					(side === 'before' ? change.accidental : null) ||
				(change.accidentalNext && change.accidentalNext.parent !== change.note)
			) {
				throw new Error(
					'editing: document changed outside the session; clear history',
				);
			}
		}
	}
}
