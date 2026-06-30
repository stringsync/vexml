import { Rect } from './geometry';
import type { Note } from './targets';

/*
 * The playback timeline: the score unrolled into a linear sequence of steps in playback order, with
 * repeats and voltas expanded, onsets resolved to absolute beats, and beats mapped to milliseconds
 * through the score's tempo marks. A playback Cursor walks it; the Score queries it (duration,
 * position->time). This module is pure over the `SequenceInput` seam (no DOM, no rendering), so the
 * whole timeline is unit-tested directly; `render.ts` builds the real input from the engraved
 * geometry and the parsed document.
 */

/* A measure's repeat structure, as the iterator consumes it. `times` is the number of *back-jumps*
 * (a plain repeat that plays twice is `times: 1`); a volta `repeatending`'s `times` is how many
 * passes that ending covers. Derived from MusicXML barlines/endings in render.ts. */
export type Jump =
	| { type: 'repeatstart' }
	| { type: 'repeatend'; times: number }
	| { type: 'repeatending'; times: number };

/* One measure in document (visual) order. `beats` is its played length in quarter-note beats (the
 * max note end, or the meter); `tempoBpm` is the quarter-note BPM in effect at its start, or null to
 * carry the previous (the piece starts at 120 if never set). `systemRect` is the measure's full
 * system box — the bar's vertical span and the x it clamps to at a line end. */
export interface MeasureInfo {
	index: number;
	beats: number;
	tempoBpm: number | null;
	jumps: Jump[];
	systemRect: Rect;
}

/* A rendered, time-bearing note (a notation notehead or rest — grace notes and tab ghosts are not
 * rendered as tickables, so they never appear here). `note` is the target identity used in active
 * sets; `tiedFrom` is the note this one continues from across a tie, so a tied continuation reads as
 * a sustain rather than a re-attack. */
export interface SequenceNote {
	note: Note;
	measureIndex: number;
	measureBeat: number;
	beats: number;
	x: number;
	tiedFrom: Note | null;
}

/* Everything the timeline is built from. A fake supplies plain values in tests; render.ts builds the
 * real one from `RawGeometry` + the parsed parts. */
export interface SequenceInput {
	measures: MeasureInfo[];
	notes: SequenceNote[];
}

/* One stop in playback order: the onset of a tickable. The active set is constant across
 * `[startBeat, endBeat)`. `x`/`glideToX` are the bar's onset position and where it glides to by the
 * step's end (the next onset on the same system, or the system's right edge at a line break);
 * `systemRect` is its vertical span. */
export interface Step {
	readonly index: number;
	readonly measureIndex: number;
	readonly startBeat: number;
	readonly endBeat: number;
	readonly startMs: number;
	readonly endMs: number;
	readonly x: number;
	readonly glideToX: number;
	readonly systemRect: Rect;
	readonly active: readonly Note[];
}

/* What changed between two cursor positions: notes to attack (a re-struck pitch shows in both
 * `started` and `stopped`), notes held or tied through (do not re-attack), and notes released
 * (a note tied into the next step is excluded — it keeps ringing). */
export interface CursorTransition {
	readonly started: readonly Note[];
	readonly sustained: readonly Note[];
	readonly stopped: readonly Note[];
}

/* A quarter-note-beats <-> ms segment: `[startBeat, endBeat)` plays at `bpm` quarter notes/min. */
type TempoSegment = { startBeat: number; endBeat: number; bpm: number };

const DEFAULT_BPM = 120;
/* The bar is a thin line; the view thickens it. A nonzero width keeps it a valid, hit-testable box. */
const BAR_WIDTH = 1;

/**
 * Iterates measure indices in playback order, expanding repeats and voltas. Two phases: pre-scan to
 * pair `repeatend`s with their `repeatstart`s and group `repeatending` runs into voltas, then a
 * linear walk that back-jumps and skips exhausted endings. Ported from legacy vexml.
 */
export class MeasureSequenceIterator implements Iterable<number> {
	constructor(
		private readonly measures: ReadonlyArray<{ index: number; jumps: Jump[] }>,
	) {}

	[Symbol.iterator](): Iterator<number> {
		return computeSequence(this.measures)[Symbol.iterator]();
	}
}

type RepeatEnd = { measureIndex: number; startIndex: number; times: number };
type VoltaEnding = {
	measureIndex: number;
	times: number;
	startPass: number;
	endPass: number;
};
type Volta = {
	startIndex: number;
	endings: VoltaEnding[];
	totalPasses: number;
};
type Structure = {
	repeatEndsByMeasure: Map<number, RepeatEnd>;
	voltas: Volta[];
	endingByMeasure: Map<number, { volta: Volta; ending: VoltaEnding }>;
};

