// vet-ignore-file compact-files: came in at this size from the upstream repository; splitting it is a refactor of its own
import type { Note as MNote, Part } from '@stringsync/mdom';
import { Rect } from 'core/geometry';
import { DEFAULT_TEMPO_BPM } from './constants';
import { isCueNote } from './cue-note';
import type { Gaps } from './gaps';
import { MeasureSequenceIterator } from './measure-sequence-iterator';
import { MNoteFacts } from './mnote-facts';
import type { Note, NoteKey } from './note';
import type { RawGeometry } from './score-drawer';
import type { ScoreReader, Swing } from './score-reader';
import {
	type MeasureInfo,
	Sequence,
	type SequenceInput,
	type SequenceModel,
	type SequenceNote,
	type Step,
} from './sequence';
import {
	SequencePlacer,
	type SequenceSkeleton,
	type StepSkeleton,
} from './sequence-placer';
import { SwingWarp } from './swing-warp';
import { TempoMap, type TempoSegment } from './tempo-map';
import { Timeline } from './timeline';

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

// What buildInput asks of every note, read off the document once.
type NoteRead = { grace: boolean; chordMember: boolean; voice: string };

const EMPTY_GEOMETRY: RawGeometry = {
	bounds: new Rect(0, 0, 0, 0),
	notes: [],
	measures: [],
	chordDiagrams: [],
};

