import { describe, expect, it } from 'bun:test';
import type { Note } from '../elements/note';
import { ScoreReader } from '../engraving/score-reader';
import { Rect } from '../geometry';
import type { Jump, SequenceInput, SequenceNote } from './sequence';
import { MeasureSequenceIterator, SequenceFactory } from './sequence-factory';

// ── MeasureSequenceIterator (ported from legacy vexml) ──

function order(measures: Array<{ index: number; jumps: Jump[] }>): number[] {
	return [...new MeasureSequenceIterator(measures)];
}

describe('MeasureSequenceIterator', () => {
	it('iterator: empty when there are no measures', () => {
		expect(order([])).toEqual([]);
	});

	it('iterator: same as input when there are no repeats', () => {
		expect(
			order([
				{ index: 0, jumps: [] },
				{ index: 1, jumps: [] },
				{ index: 2, jumps: [] },
			]),
		).toEqual([0, 1, 2]);
	});

	it('iterator: repeats a single measure', () => {
		expect(
			order([
				{
					index: 0,
					jumps: [{ type: 'repeatstart' }, { type: 'repeatend', times: 1 }],
				},
			]),
		).toEqual([0, 0]);
	});

	it('iterator: repeats a single measure multiple times', () => {
		expect(
			order([
				{
					index: 0,
					jumps: [{ type: 'repeatstart' }, { type: 'repeatend', times: 3 }],
				},
			]),
		).toEqual([0, 0, 0, 0]);
	});

	it('iterator: repeats a single measure when the start is not at the beginning', () => {
		expect(
			order([
				{ index: 0, jumps: [] },
				{ index: 1, jumps: [{ type: 'repeatstart' }] },
				{ index: 2, jumps: [{ type: 'repeatend', times: 1 }] },
			]),
		).toEqual([0, 1, 2, 1, 2]);
	});

	it('iterator: repeats multiple measures', () => {
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{ index: 1, jumps: [{ type: 'repeatend', times: 1 }] },
			]),
		).toEqual([0, 1, 0, 1]);
	});

	it('iterator: repeats multiple measures multiple times', () => {
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{ index: 1, jumps: [{ type: 'repeatend', times: 2 }] },
			]),
		).toEqual([0, 1, 0, 1, 0, 1]);
	});

	it('iterator: repeats endings', () => {
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{ index: 1, jumps: [{ type: 'repeatending', times: 1 }] },
				{ index: 2, jumps: [] },
			]),
		).toEqual([0, 1, 0, 2]);
	});

	it('iterator: repeats multiple endings', () => {
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{ index: 1, jumps: [{ type: 'repeatending', times: 2 }] },
				{ index: 2, jumps: [] },
			]),
		).toEqual([0, 1, 0, 1, 0, 2]);
	});

	it('iterator: handles implicit start repeats', () => {
		expect(
			order([
				{ index: 0, jumps: [] },
				{ index: 1, jumps: [{ type: 'repeatend', times: 1 }] },
			]),
		).toEqual([0, 1, 0, 1]);
	});

	it('iterator: handles multiple implicit start repeats', () => {
		expect(
			order([
				{ index: 0, jumps: [] },
				{ index: 1, jumps: [{ type: 'repeatend', times: 1 }] },
				{ index: 2, jumps: [{ type: 'repeatend', times: 1 }] },
			]),
		).toEqual([0, 1, 0, 1, 2, 0, 1, 0, 1, 2]);
	});

	it('iterator: handles a repeat ending with an implicit start', () => {
		expect(
			order([
				{ index: 0, jumps: [] },
				{ index: 1, jumps: [{ type: 'repeatending', times: 1 }] },
				{ index: 2, jumps: [] },
			]),
		).toEqual([0, 1, 0, 2]);
	});

	it('iterator: continues past a repeat block', () => {
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{ index: 1, jumps: [{ type: 'repeatend', times: 1 }] },
				{ index: 2, jumps: [] },
				{ index: 3, jumps: [] },
			]),
		).toEqual([0, 1, 0, 1, 2, 3]);
	});

	it('iterator: handles a standalone repeat start with no matching end', () => {
		expect(
			order([
				{ index: 0, jumps: [] },
				{ index: 1, jumps: [{ type: 'repeatstart' }] },
				{ index: 2, jumps: [] },
			]),
		).toEqual([0, 1, 2]);
	});

	it('iterator: handles two non-nested repeats in sequence', () => {
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{ index: 1, jumps: [{ type: 'repeatend', times: 1 }] },
				{ index: 2, jumps: [{ type: 'repeatstart' }] },
				{ index: 3, jumps: [{ type: 'repeatend', times: 1 }] },
			]),
		).toEqual([0, 1, 0, 1, 2, 3, 2, 3]);
	});

	it('iterator: replays an inner repeat during each pass of an outer repeat', () => {
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{ index: 1, jumps: [{ type: 'repeatstart' }] },
				{ index: 2, jumps: [{ type: 'repeatend', times: 1 }] },
				{ index: 3, jumps: [{ type: 'repeatend', times: 1 }] },
			]),
		).toEqual([0, 1, 2, 1, 2, 3, 0, 1, 2, 1, 2, 3]);
	});

	it('iterator: plays the 1st ending N times before advancing to the 2nd ending', () => {
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{ index: 1, jumps: [{ type: 'repeatending', times: 2 }] },
				{ index: 2, jumps: [{ type: 'repeatending', times: 1 }] },
				{ index: 3, jumps: [] },
			]),
		).toEqual([0, 1, 0, 1, 0, 2, 3]);
	});

	it('iterator: plays three endings in order, each once', () => {
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

	it('iterator: treats a repeatend with times: 0 as a no-op', () => {
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{ index: 1, jumps: [{ type: 'repeatend', times: 0 }] },
			]),
		).toEqual([0, 1]);
	});
});

