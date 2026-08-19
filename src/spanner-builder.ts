import type { BeamRun, Chord, Tuplet as MTuplet, Note } from '@stringsync/mdom';
import {
	Beam,
	Curve,
	type CurveOptions,
	PedalMarking,
	type Stave,
	type StaveNote,
	StaveTie,
	Stem,
	type StemmableNote,
	type TabNote,
	TabSlide,
	type TieNotes,
	Tuplet,
	VibratoBracket,
} from 'vexflow';
import {
	SINGLE_SLIDE_GAP,
	SLUR_END_ZONE,
	SLUR_GRACE_ANCHOR,
	SLUR_GRACE_CP_Y,
	SLUR_GRACE_MARGIN,
	SLUR_GRACE_Y_SHIFT,
	SLUR_MARGIN,
	SLUR_MAX_ASPECT,
	SLUR_MIN_CP_Y,
	SLUR_STEM_TIP_SLANT,
	SLUR_WIDTH_FACTOR,
	SLUR_Y_SHIFT,
	TUPLET_NESTING_EXTRA_GAP,
} from './constants';
import {
	CrispCurve,
	CURVE_THICKNESS,
	HeadCurve,
	TabCurve,
} from './curve-shape';
import { Hairpin } from './hairpin';
import { NoteheadArticulation } from './notation-translator';
import { LINE_TYPE_DASH, type PedalMark, type WedgeMark } from './score-reader';
import {
	CrispTabSlide,
	NotationSlide,
	SingleSlide,
	TabSlideLine,
} from './slide-shape';

/*
 * A built slur, with the vertical extent it will be drawn at. A slur is not movable — it's
 * pinned to its two noteheads — so the only way it can stop printing through a neighbouring
 * part's lyrics is for the draw pass to reserve the room its bow needs (it feeds this to
 * recordStaveSpill).
 */
export type SlurCurve = {
	curve: Curve;
	/* The stave the bow is drawn over; absent only if an endpoint lost its stave. */
	stave: Stave | undefined;
	top: number;
	bottom: number;
	left: number;
	right: number;
	/* Whether the bow joins two staves of the same system. Such a curve LIVES in the gap
	 * between them, so it doesn't report spill: it would ask the gap to widen to hold a
	 * curve whose height that same gap sets, and the two would chase each other. It takes
	 * whatever room the notes leave. */
	crossStave: boolean;
};

/*
 * How a <tuplet> start marker asks to be PRINTED, which MusicXML keeps separate from the
 * <time-modification> that compresses the durations: <tuplet-actual>/<tuplet-normal> give the
 * printed pair their own numbers (a "7:5" label over a 3:2 compression), show-number="both"
 * prints the second half of that pair, and `bracket` settles the bracket instead of leaving
 * vexflow to infer it from whether the group is beamed. Nulls mean "not stated" — the caller
 * falls back to the <time-modification> ratio and vexflow's own bracket rule.
 *
 * ponytail: show-number="none" (a bracket with no numeral) and show-type (the note-value
 * glyphs some publishers print beside the number) are ignored. vexflow's Tuplet always draws
 * its text and splits the bracket around it, so either would need a draw() override; no
 * fixture asks for them yet.
 */
type TupletDisplay = {
	numNotes: number | null;
	notesOccupied: number | null;
	ratioed: boolean;
	bracketed: boolean | null;
};

/*
 * The slur-like connectors starting/stopping on a note: its <slur> markers plus any
 * <hammer-on>/<pull-off> in <technical>. In standard notation a hammer-on/pull-off IS
 * just a slur curve (the "H"/"P" label is a tab-only convention), so buildSlurs draws
 * them the same way — including grace-to-main graces. A technique a real <slur> already
 * covers is dropped, so an exporter that emits both doesn't double the arc: either the
 * slur reaches the same partner, or (`spans`) one slur arcs over both of the technique's
 * ends. The second case is a legato run written as one long <slur> plus a hammer-on/pull-off
 * per adjacent pair — the run gets its one arc, not that arc plus a bump over every pair.
 */
type SlurConnector = {
	slurType: string;
	partner: { note: Note } | null;
	placement: string | null;
	/* The canvas dash array from <slur line-type>, or null for a solid curve. A
	 * hammer-on/pull-off has no line-type, so it is always solid. */
	dash: number[] | null;
};

export class SpannerBuilder {
	/*
	 * Beams: map each beam group's notes to their StaveNotes. Built before formatting
	 * so the beamed notes drop their flags.
	 */
	buildBeams(
		groups: BeamRun[],
		byLead: Map<Note, StaveNote>,
		defaultStem?: 'up' | 'down',
		// Overrides what a lead resolves to, for a chord split across two staves: it drew one
		// StaveNote per staff and only one of them is reachable through `byLead`, so the caller
		// supplies the whole set, already ordered the way the beam should run through them.
		notesByLead?: Map<Note, StaveNote[]>,
	): Beam[] {
		const beams: Beam[] = [];
		for (const group of groups) {
			const notes = group.notes
				// Grace notes are beamed by their own GraceNoteGroup; they live in byLead
				// only for slur resolution, so skip them here to avoid a second, conflicting
				// auto-stemmed beam drawn over the ornament.
				.filter((note) => !note.isGrace)
				.flatMap((note) => notesByLead?.get(note) ?? [byLead.get(note)])
				.filter((note): note is StaveNote => note !== undefined);
			if (notes.length > 1) {
				// auto_stem=true picks one direction for the whole group (notes' own
				// autoStem would conflict). But explicit <stem>s (e.g. voice separation)
				// and a multi-voice default direction must stand, so only auto-stem when
				// neither applies.
				const autoStem =
					!defaultStem && group.notes.every((note) => !note.stem);
				const beam = new Beam(notes, autoStem);
				// The beam just settled stem directions; re-pin articulations placed
				// against each note's pre-beam direction onto the notehead side.
				if (autoStem) {
					notes.forEach((note) => {
						this.reorientArticulations(note);
					});
				}
				if (this.isFlatBeam(group, byLead)) {
					beam.renderOptions.flatBeams = true;
					// vexflow parks a flat beam at the group's *average* stem tip, so a group
					// spanning a wide range leaves the note closest to the beam with a stub of
					// a stem. Raise vexflow's floor (default 15) so that shortest stem is a
					// full standard stem. Each extra beam adds another beamWidth * 1.5, which
					// keeps the innermost beam exactly one standard stem from the notehead.
					beam.renderOptions.minFlatBeamOffset =
						Stem.HEIGHT - beam.renderOptions.beamWidth * 1.5;
				}
				if (group.breaksAfter.length > 0) {
					beam.breakSecondaryAt(group.breaksAfter);
				}
				beams.push(beam);
			}
		}
		return beams;
	}

