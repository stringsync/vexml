import type { Note as MNote } from '@stringsync/mdom';
import type { NoteFacts } from './note';

/*
 * A note's facts read off its mdom note when asked, not up front: a render builds thousands of
 * notes and most are never asked about, while their getters walk the document. A snapshot
 * reads them all once, when it is written.
 */
export class MNoteFacts implements NoteFacts {
	constructor(
		private readonly mnote: MNote,
		// The notes sharing its onset, itself included, engraved or not.
		private readonly chord: readonly MNote[],
	) {}

	get pitch(): string | null {
		const pitch = this.mnote.pitch;
		return pitch ? this.pitchToKey(pitch) : null;
	}

	get beats(): number {
		return this.mnote.beats ?? 0;
	}

	get articulations(): readonly string[] {
		return this.mnote.articulations;
	}

	get grace(): boolean {
		return this.mnote.isGrace;
	}

	// MusicXML exempts notes with no `<type>`, grace notes, and (the one that matters in
	// practice) notes whose sounding duration isn't the nominal one for their type, i.e.
	// anything carrying a `<time-modification>` (see Note.isSwingExempt).
	get swingExempt(): boolean {
		const { mnote } = this;
		return (
			mnote.isGrace || mnote.type === null || mnote.timeModification !== null
		);
	}

	get chordMember(): boolean {
		return this.chord.length > 1;
	}

	get graces(): readonly MNote[] {
		return this.mnote.gracesBefore;
	}

	/* MusicXML <pitch> -> vexflow key string, e.g. {step:'B', alter:-1, octave:3} -> "Bb/3". */
	private pitchToKey(p: {
		step: string;
		octave: number;
		alter: number;
	}): string {
		const n = Math.round(p.alter);
		let accidental = '';
		if (n > 0) {
			accidental = '#'.repeat(n);
		} else if (n < 0) {
			accidental = 'b'.repeat(-n);
		}
		return `${p.step}${accidental}/${p.octave}`;
	}
}
