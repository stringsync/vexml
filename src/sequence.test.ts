import { expect, test } from 'bun:test';
import { Rect } from './geometry';
import {
	beatsToMs,
	buildSequence,
	classifyTransition,
	type Jump,
	MeasureSequenceIterator,
	msToBeats,
	type SequenceNote,
} from './sequence';
import type { Note } from './targets';

// ── MeasureSequenceIterator (ported from legacy vexml) ──

function order(measures: Array<{ index: number; jumps: Jump[] }>): number[] {
	return [...new MeasureSequenceIterator(measures)];
}

test('iterator: empty when there are no measures', () => {
	expect(order([])).toEqual([]);
});

test('iterator: same as input when there are no repeats', () => {
	expect(
		order([
			{ index: 0, jumps: [] },
			{ index: 1, jumps: [] },
			{ index: 2, jumps: [] },
		]),
	).toEqual([0, 1, 2]);
});

test('iterator: repeats a single measure', () => {
	expect(
		order([
			{
				index: 0,
				jumps: [{ type: 'repeatstart' }, { type: 'repeatend', times: 1 }],
			},
		]),
	).toEqual([0, 0]);
});

test('iterator: repeats a single measure multiple times', () => {
	expect(
		order([
			{
				index: 0,
				jumps: [{ type: 'repeatstart' }, { type: 'repeatend', times: 3 }],
			},
		]),
	).toEqual([0, 0, 0, 0]);
});

test('iterator: repeats a single measure when the start is not at the beginning', () => {
	expect(
		order([
			{ index: 0, jumps: [] },
			{ index: 1, jumps: [{ type: 'repeatstart' }] },
			{ index: 2, jumps: [{ type: 'repeatend', times: 1 }] },
		]),
	).toEqual([0, 1, 2, 1, 2]);
});

test('iterator: repeats multiple measures', () => {
	expect(
		order([
			{ index: 0, jumps: [{ type: 'repeatstart' }] },
			{ index: 1, jumps: [{ type: 'repeatend', times: 1 }] },
		]),
	).toEqual([0, 1, 0, 1]);
});

test('iterator: repeats multiple measures multiple times', () => {
	expect(
		order([
			{ index: 0, jumps: [{ type: 'repeatstart' }] },
			{ index: 1, jumps: [{ type: 'repeatend', times: 2 }] },
		]),
	).toEqual([0, 1, 0, 1, 0, 1]);
});

test('iterator: repeats endings', () => {
	expect(
		order([
			{ index: 0, jumps: [{ type: 'repeatstart' }] },
			{ index: 1, jumps: [{ type: 'repeatending', times: 1 }] },
			{ index: 2, jumps: [] },
		]),
	).toEqual([0, 1, 0, 2]);
});

test('iterator: repeats multiple endings', () => {
	expect(
		order([
			{ index: 0, jumps: [{ type: 'repeatstart' }] },
			{ index: 1, jumps: [{ type: 'repeatending', times: 2 }] },
			{ index: 2, jumps: [] },
		]),
	).toEqual([0, 1, 0, 1, 0, 2]);
});

test('iterator: handles implicit start repeats', () => {
	expect(
		order([
			{ index: 0, jumps: [] },
			{ index: 1, jumps: [{ type: 'repeatend', times: 1 }] },
		]),
	).toEqual([0, 1, 0, 1]);
});

test('iterator: handles multiple implicit start repeats', () => {
	expect(
		order([
			{ index: 0, jumps: [] },
			{ index: 1, jumps: [{ type: 'repeatend', times: 1 }] },
			{ index: 2, jumps: [{ type: 'repeatend', times: 1 }] },
		]),
	).toEqual([0, 1, 0, 1, 2, 0, 1, 0, 1, 2]);
});

test('iterator: handles a repeat ending with an implicit start', () => {
	expect(
		order([
			{ index: 0, jumps: [] },
			{ index: 1, jumps: [{ type: 'repeatending', times: 1 }] },
			{ index: 2, jumps: [] },
		]),
	).toEqual([0, 1, 0, 2]);
});

test('iterator: continues past a repeat block', () => {
	expect(
		order([
			{ index: 0, jumps: [{ type: 'repeatstart' }] },
			{ index: 1, jumps: [{ type: 'repeatend', times: 1 }] },
			{ index: 2, jumps: [] },
			{ index: 3, jumps: [] },
		]),
	).toEqual([0, 1, 0, 1, 2, 3]);
});

test('iterator: handles a standalone repeat start with no matching end', () => {
	expect(
		order([
			{ index: 0, jumps: [] },
			{ index: 1, jumps: [{ type: 'repeatstart' }] },
			{ index: 2, jumps: [] },
		]),
	).toEqual([0, 1, 2]);
});