	/*
	 * Beam slope follows the group's contour (Gould, Behind Bars): a beam slants only
	 * when the run moves consistently one way, and is horizontal otherwise — equal outer
	 * pitches, a contour that reverses direction, or a peak/trough sitting in the middle
	 * (the classic "the highest note isn't an outer note, so the beam is flat").
	 *
	 * A chord contributes its top and bottom notes as two parallel voices, and the run
	 * counts as slanting only if *both* move the same way. So two stacked dyads that each
	 * step up (B4/D#5 -> C#5/E5) still slant, while a run that returns to a pitch its
	 * opening chord already sounded ([B2+G#3+D#4] G#3 D#4) goes flat: its bottom voice
	 * rises but its top voice dips and comes back, so there is no direction to slant to.
	 *
	 * Rests and grace notes are excluded: a rest under a beam sits at a fixed staff
	 * position that has nothing to do with the melodic contour, and graces beam on their
	 * own. vexflow's own slope search (capped at ±0.25) still shapes the slanted case.
	 */
	private isFlatBeam(group: BeamRun, byLead: Map<Note, StaveNote>): boolean {
		// vexflow's `line` counts upward from the bottom stave line, so a higher pitch is
		// a larger number.
		const lines = group.notes
			.filter((note) => !note.isGrace && !note.isRest)
			.map((note) => byLead.get(note))
			.filter((note): note is StaveNote => note !== undefined)
			.map((note) => note.getKeyProps().map((key) => key.line));
		const lo = lines.map((event) => Math.min(...event));
		const hi = lines.map((event) => Math.max(...event));
		if (lines.length < 2) {
			return false;
		}
		// sign is +1 to test a rising run, -1 for a falling one.
		const sorted = (voice: number[], sign: number) =>
			voice.every((line, i, all) => {
				const prev = all.at(i - 1);
				return i === 0 || prev === undefined || sign * (line - prev) >= 0;
			});
		const moved = (voice: number[], sign: number) => {
			const first = voice.at(0);
			const last = voice.at(-1);
			return (
				first !== undefined && last !== undefined && sign * (last - first) > 0
			);
		};
		const monotonic = (sign: number) =>
			sorted(lo, sign) &&
			sorted(hi, sign) &&
			(moved(lo, sign) || moved(hi, sign));
		return !monotonic(1) && !monotonic(-1);
	}

	/*
	 * A Beam reassigns one stem direction across its group, which can flip a note's
	 * direction after addArticulations already placed its marks on the old side. Re-pin
	 * each notehead-side articulation to the now-final stem direction. Fermatas (a@a/a@u)
	 * keep their fixed side, so leave them alone.
	 */
	private reorientArticulations(staveNote: StaveNote): void {
		for (const mod of staveNote.getModifiers()) {
			if (mod instanceof NoteheadArticulation) {
				mod.setSide(staveNote);
			}
		}
	}

