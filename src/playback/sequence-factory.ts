import type { Note as MNote, Part } from '@stringsync/mdom';
import { DEFAULT_TEMPO_BPM } from '../constants';
import type { Note } from '../elements/note';
import type { RawGeometry } from '../engraving/score-drawer';
import type { ScoreReader } from '../engraving/score-reader';
import { Rect } from '../geometry';
import {
	beatsToMs,
	type Jump,
	type MeasureInfo,
	Sequence,
	type SequenceInput,
	type SequenceNote,
	type Step,
	type TempoSegment,
} from './sequence';

/*
 * Builds the playback timeline: bridges the parsed document (onsets, meter, tempo, repeats, ties)
 * and the engraved geometry (note x, system boxes) into `SequenceInput`, then assembles the
 * `Sequence` from it — expanding repeats/voltas into playback order via MeasureSequenceIterator.
 * `createFromInput` is public so tests drive the assembly through the pure data seam.
 */

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

// MusicXML <beat-unit> (a note type) -> quarter notes, so a metronome mark normalizes to quarter BPM.
const QUARTERS_PER_UNIT: Record<string, number> = {
	whole: 4,
	half: 2,
	quarter: 1,
	eighth: 0.5,
	'16th': 0.25,
	'32nd': 0.125,
	'64th': 0.0625,
	'128th': 0.03125,
};

/* How many passes a volta ending covers, from its `<ending number>` ("1", "1,2", "1-3"). */
function endingPasses(numberAttr: string | null): number {
	if (!numberAttr) {
		return 1;
	}
	let total = 0;
	for (const part of numberAttr.split(',')) {
		const range = part.trim().match(/^(\d+)\s*-\s*(\d+)$/);
		if (range) {
			total += Math.max(1, Number(range[2]) - Number(range[1]) + 1);
		} else if (part.trim()) {
			total += 1;
		}
	}
	return Math.max(1, total);
}

/* The repeat/volta jumps on a measure, read from its barlines. A volta start (`<ending type=start>`)
 * supersedes a co-located backward repeat (the iterator handles the back-jump). */
function jumpsOf(measure: Part['measures'][number]): Jump[] {
	let start = false;
	let endingPassCount = 0;
	let endTimes = -1;
	for (const barline of measure.barlines) {
		const ending = barline.child('ending');
		if (ending && ending.getAttribute('type') === 'start') {
			endingPassCount = endingPasses(ending.getAttribute('number'));
		}
		if (barline.repeat === 'forward') {
			start = true;
		} else if (barline.repeat === 'backward') {
			const times = Number(barline.child('repeat')?.getAttribute('times') ?? 2);
			endTimes = Math.max(0, times - 1);
		}
	}
	const jumps: Jump[] = [];
	if (start) {
		jumps.push({ type: 'repeatstart' });
	}
	if (endingPassCount > 0) {
		jumps.push({ type: 'repeatending', times: endingPassCount });
	} else if (endTimes >= 0) {
		jumps.push({ type: 'repeatend', times: endTimes });
	}
	return jumps;
}

/* The note a tied note continues from (the start side of a tie ending here), or null. */
function tiedFromOf(
	mnote: MNote,
	notesByMnote: ReadonlyMap<MNote, Note>,
): Note | null {
	for (const tie of mnote.ties) {
		if (tie.tieType === 'stop') {
			const from = tie.partner?.note;
			const target = from ? notesByMnote.get(from) : undefined;
			if (target) {
				return target;
			}
		}
	}
	return null;
}

export class SequenceFactory {
	constructor(private readonly reader: ScoreReader) {}

	/* Build the timeline for a rendered score: the parsed parts give onsets/meter/tempo/repeats/
	 * ties, the geometry gives note x and system boxes, and `notesByMnote` ties active notes to the
	 * same identities hit-testing returns (ElementIndex.noteLookup). */
	create(
		parts: Part[],
		geometry: RawGeometry,
		notesByMnote: ReadonlyMap<MNote, Note>,
	): Sequence {
		return this.createFromInput(this.buildInput(parts, geometry, notesByMnote));
	}

	/* Assemble a Sequence from the pure data seam (what unit tests drive). */
	createFromInput(input: SequenceInput): Sequence {
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

		// Walk playback order: accumulate the measure start beat, build tempo segments, and collect
		// each note occurrence's absolute [startBeat, endBeat) interval plus the onsets that seed steps.
		type Interval = { note: Note; startBeat: number; endBeat: number };
		type Onset = { x: number; systemRect: Rect; measureIndex: number };
		const intervals: Interval[] = [];
		const onsets = new Map<number, Onset>();
		const segments: TempoSegment[] = [];
		let totalBeats = 0;
		// Start at 120; a measure's mark sets the rate from there on, null carries the previous.
		// Measures before the first mark stay at the default, and a back-jump re-applies marks as
		// written.
		let bpm = DEFAULT_TEMPO_BPM;
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
			// Glide toward the next onset on the same system; at a line break, to the system's right
			// edge.
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
			input.measures.length,
			tiedFrom,
			firstStepOfNote,
			firstStepOfMeasure,
		);
	}

	private buildInput(
		parts: Part[],
		geometry: RawGeometry,
		notesByMnote: ReadonlyMap<MNote, Note>,
	): SequenceInput {
		const systemRectByIndex = new Map<number, Rect>();
		for (const measure of geometry.measures) {
			systemRectByIndex.set(measure.index, measure.rect);
		}

		const measureCount = parts[0]?.measures.length ?? 0;
		const measures: MeasureInfo[] = [];
		for (let i = 0; i < measureCount; i++) {
			const m0 = parts[0]?.measures[i];
			measures.push({
				index: i,
				beats: this.measureBeats(parts, i),
				tempoBpm: m0 ? this.quarterBpm(m0) : null,
				jumps: m0 ? jumpsOf(m0) : [],
				systemRect: systemRectByIndex.get(i) ?? new Rect(0, 0, 0, 0),
			});
		}

		const notes: SequenceNote[] = [];
		for (const rn of geometry.notes) {
			const note = notesByMnote.get(rn.mnote);
			const measureBeat = rn.mnote.measureBeat;
			const beats = rn.mnote.beats;
			if (!note || measureBeat === null || beats === null) {
				continue;
			}
			notes.push({
				note,
				measureIndex: rn.measureIndex,
				measureBeat,
				beats,
				x: rn.rect.x,
				tiedFrom: tiedFromOf(rn.mnote, notesByMnote),
			});
		}

		return { measures, notes };
	}

	private quarterBpm(measure: Part['measures'][number]): number | null {
		const tempo = this.reader.tempoOf(measure);
		if (!tempo) {
			return null;
		}
		return tempo.bpm * (QUARTERS_PER_UNIT[tempo.duration] ?? 1);
	}

	/* A measure's played length in quarter-note beats: the latest note end across all parts (so
	 * pickups and ragged voices are honored), falling back to the meter. */
	private measureBeats(parts: Part[], index: number): number {
		let maxEnd = 0;
		for (const part of parts) {
			const measure = part.measures[index];
			if (!measure) {
				continue;
			}
			for (const note of measure.notes) {
				const onset = note.measureBeat;
				const beats = note.beats;
				if (onset !== null && beats !== null) {
					maxEnd = Math.max(maxEnd, onset + beats);
				}
			}
		}
		if (maxEnd > 0) {
			return maxEnd;
		}
		return this.reader.meterBeats(parts[0]?.measures[index]?.getTime() ?? null);
	}
}
