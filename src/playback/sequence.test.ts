import { describe, expect, it } from 'bun:test';
import type { Note } from '../elements/note';
import { Rect } from '../geometry';
import { Sequence, type Step, type TempoSegment } from './sequence';

// Identity tokens — the sequence only uses Note for identity (active sets / tie keys).
function fakeNote(label: string): Note {
	return { label } as unknown as Note;
}
const SYS = new Rect(0, 0, 1000, 100);
const A = fakeNote('a');
const B = fakeNote('b');
const C = fakeNote('c');
const D = fakeNote('d');

// A Sequence with just a tempo map, to drive the beats<->ms conversions.
function tempoOnly(segments: TempoSegment[]): Sequence {
	return new Sequence([], segments, 0, 0, new Map(), new Map(), new Map());
}

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
		[{ startBeat: 0, endBeat: active.length, bpm: 120 }],
		active.length,
		1,
		tiedFrom,
		new Map(),
		new Map(),
	);
}

describe('Sequence', () => {
	it('beatsToMs/msToBeats: default 120 bpm when no segments', () => {
		const seq = tempoOnly([]);
		expect(seq.beatsToMs(4)).toBeCloseTo(2000);
		expect(seq.msToBeats(2000)).toBeCloseTo(4);
	});

	it('beatsToMs/msToBeats: honors a mid-piece tempo change and round-trips', () => {
		const seq = tempoOnly([
			{ startBeat: 0, endBeat: 4, bpm: 120 }, // 500 ms / beat
			{ startBeat: 4, endBeat: 8, bpm: 60 }, // 1000 ms / beat
		]);
		expect(seq.beatsToMs(4)).toBeCloseTo(2000);
		expect(seq.beatsToMs(6)).toBeCloseTo(4000);
		expect(seq.beatsToMs(8)).toBeCloseTo(6000);
		expect(seq.msToBeats(4000)).toBeCloseTo(6);
		expect(seq.msToBeats(seq.beatsToMs(6.5))).toBeCloseTo(6.5);
	});

	it('classify: disjoint sets are all started/stopped', () => {
		const seq = withActive([
			[A, B],
			[C, D],
		]);
		const r = seq.classify(0, 1);
		expect(r.started).toEqual([C, D]);
		expect(r.sustained).toEqual([]);
		expect(r.stopped).toEqual([A, B]);
	});

	it('classify: a held note (same identity) is sustained', () => {
		const seq = withActive([
			[A, B],
			[B, C],
		]);
		const r = seq.classify(0, 1);
		expect(r.started).toEqual([C]);
		expect(r.sustained).toEqual([B]);
		expect(r.stopped).toEqual([A]);
	});

	it('classify: a tie sustains and the tied-out note is not a release', () => {
		const seq = withActive([[A], [B]], new Map([[B, A]]));
		const r = seq.classify(0, 1);
		expect(r.started).toEqual([]);
		expect(r.sustained).toEqual([B]);
		expect(r.stopped).toEqual([]);
	});

	it('classify: same pitch without a tie is a retrigger (stop + start)', () => {
		const seq = withActive([[A], [B]]);
		const r = seq.classify(0, 1);
		expect(r.started).toEqual([B]);
		expect(r.stopped).toEqual([A]);
	});

	it('classify: from nothing, everything is started', () => {
		const seq = withActive([[A, B]]);
		const r = seq.classify(null, 0);
		expect(r.started).toEqual([A, B]);
		expect(r.stopped).toEqual([]);
	});
});
