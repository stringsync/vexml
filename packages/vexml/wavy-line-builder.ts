import type { Chord, Note } from '@stringsync/mdom';
import type { Stave, StaveNote, VibratoBracket } from 'vexflow/core';
import type { CurveConnectors } from './curve-connectors';
import { type SpanScope, WHOLE_SCORE } from './span-scope';
import { TrillLine, type TrillLineEnd } from './trill-line';

interface OpenWavyLine {
	chordIndex: number;
	note: StaveNote;
}

/* Builds trill extension lines. */
export class WavyLineBuilder {
	constructor(private readonly connectors: CurveConnectors) {}

	/*
	 * Trill extension lines (<notations><ornaments><wavy-line>): a start..stop pair drawn as a
	 * TrillLine running from directly after `tr` across the trilled note's full duration
	 * (Behind Bars p. 136). Paired by `number` over the whole score like the other spanners,
	 * so a run of wavy-line notes (each carrying a stop and then a start) comes out as a chain
	 * of lines that meet end to end.
	 */
	build(
		chords: Chord[],
		byLead: Map<Note, StaveNote>,
		scope: SpanScope = WHOLE_SCORE,
	): VibratoBracket[] {
		if (!chords.some((c) => c.lead.wavyLines.length > 0)) {
			return [];
		}
		const notesByStave = this.groupByStave(chords, byLead);
		const brackets: VibratoBracket[] = [];
		const open = new Map<string, OpenWavyLine>();
		for (let i = 0; i < chords.length; i++) {
			const chord = chords[i];
			if (!chord) {
				continue;
			}
			const staveNote = byLead.get(chord.lead);
			if (!staveNote) {
				continue;
			}
			for (const wavy of chord.lead.wavyLines) {
				if (wavy.wavyLineType === 'start') {
					open.set(wavy.number, { chordIndex: i, note: staveNote });
					continue;
				}
				if (wavy.wavyLineType !== 'stop') {
					continue;
				}
				const from = open.get(wavy.number);
				open.delete(wavy.number);
				// No line to draw without an open start, and a zero-width span would be invisible.
				if (
					from &&
					from.note !== staveNote &&
					scope.owns(from.note, staveNote)
				) {
					const end = this.resolveEnd(
						chords,
						byLead,
						notesByStave,
						from.chordIndex,
						i,
						from.note,
						staveNote,
					);
					brackets.push(new TrillLine(from.note, staveNote, end));
				}
			}
		}
		return brackets;
	}

	/*
	 * Decide where a wavy line ends (Behind Bars p. 136):
	 * - When the stop note is tied from within the span, the trill runs for the tied note's
	 *   full duration: up to the next note/rest in that bar, or to the barline if it ends the bar.
	 * - When untied in the same measure, stop just before the stop note (or its accidental).
	 * - When untied on the first beat of a later measure, stop at the preceding barline.
	 * - When untied later in a later measure on the same system, stop before the stop note;
	 *   across a system break, stop at the preceding barline.
	 */
	private resolveEnd(
		chords: Chord[],
		byLead: Map<Note, StaveNote>,
		notesByStave: Map<Stave, StaveNote[]>,
		fromIndex: number,
		stopIndex: number,
		fromNote: StaveNote,
		stopNote: StaveNote,
	): TrillLineEnd {
		const fromStave = fromNote.checkStave();
		const stopStave = stopNote.checkStave();
		const stopChord = chords[stopIndex];
		if (
			stopChord &&
			this.isTiedWithinSpan(chords, fromIndex, stopIndex, stopChord)
		) {
			const next = this.nextNoteOnStave(notesByStave, stopStave, stopNote);
			if (next) {
				return { kind: 'before-note', note: next };
			}
			return { kind: 'barline', stave: stopStave };
		}
		if (stopStave === fromStave) {
			return { kind: 'before-note', note: stopNote };
		}
		const precedingStave = this.lastStaveBeforeStop(
			chords,
			byLead,
			fromIndex,
			stopIndex,
			fromStave,
			stopStave,
		);
		const hasEarlierInStopMeasure = this.hasEarlierNoteOnStave(
			notesByStave,
			stopStave,
			stopNote,
		);
		if (!hasEarlierInStopMeasure || stopStave.getY() !== fromStave.getY()) {
			return { kind: 'barline', stave: precedingStave };
		}
		return { kind: 'before-note', note: stopNote };
	}

	/* True when any chord in [fromIndex, stopIndex) ties into `stopChord`. */
	private isTiedWithinSpan(
		chords: Chord[],
		fromIndex: number,
		stopIndex: number,
		stopChord: Chord,
	): boolean {
		const targets = new Set(stopChord.notes);
		for (let i = fromIndex; i < stopIndex; i++) {
			const chord = chords[i];
			if (!chord) {
				continue;
			}
			for (const note of chord.notes) {
				for (const tie of this.connectors.tiesOf(note)) {
					if (tie.partner && targets.has(tie.partner)) {
						return true;
					}
				}
			}
		}
		return false;
	}

	private groupByStave(
		chords: Chord[],
		byLead: Map<Note, StaveNote>,
	): Map<Stave, StaveNote[]> {
		const byStave = new Map<Stave, StaveNote[]>();
		for (const chord of chords) {
			const note = byLead.get(chord.lead);
			const stave = note?.getStave();
			if (!note || !stave) {
				continue;
			}
			let list = byStave.get(stave);
			if (!list) {
				list = [];
				byStave.set(stave, list);
			}
			list.push(note);
		}
		return byStave;
	}

	/* Earliest drawn note/rest on `stave` strictly to the right of `after`. */
	private nextNoteOnStave(
		notesByStave: Map<Stave, StaveNote[]>,
		stave: Stave,
		after: StaveNote,
	): StaveNote | undefined {
		const afterX = after.getAbsoluteX();
		let earliest: StaveNote | undefined;
		let earliestX = Number.POSITIVE_INFINITY;
		for (const candidate of notesByStave.get(stave) ?? []) {
			if (candidate === after) {
				continue;
			}
			const x = candidate.getAbsoluteX();
			if (x > afterX + 0.5 && x < earliestX) {
				earliest = candidate;
				earliestX = x;
			}
		}
		return earliest;
	}

	private hasEarlierNoteOnStave(
		notesByStave: Map<Stave, StaveNote[]>,
		stave: Stave,
		before: StaveNote,
	): boolean {
		const beforeX = before.getAbsoluteX();
		return (notesByStave.get(stave) ?? []).some(
			(candidate) =>
				candidate !== before && candidate.getAbsoluteX() < beforeX - 0.5,
		);
	}

	/* The last stave on `fromStave`'s system row that appears before `stopStave`. */
	private lastStaveBeforeStop(
		chords: Chord[],
		byLead: Map<Note, StaveNote>,
		fromIndex: number,
		stopIndex: number,
		fromStave: Stave,
		stopStave: Stave,
	): Stave {
		const rowY = fromStave.getY();
		let last = fromStave;
		for (let i = fromIndex; i < stopIndex; i++) {
			const chord = chords[i];
			const note = chord ? byLead.get(chord.lead) : undefined;
			const stave = note?.getStave();
			if (
				stave &&
				stave !== stopStave &&
				stave.getY() === rowY &&
				stave.getX() >= last.getX()
			) {
				last = stave;
			}
		}
		return last;
	}
}