	/*
	 * Tuplets: a <tuplet>start..stop span covers every note between the two markers
	 * (the inner notes carry no marker), so slice the chord run by index. The ratio
	 * comes from the start note's <time-modification> (e.g. 3:2 -> "3"), unless the
	 * marker prints its own (see tupletDisplay).
	 *
	 * The bracket goes where the start marker's `placement` says, and otherwise on
	 * the stem side of the group — the engraving default, and what MuseScore does.
	 * Beams are built before tuplets, so the stem directions are already settled.
	 *
	 * Spans can NEST (a triplet inside a quintuplet), so the open starts are kept by the
	 * marker's `number` rather than as one slot — an inner start arriving before the outer
	 * stop would otherwise overwrite it and lose the outer bracket entirely. MusicXML
	 * defaults an omitted number to "1", which is also what a flat run of unnumbered
	 * tuplets uses, so they share the slot and pair in order either way.
	 *
	 * vexflow staggers nested brackets itself (Tuplet.getNestedTupletCount), but by a step
	 * shorter than the numeral it centers on each bracket line, so the two numbers print
	 * through each other — hence the extra yOffset, sized by how deep the nesting under this
	 * span goes (the same max-minus-min depth vexflow measures).
	 */
	buildTuplets<T extends StemmableNote>(
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
					});
					continue;
				}
				const opened = tuplet.tupletType === 'stop' && open.get(number);
				if (!opened) {
					continue;
				}
				open.delete(number);
				const { start, depth, maxDepth, placement, display } = opened;
				const group = chords
					.slice(start, i + 1)
					.map((c) => byLead.get(c.lead))
					.filter((n): n is T => n !== undefined);
				if (group.length > 1) {
					const ratio = chords[start]?.lead.timeModification;
					const numNotes = display?.numNotes ?? ratio?.actual;
					const notesOccupied = display?.notesOccupied ?? ratio?.normal;
					// ponytail: the first non-rest speaks for the group — a mixed-stem
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
						new Tuplet(group, {
							location,
							// Signed the way vexflow's own nesting offset is: away from the stave.
							yOffset:
								(maxDepth - depth) * TUPLET_NESTING_EXTRA_GAP * -location,
							// MusicXML's default is show-number="actual" — just the count.
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

	/*
	 * Ties (<tied>) and slurs (<slur>) both connect a start note to its partner;
	 * ties draw as a StaveTie, slurs as a Curve. Drawn after the notes are placed.
	 */
	buildTies(chords: Chord[], byLead: Map<Note, StaveNote>): StaveTie[] {
		// Each chord member can carry its own tie, so map every note (not just the lead)
		// to its StaveNote and notehead index — the tie must land on the right notehead,
		// and its partner may itself be a chord member.
		const placement = new Map<Note, { staveNote: StaveNote; index: number }>();
		const chordOf = new Map<Note, Chord>();
		for (const chord of chords) {
			const staveNote = byLead.get(chord.lead);
			if (staveNote) {
				chord.notes.forEach((note, index) => {
					placement.set(note, { staveNote, index });
					chordOf.set(note, chord);
				});
			}
		}

		const ties: StaveTie[] = [];
		for (const chord of chords) {
			const heads = chord.notes.length;
			for (const note of chord.notes) {
				const from = placement.get(note);
				for (const tie of note.ties) {
					// A tie always joins two notes of the same pitch. When the partner is a
					// chord, mdom can't tell which member it lands on — chord <tied>s usually
					// share number "1", so partner() pairs every start to the chord's first
					// stop. Re-resolve to the same-pitch member so the tie hits the right
					// notehead.
					const partnerNote =
						(tie.partner &&
							this.samePitchMember(note, chordOf.get(tie.partner.note))) ??
						tie.partner?.note;
					const to = partnerNote && placement.get(partnerNote);
					if (tie.tieType !== 'start' || !from || !to) {
						continue;
					}
					// A chord member's tie bows away from the chord's center: upper-half
					// notes arc over the top (direction -1), the lower half under the bottom
					// (+1). Otherwise vexflow defaults every tie to the stem direction, so a
					// stem-up chord's top notes would tuck underneath instead of over. Single
					// notes keep that default (a tie opposite the lone stem).
					const direction =
						heads > 1 ? (from.index >= (heads - 1) / 2 ? -1 : 1) : null;

					const specs = this.tieSpecs(
						from.staveNote,
						to.staveNote,
						[from.index],
						[to.index],
					);
					for (const spec of specs) {
						const staveTie = new StaveTie(spec);
						if (direction !== null) {
							staveTie.setDirection(direction);
						}
						ties.push(staveTie);
					}
				}
			}
		}
		return ties;
	}

	/*
	 * Hammer-ons and pull-offs on a TAB stave. Both are notated with a plain <slur> and draw
	 * as a TabCurve — the same bow the notation stave's slurs get, rather than vexflow's
	 * flatter TabTie arc. Which of the two it is doesn't change the drawing: the arc plus the
	 * fret motion says it (higher target = hammer-on, lower = pull-off), so the "H"/"P" letters
	 * vexflow prints are left off. Reads the same slurConnectors buildSlurs does, so a
	 * <hammer-on>/<pull-off> written WITHOUT a companion <slur> draws on the tab stave too —
	 * otherwise the notation stave shows an arc the tab is missing.
	 */
	buildHammerPulls(chords: Chord[], byTabLead: Map<Note, TabNote>): TabCurve[] {
		const ties: TabCurve[] = [];
		const spans = this.slurSpans(chords);
		for (const chord of chords) {
			const firstNote = byTabLead.get(chord.lead);
			if (!firstNote) {
				continue;
			}
			for (const slur of this.slurConnectors(chord.lead, spans)) {
				if (slur.slurType !== 'start') {
					continue;
				}
				const partner = slur.partner?.note ?? null;
				const lastNote = partner && byTabLead.get(partner);
				// An unclosed slur (no resolved partner) isn't a real hammer-on/pull-off;
				// skip it rather than drawing a dangling tie.
				if (!partner || !lastNote) {
					continue;
				}
				const { firstIndexes, lastIndexes } = this.pairByString(
					firstNote,
					lastNote,
				);
				const specs = this.tieSpecs(
					firstNote,
					lastNote,
					firstIndexes,
					lastIndexes,
				);
				for (const notes of specs) {
					// One arc per shared string: a two-string chord hammering into another draws
					// two. (TabTie took the whole index list and looped internally; a Curve is a
					// single bow, so the loop is here.)
					notes.firstIndexes?.forEach((firstIndex, i) => {
						const lastIndex = notes.lastIndexes?.[i] ?? firstIndex;
						ties.push(new TabCurve(notes, firstIndex, lastIndex));
					});
				}
			}
		}
		return ties;
	}

	/*
	 * Slides on a TAB stave: a <slide> (or <glissando>) start..stop pair, drawn as a
	 * TabSlide — a diagonal line between the two frets, angled up or down by the fret
	 * motion. Paired by `number` like every spanner; resolved over the whole score so a
	 * slide can cross a barline. (Unlike hammer/pull there's no "H"/"P" label, so the
	 * slide direction is purely cosmetic — vexflow just tilts the line.)
	 */
	buildSlides(
		chords: Chord[],
		byTabLead: Map<Note, TabNote>,
		showText: boolean,
	): Array<TabSlideLine | SingleSlide> {
		const slides: Array<TabSlideLine | SingleSlide> = [];
		const open = new Map<string, { note: TabNote; fret: number }>();
		for (const chord of chords) {
			const tabNote = byTabLead.get(chord.lead);
			if (!tabNote) {
				continue;
			}
			const markers = [
				...chord.lead.slides.map((s) => ({
					number: s.number,
					type: s.slideType,
				})),
				...chord.lead.glissandos.map((g) => ({
					number: g.number,
					type: g.glissandoType,
				})),
			];
			for (const marker of markers) {
				const number = marker.number;
				const fret = chord.lead.fret ?? 0;
				if (marker.type === 'start') {
					open.set(number, { note: tabNote, fret });
				} else if (marker.type === 'stop') {
					const from = open.get(number);
					open.delete(number);
					if (!from) {
						// A stop with no matching start is a slide *into* this note from an
						// indeterminate origin — a "/8" tick left of the fret, not a line.
						slides.push(new SingleSlide(tabNote, 0, 'in', SINGLE_SLIDE_GAP));
						continue;
					}
					const notes: TieNotes = {
						firstNote: from.note,
						lastNote: tabNote,
						firstIndexes: from.note.getPositions().map((_, i) => i),
						lastIndexes: tabNote.getPositions().map((_, i) => i),
					};
					const slide = new CrispTabSlide(
						notes,
						fret > from.fret ? TabSlide.SLIDE_UP : TabSlide.SLIDE_DOWN,
					);
					// The line always draws; clear the "sl." label when the text is off.
					if (!showText) {
						slide.setText('');
					}
					slides.push(new TabSlideLine(slide));
				}
			}
		}
		// A start left unclosed is a slide *out* of that note to an indeterminate target — a
		// tick right of the fret. (showText only labels paired "sl." lines, not these ticks.)
		for (const { note } of open.values()) {
			slides.push(new SingleSlide(note, 0, 'out', SINGLE_SLIDE_GAP));
		}
		return slides;
	}

	/*
	 * Glissandos/slides on a standard-notation stave: a <slide> (or <glissando>)
	 * start..stop pair drawn as a StaveLine — a straight line between the two
	 * noteheads (the tab counterpart is buildSlides, a tilted TabSlide). Paired by
	 * `number` and resolved over the whole score so a slide can cross a barline. The
	 * grace lead is in byLead too, so this covers a grace note that slides into the
	 * main note it precedes.
	 */
	buildGlissandos(
		chords: Chord[],
		byLead: Map<Note, StaveNote>,
	): Array<NotationSlide | SingleSlide> {
		// A slide can sit on any chord member (a two-note chord may slide both notes,
		// each with its own <slide number>), so map every note — not just the lead —
		// to its StaveNote and notehead index. Otherwise only the lead's line draws.
		const placement = new Map<Note, { staveNote: StaveNote; index: number }>();
		for (const chord of chords) {
			const staveNote = byLead.get(chord.lead);
			if (staveNote) {
				chord.notes.forEach((note, index) => {
					placement.set(note, { staveNote, index });
				});
			}
		}

		const lines: Array<NotationSlide | SingleSlide> = [];
		const open = new Map<string, { staveNote: StaveNote; index: number }>();
		for (const chord of chords) {
			for (const note of chord.notes) {
				const at = placement.get(note);
				if (!at) {
					continue;
				}
				const markers = [
					...note.slides.map((s) => ({ number: s.number, type: s.slideType })),
					...note.glissandos.map((g) => ({
						number: g.number,
						type: g.glissandoType,
					})),
				];
				for (const marker of markers) {
					if (marker.type === 'start') {
						open.set(marker.number, at);
					} else if (marker.type === 'stop') {
						const from = open.get(marker.number);
						open.delete(marker.number);
						if (!from) {
							// Stop with no start: a slide *into* this note (a "/" tick left of
							// the head) — the notation counterpart of the tab slide-in.
							lines.push(new SingleSlide(at.staveNote, at.index, 'in'));
							continue;
						}
						lines.push(
							new NotationSlide(
								from.staveNote,
								from.index,
								at.staveNote,
								at.index,
							),
						);
					}
				}
			}
		}
		// A start left unclosed is a slide *out* of that note — a "/" tick right of the head.
		for (const at of open.values()) {
			lines.push(
				new SingleSlide(at.staveNote, at.index, 'out', SINGLE_SLIDE_GAP),
			);
		}
		return lines;
	}

	/*
	 * Hairpins (<direction><wedge>): a start..stop pair drawn as a vexflow StaveHairpin —
	 * an opening wedge for a crescendo, a closing one for a diminuendo — on the side of the
	 * staff the direction's placement names (below by default). Paired by `number` and
	 * resolved over the whole score (a hairpin can span barlines) like the other spanners;
	 * the markers arrive in document order, so each stop closes the matching open start.
	 * ponytail: a hairpin whose stop wraps onto a later system isn't split into two partial
	 * hairpins the way buildTies splits a wrapped tie; it would draw right-to-left across
	 * the page. Add the split if a fixture needs one.
	 */
	buildWedges(markers: WedgeMark[], byLead: Map<Note, StaveNote>): Hairpin[] {
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
			if (!from || !firstNote || !lastNote || firstNote === lastNote) {
				continue;
			}
			wedges.push(
				new Hairpin(firstNote, lastNote, from.crescendo, from.placement),
			);
		}
		return wedges;
	}

	/*
	 * Trill extension lines (<notations><ornaments><wavy-line>): a start..stop pair drawn as a
	 * vexflow VibratoBracket — the wavy line running from a trill across the notes it is held
	 * over. Paired by `number` over the whole score like the other spanners, so a run of
	 * trilled notes (each carrying a stop and then a start) comes out as a chain of brackets
	 * that meet end to end.
	 * ponytail: the marker's placement is ignored — vexflow's bracket only draws above the
	 * stave, which is where a trill line belongs anyway.
	 */
	buildWavyLines(
		chords: Chord[],
		byLead: Map<Note, StaveNote>,
	): VibratoBracket[] {
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
				// A stop with no open start, or a zero-width span, has no line to draw.
				if (from && from !== staveNote) {
					brackets.push(new VibratoBracket({ start: from, stop: staveNote }));
				}
			}
		}
		return brackets;
	}

	/*
	 * Sustain pedals (<direction><pedal>): a start..stop pair drawn as a vexflow
	 * PedalMarking under the stave — the "Ped…*" text by default, or a bracket line
	 * when the MusicXML carries line="yes". Paired by `number` and resolved over the
	 * whole score (a pedal can span barlines) like the other spanners; the markers
	 * arrive in document order, so each stop closes the matching open start.
	 * ponytail: a pedal whose stop wraps onto a later system isn't split — vexflow
	 * throws on descending x, so a wrapping pedal would need the partial-span handling
	 * buildTies uses; add it if a fixture needs one.
	 *
	 * Each marking comes back with the notes it covers so the caller can drop it clear
	 * of any that reach down into its band (see DrawPass.finishPass).
	 */
	buildPedals(
		markers: PedalMark[],
		byLead: Map<Note, StaveNote>,
		chords: Chord[],
	): { marking: PedalMarking; notes: StaveNote[] }[] {
		const pedals: { marking: PedalMarking; notes: StaveNote[] }[] = [];
		const open = new Map<string, { note: StaveNote; line: boolean }>();
		for (const marker of markers) {
			const staveNote = byLead.get(marker.lead);
			if (!staveNote) {
				continue;
			}
			if (marker.type === 'start') {
				open.set(marker.number, { note: staveNote, line: marker.line });
			} else {
				const from = open.get(marker.number);
				open.delete(marker.number);
				if (!from) {
					continue;
				}
				const marking = PedalMarking.createSustain([from.note, staveNote]);
				if (from.line) {
					marking.setType(PedalMarking.type.BRACKET);
				}
				pedals.push({
					marking,
					notes: this.pedalSpan(chords, byLead, from.note, staveNote),
				});
			}
		}
		return pedals;
	}

	/*
	 * vexflow anchors a Curve only at its two endpoints, so the arc ignores notes in
	 * between and a high (or low) middle note pokes through it. We anchor each
	 * endpoint on the bulge side of its own noteheads, then raise the bezier control
	 * points so the arc clears the most extreme note it spans.
	 */
	buildSlurs(
		chords: Chord[],
		byLead: ReadonlyMap<Note, StaveNote>,
	): SlurCurve[] {
		const slurs: SlurCurve[] = [];
		const spans = this.slurSpans(chords);
		chords.forEach((chord, i) => {
			const from = byLead.get(chord.lead);
			const isGrace = chord.lead.isGrace;
			for (const slur of this.slurConnectors(chord.lead, spans)) {
				if (slur.slurType !== 'start' || !slur.partner || !from) {
					continue;
				}
				const partner = slur.partner.note;
				const to = byLead.get(partner);
				if (!to) {
					continue;
				}
				const j = chords.findIndex((c) => c.lead === partner);
				// `chords` is the whole score in document order, so the slice between two
				// notes also sweeps up every other part, stave and voice that happens to be
				// notated in between — the last note of a bass-stave voice and the first note
				// of the next measure's same voice are separated by the whole treble stave.
				// Clearing those would inflate a two-note bow into a spike reaching the stave
				// above, so only notes sharing a stave with an endpoint count.
				const span =
					j > i
						? chords
								.slice(i, j + 1)
								.map((c) => byLead.get(c.lead))
								.filter((n): n is StaveNote => n !== undefined)
								.filter(
									(n) =>
										n.getStave() === from.getStave() ||
										n.getStave() === to.getStave(),
								)
						: [from, to];

				// A cross-stave slur: the two ends sit on different staves of the same system,
				// because the run is beamed out of one hand's stave up into the other's. A stop
				// that WRAPS onto a later system is on another stave too, but that splits into
				// two half-curves below and each half stays put — hence the Y test, which reads
				// "the stop's stave is HIGHER on the page", the one thing a wrap can't be.
				const fromStave = from.getStave();
				const toStave = to.getStave();
				const crossStave =
					!!fromStave && !!toStave && toStave.getY() < fromStave.getY();

				// Bulge up for placement="above", down for "below", otherwise opposite the
				// stems (slurs sit on the notehead side). The opening direction forces the
				// arc's sign even when the two endpoints' stems disagree. A grace-to-main
				// slur always hugs under (under the grace, down to the main notehead),
				// ignoring placement — grace slurs read as a consistent underneath bow.
				// A cross-stave slur overrides placement the same way, in the other direction:
				// its ends are a stave apart, so a "below" bow has to duck under the beam and
				// then dive most of a stave to reach the far end, which reads as a spike rather
				// than a slur. Above, the same span is one arc riding over the run.
				const bulgeUp = isGrace
					? false
					: crossStave
						? true
						: slur.placement === 'above'
							? true
							: slur.placement === 'below'
								? false
								: // Stems disagreeing across the slur put it above the notes
									// (Gould): a bow from a stem-up note to a stem-down one has no
									// notehead side to follow, and below it has to dive under the
									// whole run to reach the far end.
									from.getStemDirection() !== to.getStemDirection() ||
									from.getStemDirection() !== 1;

				// Anchor each endpoint on the bulge side of its own note: NEAR_TOP (the stem
				// tip) when that stem points toward the bulge, else NEAR_HEAD (the outer
				// notehead). This keeps an "above" slur on stem-down notes pinned to the
				// noteheads instead of the stem tips below them.
				//
				// Applied per note that rule can pin one end to a notehead and the other to a
				// stem tip, which is fine when the stems are short but not when they aren't: a
				// low note beamed up out of the stave has a stem taller than the stave, so a
				// slur joining it to its neighbour's notehead comes out as a near-vertical
				// whip. A slur is a bow between two points at comparable heights, so choose
				// per slur rather than per note — take the stem tips only while they leave the
				// two ends at least as level as the noteheads would.
				//
				// Unless an end is BEAMED on the bulge side, where the notehead is the worse anchor
				// however level it is: the beam is a bar lying between that notehead and the bow, so
				// a curve leaving the notehead climbs out through it. Such a slur takes the stem
				// tips — the beam's own outer edge — as long as its span is wide enough to carry the
				// drop as a slant (SLUR_STEM_TIP_SLANT). That budget is what still holds the whip
				// case above to the noteheads: its far stem is a stave tall over two adjacent notes.
				const towardBulge = (note: StaveNote) =>
					(note.getStemDirection() === 1) === bulgeUp;
				// vexflow's getStemExtents() names these backwards from how they read: baseY is
				// the notehead the stem grows out of, topY its free tip (see anchorY below).
				const stemAnchorY = (note: StaveNote) => {
					const { topY, baseY } = note.getStemExtents();
					return towardBulge(note) ? topY : baseY;
				};
				const headAnchorY = (note: StaveNote) => note.getStemExtents().baseY;
				// Measure both candidates against their own stave. On a slur that wraps onto a
				// later system the two ends sit a system apart, so raw Ys differ by the row gap
				// and that would swamp the comparison; stave-relative heights are what "level"
				// means for the two halves it splits into. Same-stave slurs are unaffected — the
				// offsets cancel.
				const relative = (note: StaveNote, y: number) =>
					y - (note.getStave()?.getY() ?? 0);
				const spread = (anchorY: (note: StaveNote) => number) =>
					Math.abs(relative(from, anchorY(from)) - relative(to, anchorY(to)));
				const beamedOnBulgeSide = [from, to].some(
					(note) => note.hasBeam() && towardBulge(note),
				);
				const slantBudget = beamedOnBulgeSide
					? Math.abs(to.getAbsoluteX() - from.getAbsoluteX()) *
						SLUR_STEM_TIP_SLANT
					: 0;
				// A cross-stave slur takes the noteheads whatever that comparison says. Its two
				// ends are a stave apart, so neither anchor makes them level and the test is
				// really measuring the gap between the staves; meanwhile the stem tip of a note
				// beamed WITHIN its own stave is the beam's outer edge, which leaves the curve
				// starting in the white space beside a beam it then crosses anyway. The
				// notehead is the only end that reads as attached to its note.
				const useStemTips =
					!crossStave &&
					spread(stemAnchorY) <= Math.max(spread(headAnchorY), slantBudget);
				const metric = (note: StaveNote) =>
					useStemTips && towardBulge(note)
						? Curve.Position.NEAR_TOP
						: Curve.Position.NEAR_HEAD;

				// Where a grace curve's ends land, per SLUR_GRACE_ANCHOR. Neither vexflow
				// position metric works here: on a stem-down chord NEAR_HEAD is the *top*
				// note (the wrong end of the chord entirely), so resolve the Y explicitly
				// and hand it to HeadCurve. Always the bulge side, so an above-bulging
				// curve mirrors the same rule upward.
				const anchorY = (note: StaveNote) => {
					const bulgeSide = (top: number, bottom: number) =>
						bulgeUp ? Math.min(top, bottom) : Math.max(top, bottom);
					const { yTop, yBottom } = note.getNoteHeadBounds();
					if (SLUR_GRACE_ANCHOR === 'notehead' || !note.hasStem()) {
						return bulgeSide(yTop, yBottom);
					}
					// vexflow names these backwards from how they read: baseY is the notehead
					// the stem grows out of, topY its free tip. The bulge-side extreme of the
					// two is the end of the stem the curve should meet.
					const { topY, baseY } = note.getStemExtents();
					return bulgeSide(topY, baseY);
				};

				// Lift the control points so the arc midpoint clears the most extreme note
				// in the span and bows well off the noteheads. yShift raises the endpoints
				// off the notes; 0.75*cps.y is the extra rise the cubic bezier gains at its
				// midpoint. The arc height also grows with the slur's width so long slurs get
				// a rounder, taller bow instead of a flat line skimming the noteheads. A grace
				// curve measures against its own anchors instead, so the bow it draws is the
				// one its endpoints ask for — change SLUR_GRACE_ANCHOR and the depth follows.
				const extentsOf = (n: StaveNote) => {
					if (isGrace) {
						const y = anchorY(n);
						return { top: y, bottom: y };
					}
					return this.noteExtents(n);
				};
				// A grace-to-main curve hugs directly under the two noteheads with a small
				// tight bow instead of the fuller slur arc (see the SLUR_GRACE_* constants).
				const baseYShift = isGrace ? SLUR_GRACE_Y_SHIFT : SLUR_Y_SHIFT;
				const dir = bulgeUp ? -1 : 1;

				// The exact Y each end of the curve will be drawn at: what HeadCurve was handed
				// for a grace, and what vexflow reads off getStemExtents() for everything else.
				const endpointY = (note: StaveNote) => {
					if (isGrace) {
						return anchorY(note);
					}
					const { topY, baseY } = note.getStemExtents();
					return metric(note) === Curve.Position.NEAR_TOP ? topY : baseY;
				};

				// How far the bow stands off its chord (the straight line joining the two
				// drawn ends) at horizontal fraction `s` of the span, per unit of cpY. vexflow
				// lifts both control points off the chord by the same cpY, so the cubic reduces
				// to 3s(1-s): 0.75 at the midpoint, tapering to nothing at either end.
				const riseFactor = (s: number) => 3 * s * (1 - s);

				// How the curve clears every note it passes over, given where its two ends are
				// drawn (xL/yL to xR/yR). Two independent knobs, and which one does the work
				// matters:
				//
				//   - `cpY` inflates the bow. Cheap in the middle of the span, where the bow
				//     already stands 0.75*cpY off its chord; useless near the ends, where it
				//     stands off almost nothing and buying clearance there means doming the
				//     whole arc.
				//   - `yShift` lifts both ends, sliding the whole curve off the notes without
				//     changing its shape. Costs the same everywhere along the span.
				//
				// So: solve cpY against the notes in the middle, then lift by whatever is still
				// short anywhere — the notes under the ends, and anything the aspect cap refused
				// to inflate for. A steep near-end obstacle raises the slur off its first
				// notehead instead of ballooning it, which is what a reference engraving does.
				//
				// Clearance is checked at each note's OWN x, not just at the apex: an apex-only
				// test lets the arc skim a note lying under the tapering part. Solving per note
				// also catches notes the old midpoint-vs-extreme comparison couldn't see at all,
				// like one poking above a steeply slanted chord.
				//
				// For a full slur only the notes it passes *over* count — the endpoints are
				// where it attaches, so their own stems must not inflate it. A note beamed up
				// out of the stave has a stem taller than the stave itself, and clearing that
				// from a notehead anchor turns a two-note slur into a narrow spike; with no
				// interior notes the arc takes the floor. A grace curve measures against its own
				// endpoint anchors (extentsOf collapses to anchorY), never a stem, so it has
				// nothing to exclude.
				//
				// A cross-stave slur clears nothing at all. Its two ends are a stave apart, so
				// the run it climbs through sits above its chord for most of the span by
				// construction — no bow gets over that, and solving for it domes the arc across
				// the hand it's leaving. The endpoints alone shape it.
				const clearanceOf = (spanNotes: StaveNote[]) =>
					crossStave
						? []
						: isGrace
							? spanNotes
							: spanNotes.filter((n) => n !== from && n !== to);
				const shapeFor = (
					spanNotes: StaveNote[],
					xL: number,
					xR: number,
					yL: number,
					yR: number,
				) => {
					const width = Math.abs(xR - xL);
					// A grace bow stays tight — it takes the clearance it needs and no more,
					// where a full slur also widens with its span.
					const floor = isGrace
						? SLUR_GRACE_CP_Y
						: Math.max(SLUR_MIN_CP_Y, width * SLUR_WIDTH_FACTOR);
					const margin = isGrace ? SLUR_GRACE_MARGIN : SLUR_MARGIN;
					// How far above the base chord (the line joining the two lifted ends) each
					// note the curve passes over reaches, plus its margin. Only the overshoot
					// past the CHORD counts. Measured against a single Y instead, a note well
					// below an upward-bowing slur (the other voice on the stave, the next
					// measure's lower neighbour) asks the arc to rise by however far below it
					// sits — which turns a two-note bow across a barline into a tall narrow
					// spike.
					const clearances = clearanceOf(spanNotes).map((n) => {
						const s = width ? (n.getAbsoluteX() - xL) / (xR - xL) : 0.5;
						const extents = extentsOf(n);
						const y = bulgeUp ? extents.top : extents.bottom;
						const chordY = yL + dir * baseYShift + s * (yR - yL);
						return { s, need: Math.max(0, dir * (y - chordY) + margin) };
					});
					// Only the notes clear of both ends set the bow's depth. Math.max seeded
					// with 0, not spread bare: with no mid-span notes an unseeded Math.min
					// against the cap would return the cap itself.
					const inflation = Math.max(
						0,
						...clearances
							.filter((c) => c.s >= SLUR_END_ZONE && c.s <= 1 - SLUR_END_ZONE)
							.map((c) => c.need / riseFactor(c.s)),
					);
					// One ceiling for both knobs: how far past its base lift the curve may stand
					// off the chord at all. Beyond this it stops reading as a bow, whether it
					// got there by inflating or by rising, so it stops trying — a slur can't
					// clear everything a span might hold (a second voice, the stem of a run
					// beamed into the other hand) and shouldn't deform itself pretending to.
					const reach = width * SLUR_MAX_ASPECT;
					const cpY = Math.max(floor, Math.min(reach, inflation));
					// Whatever that bow still doesn't reach, the endpoints make up by rising,
					// out of what's left of the same budget.
					const shortfall = Math.max(
						0,
						...clearances.map((c) => c.need - riseFactor(c.s) * cpY),
					);
					const yShift =
						baseYShift + Math.min(shortfall, Math.max(0, reach - 0.75 * cpY));
					return { cpY, yShift };
				};

				const pushCurve = (
					curveFrom: StaveNote | undefined,
					curveTo: StaveNote | undefined,
					position: number,
					positionEnd: number,
					{ cpY, yShift }: { cpY: number; yShift: number },
				) => {
					// vexflow offsets each control point from its OWN endpoint by the same cps.y, so
					// on a slur whose two ends sit at very different heights both points land the
					// same distance above their end — which is nowhere near the line between the
					// two. The far one ends up on the wrong side of its endpoint entirely and the
					// curve flicks up out of the note instead of settling onto it.
					//
					// Offset them from the CHORD (the straight line joining the two ends) instead,
					// each lifted `cpY` off it. vexflow puts the control points a quarter and three
					// quarters of the way along, so the chord there is a quarter of the drop either
					// side of the midpoint — hence the ±slant. What that draws is a parabola over
					// the chord: symmetric bow, both ends tangent to the chord, no hook. The apex
					// is unchanged at chord-midpoint + 0.75*cpY (the cubic's t=0.5 works out to
					// that), so the clearance shapeFor solved for still holds. Level endpoints
					// have no slant and reduce to the old symmetric cps exactly.
					const only = (curveFrom ?? curveTo) as StaveNote;
					const y0 = endpointY(curveFrom ?? only);
					const y1 = endpointY(curveTo ?? only);
					const slant = (y1 - y0) / 4;
					const options: CurveOptions = {
						position,
						positionEnd,
						openingDirection: bulgeUp ? 'down' : 'up',
						yShift,
						cps: [
							{ x: 0, y: cpY + dir * slant },
							{ x: 0, y: cpY - dir * slant },
						],
					};
					const curve = isGrace
						? new HeadCurve(curveFrom, curveTo, options, y0, y1)
						: new CrispCurve(curveFrom, curveTo, options);
					// Where the bow will actually reach. vexflow shifts both endpoints by
					// `yShift` and lands both control points at `depth`, so the cubic's midpoint
					// sits at mid(y0,y1) + dir*(yShift + 0.75*cpY) — the arc's far side, plus the
					// stroke thickness it's drawn with. Reported so the draw pass can reserve the
					// room a bow needs over its stave instead of letting it print into the part
					// above's lyrics.
					const endTop = Math.min(y0, y1) + dir * yShift;
					const endBottom = Math.max(y0, y1) + dir * yShift;
					const apex =
						(y0 + y1) / 2 + dir * (yShift + 0.75 * cpY + CURVE_THICKNESS);
					// A dashed/dotted slur is a single stroked bezier, not the filled lens a
					// solid one is: vexflow's renderCurve already skips the fill and the
					// second (thickness) pass when the element carries a lineDash. The
					// draw pass calls drawWithStyle, which puts the dash on the context.
					// vexflow's ElementStyle spells a dash array space-separated.
					if (slur.dash) {
						curve.setStyle({ lineDash: slur.dash.join(' ') });
					}
					// A half-curve (one end wrapped onto another system) bows out to the edge of
					// the stave it does have.
					const curveStave = (curveFrom ?? curveTo)?.getStave();
					slurs.push({
						curve,
						stave: curveStave,
						top: Math.min(endTop, apex),
						bottom: Math.max(endBottom, apex),
						left: curveFrom?.getAbsoluteX() ?? curveStave?.getTieStartX() ?? 0,
						right: curveTo?.getAbsoluteX() ?? curveStave?.getTieEndX() ?? 0,
						crossStave,
					});
				};

				// When the stop note wraps onto a later system its stave sits lower on the
				// page (greater Y), so a single Curve would slant across the page gap. Split
				// it into two partial curves like a wrapped tie (see tieSpecs): one bowing off
				// the right edge of the start note's stave ("slur to nothing") and one bowing
				// in from the left edge of the stop note's ("slur from nothing"). vexflow
				// renders a Curve given only a `from` or only a `to` exactly so, anchoring the
				// open end at the stave's tie edge. (Y, not X: a slur whose start note is the
				// first in its system shares the stop note's left X but not its row.)
				if (toStave && fromStave && toStave.getY() > fromStave.getY()) {
					// Each half is level: pushCurve reads the open end's Y off the note the half
					// does have, so both its ends sit at that one Y.
					const fromY = endpointY(from);
					const toY = endpointY(to);
					pushCurve(
						from,
						undefined,
						metric(from),
						metric(from),
						shapeFor(
							span.filter((n) => n.getStave() === fromStave),
							from.getAbsoluteX(),
							fromStave.getTieEndX(),
							fromY,
							fromY,
						),
					);
					pushCurve(
						undefined,
						to,
						metric(to),
						metric(to),
						shapeFor(
							span.filter((n) => n.getStave() === toStave),
							toStave.getTieStartX(),
							to.getAbsoluteX(),
							toY,
							toY,
						),
					);
					continue;
				}

				pushCurve(
					from,
					to,
					metric(from),
					metric(to),
					shapeFor(
						span,
						from.getAbsoluteX(),
						to.getAbsoluteX(),
						endpointY(from),
						endpointY(to),
					),
				);
			}
		});
		return slurs;
	}

	/*
	 * The vexflow TieNotes spec(s) for a tie/slur from firstNote to lastNote on the given
	 * notehead/position indexes. Normally one spec spanning both notes; but when the stop note
	 * wraps onto a later system its stave sits lower on the page (greater Y), so a single tie
	 * would draw as one long diagonal across the page — split it into two partial ties, one
	 * bowing off the right edge of the start note's stave ("tie to nothing") and one bowing in
	 * from the left edge of the stop note's ("tie from nothing"). vexflow renders a tie given
	 * only a firstNote (or only a lastNote) exactly so. Shared by buildTies and buildHammerPulls.
	 * Y, not X: a tie whose start note is the first in its system shares the stop note's left X
	 * but not its row, so an X-compare would miss the wrap and draw the diagonal.
	 * ponytail: the y-compare assumes the two ends share a system row when not wrapped (true for
	 * a single-stave pitch continuation or a fretted line); a cross-staff tie on one system would
	 * misfire as a wrap.
	 */
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

	/*
	 * The position indexes a hammer-on/pull-off arc connects: each string played by both
	 * notes, paired up. A hammer-on runs along one string, so a two-string chord hammering
	 * into another draws one arc per shared string. Positions with no counterpart drop out —
	 * that's how an arpeggiated chord hammering into a single note stays drawable: the two
	 * lists have to stay the same length to pair up. Falls back to the lead position on both sides
	 * when the two share no string at all (a slur across strings isn't really a hammer-on,
	 * but it still has to draw something).
	 */
	private pairByString(
		firstNote: TabNote,
		lastNote: TabNote,
	): { firstIndexes: number[]; lastIndexes: number[] } {
		const lastPositions = lastNote.getPositions();
		const firstIndexes: number[] = [];
		const lastIndexes: number[] = [];
		firstNote.getPositions().forEach((position, i) => {
			const j = lastPositions.findIndex((other) => other.str === position.str);
			if (j >= 0) {
				firstIndexes.push(i);
				lastIndexes.push(j);
			}
		});
		return firstIndexes.length > 0
			? { firstIndexes, lastIndexes }
			: { firstIndexes: [0], lastIndexes: [0] };
	}

	private tieSpecs(
		firstNote: StaveNote | TabNote,
		lastNote: StaveNote | TabNote,
		firstIndexes: number[],
		lastIndexes: number[],
	): TieNotes[] {
		const wraps =
			(lastNote.getStave()?.getY() ?? 0) > (firstNote.getStave()?.getY() ?? 0);
		return wraps
			? [
					{ firstNote, firstIndexes, lastIndexes: firstIndexes },
					{ lastNote, firstIndexes: lastIndexes, lastIndexes },
				]
			: [{ firstNote, lastNote, firstIndexes, lastIndexes }];
	}

	/*
	 * The member of `chord` whose pitch matches `note` (a tie's two ends are always the
	 * same pitch), or null when there's no chord or no match.
	 */
	private samePitchMember(note: Note, chord: Chord | undefined): Note | null {
		const p = note.pitch;
		if (!chord || !p) {
			return null;
		}
		return (
			chord.notes.find(
				(n) =>
					n.pitch?.step === p.step &&
					n.pitch?.octave === p.octave &&
					n.pitch?.alter === p.alter,
			) ?? null
		);
	}

	private slurConnectors(
		note: Note,
		spans: Array<Set<Note>> = [],
	): SlurConnector[] {
		const slurTargets = new Set(note.slurs.map((s) => s.partner?.note ?? null));
		const techniques: SlurConnector[] = [
			...note.hammerOns.map((h) => ({
				slurType: h.hammerOnType,
				partner: h.partner,
				placement: null,
				dash: null,
			})),
			...note.pullOffs.map((p) => ({
				slurType: p.pullOffType,
				partner: p.partner,
				placement: null,
				dash: null,
			})),
		].filter((t) => {
			const partner = t.partner?.note ?? null;
			return (
				!slurTargets.has(partner) &&
				!spans.some((span) => span.has(note) && !!partner && span.has(partner))
			);
		});
		return [
			...note.slurs.map((s) => {
				const partner = s.partner?.note ?? null;
				return {
					slurType: s.slurType,
					partner: partner && { note: partner },
					placement: s.placement,
					dash: LINE_TYPE_DASH[s.lineType ?? 'solid'] ?? null,
				};
			}),
			...techniques,
		];
	}

	/*
	 * Every note each resolved <slur> arcs over, one set per slur. Used by slurConnectors to
	 * spot a hammer-on/pull-off the slur already covers. Only leads carry slurs here, and a
	 * span whose partner isn't a lead (or runs backwards) has no notes to cover, so it drops out.
	 */
	private slurSpans(chords: Chord[]): Array<Set<Note>> {
		const leads = chords.map((chord) => chord.lead);
		const index = new Map(leads.map((note, i) => [note, i]));
		const spans: Array<Set<Note>> = [];
		leads.forEach((note, i) => {
			for (const slur of note.slurs) {
				const j =
					slur.slurType === 'start' && slur.partner
						? (index.get(slur.partner.note) ?? -1)
						: -1;
				if (j > i) {
					spans.push(new Set(leads.slice(i, j + 1)));
				}
			}
		});
		return spans;
	}

	/*
	 * The highest (smallest y) and lowest (largest y) drawn point of a note,
	 * covering both its noteheads and, when present, its stem tip.
	 */
	private noteExtents(note: StaveNote): { top: number; bottom: number } {
		const { yTop, yBottom } = note.getNoteHeadBounds();
		let top = yTop;
		let bottom = yBottom;
		if (note.hasStem()) {
			const { topY, baseY } = note.getStemExtents();
			top = Math.min(top, topY, baseY);
			bottom = Math.max(bottom, topY, baseY);
		}
		return { top, bottom };
	}

	private tupletDisplay(marker: MTuplet): TupletDisplay {
		return {
			numNotes: marker.actual?.number ?? null,
			notesOccupied: marker.normal?.number ?? null,
			ratioed: marker.showNumber === 'both',
			bracketed: marker.bracket,
		};
	}
}
