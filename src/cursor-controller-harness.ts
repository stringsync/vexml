import { CursorController } from './cursor-controller';
import { FakeCursorHost } from './cursor-host/fake-cursor-host';
import { Gaps } from './gaps';
import { Rect } from './geometry';
import type { Note } from './note';
import { ScoreReader } from './score-reader';
import { FakeScroller } from './scroller/fake-scroller';
import type { SequenceNote } from './sequence';
import { SequenceFactory } from './sequence-factory';

// Identity tokens — only used for identity in active sets / deltas.
export function fakeNote(label: string): Note {
	return { label } as unknown as Note;
}
export const SYS = new Rect(0, 0, 1000, 100);
export const A = fakeNote('a');
export const B = fakeNote('b');
export const C = fakeNote('c');
export const D = fakeNote('d');

// Four quarters in one 4/4 measure @120bpm: steps at 0/500/1000/1500 ms, durationMs 2000.
export function fourQuarters() {
	const notes: SequenceNote[] = [A, B, C, D].map((note, i) => ({
		note,
		measureIndex: 0,
		measureBeat: i,
		beats: 1,
		x: 10 + i * 10,
		tiedFrom: null,
	}));
	return new SequenceFactory(new ScoreReader(), new Gaps([])).createFromInput({
		measures: [
			{ index: 0, beats: 4, tempoBpm: 120, jumps: [], systemRect: SYS },
		],
		notes,
	});
}

export function controller(opts?: {
	host?: FakeCursorHost;
	scroller?: FakeScroller;
}) {
	return new CursorController(
		fourQuarters(),
		opts?.host ?? new FakeCursorHost(),
		opts?.scroller ?? new FakeScroller(),
	);
}
