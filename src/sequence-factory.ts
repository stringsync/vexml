import type { Measure, Note as MNote, Part } from '@stringsync/mdom';
import { DEFAULT_TEMPO_BPM } from './constants';
import type { Gaps } from './gaps';
import { Rect } from './geometry';
import { MeasureSequenceIterator } from './measure-sequence-iterator';
import type { Note } from './note';
import type { RawGeometry } from './score-drawer';
import type { ScoreReader, Swing } from './score-reader';
import {
	type Jump,
	type MeasureInfo,
	Sequence,
	type SequenceInput,
	type SequenceNote,
	type Step,
} from './sequence';
import { SwingWarp } from './swing-warp';
import { TempoMap, type TempoSegment } from './tempo-map';

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
const BEAT_EPSILON = 1e-6;

/*
 * Builds the playback timeline: bridges the parsed document (onsets, meter, tempo, repeats, ties)
 * and the engraved geometry (note x, system boxes) into `SequenceInput`, then assembles the
 * `Sequence` from it — expanding repeats/voltas into playback order via MeasureSequenceIterator.
 * `createFromInput` is public so tests drive the assembly through the pure data seam.
 */
export class SequenceFactory {
	constructor(
		private readonly reader: ScoreReader,
		private readonly gaps: Gaps,
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

		// Every rate change is in by now, so the map is complete and can date the steps below.
		const tempo = new TempoMap(segments);
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
				startMs: tempo.msAt(startBeat),
				endMs: tempo.msAt(endBeat),
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
			tempo,
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

		const gaps = this.gaps.byMeasureIndex();
		const measureCount = parts[0]?.measures.length ?? 0;
		// Repeats and endings apply across the system, so they're read from the first part.
		const jumps = this.jumpsByMeasure(parts[0]?.measures ?? []);
		// Swing warps the beat axis per measure; identity everywhere no <sound><swing> is in force.
		const swings = this.swingWarps(parts);
		const swung = (index: number, beat: number): number =>
			swings[index]?.at(beat) ?? beat;
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
			const warp = note.isSwingExempt()
				? (beat: number) => beat
				: (beat: number) => swung(rn.measureIndex, beat);
			const onset = warp(measureBeat);
			notes.push({
				note,
				measureIndex: rn.measureIndex,
				measureBeat: onset,
				beats: warp(measureBeat + beats) - onset,
				x: rn.rect.x,
				tiedFrom: this.tiedFromOf(rn.mnote, notesByMnote, chordSiblings),
			});
		}

		return { measures, notes };
	}

	/* Per measure index, the beat-axis warp swing puts on that measure — identity where none is
	 * in force. A <sound><swing> carries forward from the measure that declares it until another
	 * one changes it, like tempo, and is read from the first part: swing is a performance
	 * instruction for the whole score, the same way repeats and endings are. */
	private swingWarps(parts: Part[]): SwingWarp[] {
		const measures = parts[0]?.measures ?? [];
		const warps: SwingWarp[] = [];
		let swing: Swing | null = null;
		for (const [index, measure] of measures.entries()) {
			swing = this.reader.swingOf(measure) ?? swing;
			warps.push(
				new SwingWarp(swing, {
					playedBeats: this.measureBeats(parts, index),
					meterBeats: this.reader.meterBeats(measure.getTime()),
				}),
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

	/* The repeat/volta jumps for every measure, mapped from the shared repeat structure
	 * (ScoreReader.measureRepeats, which the renderer reads too). An ending supersedes a co-located backward
	 * repeat — the iterator drives the back-jump off the ending instead. */
	private jumpsByMeasure(measures: readonly Measure[]): Jump[][] {
		const reader = this.reader;
		return reader
			.measureRepeats(measures)
			.map(({ repeatBegin, repeatEnd, repeatTimes, ending }) => {
				const jumps: Jump[] = [];
				if (repeatBegin) {
					jumps.push({ type: 'repeatstart' });
				}
				if (ending) {
					jumps.push({
						type: 'repeatending',
						times: reader.endingPasses(ending.number),
						last: ending.last,
						number: reader.endingFirstPass(ending.number),
					});
				} else if (repeatEnd) {
					jumps.push({
						type: 'repeatend',
						times: Math.max(0, (repeatTimes ?? 2) - 1),
					});
				}
				return jumps;
			});
	}

	/* Two notes at the same pitch (a tie's two ends always match). */
	private samePitch(a: MNote, b: MNote): boolean {
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
	 * but not necessarily the matching pitch; re-resolve to the same-pitch member (as the renderer
	 * does), so a tied chord links member-to-member instead of collapsing onto one note. */
	private tiedFromOf(
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
					this.samePitch(n, mnote),
				) ?? partner;
			const target = notesByMnote.get(member);
			if (target) {
				return target;
			}
		}
		return null;
	}
}
