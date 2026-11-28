import type { Chord, Note } from '@stringsync/mdom';
import type { PedalMarking, Stave, StaveNote } from 'vexflow/core';
import type { Appearance } from './appearance';
import { Ink } from './ink';
import { PedalLine } from './pedal-line';
import type { PedalMark } from './score-reader';
import { type SpanScope, WHOLE_SCORE } from './span-scope';

/* Builds pedal signs and lines. */
export type PedalOptions = {
	scope?: SpanScope;
	/** The system index a drawn note sits on; when provided, cross-system pedals split per system. */
	systemOf?: (note: StaveNote) => number;
	/** The stave row a drawn note sits on, so cross-system spans stay on their own row. */
	rowOf?: (note: StaveNote) => number | undefined;
	/** The right barline x of the system row `stave` sits on, for open-ended continuation segments. */
	systemEndX?: (stave: Stave) => number;
};

export class PedalBuilder {
	constructor(private readonly appearance: Appearance) {}

	/*
	 * Pedals (<direction><pedal>): a start..stop pair, with any changes between, drawn as a
	 * PedalLine under the stave: the "Ped…*" signs by default, a bracket line when the
	 * MusicXML carries line="yes", or both under sign="yes". Paired by `number` and resolved
	 * over the whole score (a pedal can span barlines) like the other spanners; the markers
	 * arrive in document order, so each stop closes the matching open start, and a change
	 * re-pedals the one open under its number.
	 *
	 * A pedal whose stop wraps onto a later system splits per system (Behind Bars pp. 332–333):
	 * each earlier system's line runs open to its right barline, and each new system confirms
	 * the continuing pedal with "(Ped.)" (or "(Sost. Ped.)").
	 *
	 * Each line comes back with the notes it covers so the caller can drop it clear
	 * of any that reach down into its band (see DrawPass.finishPass).
	 */
	build(
		markers: PedalMark[],
		byLead: Map<Note, StaveNote>,
		chords: Chord[],
		{ scope = WHOLE_SCORE, systemOf, rowOf, systemEndX }: PedalOptions = {},
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
			const spanNotes = this.pedalSpan(
				chords,
				byLead,
				from.note,
				staveNote,
				rowOf,
			);
			const segments = systemOf
				? this.splitBySystem(spanNotes, systemOf)
				: [spanNotes];
			segments.forEach((segment, index) => {
				const isFirst = index === 0;
				const isLast = index === segments.length - 1;
				const down = isFirst ? from.note : (segment[0] ?? from.note);
				const up = isLast ? staveNote : (segment.at(-1) ?? staveNote);
				const segSystem = systemOf?.(down);
				const segChanges =
					segments.length === 1 || segSystem === undefined
						? from.changes
						: from.changes.filter(
								(c) => systemOf?.(c) === segSystem && c !== down,
							);
				const upStave = up.getStave();
				const marking = new PedalLine(down, segChanges, up, {
					line: from.mark.line,
					sign: from.mark.sign,
					abbreviated: from.mark.abbreviated,
					sostenuto: from.mark.sostenuto,
					resumed: isFirst ? from.mark.unmarked : !from.mark.sign,
					confirmed: !isFirst && from.mark.sign,
					discontinued: isLast ? marker.unmarked : true,
					endX:
						!isLast && upStave && systemEndX ? systemEndX(upStave) : undefined,
				});
				// vexflow paints a pedal in its own black, over the context's notation ink.
				marking.renderOptions.color = Ink.NOTATION;
				marking.renderOptions.bracketLineWidth =
					this.appearance.lineWidth('pedal') ??
					marking.renderOptions.bracketLineWidth;
				pedals.push({ marking, notes: segment });
			});
		}
		return pedals;
	}

	/* Partition a pedal's covered notes into contiguous runs on the same system. */
	private splitBySystem(
		notes: readonly StaveNote[],
		systemOf: (note: StaveNote) => number,
	): StaveNote[][] {
		const segments: StaveNote[][] = [];
		let currentSystem: number | undefined;
		for (const note of notes) {
			const system = systemOf(note);
			if (segments.length === 0 || system !== currentSystem) {
				segments.push([note]);
				currentSystem = system;
			} else {
				segments.at(-1)?.push(note);
			}
		}
		return segments;
	}

	/*
	 * Every note a pedal covers: its two endpoints plus everything drawn between them, kept
	 * to the endpoints' own stave row. vexflow anchors the pedal's y to each note's stave, so
	 * a note on another row (a grand staff's other hand) sits in somebody else's band and
	 * can't clash with this one. Same-row measures share a row (or y within one system).
	 */
	private pedalSpan(
		chords: Chord[],
		byLead: Map<Note, StaveNote>,
		from: StaveNote,
		to: StaveNote,
		rowOf?: (note: StaveNote) => number | undefined,
	): StaveNote[] {
		const i = chords.findIndex((c) => byLead.get(c.lead) === from);
		const j = chords.findIndex((c) => byLead.get(c.lead) === to);
		if (i < 0 || j < i) {
			return [from, to];
		}
		const row = rowOf?.(from);
		const y = from.getStave()?.getY();
		return chords
			.slice(i, j + 1)
			.map((c) => byLead.get(c.lead))
			.filter(
				(n): n is StaveNote =>
					!!n &&
					(row !== undefined ? rowOf?.(n) === row : n.getStave()?.getY() === y),
			);
	}
}