test('iterator: handles two non-nested repeats in sequence', () => {
	expect(
		order([
			{ index: 0, jumps: [{ type: 'repeatstart' }] },
			{ index: 1, jumps: [{ type: 'repeatend', times: 1 }] },
			{ index: 2, jumps: [{ type: 'repeatstart' }] },
			{ index: 3, jumps: [{ type: 'repeatend', times: 1 }] },
		]),
	).toEqual([0, 1, 0, 1, 2, 3, 2, 3]);
});

test('iterator: replays an inner repeat during each pass of an outer repeat', () => {
	expect(
		order([
			{ index: 0, jumps: [{ type: 'repeatstart' }] },
			{ index: 1, jumps: [{ type: 'repeatstart' }] },
			{ index: 2, jumps: [{ type: 'repeatend', times: 1 }] },
			{ index: 3, jumps: [{ type: 'repeatend', times: 1 }] },
		]),
	).toEqual([0, 1, 2, 1, 2, 3, 0, 1, 2, 1, 2, 3]);
});

test('iterator: plays the 1st ending N times before advancing to the 2nd ending', () => {
	expect(
		order([
			{ index: 0, jumps: [{ type: 'repeatstart' }] },
			{ index: 1, jumps: [{ type: 'repeatending', times: 2 }] },
			{ index: 2, jumps: [{ type: 'repeatending', times: 1 }] },
			{ index: 3, jumps: [] },
		]),
	).toEqual([0, 1, 0, 1, 0, 2, 3]);
});

test('iterator: plays three endings in order, each once', () => {
	expect(
		order([
			{ index: 0, jumps: [{ type: 'repeatstart' }] },
			{ index: 1, jumps: [{ type: 'repeatending', times: 1 }] },
			{ index: 2, jumps: [{ type: 'repeatending', times: 1 }] },
			{ index: 3, jumps: [{ type: 'repeatending', times: 1 }] },
			{ index: 4, jumps: [] },
		]),
	).toEqual([0, 1, 0, 2, 0, 3, 4]);
});

test('iterator: treats a repeatend with times: 0 as a no-op', () => {
	expect(
		order([
			{ index: 0, jumps: [{ type: 'repeatstart' }] },
			{ index: 1, jumps: [{ type: 'repeatend', times: 0 }] },
		]),
	).toEqual([0, 1]);
});

// ── beats <-> ms ──

test('beatsToMs/msToBeats: default 120 bpm when no segments', () => {
	expect(beatsToMs(4, [])).toBeCloseTo(2000);
	expect(msToBeats(2000, [])).toBeCloseTo(4);
});

test('beatsToMs/msToBeats: honors a mid-piece tempo change and round-trips', () => {
	const segments = [
		{ startBeat: 0, endBeat: 4, bpm: 120 }, // 500 ms / beat
		{ startBeat: 4, endBeat: 8, bpm: 60 }, // 1000 ms / beat
	];
	expect(beatsToMs(4, segments)).toBeCloseTo(2000);
	expect(beatsToMs(6, segments)).toBeCloseTo(4000);
	expect(beatsToMs(8, segments)).toBeCloseTo(6000);
	expect(msToBeats(4000, segments)).toBeCloseTo(6);
	expect(msToBeats(beatsToMs(6.5, segments), segments)).toBeCloseTo(6.5);
});

// ── classifyTransition (generic, identity-only) ──

test('classify: disjoint sets are all started/stopped', () => {
	const r = classifyTransition(['a', 'b'], ['c', 'd'], new Map());
	expect(r.started).toEqual(['c', 'd']);
	expect(r.sustained).toEqual([]);
	expect(r.stopped).toEqual(['a', 'b']);
});

test('classify: a held note (same identity) is sustained', () => {
	const r = classifyTransition(['a', 'b'], ['b', 'c'], new Map());
	expect(r.started).toEqual(['c']);
	expect(r.sustained).toEqual(['b']);
	expect(r.stopped).toEqual(['a']);
});

test('classify: a tie sustains and the tied-out note is not a release', () => {
	const r = classifyTransition(['a'], ['b'], new Map([['b', 'a']]));
	expect(r.started).toEqual([]);
	expect(r.sustained).toEqual(['b']);
	expect(r.stopped).toEqual([]);
});

test('classify: same pitch without a tie is a retrigger (stop + start)', () => {
	const r = classifyTransition(['a'], ['b'], new Map());
	expect(r.started).toEqual(['b']);
	expect(r.stopped).toEqual(['a']);
});

test('classify: from nothing, everything is started', () => {
	const r = classifyTransition(null, ['a', 'b'], new Map());
	expect(r.started).toEqual(['a', 'b']);
	expect(r.stopped).toEqual([]);
});

// ── buildSequence assembly ──

// Identity tokens — the sequence only uses Note for identity (active sets / tie keys).
function fakeNote(label: string): Note {
	return { label } as unknown as Note;
}
const SYS = new Rect(0, 0, 1000, 100);

function quarter(
	note: Note,
	measureIndex: number,
	measureBeat: number,
	x: number,
): SequenceNote {
	return { note, measureIndex, measureBeat, beats: 1, x, tiedFrom: null };
}

