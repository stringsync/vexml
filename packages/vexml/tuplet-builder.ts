import type { Chord, Tuplet as MTuplet, Note, Part } from '@stringsync/mdom';
import { Stem, type StemmableNote, Tuplet } from 'vexflow/core';
import type { Appearance } from './appearance';
import {
	EPSILON,
	QUARTER_NOTE_TICKS,
	TUPLET_NESTING_EXTRA_GAP,
} from './constants';
import { DisplayTuplet, type TupletNoteValue } from './display-tuplet';
import type { ScoreReader } from './score-reader';
import { type SpanScope, WHOLE_SCORE } from './span-scope';

export type CrossBarlineTupletOptions<T extends StemmableNote> = {
	scope?: SpanScope;
	splitBySystem?: (notes: T[]) => T[][];
};

type OpenTuplet = {
	start: number;
	depth: number;
	maxDepth: number;
	placement: string | null;
	display: TupletDisplay | null;
	lead: Note;
};

type TupletSpan<T extends StemmableNote> = OpenTuplet & {
	parent: TupletSpan<T> | null;
	group: T[];
	location: number;
	sameSideNested: number;
	maxNestedByLocation: Map<number, number>;
};

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
	): DisplayTuplet[] {
		const open = new Map<string, TupletSpan<T>>();
		const closed: TupletSpan<T>[] = [];
		chords.forEach((chord, i) => {
			for (const tuplet of chord.lead.tuplets) {
				const number = tuplet.number;
				if (tuplet.tupletType === 'start') {
					const depth = open.size;
					let parent: TupletSpan<T> | null = null;
					for (const enclosing of open.values()) {
						enclosing.maxDepth = Math.max(enclosing.maxDepth, depth);
						parent = enclosing;
					}
					open.set(number, {
						start: i,
						depth,
						maxDepth: depth,
						parent,
						placement: tuplet.placement,
						display: this.tupletDisplay(tuplet),
						lead: chord.lead,
						group: [],
						location: Tuplet.LOCATION_TOP,
						sameSideNested: 0,
						maxNestedByLocation: new Map(),
					});
					continue;
				}
				const opened = tuplet.tupletType === 'stop' && open.get(number);
				if (!opened) {
					continue;
				}
				open.delete(number);
				opened.group = chords
					.slice(opened.start, i + 1)
					.map((c) => byLead.get(c.lead))
					.filter((n): n is T => n !== undefined);
				if (opened.group.length > 0) {
					closed.push(opened);
				}
			}
		});
		// Resolve locations outer-first so nested tuplets without explicit placement
		// sit on the opposite side of their enclosing tuplet (Behind Bars p. 214).
		for (const span of [...closed].sort((a, b) => a.depth - b.depth)) {
			if (span.placement !== null) {
				span.location = tupletLocation(span.placement, span.group);
			} else if (span.parent !== null && span.parent.group.length > 0) {
				span.location = -span.parent.location;
			} else {
				span.location = tupletLocation(null, span.group);
			}
		}
		// Compute same-side nesting depth inner-first so opposite-side nested tuplets
		// do not push the outer bracket further away from the stave.
		for (const span of closed) {
			span.sameSideNested = span.maxNestedByLocation.get(span.location) ?? 0;
			let ancestor = span.parent;
			while (ancestor) {
				ancestor.maxNestedByLocation.set(
					span.location,
					Math.max(
						ancestor.maxNestedByLocation.get(span.location) ?? 0,
						span.sameSideNested + 1,
					),
				);
				ancestor = ancestor.parent;
			}
		}
		// Construct DisplayTuplets in closing order (inner before outer) so vexflow's
		// note.getTupletStack() orders same-side nested brackets inner-to-outer.
		const tuplets: DisplayTuplet[] = [];
		for (const span of closed) {
			const isOuter = span.maxDepth > span.depth;
			const isInner = span.parent !== null && span.parent.group.length > 0;
			const built = this.createTuplet(span.group, span, {
				location: span.location,
				sameSideNested: span.sameSideNested,
				isOuter,
				isInner,
			});
			if (built) {
				tuplets.push(built);
			}
		}
		return tuplets;
	}

	/*
	 * Cross-barline tuplets (Behind Bars p. 210): a <tuplet> start..stop span whose endpoints
	 * sit in different measures. Resolved over the spanner pool once every measure's notes are
	 * placed, skipping within-measure spans (already built by build()). Ticks were already
	 * rescaled per measure before formatting, so each constructed DisplayTuplet skips rescaling.
	 */
	buildCrossBarline<T extends StemmableNote>(
		chords: Chord[],
		byLead: Map<Note, T>,
		opts: CrossBarlineTupletOptions<T> = {},
	): DisplayTuplet[] {
		if (!chords.some((c) => c.lead.tuplets.length > 0)) {
			return [];
		}
		const scope = opts.scope ?? WHOLE_SCORE;
		// Group chords by (part, voice) while keeping document order, because the spanner
		// pool interleaves parts and voices across measures.
		const byVoice = new Map<Part, Map<string, Chord[]>>();
		for (const chord of chords) {
			const part = chord.lead.part;
			let voices = byVoice.get(part);
			if (!voices) {
				voices = new Map();
				byVoice.set(part, voices);
			}
			let list = voices.get(chord.lead.voice);
			if (!list) {
				list = [];
				voices.set(chord.lead.voice, list);
			}
			list.push(chord);
		}
		const tuplets: DisplayTuplet[] = [];
		for (const voices of byVoice.values()) {
			for (const voiceChords of voices.values()) {
				const open = new Map<string, OpenTuplet>();
				voiceChords.forEach((chord, i) => {
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
						// Within-measure tuplets were already built by build().
						if (opened.lead.measure === chord.lead.measure) {
							continue;
						}
						const group = voiceChords
							.slice(opened.start, i + 1)
							.map((c) => byLead.get(c.lead))
							.filter((n): n is T => n !== undefined);
						const first = group[0];
						const last = group[group.length - 1];
						if (!first || !last || !scope.owns(first, last)) {
							continue;
						}
						const location = tupletLocation(opened.placement, group);
						const segments = opts.splitBySystem
							? opts.splitBySystem(group)
							: [group];
						for (const segment of segments) {
							const built = this.createTuplet(segment, opened, {
								rescale: false,
								location,
							});
							if (built) {
								tuplets.push(built);
							}
						}
					}
				});
			}
		}
		return tuplets;
	}

	private createTuplet<T extends StemmableNote>(
		group: T[],
		opened: OpenTuplet,
		overrides: {
			rescale?: boolean;
			location?: number;
			sameSideNested?: number;
			isOuter?: boolean;
			isInner?: boolean;
		} = {},
	): DisplayTuplet | null {
		const first = group[0];
		if (!first) {
			return null;
		}
		const { depth, maxDepth, placement, display, lead } = opened;
		const ratio = lead.timeModification;
		const numNotes = display?.numNotes ?? ratio?.actual;
		const notesOccupied = display?.notesOccupied ?? ratio?.normal;
		// A single-note tuplet (e.g. a tremolo abbreviating repeated tuplets) needs
		// an explicit ratio; without one vexflow would default numNotes to 1.
		if (group.length === 1 && numNotes == null) {
			return null;
		}
		const location = overrides.location ?? tupletLocation(placement, group);
		const sameSideNested = overrides.sameSideNested ?? maxDepth - depth;
		const isOuter = overrides.isOuter ?? maxDepth > depth;
		const isInner = overrides.isInner ?? depth > 0;
		// Single-note tuplets draw the bare numeral without a bracket unless
		// MusicXML asks for one, and skip tick rescaling when the written note
		// already carries its full sounding duration (modern tremolo notation).
		// Behind Bars pp. 213–214: enclose an outer nested tuplet numeral in a
		// bracket even when beamed, and bracket a subdivided inner tuplet when it
		// sits on the notehead side of the group.
		const single = group.length === 1;
		const onNoteheadSide = location !== stemSide(group);
		let bracketed: boolean | undefined;
		if (display?.bracketed !== undefined && display.bracketed !== null) {
			bracketed = display.bracketed;
		} else if (single) {
			bracketed = false;
		} else if (
			isOuter ||
			(isInner && onNoteheadSide) ||
			isPartOfLongerBeam(group)
		) {
			bracketed = true;
		}
		const rescale =
			overrides.rescale ??
			(single ? needsTickRescale(lead, first, this.reader) : true);
		return new DisplayTuplet(group, {
			location,
			showNumber: display?.showNumber ?? null,
			showType: display?.showType ?? null,
			actualValue: display?.actualValue ?? tupletNoteValue(lead, this.reader),
			normalValue: display?.normalValue ?? rawNormalValue(lead, this.reader),
			curved: display?.curved ?? false,
			bracketWidth: this.appearance.lineWidth('tuplet bracket'),
			rescale,
			// Signed the way vexflow's own nesting offset is: away from the stave.
			yOffset:
				sameSideNested === 0
					? 0
					: sameSideNested * TUPLET_NESTING_EXTRA_GAP * -location,
			// MusicXML's default is show-number="actual": just the count.
			// vexflow's own default prints the ratio whenever the two numbers
			// differ by more than one, which turns a plain sextuplet into "6:4".
			ratioed: display?.ratioed ?? false,
			...(bracketed !== undefined && { bracketed }),
			...(numNotes != null &&
				notesOccupied != null && { numNotes, notesOccupied }),
		});
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

function stemSide(group: StemmableNote[]): number {
	let up = 0;
	let down = 0;
	for (const note of group) {
		if (note.isRest()) {
			continue;
		}
		if (note.getStemDirection() === Stem.DOWN) {
			down += 1;
		} else {
			up += 1;
		}
	}
	return down > up ? Tuplet.LOCATION_BOTTOM : Tuplet.LOCATION_TOP;
}

/*
 * Default tuplet side when MusicXML leaves `placement` unset: follow the
 * majority stem direction of non-rest notes, defaulting above on a tie or
 * all-rest group (matching MuseScore, Verovio and OSMD on mixed-stem tuplets).
 */
function tupletLocation(
	placement: string | null,
	group: StemmableNote[],
): number {
	if (placement === 'below') {
		return Tuplet.LOCATION_BOTTOM;
	}
	if (placement === 'above') {
		return Tuplet.LOCATION_TOP;
	}
	const side = ledgerLineSide(group);
	if (side !== null) {
		return side;
	}
	return stemSide(group);
}

/*
 * Behind Bars p. 198: when every note of the group sits on ledger lines beyond the stave, the
 * bracket goes on the notehead side, clear of the ledger lines, rather than the stem side that
 * would put it across the whole stave. Null when the group is not entirely out on one side.
 */
function ledgerLineSide(group: StemmableNote[]): number | null {
	let high = true;
	let low = true;
	let any = false;
	for (const note of group) {
		if (note.isRest()) {
			continue;
		}
		any = true;
		const line = (note as { getLineNumber?: () => number }).getLineNumber?.();
		if (line === undefined) {
			return null;
		}
		const down = note.getStemDirection() === Stem.DOWN;
		high &&= line >= 6 && down;
		low &&= line <= 0 && !down;
	}
	if (!any) {
		return null;
	}
	if (high) {
		return Tuplet.LOCATION_TOP;
	}
	return low ? Tuplet.LOCATION_BOTTOM : null;
}

/*
 * Behind Bars p. 200: when a tuplet is only part of a longer beam (the beam also
 * joins notes outside the tuplet), draw a bracket over the tuplet so the numeral
 * does not appear to apply to the entire beam.
 */
function isPartOfLongerBeam(group: readonly StemmableNote[]): boolean {
	if (group.length === 0) {
		return false;
	}
	const inGroup = new Set<StemmableNote>(group);
	for (const note of group) {
		const beam = note.getBeam();
		if (beam?.getNotes().some((member) => !inGroup.has(member))) {
			return true;
		}
	}
	return false;
}

/*
 * Whether a single-note tuplet's written note value still needs vexflow's tick multiplier.
 * Modern tremolo notation writes the full beat (e.g. a quarter note lasting 1 beat with 3:2
 * eighth time-modification), so rescaling it by 2/3 would misalign voices; traditional dotted
 * notation (a dotted quarter lasting 1 beat) needs the 2/3 multiplier.
 */
function needsTickRescale(
	lead: Note,
	note: StemmableNote,
	reader: ScoreReader,
): boolean {
	const actualBeats = reader.beatsOf(lead);
	if (actualBeats === null) {
		return true;
	}
	const writtenBeats = note.getIntrinsicTicks() / QUARTER_NOTE_TICKS;
	return Math.abs(actualBeats - writtenBeats) >= EPSILON;
}

/*
 * Lead notes in a single measure's voice run that belong to a real cross-barline <tuplet>
 * span (an unmatched start whose partner sits in a later measure, or an unmatched stop whose
 * partner sits in an earlier measure). Dangling starts/stops with no partner are ignored.
 * VoiceBuilder rescales their ticks before per-measure formatting so voices stay aligned
 * across the barline, while SpannerResolver draws the unbroken bracket afterwards.
 */
export function crossBarlineTupletLeads(chords: readonly Chord[]): Set<Note> {
	const open = new Map<string, number>();
	let unmatchedStopEnd = -1;
	let unmatchedStartBegin = Infinity;
	chords.forEach((chord, i) => {
		for (const tuplet of chord.lead.tuplets) {
			if (tuplet.tupletType === 'start') {
				open.set(tuplet.number, i);
			} else if (tuplet.tupletType === 'stop') {
				if (open.has(tuplet.number)) {
					open.delete(tuplet.number);
				} else if (
					tuplet.partner &&
					tuplet.partner.note.measure !== chord.lead.measure
				) {
					unmatchedStopEnd = Math.max(unmatchedStopEnd, i);
				}
			}
		}
	});
	for (const [number, startIndex] of open) {
		const startChord = chords[startIndex];
		const marker = startChord?.lead.tuplets.find(
			(t) => t.tupletType === 'start' && t.number === number,
		);
		if (
			marker?.partner &&
			marker.partner.note.measure !== startChord?.lead.measure
		) {
			unmatchedStartBegin = Math.min(unmatchedStartBegin, startIndex);
		}
	}
	const leads = new Set<Note>();
	for (let i = 0; i <= unmatchedStopEnd; i++) {
		const chord = chords[i];
		if (chord) {
			leads.add(chord.lead);
		}
	}
	for (let i = unmatchedStartBegin; i < chords.length; i++) {
		const chord = chords[i];
		if (chord) {
			leads.add(chord.lead);
		}
	}
	return leads;
}
