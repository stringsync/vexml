import type { Note, NoteKey, NoteLookup } from './note';

/*
 * One voice within one part's measure. A stave is not a node of its own: it's this grouping
 * key: a measure's voices each carry the stave they live on, and callers bucket by getStave().
 * Resolves its notes' keys to the interactive Note elements through the shared lookup (populated
 * by the factory before any query), so voice traversal lands on the same identities hit-testing
 * and playback report.
 */
export class Voice {
	constructor(
		private readonly id: string,
		private readonly stave: number,
		private readonly keys: readonly NoteKey[],
		private readonly notes: NoteLookup,
	) {}

	/* The MusicXML voice id, e.g. "1". */
	getId(): string {
		return this.id;
	}

	/* The 1-based stave this voice lives on. */
	getStave(): number {
		return this.stave;
	}

	/* This voice's notes in document order (rests and grace notes included). A note the draw
	 * pass emitted no geometry for has no element and is skipped. */
	getNotes(): Note[] {
		const all: Note[] = [];
		for (const key of this.keys) {
			const note = this.notes.get(key);
			if (note) {
				all.push(note);
			}
		}
		return all;
	}
}