function computeSequence(
	measures: ReadonlyArray<{ index: number; jumps: Jump[] }>,
): number[] {
	return walk(measures, analyzeStructure(measures));
}

function findJump<K extends Jump['type']>(
	jumps: Jump[],
	type: K,
): Extract<Jump, { type: K }> | undefined {
	return jumps.find(
		(jump): jump is Extract<Jump, { type: K }> => jump.type === type,
	);
}

function analyzeStructure(
	measures: ReadonlyArray<{ index: number; jumps: Jump[] }>,
): Structure {
	const repeatEndsByMeasure = new Map<number, RepeatEnd>();
	const voltas: Volta[] = [];
	const endingByMeasure = new Map<
		number,
		{ volta: Volta; ending: VoltaEnding }
	>();

	const startStack: number[] = [];
	let currentVolta: Volta | null = null;

	for (const [i, measure] of measures.entries()) {
		for (const jump of measure.jumps) {
			if (jump.type === 'repeatstart') {
				startStack.push(i);
			}
		}

		const endingJump = findJump(measure.jumps, 'repeatending');
		if (endingJump) {
			if (currentVolta === null) {
				currentVolta = {
					startIndex: startStack.at(-1) ?? 0,
					endings: [],
					totalPasses: 0,
				};
				voltas.push(currentVolta);
			}
			const ending: VoltaEnding = {
				measureIndex: i,
				times: endingJump.times,
				startPass: 0,
				endPass: 0,
			};
			currentVolta.endings.push(ending);
			endingByMeasure.set(i, { volta: currentVolta, ending });
			// A `repeatend` co-located with a `repeatending` is intentionally dropped.
			continue;
		}

		if (currentVolta !== null) {
			if (startStack.at(-1) === currentVolta.startIndex) {
				startStack.pop();
			}
			currentVolta = null;
		}

		const endJump = findJump(measure.jumps, 'repeatend');
		if (endJump) {
			const startIndex = startStack.pop() ?? 0;
			repeatEndsByMeasure.set(i, {
				measureIndex: i,
				startIndex,
				times: endJump.times,
			});
		}
	}

	// Close any volta that runs to the end of the score.
	if (currentVolta !== null && startStack.at(-1) === currentVolta.startIndex) {
		startStack.pop();
	}

	for (const volta of voltas) {
		// A `repeatending` with `times: 0` on the LAST ending is the standard "discontinue" volta: it
		// plays once on the final pass with no back-jump. Treat it as `times: 1` for pass ranges.
		const last = volta.endings.at(-1);
		let pass = 1;
		for (const ending of volta.endings) {
			const effective =
				ending === last && ending.times === 0 ? 1 : ending.times;
			ending.startPass = pass;
			ending.endPass = pass + effective - 1;
			pass += effective;
		}
		const sum = pass - 1;
		// A single-ending volta whose ending has a back-jump needs an implicit final pass for the
		// run-past-the-now-exhausted-ending step. Other shapes exit on their final ending naturally.
		const needsImplicitFinalPass =
			volta.endings.length === 1 && last !== undefined && last.times > 0;
		volta.totalPasses = needsImplicitFinalPass ? sum + 1 : sum;
	}

	return { repeatEndsByMeasure, voltas, endingByMeasure };
}

function walk(
	measures: ReadonlyArray<{ index: number; jumps: Jump[] }>,
	structure: Structure,
): number[] {
	const result: number[] = [];
	const remainingBackJumps = new Map<number, number>();
	const voltaPass = new Map<Volta, number>();

	let i = 0;
	while (i < measures.length) {
		const measure = measures[i];
		if (!measure) {
			break;
		}

		const endingHit = structure.endingByMeasure.get(i);
		if (endingHit) {
			const pass = voltaPass.get(endingHit.volta) ?? 1;
			if (
				pass < endingHit.ending.startPass ||
				pass > endingHit.ending.endPass
			) {
				i++;
				continue;
			}
		}

		result.push(measure.index);

		if (endingHit) {
			const { volta } = endingHit;
			const nextPass = (voltaPass.get(volta) ?? 1) + 1;
			if (nextPass > volta.totalPasses) {
				voltaPass.delete(volta);
				i++;
			} else {
				voltaPass.set(volta, nextPass);
				resetNestedState(
					structure,
					remainingBackJumps,
					voltaPass,
					volta.startIndex,
					i,
				);
				i = volta.startIndex;
			}
			continue;
		}

		const repeatEnd = structure.repeatEndsByMeasure.get(i);
		if (repeatEnd) {
			if (repeatEnd.times === 0) {
				i++;
				continue;
			}
			const remaining = remainingBackJumps.get(i) ?? repeatEnd.times;
			if (remaining > 0) {
				remainingBackJumps.set(i, remaining - 1);
				resetNestedState(
					structure,
					remainingBackJumps,
					voltaPass,
					repeatEnd.startIndex,
					i,
				);
				i = repeatEnd.startIndex;
			} else {
				remainingBackJumps.delete(i);
				i++;
			}
			continue;
		}

		i++;
	}

	return result;
}

