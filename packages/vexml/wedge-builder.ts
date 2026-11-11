import type { Note } from '@stringsync/mdom';
import type { StaveNote } from 'vexflow/core';
import type { Appearance } from './appearance';
import { Hairpin } from './hairpin';
import type { WedgeMark } from './score-reader';
import { type SpanScope, WHOLE_SCORE } from './span-scope';

// A trailing hairpin leaves air before its measure’s barline.
const HAIRPIN_BARLINE_GAP = 4;

export type WedgeOptions = {
	scope?: SpanScope;
	wraps?: (from: StaveNote, to: StaveNote) => boolean;
};

/* Builds hairpins. */
export class WedgeBuilder {
	constructor(private readonly appearance: Appearance) {}

	/*
	 * Hairpins (<direction><wedge>): a start..stop pair drawn as a vexflow StaveHairpin
	 * (an opening wedge for a crescendo, a closing one for a diminuendo), on the side of the
	 * staff the direction's placement names (below by default). Paired by `number` and
	 * resolved over the whole score (a hairpin can span barlines) like the other spanners;
	 * the markers arrive in document order, so each stop closes the matching open start.
	 * A hairpin whose stop wraps onto a later system is split in two, like a wrapped tie: one
	 * running off the right edge of the start's stave and one in from the left edge of the stop's.
	 * `wraps` tells a later system from another stave of the same one (a hairpin from the right
	 * hand to the left sits lower on the page without wrapping); without it, a lower stave wraps.
	 */
	build(
		markers: WedgeMark[],
		byLead: Map<Note, StaveNote>,
		{
			scope = WHOLE_SCORE,
			wraps = (from, to) =>
				(to.getStave()?.getY() ?? 0) > (from.getStave()?.getY() ?? 0),
		}: WedgeOptions = {},
	): Hairpin[] {
		const wedges: Hairpin[] = [];
		const open = new Map<string, WedgeMark>();
		for (const marker of markers) {
			if (marker.type === 'start') {
				open.set(marker.number, marker);
				continue;
			}
			const from = open.get(marker.number);
			open.delete(marker.number);
			const firstNote = from && byLead.get(from.lead);
			const lastNote = byLead.get(marker.lead);
			// A stop with no open start, or either endpoint off a hidden staff, has nothing
			// to span. Same for a zero-width span (both ends on one note).
			if (
				!from ||
				!firstNote ||
				!lastNote ||
				(firstNote === lastNote && !marker.trailing) ||
				!scope.owns(firstNote, lastNote)
			) {
				continue;
			}
			// The mouth is the wider end; an exporter that writes the spread on the wrong end
			// still sizes it.
			const spreads = [from.spread, marker.spread].filter(
				(spread): spread is number => spread !== null,
			);
			const opts = {
				crescendo: from.crescendo,
				placement: from.placement,
				dash: from.dash ?? marker.dash,
				niente: from.niente || marker.niente,
				spread: spreads.length > 0 ? Math.max(...spreads) : null,
			};
			// A half runs to the system's edge, not just its own measure's: the system's
			// staves are every one at that height.
			const rowStaves = (note: StaveNote) => {
				const y = note.getStave()?.getY();
				return [...byLead.values()].flatMap((other) => {
					const stave = other.getStave();
					return stave && stave.getY() === y ? [stave] : [];
				});
			};
			const rowEnd = Math.max(
				...rowStaves(firstNote).map((s) => s.getX() + s.getWidth()),
			);
			const rowStart = Math.min(
				...rowStaves(lastNote).map((s) => s.getNoteStartX()),
			);
			// A stop trailing its opening note ends at that measure, not the system edge.
			const wrapped = firstNote === lastNote || wraps(firstNote, lastNote);
			const halves = wrapped
				? [
						new Hairpin(firstNote, firstNote, {
							...opts,
							runsOff: 'right',
							edgeX:
								firstNote === lastNote
									? firstNote.checkStave().getNoteEndX() - HAIRPIN_BARLINE_GAP
									: rowEnd,
						}),
						...(firstNote === lastNote
							? []
							: [
									new Hairpin(lastNote, lastNote, {
										...opts,
										runsOff: 'left',
										edgeX: rowStart,
									}),
								]),
					]
				: [new Hairpin(firstNote, lastNote, opts)];
			for (const half of halves) {
				wedges.push(half.setLineWidth(this.appearance.lineWidth('wedge')));
			}
		}
		return wedges;
	}
}
