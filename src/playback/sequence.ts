import { BAR_WIDTH, DEFAULT_TEMPO_BPM } from '../constants';
import type { Note } from '../elements/note';
import { Rect } from '../geometry';

/*
 * The playback timeline: the score unrolled into a linear sequence of steps in playback order, with
 * repeats and voltas expanded, onsets resolved to absolute beats, and beats mapped to milliseconds
 * through the score's tempo marks. A playback CursorController walks it; the Score queries it
 * (duration, position->time). Pure over the `SequenceInput` seam (no DOM, no rendering), so the
 * whole timeline is unit-tested directly; SequenceFactory builds the real input from the engraved
 * geometry and the parsed document.
 */

/* A measure's repeat structure, as the iterator consumes it. `times` is the number of *back-jumps*
 * (a plain repeat that plays twice is `times: 1`); a volta `repeatending`'s `times` is how many
 * passes that ending covers. Derived from MusicXML barlines/endings by SequenceFactory. */
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
	/** Set on a gap measure: it plays for exactly this many ms regardless of tempo
	 * (its `beats` are nominal — the factory maps them to gapMs via a dedicated tempo
	 * segment) and gets a synthesized silent step spanning it. */
	gapMs?: number;
}

/* A rendered, time-bearing note (a notation notehead or rest — grace notes and tab ghosts are not
 * rendered as tickables, so they never appear here). `note` is the element identity used in active
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

/* Everything the timeline is built from. A fake supplies plain values in tests; SequenceFactory
 * builds the real one from `RawGeometry` + the parsed parts. */
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
export type TempoSegment = { startBeat: number; endBeat: number; bpm: number };

/**
 * Quarter-note beats -> milliseconds across tempo segments. Folds the elapsed time of every segment
 * the beat spans, plus the partial of the segment it lands in. Segments are contiguous and ordered;
 * a beat past the last segment extrapolates at the last segment's rate. Internal to the
 * sequence/factory pair — drive it through Sequence in tests.
 */
export function beatsToMs(
	beats: number,
	segments: readonly TempoSegment[],
): number {
	const last = segments.at(-1);
	if (!last) {
		return (beats / DEFAULT_TEMPO_BPM) * 60000;
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
		return (ms / 60000) * DEFAULT_TEMPO_BPM;
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

/*
 * Partition the notes active at a destination step into attacks vs. sustains relative to a source
 * step, and the notes released. Pure set algebra over identities. A note is sustained when it was
 * already ringing (same identity) or is tied in from a note that was; otherwise it's a (re)attack.
 * A source note is released unless it's tied into a destination note (then it keeps ringing).
 */
function classifyTransition<T>(
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

/**
 * The built timeline: ordered steps, the tempo map, and lookups. Constructed by SequenceFactory;
 * the CursorController walks it (step/seek/interpolate) and the Score queries it (duration,
 * position->time).
 */
export class Sequence {
	// Undirected tie graph (built in the constructor from tiedFrom), so getHighlighted can light a
	// whole tie chain in both directions while any of it is sounding.
	private readonly tieAdjacency = new Map<Note, Note[]>();

	constructor(
		private readonly steps: Step[],
		private readonly segments: readonly TempoSegment[],
		private readonly durationBeats: number,
		private readonly measureCount: number,
		private readonly tiedFrom: ReadonlyMap<Note, Note>,
		private readonly firstStepOfNote: ReadonlyMap<Note, number>,
		private readonly firstStepOfMeasure: ReadonlyMap<number, number>,
	) {
		const link = (a: Note, b: Note) => {
			const edges = this.tieAdjacency.get(a) ?? [];
			edges.push(b);
			this.tieAdjacency.set(a, edges);
		};
		for (const [note, from] of tiedFrom) {
			link(note, from);
			link(from, note);
		}
	}

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

	/* The total number of measures in document order (not repeat-expanded). */
	getMeasureCount(): number {
		return this.measureCount;
	}

	/* The document measure index playing at `ms` (before the first onset clamps to 0). */
	getMeasureIndexAtMs(ms: number): number {
		const index = this.getStepIndexAtMs(ms);
		return index === null ? 0 : (this.steps[index]?.measureIndex ?? 0);
	}

	/* The document measure index playing at `beats` (before the first onset clamps to 0). */
	getMeasureIndexAtBeats(beats: number): number {
		const index = this.getStepIndexAtBeats(beats);
		return index === null ? 0 : (this.steps[index]?.measureIndex ?? 0);
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

	/* Notes to visually highlight at a step: its active set expanded across ties in both directions,
	 * so a whole tie chain lights together while any note in it is sounding (an origin stays lit while
	 * its continuation plays, and vice versa). Distinct from `active`/`classify`, which stay
	 * onset-based so audio doesn't re-attack a tied-over voice. The caller blanks this once playback
	 * is done. */
	getHighlighted(index: number): readonly Note[] {
		const active = this.steps[index]?.active;
		if (!active) {
			return [];
		}
		const lit = new Set<Note>(active);
		const queue = [...active];
		for (let note = queue.pop(); note; note = queue.pop()) {
			for (const neighbor of this.tieAdjacency.get(note) ?? []) {
				if (!lit.has(neighbor)) {
					lit.add(neighbor);
					queue.push(neighbor);
				}
			}
		}
		return [...lit];
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