/* Reset repeat-ends and voltas nested strictly inside a range being jumped back over, so their
 * counters re-initialize on the next pass through the outer block. */
function resetNestedState(
	structure: Structure,
	remainingBackJumps: Map<number, number>,
	voltaPass: Map<Volta, number>,
	startIndex: number,
	endIndex: number,
): void {
	for (const measureIndex of structure.repeatEndsByMeasure.keys()) {
		if (measureIndex > startIndex && measureIndex < endIndex) {
			remainingBackJumps.delete(measureIndex);
		}
	}
	for (const volta of structure.voltas) {
		if (volta.startIndex > startIndex && volta.startIndex < endIndex) {
			voltaPass.delete(volta);
		}
	}
}

/**
 * Quarter-note beats -> milliseconds across tempo segments. Folds the elapsed time of every segment
 * the beat spans, plus the partial of the segment it lands in. Segments are contiguous and ordered;
 * a beat past the last segment extrapolates at the last segment's rate.
 */
export function beatsToMs(
	beats: number,
	segments: readonly TempoSegment[],
): number {
	const last = segments.at(-1);
	if (!last) {
		return (beats / DEFAULT_BPM) * 60000;
	}
	let ms = 0;
	for (const seg of segments) {
		if (beats <= seg.startBeat) {
			break;
		}
		const upto = Math.min(beats, seg.endBeat);
		ms += ((upto - seg.startBeat) / seg.bpm) * 60000;
	}
	if (beats > last.endBeat) {
		ms += ((beats - last.endBeat) / last.bpm) * 60000;
	}
	return ms;
}

/** Milliseconds -> quarter-note beats: the monotonic inverse of {@link beatsToMs}. */
export function msToBeats(
	ms: number,
	segments: readonly TempoSegment[],
): number {
	const last = segments.at(-1);
	if (!last) {
		return (ms / 60000) * DEFAULT_BPM;
	}
	let elapsed = 0;
	for (const seg of segments) {
		const segMs = ((seg.endBeat - seg.startBeat) / seg.bpm) * 60000;
		if (ms <= elapsed + segMs) {
			return seg.startBeat + ((ms - elapsed) / 60000) * seg.bpm;
		}
		elapsed += segMs;
	}
	return last.endBeat + ((ms - elapsed) / 60000) * last.bpm;
}

/**
 * Partition the notes active at a destination step into attacks vs. sustains relative to a source
 * step, and the notes released. Pure set algebra over identities, generic so it's tested with plain
 * tokens. A note is sustained when it was already ringing (same identity) or is tied in from a note
 * that was; otherwise it's a (re)attack. A source note is released unless it's tied into a
 * destination note (then it keeps ringing as that note).
 */
export function classifyTransition<T>(
	prevActive: readonly T[] | null,
	nextActive: readonly T[],
	tiedFrom: ReadonlyMap<T, T>,
): { started: T[]; sustained: T[]; stopped: T[] } {
	const prev = new Set(prevActive ?? []);
	const next = new Set(nextActive);
	const started: T[] = [];
	const sustained: T[] = [];
	const tiedOut = new Set<T>();

	for (const n of nextActive) {
		const from = tiedFrom.get(n);
		if (prev.has(n)) {
			sustained.push(n);
		} else if (from !== undefined && prev.has(from)) {
			sustained.push(n);
			tiedOut.add(from);
		} else {
			started.push(n);
		}
	}

	const stopped: T[] = [];
	for (const p of prevActive ?? []) {
		if (!next.has(p) && !tiedOut.has(p)) {
			stopped.push(p);
		}
	}
	return { started, sustained, stopped };
}

