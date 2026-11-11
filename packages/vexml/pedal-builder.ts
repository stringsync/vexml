import type { Chord, Note } from '@stringsync/mdom';
import type { PedalMarking, StaveNote } from 'vexflow/core';
import type { Appearance } from './appearance';
import { Ink } from './ink';
import { PedalLine } from './pedal-line';
import type { PedalMark } from './score-reader';
import { type SpanScope, WHOLE_SCORE } from './span-scope';

/* Builds pedal signs and lines. */
export type PedalOptions = { scope?: SpanScope };

export class PedalBuilder {
	constructor(private readonly appearance: Appearance) {}

	/*
	 * Pedals (<direction><pedal>): a start..stop pair, with any changes between, drawn as a
	 * PedalLine under the stave: the "Ped…*" signs by default, a bracket line when the
	 * MusicXML carries line="yes", or both under sign="yes". Paired by `number` and resolved
	 * over the whole score (a pedal can span barlines) like the other spanners; the markers
	 * arrive in document order, so each stop closes the matching open start, and a change
	 * re-pedals the one open under its number.
	 * ponytail: a pedal whose stop wraps onto a later system isn't split; it would need the
	 * partial-span handling TieBuilder uses; add it if a fixture needs one.
	 *
	 * Each line comes back with the notes it covers so the caller can drop it clear
	 * of any that reach down into its band (see DrawPass.finishPass).
	 */
	build(
		markers: PedalMark[],
		byLead: Map<Note, StaveNote>,
		chords: Chord[],
		{ scope = WHOLE_SCORE }: PedalOptions = {},
	): { marking: PedalMarking; notes: StaveNote[] }[] {
		const pedals: { marking: PedalMarking; notes: StaveNote[] }[] = [];
		const open = new Map<
			string,
			{ note: StaveNote; mark: PedalMark; changes: StaveNote[] }
		>();
		for (const marker of markers) {
			const staveNote = byLead.get(marker.lead);
			if (!staveNote) {
				continue;
			}
			if (marker.type === 'start') {
				open.set(marker.number, { note: staveNote, mark: marker, changes: [] });
				continue;
			}
			const from = open.get(marker.number);
			if (marker.type === 'change') {
				// A change on the note the pedal went down on has nothing to lift.
				if (from && from.note !== staveNote) {
					from.changes.push(staveNote);
				}
				continue;
			}
			open.delete(marker.number);
			if (!from || !scope.owns(from.note, staveNote)) {
				continue;
			}
			const marking = new PedalLine(from.note, from.changes, staveNote, {
				line: from.mark.line,
				sign: from.mark.sign,
				abbreviated: from.mark.abbreviated,
				sostenuto: from.mark.sostenuto,
				resumed: from.mark.unmarked,
				discontinued: marker.unmarked,
			});
			// vexflow paints a pedal in its own black, over the context's notation ink.
			marking.renderOptions.color = Ink.NOTATION;
			marking.renderOptions.bracketLineWidth =
				this.appearance.lineWidth('pedal') ??
				marking.renderOptions.bracketLineWidth;
			pedals.push({
				marking,
				notes: this.pedalSpan(chords, byLead, from.note, staveNote),
			});
		}
		return pedals;
	}

	/*
	 * Every note a pedal covers: its two endpoints plus everything drawn between them, kept
	 * to the endpoints' own stave row. vexflow anchors the pedal's y to each note's stave, so
	 * a note on another row (a grand staff's other hand) sits in somebody else's band and
	 * can't clash with this one. Same-row measures share a y, which is what identifies the row.
	 */
	private pedalSpan(
		chords: Chord[],
		byLead: Map<Note, StaveNote>,
		from: StaveNote,
		to: StaveNote,
	): StaveNote[] {
		const i = chords.findIndex((c) => byLead.get(c.lead) === from);
		const j = chords.findIndex((c) => byLead.get(c.lead) === to);
		if (i < 0 || j < i) {
			return [from, to];
		}
		const y = from.getStave()?.getY();
		return chords
			.slice(i, j + 1)
			.map((c) => byLead.get(c.lead))
			.filter((n): n is StaveNote => !!n && n.getStave()?.getY() === y);
	}
}
