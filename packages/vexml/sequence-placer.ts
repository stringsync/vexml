import { Rect } from 'webappwiz/geometry';
import type { Note, NoteKey } from './note';
import type { RawGeometry } from './score-drawer';
import {
	type MeasureInfo,
	Sequence,
	type SequenceInput,
	type Step,
} from './sequence';
import type { TempoMap } from './tempo-map';

/* Where the engraving put what a step stands on: a measure's box and a note's x. */
export interface StepGeometry {
	systemRectOf(measureIndex: number): Rect;
	/* The leftmost x a note was drawn at, or null for a note the geometry lacks. */
	xOf(note: Note): number | null;
}

/* A step before it is placed: where the bar stands comes from its notes (`notes`), the left
 * edge of its measure (`left`, the measure after a gap), the gap's own box (`gap`, glided across
 * alone), or a note end with no onset of its own (`seed`, placed along the glide between its
 * neighbours). */
export interface StepSkeleton {
	startBeat: number;
	endBeat: number;
	measureIndex: number;
	kind: 'notes' | 'left' | 'gap' | 'seed';
	notes: readonly Note[];
	active: readonly Note[];
}

/* A timeline built but for its geometry: every step's beats, times and notes, in order. */
export interface SequenceSkeleton {
	steps: readonly StepSkeleton[];
	tempo: TempoMap;
	totalBeats: number;
	measures: readonly MeasureInfo[];
	tiedFrom: ReadonlyMap<Note, Note>;
}

/*
 * Places a timeline's steps on the engraving: each step's x, where its bar glides to, and its
 * measure's box, from a skeleton SequenceFactory builds once from the document. The same
 * skeleton places again over newer geometry, which is how a progressive render keeps its
 * timeline exact as systems are drawn (see ProgressiveEngraving) without reading the document
 * again.
 */
export class SequencePlacer {
	constructor(
		private readonly skeleton: SequenceSkeleton,
		// The score's notes by their mdom note, to read a RawGeometry's x per note.
		private readonly notesByMnote: ReadonlyMap<NoteKey, Note>,
	) {}

	/* The timeline placed on `geometry`, the engraving's raw geometry. */
	place(geometry: RawGeometry): Sequence {
		const rects = new Map<number, Rect>();
		for (const m of geometry.measures) {
			rects.set(m.index, m.rect);
		}
		const xs = new Map<Note, number>();
		for (const rn of geometry.notes) {
			const note = this.notesByMnote.get(rn.mnote);
			if (note) {
				xs.set(note, Math.min(xs.get(note) ?? Infinity, rn.rect.x));
			}
		}
		return this.placeOn({
			systemRectOf: (m) => rects.get(m) ?? EMPTY,
			xOf: (note) => xs.get(note) ?? null,
		});
	}

	/* The timeline placed on the x and boxes a SequenceInput carries. */
	placeInput(input: SequenceInput): Sequence {
		const xs = new Map<Note, number>();
		for (const sn of input.notes) {
			xs.set(sn.note, Math.min(xs.get(sn.note) ?? Infinity, sn.x));
		}
		return this.placeOn({
			systemRectOf: (m) => input.measures[m]?.systemRect ?? EMPTY,
			xOf: (note) => xs.get(note) ?? null,
		});
	}

	private placeOn(geometry: StepGeometry): Sequence {
		const {
			steps: skeletons,
			tempo,
			totalBeats,
			measures,
			tiedFrom,
		} = this.skeleton;
		const rect = (s: StepSkeleton) => geometry.systemRectOf(s.measureIndex);
		// Each step's x: a seed's is null until it is placed between its neighbours below.
		const xs: Array<number | null> = skeletons.map((s) => {
			if (s.kind === 'seed') {
				return null;
			}
			const box = rect(s);
			let x: number | null = null;
			for (const note of s.notes) {
				const noteX = geometry.xOf(note);
				if (noteX !== null) {
					x = x === null ? noteX : Math.min(x, noteX);
				}
			}
			return x ?? box.x;
		});
		// Place each seeded end along the glide the cursor was already making between the
		// surrounding noteheads, so splitting a step leaves the cursor's path unchanged; only the
		// active set differs. Ascending order means the previous step is always placed already;
		// the next one may be another seed, so scan forward to the next placed one.
		for (const [i, s] of skeletons.entries()) {
			if (xs[i] !== null) {
				continue;
			}
			const box = rect(s);
			const prev = skeletons[i - 1];
			const prevBeat = prev?.startBeat ?? s.startBeat;
			const prevX = xs[i - 1] ?? null;
			let j = i + 1;
			while (j < skeletons.length && xs[j] === null) {
				j++;
			}
			const next = skeletons[j];
			const nextX = xs[j] ?? null;
			const fromX =
				prev && prevX !== null && rect(prev).y === box.y ? prevX : box.x;
			const toX =
				next && nextX !== null && rect(next).y === box.y && nextX > fromX
					? nextX
					: box.right;
			const span = (next?.startBeat ?? totalBeats) - prevBeat;
			xs[i] =
				span > 0
					? fromX + ((toX - fromX) * (s.startBeat - prevBeat)) / span
					: fromX;
		}

		const steps: Step[] = [];
		const firstStepOfNote = new Map<Note, number>();
		const firstStepOfMeasure = new Map<number, number>();
		for (const [i, s] of skeletons.entries()) {
			const box = rect(s);
			// Every x is placed by now; the fallback only satisfies types.
			const x = xs[i] ?? box.x;
			// Glide toward the next step on the same system; at a line break, to the system's
			// right edge. A gap glides across its own box only: the clef, signatures or barline
			// between its right edge and the next onset are crossed in a jump, as at a line break,
			// so the cursor spends the gap's whole time over the gap.
			const next = skeletons[i + 1];
			const nextX = xs[i + 1] ?? null;
			const sameSystem =
				next !== undefined &&
				nextX !== null &&
				rect(next).y === box.y &&
				nextX > x;
			const glideToX =
				s.kind !== 'gap' && sameSystem && nextX !== null ? nextX : box.right;
			steps.push({
				index: i,
				measureIndex: s.measureIndex,
				startBeat: s.startBeat,
				endBeat: s.endBeat,
				startMs: tempo.msAt(s.startBeat),
				endMs: tempo.msAt(s.endBeat),
				x,
				glideToX,
				systemRect: box,
				active: [...s.active],
			});
			for (const note of s.active) {
				if (!firstStepOfNote.has(note)) {
					firstStepOfNote.set(note, i);
				}
			}
			if (!firstStepOfMeasure.has(s.measureIndex)) {
				firstStepOfMeasure.set(s.measureIndex, i);
			}
		}
		return new Sequence(
			steps,
			tempo,
			totalBeats,
			measures.length,
			tiedFrom,
			firstStepOfNote,
			firstStepOfMeasure,
		);
	}
}

const EMPTY = new Rect(0, 0, 0, 0);