/** Build the playback timeline from its input. See {@link Sequence}. */
export function buildSequence(input: SequenceInput): Sequence {
	const order = [...new MeasureSequenceIterator(input.measures)];

	const notesByMeasure = new Map<number, SequenceNote[]>();
	for (const note of input.notes) {
		const list = notesByMeasure.get(note.measureIndex);
		if (list) {
			list.push(note);
		} else {
			notesByMeasure.set(note.measureIndex, [note]);
		}
	}

	// Walk playback order: accumulate the measure start beat, build tempo segments, and collect each
	// note occurrence's absolute [startBeat, endBeat) interval plus the onsets that seed steps.
	type Interval = { note: Note; startBeat: number; endBeat: number };
	type Onset = { x: number; systemRect: Rect; measureIndex: number };
	const intervals: Interval[] = [];
	const onsets = new Map<number, Onset>();
	const segments: TempoSegment[] = [];
	let totalBeats = 0;
	// Start at 120; a measure's mark sets the rate from there on, null carries the previous. Measures
	// before the first mark stay at the default, and a back-jump re-applies marks as written.
	let bpm = DEFAULT_BPM;
	for (const measureIndex of order) {
		const measure = input.measures[measureIndex];
		if (!measure) {
			continue;
		}
		if (measure.tempoBpm !== null) {
			bpm = measure.tempoBpm;
		}
		segments.push({
			startBeat: totalBeats,
			endBeat: totalBeats + measure.beats,
			bpm,
		});
		for (const sn of notesByMeasure.get(measureIndex) ?? []) {
			const startBeat = totalBeats + sn.measureBeat;
			intervals.push({
				note: sn.note,
				startBeat,
				endBeat: startBeat + sn.beats,
			});
			const existing = onsets.get(startBeat);
			if (existing) {
				existing.x = Math.min(existing.x, sn.x); // the onset's leftmost notehead anchors the bar
			} else {
				onsets.set(startBeat, {
					x: sn.x,
					systemRect: measure.systemRect,
					measureIndex: measure.index,
				});
			}
		}
		totalBeats += measure.beats;
	}

	const tiedFrom = new Map<Note, Note>();
	for (const sn of input.notes) {
		if (sn.tiedFrom) {
			tiedFrom.set(sn.note, sn.tiedFrom);
		}
	}

	const startBeats = [...onsets.keys()].sort((a, b) => a - b);
	const steps: Step[] = [];
	const firstStepOfNote = new Map<Note, number>();
	const firstStepOfMeasure = new Map<number, number>();
	for (const [i, startBeat] of startBeats.entries()) {
		const onset = onsets.get(startBeat);
		if (!onset) {
			continue;
		}
		const nextBeat = startBeats[i + 1];
		const endBeat = nextBeat ?? totalBeats;
		const active = intervals
			.filter((iv) => iv.startBeat <= startBeat && startBeat < iv.endBeat)
			.map((iv) => iv.note);
		// Glide toward the next onset on the same system; at a line break, to the system's right edge.
		const next = nextBeat === undefined ? undefined : onsets.get(nextBeat);
		const sameSystem =
			next !== undefined &&
			next.systemRect.y === onset.systemRect.y &&
			next.x > onset.x;
		const glideToX = sameSystem && next ? next.x : onset.systemRect.right;
		steps.push({
			index: i,
			measureIndex: onset.measureIndex,
			startBeat,
			endBeat,
			startMs: beatsToMs(startBeat, segments),
			endMs: beatsToMs(endBeat, segments),
			x: onset.x,
			glideToX,
			systemRect: onset.systemRect,
			active,
		});
		for (const note of active) {
			if (!firstStepOfNote.has(note)) {
				firstStepOfNote.set(note, i);
			}
		}
		if (!firstStepOfMeasure.has(onset.measureIndex)) {
			firstStepOfMeasure.set(onset.measureIndex, i);
		}
	}

	return new Sequence(
		steps,
		segments,
		totalBeats,
		tiedFrom,
		firstStepOfNote,
		firstStepOfMeasure,
	);
}

/**
 * The built timeline: ordered steps, the tempo map, and lookups. Constructed by {@link buildSequence};
 * the Cursor walks it (step/seek/interpolate) and the Score queries it (duration, position->time).
 */
export class Sequence {
	constructor(
		private readonly steps: Step[],
		private readonly segments: readonly TempoSegment[],
		private readonly durationBeats: number,
		private readonly tiedFrom: ReadonlyMap<Note, Note>,
		private readonly firstStepOfNote: ReadonlyMap<Note, number>,
		private readonly firstStepOfMeasure: ReadonlyMap<number, number>,
	) {}

