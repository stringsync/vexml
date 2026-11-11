import type { Chord, Note } from '@stringsync/mdom';
import { type StaveNote, VibratoBracket } from 'vexflow/core';
import { type SpanScope, WHOLE_SCORE } from './span-scope';

/* Builds trill extension lines. */
export class WavyLineBuilder {
	/*
	 * Trill extension lines (<notations><ornaments><wavy-line>): a start..stop pair drawn as a
	 * vexflow VibratoBracket: the wavy line running from a trill across the notes it is held
	 * over. Paired by `number` over the whole score like the other spanners, so a run of
	 * trilled notes (each carrying a stop and then a start) comes out as a chain of brackets
	 * that meet end to end.
	 * ponytail: the marker's placement is ignored; vexflow's bracket only draws above the
	 * stave, which is where a trill line belongs anyway.
	 */
	build(
		chords: Chord[],
		byLead: Map<Note, StaveNote>,
		scope: SpanScope = WHOLE_SCORE,
	): VibratoBracket[] {
		if (!chords.some((c) => c.lead.wavyLines.length > 0)) {
			return [];
		}
		const brackets: VibratoBracket[] = [];
		const open = new Map<string, StaveNote>();
		for (const chord of chords) {
			const staveNote = byLead.get(chord.lead);
			if (!staveNote) {
				continue;
			}
			for (const wavy of chord.lead.wavyLines) {
				if (wavy.wavyLineType === 'start') {
					open.set(wavy.number, staveNote);
					continue;
				}
				if (wavy.wavyLineType !== 'stop') {
					continue;
				}
				const from = open.get(wavy.number);
				open.delete(wavy.number);
				// No line to draw without an open start, and a zero-width span would be invisible.
				if (from && from !== staveNote && scope.owns(from, staveNote)) {
					brackets.push(new VibratoBracket({ start: from, stop: staveNote }));
				}
			}
		}
		return brackets;
	}
}
