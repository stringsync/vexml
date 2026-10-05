import type { Note as MNote, Part } from '@stringsync/mdom';
import { Rect } from 'webappwiz/geometry';
import { DEFAULT_TEMPO_BPM } from './constants';
import type { Gaps } from './gaps';
import { MeasureSequenceIterator } from './measure-sequence-iterator';
import type { Note } from './note';
import type { RawGeometry } from './score-drawer';
import type { ScoreReader, Swing } from './score-reader';
import {
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
// How long every grace note sounds: a fixed flick, whatever the tempo (MuseScore's acciaccatura).
const GRACE_MS = 65;

type Span = { onset: number; end: number };

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
		// `gap` marks a gap measure's synthesized step, which glides across its own box only.
		type Onset = {
			x: number | null;
			systemRect: Rect;
			measureIndex: number;
			gap?: boolean;
		};
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
			// the cursor glides across its box and everything sounding before it stops.
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
					gap: true,
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
			// edge. A gap glides across its own box only: the clef, signatures or barline between its
			// right edge and the next onset are crossed in a jump, as at a line break, so the cursor
			// spends the gap's whole time over the gap.
			const next = nextBeat === undefined ? undefined : onsets.get(nextBeat);
			// Every x is resolved by now (seeds were filled in above); the fallbacks only satisfy types.
			const x = onset.x ?? onset.systemRect.x;
			const sameSystem =
				next?.x != null &&
				next.systemRect.y === onset.systemRect.y &&
				next.x > x;
			const glideToX =
				!onset.gap && sameSystem && next?.x != null
					? next.x
					: onset.systemRect.right;
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
		const jumps = this.reader.measureJumps(parts[0]?.measures ?? []);
		// Swing warps the beat axis per measure; identity everywhere no <sound><swing> is in force.
		const swings = this.swingWarps(parts);
		const swung = (index: number, beat: number): number =>
			swings[index]?.at(beat) ?? beat;
		// The quarter BPM each measure's tempo mark sets (null carries the previous; a gap sets none),
		// and the BPM in effect there in document order, to turn a grace's fixed time into beats.
		const tempoBpms =
			parts[0]?.measures.map((m0, i) =>
				gaps.get(i) ? null : this.quarterBpm(m0),
			) ?? [];
		const bpms: number[] = [];
		for (const tempoBpm of tempoBpms) {
			bpms.push(tempoBpm ?? bpms.at(-1) ?? DEFAULT_TEMPO_BPM);
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

		// A note's played span within its measure, warped by swing. Warp onset and end through the
		// same function, then take the duration as the difference: a swung note's length falls out
		// of where its neighbors land, so it can never drift out of step with them or with the
		// measure's own length.
		const span = (mnote: MNote, measureIndex: number): Span | null => {
			const measureBeat = this.reader.measureBeatOf(mnote);
			const beats = this.reader.beatsOf(mnote);
			const note = notesByMnote.get(mnote);
			if (!note || measureBeat === null || beats === null) {
				return null;
			}
			const warp = note.isSwingExempt()
				? (beat: number) => beat
				: (beat: number) => swung(measureIndex, beat);
			return { onset: warp(measureBeat), end: warp(measureBeat + beats) };
		};

		// Graces take their time from a neighbor, so a chord can play shorter than written: `starts`
		// delays a chord past the graces before it, `ends` cuts a chord short ahead of graces that
		// play before the next beat or close it out as after-graces. Both are keyed by chord lead. A run that makes time instead
		// adds beats to its measure at its anchor's onset (`made`, per measure: onset -> beats,
		// the longest when parts make time at one onset), and is placed after the shift below.
		const graceSpans = new Map<MNote, Span>();
		const madeGraces = new Map<MNote, { at: number; offset: number }>();
		const starts = new Map<MNote, number>();
		const ends = new Map<MNote, number>();
		const made = new Map<number, Map<number, number>>();
		for (const part of parts) {
			for (const [measureIndex, measure] of part.measures.entries()) {
				const bpm = bpms[measureIndex] ?? DEFAULT_TEMPO_BPM;
				const previousByVoice = new Map<string, MNote>();
				// Graces not yet followed by a note in their voice; those left at the measure's end
				// are after-graces of the note before them.
				const pendingByVoice = new Map<string, MNote[]>();
				for (const n of measure.notes) {
					if (n.isGrace) {
						pendingByVoice.set(n.voice, [
							...(pendingByVoice.get(n.voice) ?? []),
							n,
						]);
						continue;
					}
					if (n.isChordMember) {
						continue;
					}
					const graces = pendingByVoice.get(n.voice) ?? [];
					pendingByVoice.delete(n.voice);
					const previous = previousByVoice.get(n.voice) ?? null;
					previousByVoice.set(n.voice, n);
					const anchorSpan = span(n, measureIndex);
					if (graces.length === 0 || !anchorSpan) {
						continue;
					}
					const previousSpan = previous ? span(previous, measureIndex) : null;
					const makeTime = graces[0]?.graceMakeTime != null;
					// Ahead of the beat, out of the previous note, only when asked and there is one.
					const ahead =
						!makeTime &&
						previousSpan !== null &&
						graces[0]?.graceStealTimePrevious != null;
					const victim = ahead && previousSpan ? previousSpan : anchorSpan;
					const run = this.placeGraces(
						graces,
						victim,
						ahead ? 'end' : 'start',
						bpm,
						makeTime,
					);
					for (const [grace, graceSpan] of run) {
						graceSpans.set(grace, graceSpan);
					}
					const runStart = run.get(graces[0] as MNote)?.onset ?? victim.onset;
					const runEnd = run.get(graces.at(-1) as MNote)?.end ?? victim.onset;
					if (makeTime) {
						const inMeasure =
							made.get(measureIndex) ?? new Map<number, number>();
						const at = anchorSpan.onset;
						inMeasure.set(at, Math.max(inMeasure.get(at) ?? 0, runEnd - at));
						made.set(measureIndex, inMeasure);
						for (const [grace, graceSpan] of run) {
							madeGraces.set(grace, { at, offset: graceSpan.onset - at });
						}
					} else if (ahead && previous) {
						ends.set(previous, runStart);
					} else {
						starts.set(n, runEnd);
					}
				}
				// After-graces close out the note they follow, stealing the end of its time.
				for (const [voice, graces] of pendingByVoice) {
					const host = previousByVoice.get(voice);
					const hostSpan = host ? span(host, measureIndex) : null;
					if (!host || !hostSpan) {
						continue;
					}
					const run = this.placeGraces(graces, hostSpan, 'end', bpm, false);
					for (const [grace, graceSpan] of run) {
						graceSpans.set(grace, graceSpan);
					}
					ends.set(host, run.get(graces[0] as MNote)?.onset ?? hostSpan.end);
				}
			}
		}

		// The beats made earlier in a measure than `beat`: strictly before it for an end (a note
		// ending where time is made is released, not held through it), and at it too for an onset (a
		// note starting there waits out the made time).
		const madeBefore = (
			measureIndex: number,
			beat: number,
			inclusive: boolean,
		) => {
			let beats = 0;
			for (const [at, extra] of made.get(measureIndex) ?? []) {
				if (
					at < beat - BEAT_EPSILON ||
					(inclusive && at <= beat + BEAT_EPSILON)
				) {
					beats += extra;
				}
			}
			return beats;
		};

		const measures: MeasureInfo[] = [];
		for (let i = 0; i < measureCount; i++) {
			const gap = gaps.get(i);
			// A gap's beats are nominal (1): createFromInput maps them to gapMs through the
			// gap's own tempo segment, so its musical length never depends on the meter the
			// empty measure inherits.
			measures.push({
				index: i,
				beats: gap
					? 1
					: swung(i, this.measureBeats(parts, i)) +
						madeBefore(i, Number.POSITIVE_INFINITY, false),
				tempoBpm: tempoBpms[i] ?? null,
				jumps: jumps[i] ?? [],
				systemRect: systemRectByIndex.get(i) ?? new Rect(0, 0, 0, 0),
				...(gap ? { gapMs: gap.durationMs } : {}),
			});
		}

		const notes: SequenceNote[] = [];
		for (const rn of geometry.notes) {
			const note = notesByMnote.get(rn.mnote);
			if (!note) {
				continue;
			}
			let played: Span | null;
			const madeGrace = madeGraces.get(rn.mnote);
			const graceSpan = graceSpans.get(rn.mnote);
			if (madeGrace && graceSpan) {
				const onset =
					madeGrace.at +
					madeBefore(rn.measureIndex, madeGrace.at, false) +
					madeGrace.offset;
				played = { onset, end: onset + graceSpan.end - graceSpan.onset };
			} else if (rn.mnote.isGrace) {
				played = graceSpan ?? null;
			} else {
				const written = span(rn.mnote, rn.measureIndex);
				const lead = chordSiblings.get(rn.mnote)?.[0] ?? rn.mnote;
				played = written && {
					onset: Math.max(written.onset, starts.get(lead) ?? written.onset),
					end: Math.min(written.end, ends.get(lead) ?? written.end),
				};
			}
			if (played && !madeGrace) {
				played = {
					onset: played.onset + madeBefore(rn.measureIndex, played.onset, true),
					end: played.end + madeBefore(rn.measureIndex, played.end, false),
				};
			}
			// Graces stealing from both ends of one note can leave it no time at all.
			if (!played || played.end <= played.onset) {
				continue;
			}
			notes.push({
				note,
				measureIndex: rn.measureIndex,
				measureBeat: played.onset,
				beats: played.end - played.onset,
				x: rn.rect.x,
				tiedFrom: this.tiedFromOf(rn.mnote, notesByMnote, chordSiblings),
			});
		}

		return { measures, notes };
	}

	/*
	 * Where a run of graces plays: every grace is a fast flick of GRACE_MS, whatever its written
	 * value or steal-time percent, so it reads as an ornament rather than a note. The run takes its
	 * time from `victim`: from its `start` (on the beat, the usual case), or from its `end` (ahead
	 * of the next beat: steal-time-previous, and after-graces closing out their note), squeezed to
	 * at most half of it so the victim still sounds. A make-time run steals nothing: it starts at
	 * the victim's start and the caller inserts its time for every part.
	 */
	private placeGraces(
		graces: readonly MNote[],
		victim: Span,
		from: 'start' | 'end',
		bpm: number,
		makeTime: boolean,
	): Map<MNote, Span> {
		const flick = (GRACE_MS * bpm) / 60000;
		const room = (victim.end - victim.onset) / 2;
		const beats = makeTime
			? flick
			: Math.min(flick, room / Math.max(1, graces.length));
		let at =
			from === 'start' ? victim.onset : victim.end - beats * graces.length;
		const placed = new Map<MNote, Span>();
		for (const grace of graces) {
			placed.set(grace, { onset: at, end: at + beats });
			at += beats;
		}
		return placed;
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
				const onset = this.reader.measureBeatOf(note);
				const beats = this.reader.beatsOf(note);
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
