import { describe, expect, it } from 'bun:test';
import { Rect } from 'webappwiz/geometry';
import type { Note } from './note';
import { Sequence, type Step } from './sequence';
import { TempoMap } from './tempo-map';

// Identity tokens — the sequence only uses Note for identity (active sets / tie keys).
function fakeNote(label: string): Note {
	return { label } as unknown as Note;
}
const SYS = new Rect(0, 0, 1000, 100);
const A = fakeNote('a');
const B = fakeNote('b');
const C = fakeNote('c');
const D = fakeNote('d');

// A Sequence whose steps carry the given active sets (one step per set, one beat each), to drive
// classify() through the public surface.
function withActive(
	active: Note[][],
	tiedFrom: ReadonlyMap<Note, Note> = new Map(),
): Sequence {
	const steps: Step[] = active.map((notes, i) => ({
		index: i,
		measureIndex: 0,
		startBeat: i,
		endBeat: i + 1,
		startMs: i * 500,
		endMs: (i + 1) * 500,
		x: 10 + i * 10,
		glideToX: 20 + i * 10,
		systemRect: SYS,
		active: notes,
	}));
	return new Sequence(
		steps,
		new TempoMap([{ startBeat: 0, endBeat: active.length, bpm: 120 }]),
		active.length,
		1,
		tiedFrom,
		new Map(),
		new Map(),
	);
}

describe('Sequence', () => {
	it('counts every note as started or stopped when two steps share none', () => {
		const seq = withActive([
			[A, B],
			[C, D],
		]);
		const r = seq.classify(0, 1);
		expect(r.started).toEqual([C, D]);
		expect(r.sustained).toEqual([]);
		expect(r.stopped).toEqual([A, B]);
	});

	it('counts a held note as sustained', () => {
		const seq = withActive([
			[A, B],
			[B, C],
		]);
		const r = seq.classify(0, 1);
		expect(r.started).toEqual([C]);
		expect(r.sustained).toEqual([B]);
		expect(r.stopped).toEqual([A]);
	});

	it('sustains across a tie, so the tied-out note is not a release', () => {
		const seq = withActive([[A], [B]], new Map([[B, A]]));
		const r = seq.classify(0, 1);
		expect(r.started).toEqual([]);
		expect(r.sustained).toEqual([B]);
		expect(r.stopped).toEqual([]);
	});

	it('lights a whole tie chain from any member of it', () => {
		const seq = withActive([[A], [B]], new Map([[B, A]]));
		expect(new Set(seq.getHighlighted(0))).toEqual(new Set([A, B]));
		expect(new Set(seq.getHighlighted(1))).toEqual(new Set([A, B]));
	});

	it('walks a tie chain of any length from any member of it', () => {
		const seq = withActive(
			[[A], [B], [C]],
			new Map([
				[B, A],
				[C, B],
			]),
		);
		expect(new Set(seq.getHighlighted(0))).toEqual(new Set([A, B, C]));
		expect(new Set(seq.getHighlighted(2))).toEqual(new Set([A, B, C]));
	});

	it('leaves an untied note lit on its own', () => {
		const seq = withActive([[A, B]], new Map([[C, D]]));
		expect(new Set(seq.getHighlighted(0))).toEqual(new Set([A, B]));
	});

	it('treats the same pitch without a tie as a retrigger, stopping then starting it', () => {
		const seq = withActive([[A], [B]]);
		const r = seq.classify(0, 1);
		expect(r.started).toEqual([B]);
		expect(r.stopped).toEqual([A]);
	});

	it('counts everything as started when coming from nothing', () => {
		const seq = withActive([[A, B]]);
		const r = seq.classify(null, 0);
		expect(r.started).toEqual([A, B]);
		expect(r.stopped).toEqual([]);
	});
});
