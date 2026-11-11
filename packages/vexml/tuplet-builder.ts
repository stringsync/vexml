import type { Chord, Tuplet as MTuplet, Note } from '@stringsync/mdom';
import { Stem, type StemmableNote, Tuplet } from 'vexflow/core';
import type { Appearance } from './appearance';
import { TUPLET_NESTING_EXTRA_GAP } from './constants';
import { DisplayTuplet, type TupletNoteValue } from './display-tuplet';
import type { ScoreReader } from './score-reader';

/* Builds tuplet brackets and their numbers. */
export class TupletBuilder {
	constructor(
		private readonly reader: ScoreReader,
		private readonly appearance: Appearance,
	) {}

	/*
	 * Tuplets: a <tuplet>start..stop span covers every note between the two markers
	 * (the inner notes carry no marker), so slice the chord run by index. The ratio
	 * comes from the start note's <time-modification> (e.g. 3:2 -> "3"), unless the
	 * marker prints its own (see tupletDisplay).
	 *
	 * The bracket goes where the start marker's `placement` says, and otherwise on
	 * the stem side of the group, which is the engraving default and what MuseScore does.
	 * Beams are built before tuplets, so the stem directions are already settled.
	 *
	 * Spans can NEST (a triplet inside a quintuplet), so the open starts are kept by the
	 * marker's `number` rather than as one slot: an inner start arriving before the outer
	 * stop would otherwise overwrite it and lose the outer bracket entirely. MusicXML
	 * defaults an omitted number to "1", which is also what a flat run of unnumbered
	 * tuplets uses, so they share the slot and pair in order either way.
	 *
	 * vexflow staggers nested brackets itself (Tuplet.getNestedTupletCount), but by a step
	 * shorter than the numeral it centers on each bracket line, so the two numbers print
	 * through each other, hence the extra yOffset, sized by how deep the nesting under this
	 * span goes (the same max-minus-min depth vexflow measures).
	 */
	build<T extends StemmableNote>(
		chords: Chord[],
		byLead: Map<Note, T>,
	): Tuplet[] {
		const tuplets: Tuplet[] = [];
		const open = new Map<
			string,
			{
				start: number;
				depth: number;
				maxDepth: number;
				placement: string | null;
				display: TupletDisplay | null;
				lead: Note;
			}
		>();
		chords.forEach((chord, i) => {
			for (const tuplet of chord.lead.tuplets) {
				const number = tuplet.number;
				if (tuplet.tupletType === 'start') {
					const depth = open.size;
					for (const enclosing of open.values()) {
						enclosing.maxDepth = Math.max(enclosing.maxDepth, depth);
					}
					open.set(number, {
						start: i,
						depth,
						maxDepth: depth,
						placement: tuplet.placement,
						display: this.tupletDisplay(tuplet),
						lead: chord.lead,
					});
					continue;
				}
				const opened = tuplet.tupletType === 'stop' && open.get(number);
				if (!opened) {
					continue;
				}
				open.delete(number);
				const { start, depth, maxDepth, placement, display, lead } = opened;
				const group = chords
					.slice(start, i + 1)
					.map((c) => byLead.get(c.lead))
					.filter((n): n is T => n !== undefined);
				if (group.length > 1) {
					const ratio = chords[start]?.lead.timeModification;
					const numNotes = display?.numNotes ?? ratio?.actual;
					const notesOccupied = display?.notesOccupied ?? ratio?.normal;
					// ponytail: the first non-rest speaks for the group; a mixed-stem
					// tuplet would need a majority vote.
					const stemmed = group.find((n) => !n.isRest()) ?? group[0];
					const isBelow =
						placement === 'below' ||
						(placement !== 'above' &&
							stemmed?.getStemDirection() === Stem.DOWN);
					const location = isBelow
						? Tuplet.LOCATION_BOTTOM
						: Tuplet.LOCATION_TOP;
					tuplets.push(
						new DisplayTuplet(group, {
							location,
							showNumber: display?.showNumber ?? null,
							showType: display?.showType ?? null,
							actualValue:
								display?.actualValue ?? tupletNoteValue(lead, this.reader),
							normalValue:
								display?.normalValue ?? rawNormalValue(lead, this.reader),
							curved: display?.curved ?? false,
							bracketWidth: this.appearance.lineWidth('tuplet bracket'),
							// Signed the way vexflow's own nesting offset is: away from the stave.
							yOffset:
								(maxDepth - depth) * TUPLET_NESTING_EXTRA_GAP * -location,
							// MusicXML's default is show-number="actual": just the count.
							// vexflow's own default prints the ratio whenever the two numbers
							// differ by more than one, which turns a plain sextuplet into "6:4".
							ratioed: display?.ratioed ?? false,
							...(display?.bracketed != null && {
								bracketed: display.bracketed,
							}),
							...(numNotes != null &&
								notesOccupied != null && { numNotes, notesOccupied }),
						}),
					);
				}
			}
		});
		return tuplets;
	}

	private tupletDisplay(marker: MTuplet): TupletDisplay {
		return {
			numNotes: marker.actual?.number ?? null,
			notesOccupied: marker.normal?.number ?? null,
			ratioed: marker.showNumber === 'both',
			bracketed: marker.bracket,
			showNumber: marker.showNumber,
			showType: marker.showType,
			actualValue: displayValue(marker.actual),
			normalValue: displayValue(marker.normal),
			curved: marker.getAttribute('line-shape') === 'curved',
		};
	}
}

/*
 * How a <tuplet> start marker asks to be PRINTED, which MusicXML keeps separate from the
 * <time-modification> that compresses the durations: <tuplet-actual>/<tuplet-normal> give the
 * printed pair their own numbers (a "7:5" label over a 3:2 compression), show-number="both"
 * prints the second half of that pair, and `bracket` settles the bracket instead of leaving
 * vexflow to infer it from whether the group is beamed. Nulls mean "not stated": the caller
 * falls back to the <time-modification> ratio and vexflow's own bracket rule.
 *
 * show-number="none", show-type (note-value glyphs beside the number) and line-shape="curved"
 * are drawn by DisplayTuplet.
 */
type TupletDisplay = {
	showNumber: 'actual' | 'both' | 'none' | null;
	showType: 'actual' | 'both' | 'none' | null;
	actualValue: TupletNoteValue | null;
	normalValue: TupletNoteValue | null;
	curved: boolean;
	numNotes: number | null;
	notesOccupied: number | null;
	ratioed: boolean;
	bracketed: boolean | null;
};

/* A <tuplet-actual>/<tuplet-normal> block's note value, or null when it names no type. */
function displayValue(
	side: { type: string | null; dots: number } | null,
): TupletNoteValue | null {
	return side?.type ? { type: side.type, dots: side.dots } : null;
}

/* The note's own written value, which <tuplet-actual> falls back to. */
function tupletNoteValue(
	note: Note,
	reader: ScoreReader,
): TupletNoteValue | null {
	return note.type ? { type: note.type, dots: reader.dotsOf(note) } : null;
}

/*
 * The <time-modification> <normal-type>/<normal-dot> value, which mdom keeps raw; without it
 * the normal side prints the note's own value.
 */
function rawNormalValue(
	note: Note,
	reader: ScoreReader,
): TupletNoteValue | null {
	const modification = note.child('time-modification');
	const type = modification?.child('normal-type')?.text?.trim();
	if (!type) {
		return tupletNoteValue(note, reader);
	}
	return { type, dots: modification?.childrenNamed('normal-dot').length ?? 0 };
}
