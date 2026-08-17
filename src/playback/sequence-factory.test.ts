import { describe, expect, it } from 'bun:test';
import { ScoreReader } from '../engraving/score-reader';
import {
	metronomeDir,
	nth,
	parseMeasures,
} from '../engraving/score-reader-harness';
import type { MeasureInfo, SequenceNote } from './sequence';
import { SequenceFactory } from './sequence-factory';
import { build, fakeNote, quarter, SYS } from './sequence-factory-harness';

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

	// Playback tempo resolution: <sound tempo> drives timing, <metronome> the visuals.
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