test('assembly: two 4/4 measures of quarters → 8 steps with correct beats/ms', () => {
	const notes: SequenceNote[] = [];
	for (let b = 0; b < 4; b++) {
		notes.push(quarter(fakeNote(`m0b${b}`), 0, b, 10 + b * 10));
		notes.push(quarter(fakeNote(`m1b${b}`), 1, b, 110 + b * 10));
	}
	const seq = buildSequence({
		measures: [
			{ index: 0, beats: 4, tempoBpm: 120, jumps: [], systemRect: SYS },
			{ index: 1, beats: 4, tempoBpm: null, jumps: [], systemRect: SYS },
		],
		notes,
	});

	expect(seq.length).toBe(8);
	expect(seq.getDurationBeats()).toBe(8);
	expect(seq.getDurationMs()).toBeCloseTo(4000);
	expect(seq.getStep(0)?.startBeat).toBe(0);
	expect(seq.getStep(0)?.startMs).toBeCloseTo(0);
	expect(seq.getStep(4)?.startBeat).toBe(4); // first onset of measure 1
	expect(seq.getStep(4)?.startMs).toBeCloseTo(2000);
});

test('assembly: a repeated measure replays its steps at later times, earliest-first lookup', () => {
	const a = fakeNote('a');
	const seq = buildSequence({
		measures: [
			{
				index: 0,
				beats: 2,
				tempoBpm: 120,
				jumps: [{ type: 'repeatstart' }, { type: 'repeatend', times: 1 }],
				systemRect: SYS,
			},
		],
		notes: [
			{
				note: a,
				measureIndex: 0,
				measureBeat: 0,
				beats: 2,
				x: 10,
				tiedFrom: null,
			},
		],
	});

	// Played twice: two steps, the second a measure later in beats.
	expect(seq.length).toBe(2);
	expect(seq.getStep(0)?.startBeat).toBe(0);
	expect(seq.getStep(1)?.startBeat).toBe(2);
	expect(seq.getDurationBeats()).toBe(4);
	// The same note maps to its EARLIEST step (first pass).
	expect(seq.getFirstStepOfNote(a)).toBe(0);
});

test('assembly: overlapping voices window the active set; classify reports held vs released', () => {
	const half = fakeNote('half'); // voice A, [0, 2)
	const q1 = fakeNote('q1'); // voice B, [0, 1)
	const q2 = fakeNote('q2'); // voice B, [1, 2)
	const seq = buildSequence({
		measures: [
			{ index: 0, beats: 2, tempoBpm: 120, jumps: [], systemRect: SYS },
		],
		notes: [
			{
				note: half,
				measureIndex: 0,
				measureBeat: 0,
				beats: 2,
				x: 10,
				tiedFrom: null,
			},
			{
				note: q1,
				measureIndex: 0,
				measureBeat: 0,
				beats: 1,
				x: 10,
				tiedFrom: null,
			},
			{
				note: q2,
				measureIndex: 0,
				measureBeat: 1,
				beats: 1,
				x: 50,
				tiedFrom: null,
			},
		],
	});

	expect(seq.length).toBe(2);
	expect(seq.getStep(0)?.active).toEqual([half, q1]);
	expect(seq.getStep(1)?.active).toEqual([half, q2]);

	const t = seq.classify(0, 1);
	expect(t.started).toEqual([q2]);
	expect(t.sustained).toEqual([half]);
	expect(t.stopped).toEqual([q1]);
});

test('positionAt: interpolates the bar x within a step toward the next onset', () => {
	const seq = buildSequence({
		measures: [
			{ index: 0, beats: 2, tempoBpm: 120, jumps: [], systemRect: SYS },
		],
		notes: [quarter(fakeNote('a'), 0, 0, 10), quarter(fakeNote('b'), 0, 1, 20)],
	});
	// Step 0 spans beat [0,1) = ms [0,500), gliding x 10 -> 20.
	expect(seq.positionAt(0)?.x).toBeCloseTo(10);
	expect(seq.positionAt(250)?.x).toBeCloseTo(15);
	const rect = seq.positionAt(250);
	expect(rect?.y).toBe(0);
	expect(rect?.h).toBe(100);
});

test('getStepIndexAtBeats: binary search, null before the first onset', () => {
	const seq = buildSequence({
		measures: [
			{ index: 0, beats: 4, tempoBpm: 120, jumps: [], systemRect: SYS },
		],
		notes: [
			quarter(fakeNote('a'), 0, 0, 10),
			quarter(fakeNote('b'), 0, 1, 20),
			quarter(fakeNote('c'), 0, 2, 30),
		],
	});
	expect(seq.getStepIndexAtBeats(-1)).toBeNull();
	expect(seq.getStepIndexAtBeats(0)).toBe(0);
	expect(seq.getStepIndexAtBeats(1.5)).toBe(1);
	expect(seq.getStepIndexAtBeats(99)).toBe(2);
	expect(seq.getStepIndexAtMs(500)).toBe(1);
});
