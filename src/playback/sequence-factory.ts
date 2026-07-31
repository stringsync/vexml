import type { Measure, Note as MNote, Part } from '@stringsync/mdom';
import type { Gap } from '../config';
import { DEFAULT_TEMPO_BPM } from '../constants';
import type { Note } from '../elements/note';
import type { RawGeometry } from '../engraving/score-drawer';
import type { ScoreReader, Swing } from '../engraving/score-reader';
import { gapsByMeasureIndex } from '../gaps';
import { Rect } from '../geometry';
import { endingFirstPass, endingPasses, measureRepeats } from '../repeats';
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
	/* The measure range the ending covers; playback jumps from `endIndex`, not from every one. */
	startIndex: number;
	endIndex: number;
	times: number;
	/* The ending's own `<ending number>`, as its first pass — see Jump. Only used to spot the
	 * restart that separates one volta group from the next. */
	number: number;
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
	// The ending still being extended, i.e. one whose `last` measure hasn't been reached.
	let currentEnding: VoltaEnding | null = null;

	/* Finish the open volta group: its repeat block is done, so drop the block's start off the
	 * stack and leave the enclosing one (if any) exposed for the next group. */
	const closeVolta = (): void => {
		currentEnding = null;
		if (
			currentVolta !== null &&
			startStack.at(-1) === currentVolta.startIndex
		) {
			startStack.pop();
		}
		currentVolta = null;
	};

	for (const [i, measure] of measures.entries()) {
		for (const jump of measure.jumps) {
			if (jump.type === 'repeatstart') {
				startStack.push(i);
			}
		}

		const endingJump = findJump(measure.jumps, 'repeatending');
		if (endingJump) {
			// Nested blocks put two volta groups back to back with no plain measure between them,
			// so "the group ends at the first measure carrying no ending" can't see the seam. The
			// numbering does: endings within one group climb (1., 2., 3.), so a run whose number
			// doesn't is the enclosing block's first ending, not another of this block's.
			const previous = currentVolta?.endings.at(-1);
			if (
				currentEnding === null &&
				previous !== undefined &&
				endingJump.number <= previous.number
			) {
				closeVolta();
			}
			if (currentVolta === null) {
				currentVolta = {
					startIndex: startStack.at(-1) ?? 0,
					endings: [],
					totalPasses: 0,
				};
				voltas.push(currentVolta);
			}
			let ending: VoltaEnding | null = currentEnding;
			if (ending === null) {
				ending = {
					startIndex: i,
					endIndex: i,
					times: endingJump.times,
					number: endingJump.number,
					startPass: 0,
					endPass: 0,
				};
				currentVolta.endings.push(ending);
			} else {
				ending.endIndex = i;
			}
			currentEnding = endingJump.last ? null : ending;
			endingByMeasure.set(i, { volta: currentVolta, ending });
			// A `repeatend` co-located with a `repeatending` is intentionally dropped.
			continue;
		}

		if (currentVolta !== null) {
			closeVolta();
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
			const { volta, ending } = endingHit;
			// Mid-run: the ending spans more measures, so keep playing before deciding.
			if (i < ending.endIndex) {
				i++;
				continue;
			}
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
 * One measure's swing as a warp of its beat axis, given the swing in force, the measure's played
 * length and its meter. Identity when nothing is swinging.
 *
 * Each pair of swung notes spans `2 * unit` beats; the warp stretches the on-beat half to
 * `first / (first + second)` of that span and squeezes the off-beat half into what's left. The
 * pair boundaries are fixed points, so a measure keeps its length and only the off-beats move —
 * which means the same function warps a note's onset, its end, and the measure's own length
 * without any of them drifting apart.
 *
 * The grid is phased off the notated downbeat rather than off the measure's first beat. A full
 * measure starts on a boundary, but a pickup starts part-way through a pair, and without the
 * shift its off-beat eighth would be read as an on-beat and played LONG instead of short —
 * backwards, and audible on the very first note of any swung tune with an anacrusis.
 *
 * Exempt notes (see {@link isSwingExempt}) skip the warp entirely and keep their written beats.
 * That stays consistent with their swung neighbors because the pair boundaries are fixed points:
 * a triplet filling a beat still starts and ends where the warp leaves that beat, and only its
 * interior stays even.
 */
/**
 * Whether swing leaves this note alone. MusicXML exempts notes with no `<type>`, grace notes,
 * and — the one that matters in practice — notes whose sounding duration isn't the nominal one
 * for their type, i.e. anything carrying a `<time-modification>`.
 *
 * This is not a nicety. Arrangers of swung music routinely write the guitar or piano part as
 * explicit triplets rather than leaning on the swing marking, so a score can hold both notations
 * at once: plain eighths in the vocal line that must swing, and written-out triplets underneath
 * that must not be swung a SECOND time. Without this, those triplets come out as neither an even
 * triplet nor a swung pair.
 */
export function isSwingExempt(note: MNote): boolean {
	return note.isGrace || note.type === null || note.timeModification !== null;
}

export function swingWarp(
	swing: Swing | null,
	playedBeats: number,
	meterBeats: number,
): (beat: number) => number {
	if (!swing || swing.first === swing.second) {
		return (beat) => beat;
	}
	const span = 2 * swing.unit;
	const onBeatSpan = (swing.first / (swing.first + swing.second)) * span;
	// How far into a swung pair this measure's first beat sits. A full measure starts on a pair
	// boundary; a pickup is short by exactly the beats the meter says are missing.
	const phase =
		meterBeats > playedBeats ? (meterBeats - playedBeats) % span : 0;
	const at = (beat: number): number => {
		const pair = Math.floor(beat / span);
		const into = beat - pair * span;
		const warped =
			into <= swing.unit
				? (into / swing.unit) * onBeatSpan
				: onBeatSpan + ((into - swing.unit) / swing.unit) * (span - onBeatSpan);
		return pair * span + warped;
	};
	const origin = at(phase);
	return (beat) => at(beat + phase) - origin;
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

/* The repeat/volta jumps for every measure, mapped from the shared repeat structure
 * (src/repeats.ts, which the renderer reads too). An ending supersedes a co-located backward
 * repeat — the iterator drives the back-jump off the ending instead. */
function jumpsByMeasure(measures: readonly Measure[]): Jump[][] {
	return measureRepeats(measures).map(
		({ repeatBegin, repeatEnd, repeatTimes, ending }) => {
			const jumps: Jump[] = [];
			if (repeatBegin) {
				jumps.push({ type: 'repeatstart' });
			}
			if (ending) {
				jumps.push({
					type: 'repeatending',
					times: endingPasses(ending.number),
					last: ending.last,
					number: endingFirstPass(ending.number),
				});
			} else if (repeatEnd) {
				jumps.push({
					type: 'repeatend',
					times: Math.max(0, (repeatTimes ?? 2) - 1),
				});
			}
			return jumps;
		},
	);
}

/* Two notes at the same pitch (a tie's two ends always match). */
function samePitch(a: MNote, b: MNote): boolean {
	return (
		!!a.pitch &&
		!!b.pitch &&
		a.pitch.step === b.pitch.step &&
		a.pitch.octave === b.pitch.octave &&
		a.pitch.alter === b.pitch.alter
	);
}

/* The note a tied note continues from (the start side of a tie ending here), or null. mdom pairs a
 * chord's ties by their shared <tied> number, so tie.partner lands on some member of the right chord
 * but not necessarily the matching pitch; re-resolve to the same-pitch member (as the renderer does),
 * so a tied chord links member-to-member instead of collapsing onto one note. */
function tiedFromOf(
	mnote: MNote,
	notesByMnote: ReadonlyMap<MNote, Note>,
	chordSiblings: ReadonlyMap<MNote, readonly MNote[]>,
): Note | null {
	for (const tie of mnote.ties) {
		if (tie.tieType !== 'stop') {
			continue;
		}
		const partner = tie.partner?.note;
		if (!partner) {
			continue;
		}
		const member =
			(chordSiblings.get(partner) ?? [partner]).find((n) =>
				samePitch(n, mnote),
			) ?? partner;
		const target = notesByMnote.get(member);
		if (target) {
			return target;
		}
	}
	return null;
}

/* A note's endBeat (measure start + onset + duration) and the next onset's startBeat (measure start
 * + onset) are two float paths to the same instant, and they disagree by ~1 ULP for non-dyadic
 * durations like triplets — enough to keep a note active one step too long. 1e-6 beats is ~1µs at
 * ♩=60, far below any real duration. */
const BEAT_EPSILON = 1e-6;

export class SequenceFactory {
	constructor(
		private readonly reader: ScoreReader,
		private readonly gaps: readonly Gap[],
	) {}

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
		// `x: null` marks an onset seeded by a note *end* rather than a notehead; it's filled in below.
		type Onset = { x: number | null; systemRect: Rect; measureIndex: number };
		const intervals: Interval[] = [];
		const onsets = new Map<number, Onset>();
		const ends: Array<{
			beat: number;
			systemRect: Rect;
			measureIndex: number;
		}> = [];
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
			// A gap plays for exactly gapMs: its segment gets the bpm that maps its nominal
			// beats to that time, without touching the carried tempo (the next measure
			// resumes at the rate in effect before the gap). Its step is synthesized here —
			// a gap has no notes to seed one — spanning the measure with nothing active, so
			// the cursor glides across it and everything sounding before it stops.
			if (measure.gapMs !== undefined) {
				segments.push({
					startBeat: totalBeats,
					endBeat: totalBeats + measure.beats,
					bpm: (measure.beats * 60000) / measure.gapMs,
				});
				onsets.set(totalBeats, {
					x: measure.systemRect.x,
					systemRect: measure.systemRect,
					measureIndex: measure.index,
				});
				totalBeats += measure.beats;
				continue;
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
				ends.push({
					beat: startBeat + sn.beats,
					systemRect: measure.systemRect,
					measureIndex: measure.index,
				});
				const existing = onsets.get(startBeat);
				if (existing) {
					// the onset's leftmost notehead anchors the bar
					existing.x = Math.min(existing.x ?? sn.x, sn.x);
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

		// A voice can end before its measure does (no trailing rest — legal, and common in real
		// exports), leaving no onset at the note's end: without a step boundary there the note keeps
		// sounding until the next onset anywhere in the score. Seed a step at every note end that isn't
		// already an onset. Matching is epsilon-tolerant (see BEAT_EPSILON) via a quantized key —
		// an exact-equality test would seed a duplicate micro-step one ULP off a real onset.
		const quantize = (beat: number) => Math.round(beat / BEAT_EPSILON);
		const onsetKeys = new Set([...onsets.keys()].map(quantize));
		for (const end of ends) {
			const key = quantize(end.beat);
			if (
				end.beat >= totalBeats - BEAT_EPSILON ||
				onsetKeys.has(key - 1) ||
				onsetKeys.has(key) ||
				onsetKeys.has(key + 1)
			) {
				continue;
			}
			onsetKeys.add(key);
			onsets.set(end.beat, {
				x: null,
				systemRect: end.systemRect,
				measureIndex: end.measureIndex,
			});
		}

		const startBeats = [...onsets.keys()].sort((a, b) => a - b);
		// Place each seeded end along the glide the cursor was already making between the surrounding
		// noteheads, so splitting a step leaves the cursor's path unchanged — only the active set
		// differs. Ascending order means the previous onset is always resolved already; the next one
		// may be another seed, so scan forward to the next real notehead.
		for (const [i, startBeat] of startBeats.entries()) {
			const onset = onsets.get(startBeat);
			if (!onset || onset.x !== null) {
				continue;
			}
			const prevBeat = startBeats[i - 1] ?? startBeat;
			const prev = onsets.get(prevBeat);
			let j = i + 1;
			while (onsets.get(startBeats[j] ?? -1)?.x === null) {
				j++;
			}
			const nextBeat = startBeats[j];
			const next = nextBeat === undefined ? undefined : onsets.get(nextBeat);
			const fromX =
				prev?.x != null && prev.systemRect.y === onset.systemRect.y
					? prev.x
					: onset.systemRect.x;
			const toX =
				next?.x != null &&
				next.systemRect.y === onset.systemRect.y &&
				next.x > fromX
					? next.x
					: onset.systemRect.right;
			const span = (nextBeat ?? totalBeats) - prevBeat;
			onset.x =
				span > 0
					? fromX + ((toX - fromX) * (startBeat - prevBeat)) / span
					: fromX;
		}

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
				.filter(
					(iv) =>
						iv.startBeat <= startBeat && startBeat < iv.endBeat - BEAT_EPSILON,
				)
				.map((iv) => iv.note);
			// Glide toward the next onset on the same system; at a line break, to the system's right
			// edge.
			const next = nextBeat === undefined ? undefined : onsets.get(nextBeat);
			// Every x is resolved by now (seeds were filled in above); the fallbacks only satisfy types.
			const x = onset.x ?? onset.systemRect.x;
			const sameSystem =
				next?.x != null &&
				next.systemRect.y === onset.systemRect.y &&
				next.x > x;
			const glideToX =
				sameSystem && next?.x != null ? next.x : onset.systemRect.right;
			steps.push({
				index: i,
				measureIndex: onset.measureIndex,
				startBeat,
				endBeat,
				startMs: beatsToMs(startBeat, segments),
				endMs: beatsToMs(endBeat, segments),
				x,
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

		const gaps = gapsByMeasureIndex(this.gaps);
		const measureCount = parts[0]?.measures.length ?? 0;
		// Repeats and endings apply across the system, so they're read from the first part.
		const jumps = jumpsByMeasure(parts[0]?.measures ?? []);
		// Swing warps the beat axis per measure; identity everywhere no <sound><swing> is in force.
		const swings = this.swingWarps(parts);
		const swung = (index: number, beat: number): number =>
			swings[index]?.(beat) ?? beat;
		const measures: MeasureInfo[] = [];
		for (let i = 0; i < measureCount; i++) {
			const m0 = parts[0]?.measures[i];
			const gap = gaps.get(i);
			// A gap's beats are nominal (1): createFromInput maps them to gapMs through the
			// gap's own tempo segment, so its musical length never depends on the meter the
			// empty measure inherits.
			measures.push({
				index: i,
				beats: gap ? 1 : swung(i, this.measureBeats(parts, i)),
				tempoBpm: gap || !m0 ? null : this.quarterBpm(m0),
				jumps: jumps[i] ?? [],
				systemRect: systemRectByIndex.get(i) ?? new Rect(0, 0, 0, 0),
				...(gap ? { gapMs: gap.durationMs } : {}),
			});
		}

		// Each note -> its chord's members, so a chord tie can re-resolve to the matching pitch. A
		// non-<chord/> note starts a group; each following <chord/> member joins it (the array grows
		// in place, so every member ends up referencing the whole chord).
		const chordSiblings = new Map<MNote, readonly MNote[]>();
		for (const part of parts) {
			for (const measure of part.measures) {
				let chord: MNote[] = [];
				for (const n of measure.notes) {
					if (n.isChordMember && chord.length > 0) {
						chord.push(n);
					} else {
						chord = [n];
					}
					chordSiblings.set(n, chord);
				}
			}
		}

		const notes: SequenceNote[] = [];
		for (const rn of geometry.notes) {
			const note = notesByMnote.get(rn.mnote);
			const measureBeat = rn.mnote.measureBeat;
			const beats = rn.mnote.beats;
			if (!note || measureBeat === null || beats === null) {
				continue;
			}
			// Warp onset and end through the same function, then take the duration as the
			// difference — a swung note's length falls out of where its neighbors land, so it
			// can never drift out of step with them or with the measure's own length.
			const warp = isSwingExempt(rn.mnote)
				? (beat: number) => beat
				: (beat: number) => swung(rn.measureIndex, beat);
			const onset = warp(measureBeat);
			notes.push({
				note,
				measureIndex: rn.measureIndex,
				measureBeat: onset,
				beats: warp(measureBeat + beats) - onset,
				x: rn.rect.x,
				tiedFrom: tiedFromOf(rn.mnote, notesByMnote, chordSiblings),
			});
		}

		return { measures, notes };
	}

	/* Per measure index, the beat-axis warp swing puts on that measure — identity where none is
	 * in force. A <sound><swing> carries forward from the measure that declares it until another
	 * one changes it, like tempo, and is read from the first part: swing is a performance
	 * instruction for the whole score, the same way repeats and endings are. */
	private swingWarps(parts: Part[]): Array<(beat: number) => number> {
		const measures = parts[0]?.measures ?? [];
		const warps: Array<(beat: number) => number> = [];
		let swing: Swing | null = null;
		for (const [index, measure] of measures.entries()) {
			swing = this.reader.swingOf(measure) ?? swing;
			warps.push(
				swingWarp(
					swing,
					this.measureBeats(parts, index),
					this.reader.meterBeats(measure.getTime()),
				),
			);
		}
		return warps;
	}

	private quarterBpm(measure: Part['measures'][number]): number | null {
		const tempo = this.reader.playbackTempoOf(measure);
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
