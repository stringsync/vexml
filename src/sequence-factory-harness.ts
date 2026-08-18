import { Gaps } from './gaps';
import { Rect } from './geometry';
import type { Note } from './note';
import { ScoreReader } from './score-reader';
import type { SequenceInput, SequenceNote } from './sequence';
import { SequenceFactory } from './sequence-factory';

// Identity tokens — the sequence only uses Note for identity (active sets / tie keys).
export function fakeNote(label: string): Note {
	return { label } as unknown as Note;
}
export const SYS = new Rect(0, 0, 1000, 100);

export function quarter(
	note: Note,
	measureIndex: number,
	measureBeat: number,
	x: number,
): SequenceNote {
	return { note, measureIndex, measureBeat, beats: 1, x, tiedFrom: null };
}

// createFromInput never touches the reader (only create() does), so a real stateless one is fine.
export function build(input: SequenceInput) {
	return new SequenceFactory(new ScoreReader(), new Gaps([])).createFromInput(
		input,
	);
}
