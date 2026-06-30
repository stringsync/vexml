import type { Note as MNote, Part } from '@stringsync/mdom';
import { Rect } from './geometry';
import type { RawGeometry } from './hit';
import { meterBeats, tempoOf } from './notes';
import type {
	Jump,
	MeasureInfo,
	SequenceInput,
	SequenceNote,
} from './sequence';
import type { Note } from './targets';

/*
 * Builds the `SequenceInput` the playback timeline is assembled from, bridging the parsed document
 * (onsets, meter, tempo, repeats, ties) and the engraved geometry (note x, system boxes) into the
 * pure shape `buildSequence` consumes. Kept apart from both `render.ts` (orchestration) and
 * `sequence.ts` (pure timeline) so each stays focused.
 */

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

function quarterBpm(measure: Part['measures'][number]): number | null {
	const tempo = tempoOf(measure);
	if (!tempo) {
		return null;
	}
	return tempo.bpm * (QUARTERS_PER_UNIT[tempo.duration] ?? 1);
}

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

/* A measure's played length in quarter-note beats: the latest note end across all parts (so pickups
 * and ragged voices are honored), falling back to the meter. */
function measureBeats(parts: Part[], index: number): number {
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
	return meterBeats(parts[0]?.measures[index]?.getTime() ?? null);
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

export function buildSequenceInput(
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
			beats: measureBeats(parts, i),
			tempoBpm: m0 ? quarterBpm(m0) : null,
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