/*
 * Builds the playback timeline: bridges the parsed document (onsets, meter, tempo, repeats, ties)
 * and the engraved geometry (note x, system boxes) into `SequenceInput`, then assembles the
 * `Sequence` from it, expanding repeats/voltas into playback order via MeasureSequenceIterator.
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
		notesByMnote: ReadonlyMap<NoteKey, Note>,
	): Sequence {
		return this.createFromInput(
			this.buildInput(
				parts,
				geometry,
				notesByMnote,
				(mnote) => notesByMnote.get(mnote)?.isSwingExempt() ?? null,
			),
		);
	}

	/* Rebuild a timeline from its model (Sequence.model), its note indexes resolved against
	 * `notes`, the score's notes in index order. */
	restore(model: SequenceModel, notes: readonly Note[]): Sequence {
		const tempo = new TempoMap(model.segments);
		const steps: Step[] = [];
		const firstStepOfNote = new Map<Note, number>();
		const firstStepOfMeasure = new Map<number, number>();
		for (const [i, step] of model.steps.entries()) {
			const active = step.active.flatMap((n) => notes[n] ?? []);
			steps.push({
				index: i,
				measureIndex: step.measureIndex,
				startBeat: step.startBeat,
				endBeat: step.endBeat,
				startMs: tempo.msAt(step.startBeat),
				endMs: tempo.msAt(step.endBeat),
				x: step.x,
				glideToX: step.glideToX,
				systemRect: step.systemRect,
				active,
			});
			for (const note of active) {
				if (!firstStepOfNote.has(note)) {
					firstStepOfNote.set(note, i);
				}
			}
			if (!firstStepOfMeasure.has(step.measureIndex)) {
				firstStepOfMeasure.set(step.measureIndex, i);
			}
		}
		const tiedFrom = new Map<Note, Note>();
		for (const [n, from] of model.ties) {
			const note = notes[n];
			const prior = notes[from];
			if (note && prior) {
				tiedFrom.set(note, prior);
			}
		}
		return new Sequence(
			steps,
			tempo,
			model.durationBeats,
			model.measureCount,
			tiedFrom,
			firstStepOfNote,
			firstStepOfMeasure,
		);
	}

	/* Assemble a Sequence from the pure data seam (what unit tests drive). */
	createFromInput(input: SequenceInput): Sequence {
		return new SequencePlacer(this.skeletonOf(input), new Map()).placeInput(
			input,
		);
	}

	/* Begin the timeline of a score drawn a system at a time: the placer places it on the
	 * geometry at hand now, and again on each system's drawn geometry later. `geometry` names
	 * every note that sounds (the layout's plan has them all, see ProvisionalGeometry). */
	begin(
		parts: Part[],
		geometry: RawGeometry,
		notesByMnote: ReadonlyMap<NoteKey, Note>,
	): SequencePlacer {
		const input = this.buildInput(
			parts,
			geometry,
			notesByMnote,
			(mnote) => notesByMnote.get(mnote)?.isSwingExempt() ?? null,
		);
		return new SequencePlacer(this.skeletonOf(input), notesByMnote);
	}

	// Everything of the timeline but where its steps stand: the passes in playback order, each
	// step's beats and the notes that start and sound in it, the tempo map and the ties.
	private skeletonOf(input: SequenceInput): SequenceSkeleton {
		const notesByMeasure = new Map<number, SequenceNote[]>();
		for (const note of input.notes) {
			const list = notesByMeasure.get(note.measureIndex);
			if (list) {
				list.push(note);
			} else {
				notesByMeasure.set(note.measureIndex, [note]);
			}
		}

		// Walk the measure passes in playback order, collecting each note occurrence's absolute
		// [startBeat, endBeat) interval plus the onsets that seed steps.
		type Interval = { note: Note; startBeat: number; endBeat: number };
		type Onset = {
			measureIndex: number;
			kind: StepSkeleton['kind'];
			notes: Note[];
		};
		const intervals: Interval[] = [];
		const onsets = new Map<number, Onset>();
		const ends: Array<{ beat: number; measureIndex: number }> = [];
		const { passes, segments, totalBeats } = this.unroll(input.measures);
		// Where each gap ends, so its step ends there even when the measure after it opens with
		// nothing drawn (a tab stave's rest): the gap plays exactly gapMs.
		const gapEnds: Array<{ beat: number; measureIndex: number }> = [];
		for (const [p, { measure, startBeat: measureStart }] of passes.entries()) {
			// A gap has no notes to seed a step, so its step is synthesized here, spanning the
			// measure with nothing active: the cursor glides across its box and everything
			// sounding before it stops.
			if (measure.gapMs !== undefined) {
				onsets.set(measureStart, {
					measureIndex: measure.index,
					kind: 'gap',
					notes: [],
				});
				const next = passes[p + 1];
				if (next) {
					gapEnds.push({
						beat: next.startBeat,
						measureIndex: next.measure.index,
					});
				}
				continue;
			}
			for (const sn of notesByMeasure.get(measure.index) ?? []) {
				const startBeat = measureStart + sn.measureBeat;
				intervals.push({
					note: sn.note,
					startBeat,
					endBeat: startBeat + sn.beats,
				});
				ends.push({ beat: startBeat + sn.beats, measureIndex: measure.index });
				const existing = onsets.get(startBeat);
				if (existing) {
					existing.notes.push(sn.note);
				} else {
					onsets.set(startBeat, {
						measureIndex: measure.index,
						kind: 'notes',
						notes: [sn.note],
					});
				}
			}
		}

		const tiedFrom = new Map<Note, Note>();
		for (const sn of input.notes) {
			if (sn.tiedFrom) {
				tiedFrom.set(sn.note, sn.tiedFrom);
			}
		}

		// A voice can end before its measure does (no trailing rest; legal, and common in real
		// exports), leaving no onset at the note's end: without a step boundary there the note keeps
		// sounding until the next onset anywhere in the score. Seed a step at every note end that isn't
		// already an onset. Matching is epsilon-tolerant (see BEAT_EPSILON) via a quantized key;
		// an exact-equality test would seed a duplicate micro-step one ULP off a real onset.
		const quantize = (beat: number) => Math.round(beat / BEAT_EPSILON);
		for (const { beat, measureIndex } of gapEnds) {
			if (!onsets.has(beat)) {
				onsets.set(beat, { measureIndex, kind: 'left', notes: [] });
			}
		}
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
				measureIndex: end.measureIndex,
				kind: 'seed',
				notes: [],
			});
		}

		// Every rate change is in by now, so the map is complete and can date the steps.
		const tempo = new TempoMap(segments);
		const startBeats = [...onsets.keys()].sort((a, b) => a - b);
		// A step's active notes are the intervals sounding at its start. Steps ascend, so one
		// sweep over the intervals by start finds them: an interval joins once a step reaches its
		// start and leaves for good once one reaches its end. Indexes keep the walk's order.
		const byStart = intervals
			.map((_, i) => i)
			.sort(
				(a, b) =>
					(intervals[a] as Interval).startBeat -
					(intervals[b] as Interval).startBeat,
			);
		let joined = 0;
		let sounding: number[] = [];
		const steps: StepSkeleton[] = [];
		for (const [i, startBeat] of startBeats.entries()) {
			const onset = onsets.get(startBeat);
			if (!onset) {
				continue;
			}
			const endBeat = startBeats[i + 1] ?? totalBeats;
			while (
				joined < byStart.length &&
				(intervals[byStart[joined] as number] as Interval).startBeat <=
					startBeat
			) {
				sounding.push(byStart[joined] as number);
				joined++;
			}
			sounding = sounding.filter(
				(iv) => startBeat < (intervals[iv] as Interval).endBeat - BEAT_EPSILON,
			);
			const active = [...sounding]
				.sort((a, b) => a - b)
				.map((iv) => (intervals[iv] as Interval).note);
			steps.push({
				startBeat,
				endBeat,
				measureIndex: onset.measureIndex,
				kind: onset.kind,
				notes: onset.notes,
				active,
			});
		}
		return { steps, tempo, totalBeats, measures: input.measures, tiedFrom };
	}

	/* Build the timeline's timing alone, with no geometry or note elements: every mdom note
	 * sounds and reads its swing exemption off the document, which is what the rendered notes
	 * report, so the numbers equal create()'s for the same parts and gaps. */
	timeline(parts: Part[]): Timeline {
		const { measures } = this.buildInput(
			parts,
			EMPTY_GEOMETRY,
			new Map(),
			(mnote) => new MNoteFacts(mnote, []).swingExempt,
		);
		const { passes, segments, totalBeats } = this.unroll(measures);
		const tempo = new TempoMap(segments);
		const bars = passes.map(({ measure, startBeat, endBeat }) => ({
			measureIndex: measure.index,
			startMs: tempo.msAt(startBeat),
			endMs: tempo.msAt(endBeat),
		}));
		// A gap's first pass, as create()'s gap step (Score.getGaps), in config order.
		const gaps = this.gaps.documentIndexes().map(({ gap, measureIndex }) => {
			const bar = bars.find((b) => b.measureIndex === measureIndex);
			return {
				measureIndex,
				label: gap.label ?? null,
				startMs: bar?.startMs ?? 0,
				endMs: bar?.endMs ?? 0,
			};
		});
		return new Timeline(tempo, totalBeats, bars, gaps);
	}

	/*
	 * Walk the measures in playback order (repeats and voltas expanded), one pass per time a
	 * measure plays, accumulating each pass's start beat and the tempo segments. A measure's
	 * mark sets the rate from there on, and null carries the previous; measures before the first
	 * mark play at the default 120, and a back-jump re-applies marks as written. A gap plays for
	 * exactly gapMs: its segment gets the bpm that maps its nominal beats to that time, without
	 * touching the carried tempo (the next measure resumes at the rate in effect before the gap).
	 */
	private unroll(measures: readonly MeasureInfo[]): {
		passes: { measure: MeasureInfo; startBeat: number; endBeat: number }[];
		segments: TempoSegment[];
		totalBeats: number;
	} {
		const passes: {
			measure: MeasureInfo;
			startBeat: number;
			endBeat: number;
		}[] = [];
		const segments: TempoSegment[] = [];
		let totalBeats = 0;
		let bpm = DEFAULT_TEMPO_BPM;
		for (const measureIndex of new MeasureSequenceIterator(measures)) {
			const measure = measures[measureIndex];
			if (!measure) {
				continue;
			}
			if (measure.tempoBpm !== null) {
				bpm = measure.tempoBpm;
			}
			const endBeat = totalBeats + measure.beats;
			segments.push({
				startBeat: totalBeats,
				endBeat,
				bpm:
					measure.gapMs === undefined
						? bpm
						: (measure.beats * 60000) / measure.gapMs,
			});
			passes.push({ measure, startBeat: totalBeats, endBeat });
			totalBeats = endBeat;
		}
		return { passes, segments, totalBeats };
	}

	private buildInput(
		parts: Part[],
		geometry: RawGeometry,
		notesByMnote: ReadonlyMap<NoteKey, Note>,
		// A note's swing exemption, or null when it doesn't sound (has no rendered note).
		swingExemptOf: (mnote: MNote) => boolean | null,
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
		// mdom reads a note's children afresh on each property, and the passes below ask about each
		// note several times, so what they ask is read once here, with each part's notes by measure.
		const chordSiblings = new Map<MNote, readonly MNote[]>();
		const reads = new Map<MNote, NoteRead>();
		const notesOf = parts.map((part) =>
			part.measures.map((measure) => {
				const notes = this.reader.notesOf(measure);
				let chord: MNote[] = [];
				for (const n of notes) {
					const read = {
						grace: n.isGrace,
						chordMember: this.reader.isChordMember(n),
						voice: n.voice,
					};
					reads.set(n, read);
					if (read.chordMember && chord.length > 0) {
						chord.push(n);
					} else {
						chord = [n];
					}
					chordSiblings.set(n, chord);
				}
				return notes;
			}),
		);
		const readOf = (n: MNote) =>
			reads.get(n) ?? {
				grace: n.isGrace,
				chordMember: this.reader.isChordMember(n),
				voice: n.voice,
			};

		// A note's played span within its measure, warped by swing. Warp onset and end through the
		// same function, then take the duration as the difference: a swung note's length falls out
		// of where its neighbors land, so it can never drift out of step with them or with the
		// measure's own length.
		// A note is only ever asked about in its own measure, so its span is kept by note.
		const spans = new Map<MNote, Span | null>();
		const span = (mnote: MNote, measureIndex: number): Span | null => {
			const known = spans.get(mnote);
			if (known !== undefined) {
				return known;
			}
			const measureBeat = this.reader.measureBeatOf(mnote);
			const beats = this.reader.beatsOf(mnote);
			const exempt = swingExemptOf(mnote);
			let played: Span | null = null;
			if (exempt !== null && measureBeat !== null && beats !== null) {
				const warp = exempt
					? (beat: number) => beat
					: (beat: number) => swung(measureIndex, beat);
				played = { onset: warp(measureBeat), end: warp(measureBeat + beats) };
			}
			spans.set(mnote, played);
			return played;
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
		for (const measures of notesOf) {
			for (const [measureIndex, measureNotes] of measures.entries()) {
				const bpm = bpms[measureIndex] ?? DEFAULT_TEMPO_BPM;
				const previousByVoice = new Map<string, MNote>();
				// Graces not yet followed by a note in their voice; those left at the measure's end
				// are after-graces of the note before them.
				const pendingByVoice = new Map<string, MNote[]>();
				for (const n of measureNotes) {
					const { grace, chordMember, voice } = readOf(n);
					if (grace) {
						pendingByVoice.set(voice, [
							...(pendingByVoice.get(voice) ?? []),
							n,
						]);
						continue;
					}
					if (chordMember) {
						continue;
					}
					const graces = pendingByVoice.get(voice) ?? [];
					pendingByVoice.delete(voice);
					const previous = previousByVoice.get(voice) ?? null;
					previousByVoice.set(voice, n);
					if (graces.length === 0) {
						continue;
					}
					const anchorSpan = span(n, measureIndex);
					if (!anchorSpan) {
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
			// A cue note holds its place in the measure but makes no sound.
			if (!note || isCueNote(rn.mnote)) {
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
			} else if (readOf(rn.mnote).grace) {
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
	 * value or steal-time percent, so it reads as an ornament rather than a note; a grace chord
	 * shares one flick. The run takes its
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
		// A <chord/> grace sounds with the grace before it, so only chord leads take a flick each.
		const flicks = graces.filter(
			(grace, i) => i === 0 || !this.reader.isChordMember(grace),
		).length;
		const flick = (GRACE_MS * bpm) / 60000;
		const room = (victim.end - victim.onset) / 2;
		const beats = makeTime
			? flick
			: Math.min(flick, room / Math.max(1, flicks));
		let at = from === 'start' ? victim.onset : victim.end - beats * flicks;
		const placed = new Map<MNote, Span>();
		for (const [i, grace] of graces.entries()) {
			if (i > 0 && !this.reader.isChordMember(grace)) {
				at += beats;
			}
			placed.set(grace, { onset: at, end: at + beats });
		}
		return placed;
	}

	/* Per measure index, the beat-axis warp swing puts on that measure: identity where none is
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
			for (const note of this.reader.notesOf(measure)) {
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

	/* Pitch alone picks a tie's other end out of a chord, since a tie's two ends always match. */
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
		notesByMnote: ReadonlyMap<NoteKey, Note>,
		chordSiblings: ReadonlyMap<MNote, readonly MNote[]>,
	): Note | null {
		for (const tie of this.reader.tiesOf(mnote)) {
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