// ── createFromInput assembly ──

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

// createFromInput never touches the reader (only create() does), so a real stateless one is fine.
function build(input: SequenceInput) {
	return new SequenceFactory(new ScoreReader(), []).createFromInput(input);
}

describe('SequenceFactory', () => {
	it('assembly: two 4/4 measures of quarters → 8 steps with correct beats/ms', () => {
		const notes: SequenceNote[] = [];
		for (let b = 0; b < 4; b++) {
			notes.push(quarter(fakeNote(`m0b${b}`), 0, b, 10 + b * 10));
			notes.push(quarter(fakeNote(`m1b${b}`), 1, b, 110 + b * 10));
		}
		const seq = build({
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

		// Measure count is document order (2 measures); ms maps to the measure playing then.
		expect(seq.getMeasureCount()).toBe(2);
		expect(seq.getMeasureIndexAtMs(0)).toBe(0);
		expect(seq.getMeasureIndexAtMs(2500)).toBe(1); // 2.5s in → measure 1
		expect(seq.getMeasureIndexAtBeats(5)).toBe(1);
	});

	it('assembly: a gap measure plays for exactly gapMs, silent, and the next measure resumes the carried tempo', () => {
		const a = fakeNote('a');
		const b = fakeNote('b');
		const seq = build({
			measures: [
				{ index: 0, beats: 4, tempoBpm: 120, jumps: [], systemRect: SYS },
				{
					index: 1,
					beats: 1,
					tempoBpm: null,
					jumps: [],
					systemRect: SYS,
					gapMs: 5000,
				},
				{ index: 2, beats: 4, tempoBpm: null, jumps: [], systemRect: SYS },
			],
			notes: [
				{
					note: a,
					measureIndex: 0,
					measureBeat: 0,
					beats: 4,
					x: 10,
					tiedFrom: null,
				},
				{
					note: b,
					measureIndex: 2,
					measureBeat: 0,
					beats: 4,
					x: 210,
					tiedFrom: null,
				},
			],
		});

		// Three steps: a's onset, the synthesized silent gap step, b's onset.
		expect(seq.length).toBe(3);
		const gap = seq.getStep(1);
		expect(gap?.measureIndex).toBe(1);
		expect(gap?.active).toEqual([]);
		expect(gap?.startMs).toBeCloseTo(2000); // M0: 4 beats at 120bpm
		expect(gap?.endMs).toBeCloseTo(7000); // + exactly gapMs, tempo-independent
		// M2 resumes the carried 120bpm (the gap's segment never touches it).
		expect(seq.getDurationMs()).toBeCloseTo(9000);
		// Mid-gap time resolves to the gap measure; its step range is the single step.
		expect(seq.getMeasureIndexAtMs(4000)).toBe(1);
		expect(seq.getStepRangeOfMeasure(1)).toEqual({ start: 1, end: 1 });
		// Everything sounding before the gap is released on entering it.
		expect(seq.classify(0, 1).stopped).toEqual([a]);
	});

	it('assembly: a repeated measure replays its steps at later times, earliest-first lookup', () => {
		const a = fakeNote('a');
		const seq = build({
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

	it('assembly: overlapping voices window the active set; classify reports held vs released', () => {
		const half = fakeNote('half'); // voice A, [0, 2)
		const q1 = fakeNote('q1'); // voice B, [0, 1)
		const q2 = fakeNote('q2'); // voice B, [1, 2)
		const seq = build({
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

	it('positionAt: interpolates the bar x within a step toward the next onset', () => {
		const seq = build({
			measures: [
				{ index: 0, beats: 2, tempoBpm: 120, jumps: [], systemRect: SYS },
			],
			notes: [
				quarter(fakeNote('a'), 0, 0, 10),
				quarter(fakeNote('b'), 0, 1, 20),
			],
		});
		// Step 0 spans beat [0,1) = ms [0,500), gliding x 10 -> 20.
		expect(seq.positionAt(0)?.x).toBeCloseTo(10);
		expect(seq.positionAt(250)?.x).toBeCloseTo(15);
		const rect = seq.positionAt(250);
		expect(rect?.y).toBe(0);
		expect(rect?.h).toBe(100);
	});

	it('resolveX: interpolates the beat from x within a step, clamping to the range ends', () => {
		const seq = build({
			measures: [
				{ index: 0, beats: 2, tempoBpm: 120, jumps: [], systemRect: SYS },
			],
			notes: [
				quarter(fakeNote('a'), 0, 0, 10),
				quarter(fakeNote('b'), 0, 1, 20),
			],
		});
		// Step 0 spans beat [0,1) gliding x 10 -> 20; step 1 spans [1,2) gliding x 20 -> 1000 (system right).
		expect(seq.resolveX(10, 0, 1)).toEqual({ stepIndex: 0, beat: 0 });
		expect(seq.resolveX(15, 0, 1)).toEqual({ stepIndex: 0, beat: 0.5 });
		expect(seq.resolveX(20, 0, 1)).toEqual({ stepIndex: 1, beat: 1 });
		// Left of the first step clamps to its start; right of the last clamps to its end.
		expect(seq.resolveX(-5, 0, 1)).toEqual({ stepIndex: 0, beat: 0 });
		expect(seq.resolveX(9999, 0, 1)).toEqual({ stepIndex: 1, beat: 2 });
		// A single-step range stays within that step.
		expect(seq.resolveX(20, 0, 0)).toEqual({ stepIndex: 0, beat: 1 });
		expect(seq.resolveX(0, 1, 0)).toBeNull();
	});

	it('getStepRangeOfMeasure: the first occurrence contiguous run, null when empty', () => {
		const seq = build({
			measures: [
				{ index: 0, beats: 2, tempoBpm: 120, jumps: [], systemRect: SYS },
				{ index: 1, beats: 2, tempoBpm: null, jumps: [], systemRect: SYS },
			],
			notes: [
				quarter(fakeNote('a'), 0, 0, 10),
				quarter(fakeNote('b'), 0, 1, 20),
				quarter(fakeNote('c'), 1, 0, 30),
			],
		});
		expect(seq.getStepRangeOfMeasure(0)).toEqual({ start: 0, end: 1 });
		expect(seq.getStepRangeOfMeasure(1)).toEqual({ start: 2, end: 2 });
		expect(seq.getStepRangeOfMeasure(99)).toBeNull();
	});

	it('getStepIndexAtBeats: binary search, null before the first onset', () => {
		const seq = build({
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
});