	get length(): number {
		return this.steps.length;
	}

	getStep(index: number): Step | null {
		return this.steps[index] ?? null;
	}

	getDurationBeats(): number {
		return this.durationBeats;
	}

	getDurationMs(): number {
		return beatsToMs(this.durationBeats, this.segments);
	}

	beatsToMs(beats: number): number {
		return beatsToMs(beats, this.segments);
	}

	msToBeats(ms: number): number {
		return msToBeats(ms, this.segments);
	}

	/* The step active at `beat` (the last whose startBeat <= beat), or null when empty / before the
	 * first onset. Binary search over ordered startBeats. */
	getStepIndexAtBeats(beat: number): number | null {
		const first = this.steps[0];
		if (!first || beat < first.startBeat) {
			return null;
		}
		let lo = 0;
		let hi = this.steps.length - 1;
		while (lo < hi) {
			const mid = (lo + hi + 1) >> 1;
			const step = this.steps[mid];
			if (step && step.startBeat <= beat) {
				lo = mid;
			} else {
				hi = mid - 1;
			}
		}
		return lo;
	}

	getStepIndexAtMs(ms: number): number | null {
		return this.getStepIndexAtBeats(this.msToBeats(ms));
	}

	/* The bar rect at an exact time: the step's onset x interpolated toward its glide target by the
	 * elapsed fraction, spanning the step's system. Clamped to the timeline's bounds. */
	positionAt(ms: number): Rect | null {
		const beat = this.msToBeats(ms);
		const index = this.getStepIndexAtBeats(beat) ?? 0;
		const step = this.steps[index];
		if (!step) {
			return null;
		}
		const span = step.endBeat - step.startBeat;
		const frac =
			span > 0 ? Math.min(1, Math.max(0, (beat - step.startBeat) / span)) : 0;
		const x = step.x + (step.glideToX - step.x) * frac;
		return new Rect(x, step.systemRect.y, BAR_WIDTH, step.systemRect.h);
	}

	/* Inverse of positionAt over a step range: the step whose `[x, glideToX]` segment contains the
	 * score-space `x`, and the exact beat interpolated within it. Steps in a range are left-to-right
	 * contiguous (`step[i].glideToX === step[i+1].x` on the same system), so `x` left of the first
	 * clamps to frac 0 and right of the last to frac 1. Null if the range is empty/invalid. */
	resolveX(
		x: number,
		startStep: number,
		endStep: number,
	): { stepIndex: number; beat: number } | null {
		if (startStep > endStep) {
			return null;
		}
		let stepIndex = startStep;
		for (let i = startStep; i <= endStep; i++) {
			const step = this.steps[i];
			if (!step) {
				return null;
			}
			stepIndex = i;
			if (x < step.glideToX) {
				break;
			}
		}
		const step = this.steps[stepIndex];
		if (!step) {
			return null;
		}
		const span = step.glideToX - step.x;
		const frac = span > 0 ? Math.min(1, Math.max(0, (x - step.x) / span)) : 0;
		const beat = step.startBeat + (step.endBeat - step.startBeat) * frac;
		return { stepIndex, beat };
	}

	/* Started/sustained/stopped moving from one step to another (or from nothing, `from = null`). */
	classify(from: number | null, to: number): CursorTransition {
		const prev = from === null ? null : (this.steps[from]?.active ?? null);
		const next = this.steps[to]?.active ?? [];
		return classifyTransition(prev, next, this.tiedFrom);
	}

	/* The earliest step a note sounds in (its first occurrence under repeats), or null if unrendered. */
	getFirstStepOfNote(note: Note): number | null {
		return this.firstStepOfNote.get(note) ?? null;
	}

	/* The earliest step in a measure (its first occurrence under repeats), or null if it has none. */
	getFirstStepOfMeasure(measureIndex: number): number | null {
		return this.firstStepOfMeasure.get(measureIndex) ?? null;
	}

	/* The first occurrence's contiguous run of steps for a measure, or null if it has none. The run
	 * is contiguous because a measure's onsets are emitted together, in playback order. */
	getStepRangeOfMeasure(
		measureIndex: number,
	): { start: number; end: number } | null {
		const start = this.firstStepOfMeasure.get(measureIndex);
		if (start === undefined) {
			return null;
		}
		let end = start;
		while (this.steps[end + 1]?.measureIndex === measureIndex) {
			end++;
		}
		return { start, end };
	}
}
