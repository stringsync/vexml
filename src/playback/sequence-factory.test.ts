import { describe, expect, it } from 'bun:test';
import type { Note } from '../elements/note';
import { ScoreReader } from '../engraving/score-reader';
import { Rect } from '../geometry';
import { DefaultScoreParser } from '../score-parser';
import type {
	Jump,
	MeasureInfo,
	SequenceInput,
	SequenceNote,
} from './sequence';
import {
	isSwingExempt,
	MeasureSequenceIterator,
	SequenceFactory,
	swingWarp,
} from './sequence-factory';

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
				{
					index: 1,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 1 }],
				},
				{ index: 2, jumps: [] },
			]),
		).toEqual([0, 1, 0, 2]);
	});

	it('iterator: repeats multiple endings', () => {
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{
					index: 1,
					jumps: [{ type: 'repeatending', times: 2, last: true, number: 1 }],
				},
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
				{
					index: 1,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 1 }],
				},
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
				{
					index: 1,
					jumps: [{ type: 'repeatending', times: 2, last: true, number: 1 }],
				},
				{
					index: 2,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 3 }],
				},
				{ index: 3, jumps: [] },
			]),
		).toEqual([0, 1, 0, 1, 0, 2, 3]);
	});

	it('iterator: plays three endings in order, each once', () => {
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{
					index: 1,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 1 }],
				},
				{
					index: 2,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 2 }],
				},
				{
					index: 3,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 3 }],
				},
				{ index: 4, jumps: [] },
			]),
		).toEqual([0, 1, 0, 2, 0, 3, 4]);
	});

	it('iterator: plays a multi-measure ending through before jumping back', () => {
		// M2-M3 are one first ending, M4-M5 one second ending: the back-jump happens at the
		// run's last measure, not at every measure it covers.
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{
					index: 1,
					jumps: [{ type: 'repeatending', times: 1, last: false, number: 1 }],
				},
				{
					index: 2,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 1 }],
				},
				{
					index: 3,
					jumps: [{ type: 'repeatending', times: 1, last: false, number: 2 }],
				},
				{
					index: 4,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 2 }],
				},
				{ index: 5, jumps: [] },
			]),
		).toEqual([0, 1, 2, 0, 3, 4, 5]);
	});

	it('iterator: skips every measure of an exhausted multi-measure ending', () => {
		// On the second pass the whole first ending (M2-M3) is skipped, not just its last
		// measure — otherwise the second pass would replay part of the first ending.
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{
					index: 1,
					jumps: [{ type: 'repeatending', times: 2, last: false, number: 1 }],
				},
				{
					index: 2,
					jumps: [{ type: 'repeatending', times: 2, last: true, number: 1 }],
				},
				{
					index: 3,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 3 }],
				},
				{ index: 4, jumps: [] },
			]),
		).toEqual([0, 1, 2, 0, 1, 2, 0, 3, 4]);
	});

	it('iterator: starts a new volta group when an ending number restarts', () => {
		// repeats_nested.musicxml: an outer block (M1) holding an inner one (M2), each closing
		// with its own 1st/2nd endings. M3-M6 are four consecutive ending measures with no plain
		// measure between them, so only the numbering restarting at 1 on M5 separates the outer
		// group from the inner one. Each pass of the outer block replays the inner block whole.
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{ index: 1, jumps: [{ type: 'repeatstart' }] },
				{
					index: 2,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 1 }],
				},
				{
					index: 3,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 2 }],
				},
				{
					index: 4,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 1 }],
				},
				{
					index: 5,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 2 }],
				},
			]),
		).toEqual([0, 1, 2, 1, 3, 4, 0, 1, 2, 1, 3, 5]);
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

	it('assembly: 3:2 sixteenth triplets in a measure starting at beat 4 keep one note active per step', () => {
		// 1/6-beat onsets: (4 + 1/6) + 1/6 and 4 + 2/6 are the same instant but differ by 1 ULP, so a
		// strict `startBeat < endBeat` test leaks the previous note into the next step.
		const notes: SequenceNote[] = Array.from({ length: 6 }, (_, i) => ({
			note: fakeNote(`t${i}`),
			measureIndex: 1,
			measureBeat: i / 6,
			beats: 1 / 6,
			x: 110 + i * 10,
			tiedFrom: null,
		}));
		const seq = build({
			measures: [
				{ index: 0, beats: 4, tempoBpm: 120, jumps: [], systemRect: SYS },
				{ index: 1, beats: 1, tempoBpm: null, jumps: [], systemRect: SYS },
			],
			notes: [
				...[0, 1, 2, 3].map((b) =>
					quarter(fakeNote(`m0b${b}`), 0, b, 10 + b * 10),
				),
				...notes,
			],
		});

		expect(seq.length).toBe(10);
		for (const [i, sn] of notes.entries()) {
			expect(seq.getStep(i + 4)?.active).toEqual([sn.note]);
		}
	});

	it('assembly: a voice that ends before its measure does stops sounding at the note end', () => {
		// Voice 1 fills only beat 1 of a 4-beat measure and has no trailing rest, so nothing onsets at
		// beat 1 — without a step seeded there the quarter rings until the next measure.
		const short = fakeNote('short');
		const held = fakeNote('held');
		const next = fakeNote('next');
		const seq = build({
			measures: [
				{ index: 0, beats: 4, tempoBpm: 120, jumps: [], systemRect: SYS },
				{ index: 1, beats: 4, tempoBpm: null, jumps: [], systemRect: SYS },
			],
			notes: [
				quarter(short, 0, 0, 10),
				{
					note: held,
					measureIndex: 0,
					measureBeat: 0,
					beats: 4,
					x: 10,
					tiedFrom: null,
				},
				{
					note: next,
					measureIndex: 1,
					measureBeat: 0,
					beats: 4,
					x: 110,
					tiedFrom: null,
				},
			],
		});

		expect(seq.length).toBe(3);
		expect(seq.getStep(0)?.active).toEqual([short, held]);
		expect(seq.getStep(1)?.startBeat).toBe(1);
		expect(seq.getStep(1)?.active).toEqual([held]);
		expect(seq.getStep(2)?.active).toEqual([next]);
		// The seeded step sits on the glide the cursor was already making, so its path is unchanged.
		expect(seq.getStep(1)?.x).toBeCloseTo(35);
		expect(seq.getStep(1)?.glideToX).toBe(110);
		expect(seq.getStep(1)?.measureIndex).toBe(0);
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
				{ index: 1, beats: 1, tempoBpm: null, jumps: [], systemRect: SYS },
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
				{ index: 0, beats: 3, tempoBpm: 120, jumps: [], systemRect: SYS },
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

// ── Playback tempo resolution: <sound tempo> drives timing, <metronome> the visuals ──

const FOUR_QUARTERS =
	'<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>'.repeat(
		4,
	);

function metronomeDir(bpm: number, sound?: number): string {
	const soundTempo = sound === undefined ? '' : `<sound tempo="${sound}"/>`;
	return `<direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${bpm}</per-minute></metronome></direction-type>${soundTempo}</direction>`;
}

function measureXml(number: number, prefix: string): string {
	const attrs =
		number === 1
			? '<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>'
			: '';
	return `<measure number="${number}">${attrs}${prefix}${FOUR_QUARTERS}</measure>`;
}

async function parseMeasures(...prefixes: string[]) {
	const body = prefixes.map((p, i) => measureXml(i + 1, p)).join('');
	const mdoc = await new DefaultScoreParser().parse(
		`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>
  <part id="P1">${body}</part>
</score-partwise>`,
	);
	return mdoc.score.parts[0]?.measures ?? [];
}

function nth<T>(arr: readonly T[], i: number): T {
	const value = arr[i];
	if (value === undefined) {
		throw new Error(`no element at index ${i}`);
	}
	return value;
}

describe('SequenceFactory playback tempo', () => {
	const reader = new ScoreReader();

	it('metronome wins over a co-located <sound tempo>', async () => {
		const m = nth(await parseMeasures(metronomeDir(60, 120)), 0);
		expect(reader.playbackTempoOf(m)?.bpm).toBe(60);
	});

	it('<sound tempo> alone drives playback and engraves no metronome', async () => {
		const m = nth(await parseMeasures('<sound tempo="60"/>'), 0);
		expect(reader.playbackTempoOf(m)?.bpm).toBe(60);
		expect(reader.tempoOf(m)).toBeNull(); // the visual path draws nothing
	});

	it('a mid-piece metronome change retempos from that measure on', async () => {
		const parsed = await parseMeasures(metronomeDir(60), metronomeDir(120));
		expect(reader.playbackTempoOf(nth(parsed, 0))?.bpm).toBe(60);
		expect(reader.playbackTempoOf(nth(parsed, 1))?.bpm).toBe(120);
	});

	it('a mid-piece <sound tempo> change retempos and engraves no marks', async () => {
		const parsed = await parseMeasures(
			'<sound tempo="60"/>',
			'<sound tempo="120"/>',
		);
		expect(reader.tempoOf(nth(parsed, 0))).toBeNull();
		expect(reader.tempoOf(nth(parsed, 1))).toBeNull();

		const measures: MeasureInfo[] = parsed.map((m, index) => ({
			index,
			beats: 4,
			tempoBpm: reader.playbackTempoOf(m)?.bpm ?? null,
			jumps: [],
			systemRect: SYS,
		}));
		const seq = new SequenceFactory(reader, []).createFromInput({
			measures,
			// Whole notes, so each measure is filled and its single onset is its only step.
			notes: [0, 1].map((index) => ({
				note: fakeNote(`m${index}`),
				measureIndex: index,
				measureBeat: 0,
				beats: 4,
				x: 0,
				tiedFrom: null,
			})),
		});

		// m1 at 60 bpm: 4 beats = 4000ms. m2 at 120 bpm: 4 beats = 2000ms (would be
		// 4000 without the retempo), so it ends at 6000, not 8000.
		expect(seq.getStep(0)?.endMs).toBeCloseTo(4000);
		expect(seq.getStep(1)?.startMs).toBeCloseTo(4000);
		expect(seq.getStep(1)?.endMs).toBeCloseTo(6000);
	});
});

/*
 * A <metronome>'s printed shape, which the barline_styles/tempo_beat_unit_dot screenshots
 * pin visually but cannot pull apart: an augmentation dot is a SIBLING of the <beat-unit>
 * it modifies, not a child, so "dotted quarter = half" and "quarter = dotted half" differ
 * only in where the <beat-unit-dot/> sits in document order.
 */
describe('ScoreReader.tempoOf', () => {
	const reader = new ScoreReader();
	const metronome = (inner: string, attrs = '') =>
		`<direction><direction-type><metronome ${attrs}>${inner}</metronome></direction-type></direction>`;
	const markOf = async (inner: string, attrs = '') =>
		reader.tempoOf(nth(await parseMeasures(metronome(inner, attrs)), 0));

	it('counts the <beat-unit-dot/> markers trailing a beat unit', async () => {
		const mark = await markOf(
			'<beat-unit>quarter</beat-unit><beat-unit-dot/><per-minute>100</per-minute>',
		);
		expect(mark).toMatchObject({ duration: 'quarter', dots: 1, bpm: 100 });
	});

	it('binds each dot to the unit it follows, not to the mark', async () => {
		const mark = await markOf(
			'<beat-unit>quarter</beat-unit><beat-unit-dot/><beat-unit>half</beat-unit>',
		);
		expect(mark).toMatchObject({
			duration: 'quarter',
			dots: 1,
			duration2: 'half',
			dots2: 0,
		});
	});

	it('reads a second <beat-unit> as the metric-modulation right-hand side', async () => {
		const mark = await markOf(
			'<beat-unit>quarter</beat-unit><beat-unit>half</beat-unit><beat-unit-dot/>',
		);
		expect(mark).toMatchObject({ duration2: 'half', dots2: 1 });
	});

	it('leaves duration2 null for the ordinary unit-equals-bpm form', async () => {
		const mark = await markOf(
			'<beat-unit>half</beat-unit><per-minute>60</per-minute>',
		);
		expect(mark).toMatchObject({ duration2: null, dots: 0, bpm: 60 });
	});

	it('reads the parentheses attribute', async () => {
		const plain = await markOf('<beat-unit>quarter</beat-unit>');
		const wrapped = await markOf(
			'<beat-unit>quarter</beat-unit>',
			'parentheses="yes"',
		);
		expect(plain?.parenthesis).toBe(false);
		expect(wrapped?.parenthesis).toBe(true);
	});
});

/*
 * Swing. The distinction this pins down is the one the notation hides: a <metronome> "two
 * eighths = quarter-eighth triplet" figure tells a HUMAN to swing and carries no timing at
 * all, so only a <sound><swing> makes playback actually swing.
 */
describe('ScoreReader.swingOf', () => {
	const reader = new ScoreReader();
	const swingOf = async (inner: string) =>
		reader.swingOf(
			nth(await parseMeasures(`<sound><swing>${inner}</swing></sound>`), 0),
		);

	it('reads the ratio, defaulting the swung unit to eighths', async () => {
		expect(await swingOf('<first>2</first><second>1</second>')).toEqual({
			first: 2,
			second: 1,
			unit: 0.5,
		});
	});

	it('reads a 16th <swing-type> as the finer unit', async () => {
		expect(
			await swingOf(
				'<first>2</first><second>1</second><swing-type>16th</swing-type>',
			),
		).toEqual({ first: 2, second: 1, unit: 0.25 });
	});

	it('reads <straight/> as an even ratio, so it cancels a carried swing', async () => {
		expect(await swingOf('<straight/>')).toMatchObject({
			first: 1,
			second: 1,
		});
	});

	it('is null with no <swing>, so the swing in force carries forward', async () => {
		const m = nth(await parseMeasures('<sound tempo="60"/>'), 0);
		expect(reader.swingOf(m)).toBeNull();
	});

	it('finds a <swing> nested in a <direction>, not just a bare measure child', async () => {
		const m = nth(
			await parseMeasures(
				'<direction><direction-type><words>Swing</words></direction-type>' +
					'<sound><swing><first>2</first><second>1</second></swing></sound></direction>',
			),
			0,
		);
		expect(reader.swingOf(m)).toMatchObject({ first: 2, second: 1 });
	});

	it('does not swing off the <metronome> figure alone — that is notation, not timing', async () => {
		const m = nth(
			await parseMeasures(
				'<direction><direction-type><metronome>' +
					'<metronome-note><metronome-type>eighth</metronome-type></metronome-note>' +
					'<metronome-relation>equals</metronome-relation>' +
					'<metronome-note><metronome-type>quarter</metronome-type></metronome-note>' +
					'</metronome></direction-type></direction>',
			),
			0,
		);
		expect(reader.swingOf(m)).toBeNull();
	});
});

describe('swingWarp', () => {
	const SWUNG = { first: 2, second: 1, unit: 0.5 };

	it('holds the pair boundaries fixed and pushes the off-beat late', () => {
		const warp = swingWarp(SWUNG, 4, 4);
		expect(warp(0)).toBeCloseTo(0);
		expect(warp(0.5)).toBeCloseTo(2 / 3);
		expect(warp(1)).toBeCloseTo(1);
		expect(warp(1.5)).toBeCloseTo(5 / 3);
		// The measure keeps its length, so tempo segments and bar starts never drift.
		expect(warp(4)).toBeCloseTo(4);
	});

	it('phases the grid off the downbeat, so a pickup eighth plays SHORT', () => {
		// One eighth of pickup in 3/4: that note is the OFF-beat of the pair landing on beat 1,
		// so it is the squeezed half (1/3 of a quarter). Phased off the measure's own start
		// instead, it would come out 2/3 — stretched, exactly backwards.
		const warp = swingWarp(SWUNG, 0.5, 3);
		expect(warp(0)).toBeCloseTo(0);
		expect(warp(0.5)).toBeCloseTo(1 / 3);
	});

	it('is identity for straight time and for no swing at all', () => {
		expect(swingWarp({ first: 1, second: 1, unit: 0.5 }, 4, 4)(0.5)).toBe(0.5);
		expect(swingWarp(null, 4, 4)(0.5)).toBe(0.5);
	});

	it('swings 16ths on the finer grid, leaving the eighths where they are', () => {
		const warp = swingWarp({ first: 2, second: 1, unit: 0.25 }, 4, 4);
		expect(warp(0.25)).toBeCloseTo(1 / 3);
		expect(warp(0.5)).toBeCloseTo(0.5);
	});
});

/*
 * The <metronome-note> form: note GROUPS either side of a <metronome-relation>, which the
 * <beat-unit> form cannot state. The tempo_beat_unit_dot screenshot pins how it draws; this
 * pins what is read out of the markup, which the picture cannot show.
 */
describe('ScoreReader.modulationOf', () => {
	const reader = new ScoreReader();
	const SWING =
		'<metronome-note><metronome-type>eighth</metronome-type>' +
		'<metronome-beam number="1">begin</metronome-beam></metronome-note>' +
		'<metronome-note><metronome-type>eighth</metronome-type>' +
		'<metronome-beam number="1">end</metronome-beam></metronome-note>' +
		'<metronome-relation>equals</metronome-relation>' +
		'<metronome-note><metronome-type>quarter</metronome-type>' +
		'<metronome-tuplet bracket="yes" type="start"><actual-notes>3</actual-notes>' +
		'<normal-notes>2</normal-notes></metronome-tuplet></metronome-note>' +
		'<metronome-note><metronome-type>eighth</metronome-type>' +
		'<metronome-tuplet bracket="yes" type="stop"><actual-notes>3</actual-notes>' +
		'<normal-notes>2</normal-notes></metronome-tuplet></metronome-note>';
	const modulationOf = async (inner: string, attrs = '') =>
		reader.modulationOf(
			nth(
				await parseMeasures(
					`<direction><direction-type><metronome ${attrs}>${inner}</metronome></direction-type></direction>`,
				),
				0,
			),
		);

	it('splits the notes at the <metronome-relation>', async () => {
		const mark = await modulationOf(SWING);
		expect(mark?.left.map((note) => note.type)).toEqual(['eighth', 'eighth']);
		expect(mark?.right.map((note) => note.type)).toEqual(['quarter', 'eighth']);
	});

	it('counts only the beams that carry on to the next note', async () => {
		// 'begin' continues the beam into the gap after it; 'end' closes it, so the second note
		// draws beamed but stretches no beam rightward.
		const mark = await modulationOf(SWING);
		expect(mark?.left.map((note) => note.beamsToNext)).toEqual([1, 0]);
		expect(mark?.left.every((note) => note.beamed)).toBe(true);
		// The right-hand notes carry no <metronome-beam>, so they keep their own flags.
		expect(mark?.right.some((note) => note.beamed)).toBe(false);
	});

	it('reads the tuplet span and its actual-notes', async () => {
		const mark = await modulationOf(SWING);
		expect(mark?.right.map((note) => note.tuplet)).toEqual([
			{ actual: 3, type: 'start' },
			{ actual: 3, type: 'stop' },
		]);
	});

	it('is null for the beat-unit form, which tempoOf reads instead', async () => {
		expect(
			await modulationOf(
				'<beat-unit>quarter</beat-unit><per-minute>60</per-minute>',
			),
		).toBeNull();
	});

	it('is null without a relation — one group equates to nothing', async () => {
		expect(
			await modulationOf(
				'<metronome-note><metronome-type>eighth</metronome-type></metronome-note>',
			),
		).toBeNull();
	});

	it('reads both marks of one <direction>, each through its own accessor', async () => {
		const m = nth(
			await parseMeasures(
				'<direction><direction-type><metronome><beat-unit>quarter</beat-unit>' +
					`<per-minute>60</per-minute></metronome></direction-type><direction-type><metronome>${SWING}</metronome></direction-type></direction>`,
			),
			0,
		);
		// The rate is no longer shadowed by the note-form metronome sitting next to it, and the
		// note form is no longer lost behind the rate: the two print side by side.
		expect(reader.tempoOf(m)).toMatchObject({ duration: 'quarter', bpm: 60 });
		expect(reader.modulationOf(m)?.left).toHaveLength(2);
	});

	it('reads the parentheses attribute', async () => {
		expect((await modulationOf(SWING, 'parentheses="yes"'))?.parenthesis).toBe(
			true,
		);
	});
});

describe('isSwingExempt', () => {
	const PITCH = '<pitch><step>C</step><octave>5</octave></pitch>';
	const exemptOf = async (inner: string) =>
		isSwingExempt(nth(nth(await parseMeasures(inner), 0).notes, 0));

	it('swings an ordinary eighth', async () => {
		expect(
			await exemptOf(
				`<note>${PITCH}<duration>1</duration><type>eighth</type></note>`,
			),
		).toBe(false);
	});

	it('exempts a note under a <time-modification>', async () => {
		// A written-out triplet already carries the swing feel. Swinging it again would put it
		// on neither an even third of the beat nor a swung pair — this is the case that shows
		// up in real arrangements, where a swung vocal line sits over a triplet accompaniment.
		expect(
			await exemptOf(
				`<note>${PITCH}<duration>1</duration><type>eighth</type>` +
					'<time-modification><actual-notes>3</actual-notes>' +
					'<normal-notes>2</normal-notes></time-modification></note>',
			),
		).toBe(true);
	});

	it('exempts a grace note, which has no written duration to stretch', async () => {
		expect(
			await exemptOf(`<note><grace/>${PITCH}<type>eighth</type></note>`),
		).toBe(true);
	});

	it('exempts a note with no <type>, whose nominal duration is unknown', async () => {
		expect(await exemptOf(`<note>${PITCH}<duration>1</duration></note>`)).toBe(
			true,
		);
	});
});
