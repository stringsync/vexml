// vet-ignore-file compact-files: came in at this size from the upstream repository; splitting it is a refactor of its own
import type { BeamRun, Chord, Tuplet as MTuplet, Note } from '@stringsync/mdom';
import {
	Articulation,
	Beam,
	Curve,
	type CurveOptions,
	Modifier,
	type PedalMarking,
	type Stave,
	type StaveNote,
	type StaveTie,
	Stem,
	type StemmableNote,
	type TabNote,
	TabSlide,
	type TieNotes,
	Tuplet,
	VibratoBracket,
} from 'vexflow/core';
import { Appearance } from './appearance';
import { BowedTremolo } from './bowed-tremolo';
import {
	SINGLE_SLIDE_GAP,
	SLUR_ACCIDENTAL_GAP,
	SLUR_BOW_ASPECT,
	SLUR_BOW_FLAT_WIDTH,
	SLUR_BOW_GROWTH,
	SLUR_BOW_MAX,
	SLUR_BOW_MIN,
	SLUR_END_ZONE,
	SLUR_GHOST_MAX_BETWEEN,
	SLUR_GHOST_OVERLAP,
	SLUR_GHOST_STEEPNESS,
	SLUR_GRACE_ANCHOR,
	SLUR_GRACE_CP_Y,
	SLUR_GRACE_MARGIN,
	SLUR_GRACE_Y_SHIFT,
	SLUR_MARGIN,
	SLUR_MARK_GAP,
	SLUR_MAX_ASPECT,
	SLUR_MAX_CP_Y,
	SLUR_MIN_SHOULDER,
	SLUR_SHOULDER,
	SLUR_STEM_TIP_SLANT,
	SLUR_Y_SHIFT,
	TUPLET_NESTING_EXTRA_GAP,
} from './constants';
import { CrispCurve, CURVE_THICKNESS, curveThickness } from './crisp-curve';
import { CrispTabSlide } from './crisp-tab-slide';
import { DashedTie } from './dashed-tie';
import { DisplayTuplet, type TupletNoteValue } from './display-tuplet';
import { type BeamFan, FeatheredBeam } from './feathered-beam';
import { Hairpin } from './hairpin';
import { HeadCurve } from './head-curve';
import { Ink } from './ink';
import { NotationSlide } from './notation-slide';
import { NoteheadArticulation } from './notehead-articulation';
import { PedalLine } from './pedal-line';
import {
	curveSegmentOf,
	type DocumentBezier,
	lineDashOf,
	type PedalMark,
	type ScoreReader,
	type WedgeMark,
} from './score-reader';
import { SingleSlide } from './single-slide';
import { SpacedBeam } from './spaced-beam';
import { TabCurve } from './tab-curve';
import { TabSlideLine } from './tab-slide-line';

// A trailing hairpin leaves air before its measure’s barline.
const HAIRPIN_BARLINE_GAP = 4;

/* A drawn note a spanner can end on: all a scope reads is which stave it landed on. */
export interface SpanEnd {
	getStave(): Stave | undefined;
}

/*
 * Which spanners one build call owns. A whole-score resolve owns all of them; drawing a
 * system at a time hands the builders a window of chords reaching back to the oldest open
 * start, and owns only what the system just drawn completes, so a spanner whose two ends
 * both landed earlier isn't drawn twice.
 */
export interface SpanScope {
	/** Whether the spanner joining these two drawn ends is this call's to draw. */
	owns(from: SpanEnd, to: SpanEnd): boolean;
	/** Whether a start left unpaired, drawn alone as a tick, is this call's to draw: it is
	 * once no partner can arrive anymore. */
	ownsOpen(start: Note): boolean;
}

export const WHOLE_SCORE: SpanScope = {
	owns: () => true,
	ownsOpen: () => true,
};

/* How SpannerBuilder.buildSlides draws and which slides it owns. */
export interface SlideOptions {
	/** Print the "sl." label on each paired slide (the line always draws). */
	showText: boolean;
	scope?: SpanScope;
}
type BeamOptions = {
	defaultStem?: 'up' | 'down';
	/* Overrides what a lead resolves to, for a chord split across two staves: it drew one
	 * StaveNote per staff and only one of them is reachable through `byLead`, so the caller
	 * supplies the whole set, already ordered the way the beam should run through them. */
	notesByLead?: Map<Note, StaveNote[]>;
};

/** How many px cheaper the other side must score before it replaces the rules' side. */
const PREFERRED_SIDE_BONUS = 8;

export class SpannerBuilder {
	private readonly connectors = new Map<
		Note,
		{ slurs: SlurConnector[]; techniques: SlurConnector[] }
	>();
	// A note's starting ties with their partners, read once: like a slur's, a tie's partner
	// re-pairs every tie in the part.
	private readonly ties = new Map<Note, TieEnd[]>();
	private readonly reaches = new Map<Note, number>();
	// The document's line widths the spanners draw with: set afresh by every draw pass.
	private appearance = Appearance.NONE;
	private documentCurves = false;

	constructor(private readonly reader: ScoreReader) {}

	useDocumentCurves(enabled: boolean): void {
		if (enabled !== this.documentCurves) {
			this.connectors.clear();
			this.ties.clear();
			this.reaches.clear();
		}
		this.documentCurves = enabled;
	}

	/* Draw the spanners built from here on to the document's line widths (Appearance.NONE
	 * keeps vexml's own). */
	useAppearance(appearance: Appearance): void {
		this.appearance = appearance;
	}

	/*
	 * Two-note tremolos: each <tremolo type="start"> pairs with the next "stop" in the voice's
	 * chords, and the slashes between their stems are drawn once the notes are placed.
	 */
	buildTremolos(chords: Chord[], byLead: Map<Note, StaveNote>): BowedTremolo[] {
		const out: BowedTremolo[] = [];
		let open: { note: StaveNote; marks: number } | undefined;
		for (const { lead } of chords) {
			const staveNote = byLead.get(lead);
			const tremolo = this.reader
				.ornamentsOf(lead)
				.find((o) => o.ornamentType === 'tremolo');
			if (!staveNote || !tremolo) {
				continue;
			}
			if (tremolo.tremoloType === 'start') {
				open = { note: staveNote, marks: tremolo.tremoloMarks || 1 };
			} else if (tremolo.tremoloType === 'stop' && open) {
				out.push(new BowedTremolo(open.note, staveNote, open.marks));
				open = undefined;
			}
		}
		return out;
	}

	/*
	 * Beams: map each beam group's notes to their StaveNotes. Built before formatting
	 * so the beamed notes drop their flags.
	 */
	buildBeams(
		groups: BeamRun[],
		byLead: Map<Note, StaveNote>,
		opts: BeamOptions = {},
	): Beam[] {
		const { defaultStem, notesByLead } = opts;
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
				// The translator builds such a group already stemmed the beam's way, so the Beam
				// only has to re-stem (rebuilding every notehead, and dropping slash heads) when
				// it didn't.
				const autoStem =
					!defaultStem &&
					group.notes.every((note) => !note.stem) &&
					!notes.every((note) => note.getStemDirection() === beamStem(notes));
				const beam = this.beamOf(notes, autoStem, fanOf(group, this.reader));
				beam.renderOptions.beamWidth =
					this.appearance.lineWidth('beam') ?? beam.renderOptions.beamWidth;
				// The beam just settled stem directions; re-pin articulations placed
				// against each note's pre-beam direction onto the notehead side.
				if (autoStem) {
					notes.forEach((note) => {
						this.reorientArticulations(note);
					});
				}
				// vexflow's flat beam averages stem tips as if all stemmed one way, which parks a
				// beam of opposing written stems (across staves) past its outermost tip.
				const opposed = notes.some(
					(note) => note.getStemDirection() !== notes[0]?.getStemDirection(),
				);
				if (!opposed && this.isFlatBeam(group, byLead)) {
					beam.renderOptions.flatBeams = true;
					// vexflow parks a flat beam at the group's *average* stem tip, so a group
					// spanning a wide range leaves the note closest to the beam with a stub of
					// a stem. Raise vexflow's floor (default 15) so that shortest stem is a
					// full standard stem. Each extra beam adds another level distance, which
					// keeps the innermost beam exactly one standard stem from the notehead.
					beam.renderOptions.minFlatBeamOffset =
						Stem.HEIGHT -
						(beam instanceof SpacedBeam
							? beam.levelDistance()
							: beam.renderOptions.beamWidth * 1.5);
				}
				if (group.breaksAfter.length > 0) {
					beam.breakSecondaryAt(group.breaksAfter);
				}
				beams.push(beam);
			}
		}
		return beams;
	}

	/* The beam for one group: feathered when it fans, spaced when the document sets its levels'
	 * distance, and vexflow's own otherwise. */
	private beamOf(
		notes: StaveNote[],
		autoStem: boolean,
		fan: BeamFan | null,
	): Beam {
		const distance = this.appearance.distance('beam');
		if (fan) {
			return new FeatheredBeam(notes, autoStem, fan).setDistance(distance);
		}
		if (distance !== null) {
			return new SpacedBeam(notes, autoStem).setDistance(distance);
		}
		return new Beam(notes, autoStem);
	}

	/*
	 * Beam slope follows the group's contour (Gould, Behind Bars): a beam slants only
	 * when the run moves consistently one way, and is horizontal otherwise: equal outer
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

	/*
	 * Ties (<tied>) and slurs (<slur>) both connect a start note to its partner;
	 * ties draw as a StaveTie, slurs as a Curve. Drawn after the notes are placed.
	 */
	buildTies(
		chords: Chord[],
		byLead: Map<Note, StaveNote>,
		scope: SpanScope = WHOLE_SCORE,
	): StaveTie[] {
		// Nothing to draw, so skip the per-note maps below.
		if (!chords.some((c) => c.notes.some((n) => this.tiesOf(n).length > 0))) {
			return [];
		}
		// Each chord member can carry its own tie, so map every note (not just the lead)
		// to its StaveNote and notehead index: the tie must land on the right notehead,
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

		// The sounding notes on each stave row, by the voice they belong to, read once for the
		// ties that ask whether another voice sits under them.
		let voicesByRow:
			| Map<number, { note: StaveNote; voice: string }[]>
			| undefined;
		const otherVoiceUnder = (
			chord: Chord,
			first: StaveNote,
			last: StaveNote,
		) => {
			const row = first.getStave()?.getY();
			if (row === undefined || last.getStave()?.getY() !== row) {
				return false;
			}
			if (!voicesByRow) {
				const index = new Map<number, { note: StaveNote; voice: string }[]>();
				voicesByRow = index;
				for (const c of chords) {
					const note = byLead.get(c.lead);
					const y = note?.getStave()?.getY();
					if (note && y !== undefined && !note.isRest()) {
						const entry = { note, voice: `${c.lead.staff}/${c.lead.voice}` };
						const notes = index.get(y);
						if (notes) {
							notes.push(entry);
						} else {
							index.set(y, [entry]);
						}
					}
				}
			}
			const voice = `${chord.lead.staff}/${chord.lead.voice}`;
			const left = first.getAbsoluteX();
			const right = last.getAbsoluteX();
			return (voicesByRow.get(row) ?? []).some(
				({ note, voice: other }) =>
					other !== voice &&
					note.getAbsoluteX() > left &&
					note.getAbsoluteX() < right,
			);
		};

		const ties: StaveTie[] = [];
		for (const chord of chords) {
			const heads = chord.notes.length;
			for (const note of chord.notes) {
				const from = placement.get(note);
				if (!from) {
					continue;
				}
				for (const tie of this.tiesOf(note)) {
					// A tie always joins two notes of the same pitch. When the partner is a
					// chord, mdom can't tell which member it lands on (chord <tied>s usually
					// share number "1"), so partner() pairs every start to the chord's first
					// stop. Re-resolve to the same-pitch member so the tie hits the right
					// notehead.
					const partnerNote =
						(tie.partner &&
							this.samePitchMember(note, chordOf.get(tie.partner))) ??
						tie.partner;
					const to = partnerNote && placement.get(partnerNote);
					if (!to || !scope.owns(from.staveNote, to.staveNote)) {
						continue;
					}
					// A chord member's tie bows away from the chord's center: upper-half
					// notes arc over the top (direction -1), the lower half under the bottom
					// (+1), and an odd chord's middle member bows away from the stem. Otherwise vexflow defaults every tie to the stem direction, so a
					// stem-up chord's top notes would tuck underneath instead of over. Single
					// notes keep that default (a tie opposite the lone stem), unless another
					// voice sounds under the tie: then it bows on the stem side, away from that
					// voice, rather than through it (Gould).
					let direction: number | null = null;
					if (heads > 1) {
						const middle = (heads - 1) / 2;
						if (from.index === middle) {
							// The middle member of an odd chord bows away from the stem.
							direction = from.staveNote.getStemDirection() === 1 ? 1 : -1;
						} else {
							direction = from.index > middle ? -1 : 1;
						}
					} else if (otherVoiceUnder(chord, from.staveNote, to.staveNote)) {
						direction = from.staveNote.getStemDirection() === 1 ? -1 : 1;
					}
					// An explicit orientation overrides both defaults.
					if (tie.orientation === 'over') {
						direction = -1;
					} else if (tie.orientation === 'under') {
						direction = 1;
					}

					const specs = this.tieSpecs(
						from.staveNote,
						to.staveNote,
						[from.index],
						[to.index],
					);
					for (const spec of specs) {
						const staveTie = new DashedTie(spec, {
							dash: tie.dash,
							tip: this.appearance.lineWidth('tie tip'),
							// A document's own tie line widths keep vexflow's bows, sized as it asks.
							fit:
								this.appearance.lineWidth('tie tip') === null &&
								this.appearance.lineWidth('tie middle') === null,
							bezier: tie.bezier && {
								start: spec.firstNote ? tie.bezier.start : { x: null, y: null },
								end: spec.lastNote ? tie.bezier.end : { x: null, y: null },
							},
						});
						// A solid tie is the lens between two quadratic bows, cp1 and cp2 off
						// the ends, so it is (cp2 - cp1) / 2 deep at its middle.
						const middle = this.appearance.lineWidth('tie middle');
						if (middle !== null) {
							const options = staveTie.renderOptions;
							options.cp1 = options.cp2 - 2 * middle;
							options.cp1Short = options.cp2Short - 2 * middle;
						}
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
	 * as a TabCurve: the same bow the notation stave's slurs get, rather than vexflow's
	 * flatter TabTie arc. Which of the two it is doesn't change the drawing: the arc plus the
	 * fret motion says it (higher target = hammer-on, lower = pull-off), so the "H"/"P" letters
	 * vexflow prints are left off. Reads the same slurConnectors buildSlurs does, so a
	 * <hammer-on>/<pull-off> written WITHOUT a companion <slur> draws on the tab stave too;
	 * otherwise the notation stave shows an arc the tab is missing.
	 */
	buildHammerPulls(
		chords: Chord[],
		byTabLead: Map<Note, TabNote>,
		scope: SpanScope = WHOLE_SCORE,
	): TabCurve[] {
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
				if (!partner || !lastNote || !scope.owns(firstNote, lastNote)) {
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
	 * TabSlide: a diagonal line between the two frets, angled up or down by the fret
	 * motion. Paired by `number` like every spanner; resolved over the whole score so a
	 * slide can cross a barline. (Unlike hammer/pull there's no "H"/"P" label, so the
	 * slide direction is purely cosmetic: vexflow just tilts the line.)
	 */
	buildSlides(
		chords: Chord[],
		byTabLead: Map<Note, TabNote>,
		opts: SlideOptions,
	): Array<TabSlideLine | SingleSlide> {
		const { showText, scope = WHOLE_SCORE } = opts;
		const slides: Array<TabSlideLine | SingleSlide> = [];
		const open = new Map<string, { note: TabNote; fret: number; lead: Note }>();
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
					open.set(number, { note: tabNote, fret, lead: chord.lead });
				} else if (marker.type === 'stop') {
					const from = open.get(number);
					open.delete(number);
					if (!from) {
						// A stop with no matching start is a slide *into* this note from an
						// indeterminate origin: a "/8" tick left of the fret, not a line.
						if (scope.owns(tabNote, tabNote)) {
							slides.push(new SingleSlide(tabNote, 0, 'in', SINGLE_SLIDE_GAP));
						}
						continue;
					}
					if (!scope.owns(from.note, tabNote)) {
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
		// A start left unclosed is a slide *out* of that note to an indeterminate target: a
		// tick right of the fret. (showText only labels paired "sl." lines, not these ticks.)
		for (const { note, lead } of open.values()) {
			if (scope.ownsOpen(lead)) {
				slides.push(new SingleSlide(note, 0, 'out', SINGLE_SLIDE_GAP));
			}
		}
		return slides;
	}

	/*
	 * Glissandos/slides on a standard-notation stave: a <slide> (or <glissando>)
	 * start..stop pair drawn as a StaveLine: a straight line between the two
	 * noteheads (the tab counterpart is buildSlides, a tilted TabSlide). Paired by
	 * `number` and resolved over the whole score so a slide can cross a barline. The
	 * grace lead is in byLead too, so this covers a grace note that slides into the
	 * main note it precedes.
	 */
	buildGlissandos(
		chords: Chord[],
		byLead: Map<Note, StaveNote>,
		scope: SpanScope = WHOLE_SCORE,
	): Array<NotationSlide | SingleSlide> {
		if (
			!chords.some((c) =>
				c.notes.some((n) => n.slides.length > 0 || n.glissandos.length > 0),
			)
		) {
			return [];
		}
		// A slide can sit on any chord member (a two-note chord may slide both notes,
		// each with its own <slide number>), so map every note (not just the lead)
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
		const open = new Map<
			string,
			{
				staveNote: StaveNote;
				index: number;
				note: Note;
				dash: number[] | null;
			}
		>();
		for (const chord of chords) {
			for (const note of chord.notes) {
				const at = placement.get(note);
				if (!at) {
					continue;
				}
				const markers = [
					...note.slides.map((s) => ({
						number: s.number,
						type: s.slideType,
						dash: lineDashOf(s),
					})),
					...note.glissandos.map((g) => ({
						number: g.number,
						type: g.glissandoType,
						dash: lineDashOf(g),
					})),
				];
				for (const marker of markers) {
					if (marker.type === 'start') {
						open.set(marker.number, { ...at, note, dash: marker.dash });
					} else if (marker.type === 'stop') {
						const from = open.get(marker.number);
						open.delete(marker.number);
						if (!from) {
							// Stop with no start: a slide *into* this note (a "/" tick left of
							// the head), the notation counterpart of the tab slide-in.
							if (scope.owns(at.staveNote, at.staveNote)) {
								lines.push(new SingleSlide(at.staveNote, at.index, 'in', 0));
							}
							continue;
						}
						if (!scope.owns(from.staveNote, at.staveNote)) {
							continue;
						}
						lines.push(
							new NotationSlide(from.staveNote, at.staveNote, {
								fromIndex: from.index,
								toIndex: at.index,
								dash: from.dash ?? marker.dash,
							}),
						);
					}
				}
			}
		}
		// A start left unclosed is a slide *out* of that note: a "/" tick right of the head.
		for (const at of open.values()) {
			if (scope.ownsOpen(at.note)) {
				lines.push(
					new SingleSlide(at.staveNote, at.index, 'out', SINGLE_SLIDE_GAP),
				);
			}
		}
		return lines;
	}

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
	buildWedges(
		markers: WedgeMark[],
		byLead: Map<Note, StaveNote>,
		scope: SpanScope = WHOLE_SCORE,
		wraps: (from: StaveNote, to: StaveNote) => boolean = (from, to) =>
			(to.getStave()?.getY() ?? 0) > (from.getStave()?.getY() ?? 0),
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

	/*
	 * Trill extension lines (<notations><ornaments><wavy-line>): a start..stop pair drawn as a
	 * vexflow VibratoBracket: the wavy line running from a trill across the notes it is held
	 * over. Paired by `number` over the whole score like the other spanners, so a run of
	 * trilled notes (each carrying a stop and then a start) comes out as a chain of brackets
	 * that meet end to end.
	 * ponytail: the marker's placement is ignored; vexflow's bracket only draws above the
	 * stave, which is where a trill line belongs anyway.
	 */
	buildWavyLines(
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

	/*
	 * Pedals (<direction><pedal>): a start..stop pair, with any changes between, drawn as a
	 * PedalLine under the stave: the "Ped…*" signs by default, a bracket line when the
	 * MusicXML carries line="yes", or both under sign="yes". Paired by `number` and resolved
	 * over the whole score (a pedal can span barlines) like the other spanners; the markers
	 * arrive in document order, so each stop closes the matching open start, and a change
	 * re-pedals the one open under its number.
	 * ponytail: a pedal whose stop wraps onto a later system isn't split; it would need the
	 * partial-span handling buildTies uses; add it if a fixture needs one.
	 *
	 * Each line comes back with the notes it covers so the caller can drop it clear
	 * of any that reach down into its band (see DrawPass.finishPass).
	 */
	buildPedals(
		markers: PedalMark[],
		byLead: Map<Note, StaveNote>,
		chords: Chord[],
		scope: SpanScope = WHOLE_SCORE,
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
	 * vexflow anchors a Curve only at its two endpoints, so the arc ignores notes in
	 * between and a high (or low) middle note pokes through it. We anchor each
	 * endpoint on the bulge side of its own noteheads, then raise the bezier control
	 * points so the arc clears the most extreme note it spans.
	 */
	buildSlurs(
		chords: Chord[],
		byLead: ReadonlyMap<Note, StaveNote>,
		scope: SpanScope = WHOLE_SCORE,
	): SlurCurve[] {
		// No chord starts a slur or a hammer-on/pull-off, so skip the per-note maps below.
		if (
			!chords.some((c) =>
				c.notes.some((n) => {
					const { slurs, techniques } = this.connectorsOf(n);
					return slurs.length > 0 || techniques.length > 0;
				}),
			)
		) {
			return [];
		}
		const slurs: SlurCurve[] = [];
		const spans = this.slurSpans(chords);
		const indexOf = new Map(chords.map((chord, i) => [chord.lead, i]));
		// A slur can start or stop on any note of a chord, not just its lead, but only a
		// lead has a StaveNote to anchor to, so each end is read as its chord's lead. A
		// chord slurred note-for-note into the next one then names the same two leads
		// once per note, and draws one bow.
		const leadOf = new Map(
			chords.flatMap((chord) => chord.notes.map((note) => [note, chord.lead])),
		);
		const voiceOf = new Map<StaveNote, string>();
		for (const chord of chords) {
			const note = byLead.get(chord.lead);
			if (note) {
				voiceOf.set(note, `${chord.lead.staff}/${chord.lead.voice}`);
			}
		}
		let notesByRow:
			| Map<number, Array<{ note: StaveNote; index: number }>>
			| undefined;
		const onRow = (stave: Stave) => {
			if (!notesByRow) {
				const index = new Map<
					number,
					Array<{ note: StaveNote; index: number }>
				>();
				notesByRow = index;
				chords.forEach((chord, chordIndex) => {
					const note = byLead.get(chord.lead);
					const row = note?.getStave()?.getY();
					if (note && row !== undefined) {
						const notes = index.get(row);
						if (notes) {
							notes.push({ note, index: chordIndex });
						} else {
							index.set(row, [{ note, index: chordIndex }]);
						}
					}
				});
			}
			return notesByRow.get(stave.getY()) ?? [];
		};
		chords.forEach((chord, i) => {
			const from = byLead.get(chord.lead);
			const isGrace = chord.lead.isGrace;
			const connectors = [
				...this.slurConnectors(chord.lead, spans),
				...chord.notes
					.filter((note) => note !== chord.lead)
					.flatMap((note) => this.connectorsOf(note).slurs),
			];
			const reached = new Set<Note>();
			for (const slur of connectors) {
				if (slur.slurType !== 'start' || !slur.partner || !from) {
					continue;
				}
				const partner = leadOf.get(slur.partner.note) ?? slur.partner.note;
				const to = byLead.get(partner);
				if (!to || reached.has(partner) || !scope.owns(from, to)) {
					continue;
				}
				reached.add(partner);
				const j = indexOf.get(partner) ?? -1;
				// `chords` is the whole score in document order, so the slice between two
				// notes also sweeps up every other part, stave and voice that happens to be
				// notated in between: the last note of a bass-stave voice and the first note
				// of the next measure's same voice are separated by the whole treble stave.
				// Clearing those would inflate a two-note bow into a spike reaching the stave
				// above, so only notes sharing a stave with an endpoint count.
				let span =
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
				// two half-curves below and each half stays put, hence the Y test, which reads
				// "the stop's stave is HIGHER on the page", the one thing a wrap can't be.
				const fromStave = from.getStave();
				const toStave = to.getStave();
				const crossStave =
					!!fromStave && !!toStave && toStave.getY() < fromStave.getY();
				// A cross-stave slur's two ends sit on different staves, which `chords` lists one
				// after the other, so the slice above can't hold the notes between them (the
				// stop can even come first). Both ends are on one system, so what the bow passes
				// over is every note on either stave between their Xs. So does a slur along one
				// row of staves: the slice misses a second voice written after the stop (a
				// <backup> replays the measure), and its beam is just as much under the bow.
				// That row is every measure's stave at the ends' height, not just the two
				// measures the ends sit in. A grace curve hugs its two notes and keeps the slice.
				const sameRow =
					!!fromStave && !!toStave && toStave.getY() === fromStave.getY();
				if ((crossStave || (sameRow && !isGrace)) && fromStave && toStave) {
					const left = from.getAbsoluteX();
					const right = to.getAbsoluteX();
					const sliced = new Set(span);
					const candidates = crossStave
						? [...onRow(fromStave), ...onRow(toStave)].sort(
								(a, b) => a.index - b.index,
							)
						: onRow(fromStave);
					span = candidates
						.filter(
							({ note: n }) =>
								n.getAbsoluteX() >= left &&
								n.getAbsoluteX() <= right &&
								// Another voice's rest can make way instead, so only the slice's own
								// rests count, as they always have.
								(crossStave || sliced.has(n) || !n.isRest()),
						)
						.map(({ note }) => note);
				}

				// Bulge up for placement="above", down for "below", otherwise opposite the
				// stems (slurs sit on the notehead side). The opening direction forces the
				// arc's sign even when the two endpoints' stems disagree. A grace-to-main
				// slur always hugs under (under the grace, down to the main notehead),
				// ignoring placement: grace slurs read as a consistent underneath bow.
				// A cross-stave slur overrides placement too, bowing away from its run's beam: its
				// ends are a stave apart, so a bow on the beam's side has to duck under (or over)
				// the beam and then dive most of a stave to reach the far end, which reads as a
				// spike rather than a slur. The run beams one way (see buildPartBeams), so its
				// first note's stem says which side the beam is on.
				// Another voice's rest sounding under the slur is as much in its way as that
				// voice's notes: the bow on the notehead side would run through the rest, which
				// the formatter has already parked on that side to clear its own voice.
				const restedOver =
					sameRow &&
					!isGrace &&
					onRow(fromStave).some(
						({ note: n }) =>
							n.isRest() &&
							voiceOf.get(n) !== voiceOf.get(from) &&
							n.getAbsoluteX() >= from.getAbsoluteX() &&
							n.getAbsoluteX() <= to.getAbsoluteX(),
					);
				let bulgeUp: boolean;
				// Only a side the score leaves free is scored: a written placement, a grace and
				// a cross-stave slur keep theirs.
				// Nor does one whose stems disagree or that shares the stave with another voice
				// (a rest included): those have rules of their own (Gould) that the score
				// cannot see.
				const sideIsFree =
					!isGrace &&
					!crossStave &&
					!slur.placement &&
					!restedOver &&
					from.getStemDirection() === to.getStemDirection() &&
					span.every(
						(n) =>
							voiceOf.get(n) === undefined ||
							voiceOf.get(n) === voiceOf.get(from),
					);
				if (isGrace) {
					// Cross-staff graces can request an upper bow, including at a ghost end.
					bulgeUp = crossStave && slur.placement === 'above';
				} else if (crossStave) {
					bulgeUp = from.getStemDirection() !== 1;
				} else if (slur.placement === 'above') {
					bulgeUp = true;
				} else if (slur.placement === 'below') {
					bulgeUp = false;
				} else if (
					(from.getStemDirection() === to.getStemDirection() ||
						voiceOf.get(from) !== voiceOf.get(to)) &&
					(restedOver ||
						span.some(
							(n) =>
								!n.isRest() &&
								voiceOf.get(n) !== undefined &&
								voiceOf.get(n) !== voiceOf.get(from),
						))
				) {
					// Another voice sharing the stave under the slur puts it on the stem side
					// (Gould): the notehead side is where the other voice sits, and a bow there
					// either cuts through it or swings out around it.
					bulgeUp = from.getStemDirection() === 1;
				} else {
					// Stems disagreeing across the slur put it above the notes (Gould): a bow
					// from a stem-up note to a stem-down one has no notehead side to follow,
					// and below it has to dive under the whole run to reach the far end.
					bulgeUp =
						from.getStemDirection() !== to.getStemDirection() ||
						from.getStemDirection() !== 1;
				}
				if (sideIsFree) {
					bulgeUp = this.cheaperSide(from, to, span, bulgeUp);
				}

				// The last resort for a cross-stave slur that can't read as a bow: it ends on a
				// ghost note, at its start's own height on its start's stave and directly under
				// the stop, and draws as a level slur on that stave, bowing away from the gap.
				// A beamed run, a document's own control points and a slur across a phrase keep
				// their real end, since their shape is what says where they go.
				const voicesBetween = span.filter(
					(n) =>
						n !== from &&
						n !== to &&
						(voiceOf.get(n) === voiceOf.get(from) ||
							voiceOf.get(n) === voiceOf.get(to)),
				).length;
				const mayGhost =
					crossStave &&
					!from.hasBeam() &&
					!to.hasBeam() &&
					!slur.bezier &&
					voicesBetween <= SLUR_GHOST_MAX_BETWEEN;
				let ghost =
					mayGhost &&
					Math.abs(to.getAbsoluteX() - from.getAbsoluteX()) <
						Math.abs(from.getStemExtents().baseY - to.getStemExtents().baseY) *
							SLUR_GHOST_STEEPNESS;
				if (ghost && !(isGrace && slur.placement)) {
					bulgeUp = false;
				}
				const ghostOf = (n: StaveNote) => (ghost && n === to ? from : n);
				const ghostSpan = () =>
					span.filter((n) => n.getStave()?.getY() === fromStave?.getY());

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
				// per slur rather than per note: take the stem tips only while they leave the
				// two ends at least as level as the noteheads would.
				//
				// Unless an end is BEAMED on the bulge side, where the notehead is the worse anchor
				// however level it is: the beam is a bar lying between that notehead and the bow, so
				// a curve leaving the notehead climbs out through it. Such a slur takes the stem
				// tips (the beam's own outer edge), as long as its span is wide enough to carry the
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
				// means for the two halves it splits into. Same-stave slurs are unaffected: the
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
				// one its endpoints ask for; change SLUR_GRACE_ANCHOR and the depth follows.
				const extentsOf = (n: StaveNote) => {
					if (isGrace) {
						const y = anchorY(ghostOf(n));
						return { top: y, bottom: y };
					}
					const extents = this.noteExtents(n);
					const marks = this.marksOnSide(n, bulgeUp);
					return marks
						? {
								top: Math.min(extents.top, marks.top),
								bottom: Math.max(extents.bottom, marks.bottom),
							}
						: extents;
				};
				// A grace-to-main curve hugs directly under the two noteheads with a small
				// tight bow instead of the fuller slur arc (see the SLUR_GRACE_* constants).
				const baseYShift = isGrace ? SLUR_GRACE_Y_SHIFT : SLUR_Y_SHIFT;
				let dir = bulgeUp ? -1 : 1;

				// How much further out an end has to start to clear its own note's marks on the
				// bow's side: a staccato or tenuto sits inside the slur, so the end leaves from
				// just past the mark rather than from the notehead, cutting through it. Each
				// end takes only its own lift, so a mark on one end doesn't float the other
				// off its note. A cross-stave bow over a beamed run keeps its ends, like it
				// keeps its shape (see clearanceOf).
				// Where vexflow's Curve puts an end on its own: the anchor `metric` picked.
				const noteEndY = (note: StaveNote) => {
					const { topY, baseY } = note.getStemExtents();
					return metric(note) === Curve.Position.NEAR_TOP ? topY : baseY;
				};
				const markLift = (note: StaveNote) => {
					if (isGrace || (crossStave && bulgeUp)) {
						return 0;
					}
					const marks = this.marksOnSide(note, bulgeUp);
					if (!marks) {
						return 0;
					}
					const edge = bulgeUp ? marks.top : marks.bottom;
					const end = noteEndY(note) + dir * baseYShift;
					return Math.max(0, dir * (edge - end) + SLUR_MARK_GAP);
				};

				// The exact Y each end of the curve will be drawn at: what HeadCurve was handed
				// for a grace, and what vexflow reads off getStemExtents() for everything else.
				const endpointY = (note: StaveNote) => {
					if (isGrace) {
						return anchorY(ghostOf(note));
					}
					const end = ghostOf(note);
					return noteEndY(end) + dir * markLift(end);
				};

				// How far the bow stands off its chord (the straight line joining the two
				// drawn ends) at horizontal fraction `s` of the span, per unit of cpY. vexflow
				// lifts both control points off the chord by the same cpY, so at bezier
				// parameter t the bow stands 3t(1-t) off it: 0.75 at the midpoint, tapering to
				// nothing at either end. But t is not s: the control points sit at `shoulder`
				// (vexflow's quarter, or nearer the ends for a flattened bow, see shapeFor), so
				// x runs along the curve unevenly. x(t) only climbs, so solve x(t) = s for t.
				const riseFactor = (s: number, shoulder = SLUR_SHOULDER) => {
					const xAt = (t: number) =>
						3 * t * (1 - t) * ((1 - t) * shoulder + t * (1 - shoulder)) +
						t ** 3;
					let lo = 0;
					let hi = 1;
					for (let i = 0; i < 30; i++) {
						const mid = (lo + hi) / 2;
						if (xAt(mid) < s) {
							lo = mid;
						} else {
							hi = mid;
						}
					}
					const t = (lo + hi) / 2;
					return 3 * t * (1 - t);
				};

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
				// short anywhere (the notes under the ends, and anything the aspect cap refused
				// to inflate for). A steep near-end obstacle raises the slur off its first
				// notehead instead of ballooning it, which is what a reference engraving does.
				//
				// Clearance is checked at each note's OWN x, not just at the apex: an apex-only
				// test lets the arc skim a note lying under the tapering part. Solving per note
				// also catches notes the old midpoint-vs-extreme comparison couldn't see at all,
				// like one poking above a steeply slanted chord.
				//
				// For a full slur only the notes it passes *over* count: the endpoints are
				// where it attaches, so their own stems must not inflate it. A note beamed up
				// out of the stave has a stem taller than the stave itself, and clearing that
				// from a notehead anchor turns a two-note slur into a narrow spike; with no
				// interior notes the arc takes the floor. A grace curve measures against its own
				// endpoint anchors (extentsOf collapses to anchorY), never a stem, so it has
				// nothing to exclude.
				//
				// A cross-stave slur bowing over a run beamed below clears nothing at all. Its two
				// ends are a stave apart, so the run it climbs through sits above its chord for
				// most of the span by construction: no bow gets over that, and solving for it
				// domes the arc across the hand it's leaving. The endpoints alone shape it. One
				// bowing under a run beamed above passes below the run's noteheads, which a bow
				// can clear, so it does.
				const clearanceOf = (spanNotes: StaveNote[]): StaveNote[] => {
					if (crossStave && bulgeUp && !mayGhost) {
						return [];
					}
					if (isGrace) {
						return spanNotes;
					}
					return spanNotes.filter((n) => n !== from && n !== to);
				};
				const shapeFor = (
					spanNotes: StaveNote[],
					xL: number,
					xR: number,
					yL: number,
					yR: number,
				) => {
					const width = Math.abs(xR - xL);
					// A grace bow stays tight: it takes the clearance it needs and no more,
					// where a full slur also widens with its span.
					const bow = Math.min(
						SLUR_BOW_MAX,
						SLUR_BOW_MIN +
							SLUR_BOW_GROWTH * Math.max(0, width - SLUR_BOW_FLAT_WIDTH),
						width * SLUR_BOW_ASPECT,
					);
					const floor = isGrace ? SLUR_GRACE_CP_Y : bow / 0.75;
					const margin = isGrace ? SLUR_GRACE_MARGIN : SLUR_MARGIN;
					// How far above the base chord (the line joining the two lifted ends) each
					// note the curve passes over reaches, plus its margin. Only the overshoot
					// past the CHORD counts. Measured against a single Y instead, a note well
					// below an upward-bowing slur (the other voice on the stave, the next
					// measure's lower neighbour) asks the arc to rise by however far below it
					// sits, which turns a two-note bow across a barline into a tall narrow
					// spike.
					const needAt = (x: number, y: number, gap = margin) => {
						const s = width ? (x - xL) / (xR - xL) : 0.5;
						const chordY = yL + dir * baseYShift + s * (yR - yL);
						return { s, need: Math.max(0, dir * (y - chordY) + gap) };
					};
					const clearances = [
						...clearanceOf(spanNotes).map((n) => {
							const extents = extentsOf(n);
							return needAt(
								n.getAbsoluteX(),
								bulgeUp ? extents.top : extents.bottom,
							);
						}),
						// Every accidental the bow passes, the cautionary flat of the note it
						// arrives at included, sits left of its head where the notes' own extents
						// don't reach. The slur's own start has none behind it.
						...(isGrace
							? []
							: spanNotes
									.filter((n) => n !== from)
									.flatMap((n) => this.accidentalBoxes(n))
									.map((box) =>
										needAt(
											box.getX() + box.getW() / 2,
											bulgeUp ? box.getY() : box.getY() + box.getH(),
											SLUR_ACCIDENTAL_GAP,
										),
									)),
					];
					// Only the notes clear of both ends set the bow's depth. Math.max seeded
					// with 0, not spread bare: with no mid-span notes an unseeded Math.min
					// against the cap would return the cap itself.
					const inflation = Math.max(
						0,
						...clearances
							.filter((c) => c.s >= SLUR_END_ZONE && c.s <= 1 - SLUR_END_ZONE)
							.map(
								(c) => c.need / riseFactor(c.s, isGrace ? 0.25 : SLUR_SHOULDER),
							),
					);
					// One ceiling for both knobs: how far past its base lift the curve may stand
					// off the chord at all. Beyond this it stops reading as a bow, whether it
					// got there by inflating or by rising, so it stops trying: a slur can't
					// clear everything a span might hold (a second voice, the stem of a run
					// beamed into the other hand) and shouldn't deform itself pretending to.
					const reach = width * SLUR_MAX_ASPECT;
					const cpY = Math.max(
						floor,
						Math.min(reach, inflation, isGrace ? Infinity : SLUR_MAX_CP_Y),
					);
					// A bow held under the ceiling flattens instead: its control points slide
					// toward the ends, as little as clears the notes the depth was for. Only the
					// ceiling does this: a short slur the aspect cap stopped keeps its shape.
					const capped = cpY === SLUR_MAX_CP_Y && inflation > cpY;
					const middle = clearances.filter(
						(c) => c.s >= SLUR_END_ZONE && c.s <= 1 - SLUR_END_ZONE,
					);
					let shoulder = isGrace ? 0.25 : SLUR_SHOULDER;
					while (
						capped &&
						shoulder > SLUR_MIN_SHOULDER &&
						middle.some((c) => c.need > riseFactor(c.s, shoulder) * cpY)
					) {
						shoulder = Math.max(SLUR_MIN_SHOULDER, shoulder - 0.01);
					}
					// Whatever that bow still doesn't reach, the endpoints make up by rising,
					// out of what's left of the same budget.
					const shortfall = Math.max(
						0,
						...clearances.map((c) => c.need - riseFactor(c.s, shoulder) * cpY),
					);
					const yShift =
						baseYShift + Math.min(shortfall, Math.max(0, reach - 0.75 * cpY));
					const blocked = clearances.some(
						(c) =>
							c.need - riseFactor(c.s, shoulder) * cpY - (yShift - baseYShift) >
							SLUR_GHOST_OVERLAP,
					);
					return { cpY, yShift, shoulder, width, blocked };
				};

				const pushCurve = (
					// vet-ignore noop-objects-over-null: a tie end can lack a note; absence is score data, and a stand-in VexFlow note would curve to nothing
					curveFrom: StaveNote | undefined,
					// vet-ignore noop-objects-over-null: a tie end can lack a note; absence is score data, and a stand-in VexFlow note would curve to nothing
					curveTo: StaveNote | undefined,
					position: number,
					positionEnd: number,
					// vet-ignore noop-objects-over-null: absent means the stave's own edge; a stand-in X would move the end
					openX: number | undefined,
					{
						cpY,
						yShift,
						shoulder,
						width,
					}: { cpY: number; yShift: number; shoulder: number; width: number },
				) => {
					// vexflow offsets each control point from its OWN endpoint by the same cps.y, so
					// on a slur whose two ends sit at very different heights both points land the
					// same distance above their end, which is nowhere near the line between the
					// two. The far one ends up on the wrong side of its endpoint entirely and the
					// curve flicks up out of the note instead of settling onto it.
					//
					// Offset them from the CHORD (the straight line joining the two ends) instead,
					// each lifted `cpY` off it. vexflow puts the control points a quarter and three
					// quarters of the way along, so the chord there is a quarter of the drop either
					// side of the midpoint, hence the ±slant. What that draws is a parabola over
					// the chord: symmetric bow, both ends tangent to the chord, no hook. The apex
					// is unchanged at chord-midpoint + 0.75*cpY (the cubic's t=0.5 works out to
					// that), so the clearance shapeFor solved for still holds. Level endpoints
					// have no slant and reduce to the old symmetric cps exactly.
					const only = (curveFrom ?? curveTo) as StaveNote;
					const y0 = endpointY(curveFrom ?? only);
					const y1 = endpointY(curveTo ?? only);
					// vexflow puts the control points a quarter of the way in from each end;
					// a flattened bow (see shapeFor) moves them out to `shoulder`.
					const slant = (y1 - y0) * shoulder;
					const pull = (shoulder - 0.25) * width;
					// Lifted straight up or down, a control point over a slanted chord also slides
					// along it toward the end the bow hangs past, so the bow sags toward that end.
					// Leaning each point back by the chord's slope lifts it square off the chord
					// instead, and the bow sits centred on it. Level ends have no slope and no lean.
					const lean = width ? (-dir * (y1 - y0) * cpY) / width : 0;
					const middle = this.appearance.lineWidth('slur middle');
					const thickness =
						middle === null ? CURVE_THICKNESS : curveThickness(middle);
					const options: CurveOptions = {
						thickness,
						position,
						positionEnd,
						openingDirection: bulgeUp ? 'down' : 'up',
						yShift,
						cps: [
							{ x: pull + lean, y: cpY + dir * slant },
							{ x: -pull + lean, y: cpY - dir * slant },
						],
					};
					const bezier = slur.bezier && {
						start: curveFrom ? slur.bezier.start : { x: null, y: null },
						end: curveTo ? slur.bezier.end : { x: null, y: null },
					};
					// An end lifted off its marks is pinned at its own Y, which vexflow's Curve
					// can't take (it reads the end off the note), so it draws as a HeadCurve
					// too.
					const lifted = [curveFrom, curveTo].some(
						(n) => n !== undefined && markLift(n) > 0,
					);
					// A body end runs to its notehead's centre, on the side away from its stem. A stem
					// on the bow's side stands in the way, whichever anchor the end took,
					// and a document's control points are offsets from the ends it knows.
					const reachesHead = (note: StaveNote | undefined) =>
						!isGrace && !bezier && note !== undefined && !towardBulge(note);
					const reach = {
						start: reachesHead(curveFrom),
						end: reachesHead(curveTo),
					};
					const curve =
						isGrace || lifted || ghost
							? new HeadCurve(curveFrom, curveTo, y0, y1, {
									...options,
									bezier,
									reach,
									openX,
								})
							: new CrispCurve(curveFrom, curveTo, {
									...options,
									bezier,
									reach,
									openX,
								});
					curve.setTip(this.appearance.lineWidth('slur tip'));
					// Where the bow will actually reach. vexflow shifts both endpoints by
					// `yShift` and lands both control points at `depth`, so the cubic's midpoint
					// sits at mid(y0,y1) + dir*(yShift + 0.75*cpY): the arc's far side, plus the
					// stroke thickness it's drawn with. Reported so the draw pass can reserve the
					// room a bow needs over its stave instead of letting it print into the part
					// above's lyrics.
					const endTop = Math.min(y0, y1) + dir * yShift;
					const endBottom = Math.max(y0, y1) + dir * yShift;
					const apex = (y0 + y1) / 2 + dir * (yShift + 0.75 * cpY + thickness);
					const stave = only.checkStave();
					const firstX =
						(curveFrom?.getTieRightX() ?? openX ?? stave.getTieStartX()) +
						curve.renderOptions.xShift;
					const lastX =
						(curveTo?.getTieLeftX() ?? openX ?? stave.getTieEndX()) -
						curve.renderOptions.xShift;
					const spacing = (lastX - firstX) / 4;
					const controlXs = bezier
						? [
								firstX + (bezier.start.x ?? spacing + pull + lean),
								lastX + (bezier.end.x ?? -spacing - pull + lean),
							]
						: [];
					const controlYs = bezier
						? [
								y0 +
									dir * yShift +
									(bezier.start.y === null
										? dir * cpY + slant
										: -bezier.start.y),
								y1 +
									dir * yShift +
									(bezier.end.y === null ? dir * cpY - slant : -bezier.end.y),
							]
						: [];
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
						top: Math.min(endTop, apex, ...controlYs.map((y) => y - thickness)),
						bottom: Math.max(
							endBottom,
							apex,
							...controlYs.map((y) => y + thickness),
						),
						left: Math.min(
							curveFrom?.getAbsoluteX() ??
								openX ??
								curveStave?.getTieStartX() ??
								0,
							...controlXs,
						),
						right: Math.max(
							curveTo?.getAbsoluteX() ?? openX ?? curveStave?.getTieEndX() ?? 0,
							...controlXs,
						),
						crossStave: crossStave && !ghost,
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
					// The halves run to the system's edge, not just their own measure's: the row's
					// staves are every measure the system holds at that height.
					const fromRow = onRow(fromStave).flatMap(({ note }) => {
						const stave = note.getStave();
						return stave ? [stave] : [];
					});
					const toRow = onRow(toStave).flatMap(({ note }) => {
						const stave = note.getStave();
						return stave ? [stave] : [];
					});
					const rowEndX = Math.max(
						fromStave.getTieEndX(),
						...fromRow.map((stave) => stave.getTieEndX()),
					);
					const rowStartX = Math.min(
						toStave.getTieStartX(),
						...toRow.map((stave) => stave.getTieStartX()),
					);
					pushCurve(
						from,
						undefined,
						metric(from),
						metric(from),
						rowEndX,
						shapeFor(
							span.filter((n) => n.getStave() === fromStave),
							from.getAbsoluteX(),
							rowEndX,
							fromY,
							fromY,
						),
					);
					pushCurve(
						undefined,
						to,
						metric(to),
						metric(to),
						rowStartX,
						shapeFor(
							span.filter((n) => n.getStave() === toStave),
							rowStartX,
							to.getAbsoluteX(),
							toY,
							toY,
						),
					);
					continue;
				}

				const solve = () =>
					shapeFor(
						ghost ? ghostSpan() : span,
						from.getAbsoluteX(),
						to.getAbsoluteX(),
						endpointY(from),
						endpointY(to),
					);
				const takeSide = (up: boolean) => {
					bulgeUp = up;
					dir = up ? -1 : 1;
				};
				let shape = solve();
				if (mayGhost && !ghost && !isGrace && shape.blocked) {
					const side = bulgeUp;
					takeSide(!side);
					shape = solve();
					if (shape.blocked) {
						ghost = true;
						takeSide(false);
						shape = solve();
					}
				}
				// A ghost end is only useful if it clears the intervening ink. When it
				// cannot, omit the slur rather than draw a detached bow through the notes.
				if (ghost && shape.blocked) {
					continue;
				}
				pushCurve(from, to, metric(from), metric(to), undefined, shape);
			}
		});
		return slurs;
	}

	/*
	 * The vexflow TieNotes spec(s) for a tie/slur from firstNote to lastNote on the given
	 * notehead/position indexes. Normally one spec spanning both notes; but when the stop note
	 * wraps onto a later system its stave sits lower on the page (greater Y), so a single tie
	 * would draw as one long diagonal across the page, so it is split into two partial ties, one
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
	 * into another draws one arc per shared string. Positions with no counterpart drop out;
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

	private slurConnectors(note: Note, spans: Array<Set<Note>>): SlurConnector[] {
		const { slurs, techniques } = this.connectorsOf(note);
		const slurTargets = new Set(slurs.map((s) => s.partner?.note ?? null));
		return [
			...slurs,
			...techniques.filter((t) => {
				const partner = t.partner?.note ?? null;
				return (
					!slurTargets.has(partner) &&
					!spans.some(
						(span) => span.has(note) && !!partner && span.has(partner),
					)
				);
			}),
		];
	}

	/* A note's starting <tied>s with their partners resolved, read once per note. */
	private tiesOf(note: Note): TieEnd[] {
		let ties = this.ties.get(note);
		if (!ties) {
			ties = this.reader
				.tiesOf(note)
				.filter(
					(tie) =>
						tie.tieType === 'start' ||
						(this.documentCurves && tie.tieType === 'continue'),
				)
				.map((tie) => {
					const segment = this.documentCurves ? curveSegmentOf(tie) : null;
					return {
						partner: segment?.end.note ?? tie.partner?.note ?? null,
						bezier: segment?.bezier ?? null,
						dash: lineDashOf(tie),
						orientation: tie.getAttribute('orientation'),
					};
				});
			this.ties.set(note, ties);
		}
		return ties;
	}

	/*
	 * The furthest measure index a spanner starting on `note` reaches: its own measure, or
	 * the measure of the furthest partner of any tie, slur, hammer-on, pull-off, slide,
	 * glissando or trill line it starts. Read off the document alone, so it is known before
	 * the far end is drawn: a system-at-a-time resolve keeps the note in its window until
	 * that measure is on the page.
	 */
	reach(note: Note): number {
		let reach = this.reaches.get(note);
		if (reach === undefined) {
			const { slurs, techniques } = this.connectorsOf(note);
			const partners = [
				...this.tiesOf(note).map((tie) => tie.partner),
				...[...slurs, ...techniques].map((c) => c.partner?.note ?? null),
				...note.slides
					.filter((s) => s.slideType === 'start')
					.map((s) => s.partner?.note ?? null),
				...note.glissandos
					.filter((g) => g.glissandoType === 'start')
					.map((g) => g.partner?.note ?? null),
				...note.wavyLines
					.filter((w) => w.wavyLineType === 'start')
					.map((w) => w.partner?.note ?? null),
			];
			reach = Math.max(
				note.measure.index,
				...partners.map((partner) => partner?.measure.index ?? -1),
			);
			this.reaches.set(note, reach);
		}
		return reach;
	}

	/*
	 * A note's <slur>s and hammer-on/pull-offs with their partners resolved, read once per
	 * note. mdom pairs a marker by re-pairing every marker of its kind in the part, so each
	 * `partner` read costs the whole part, and the slur passes run per measure and per pass
	 * over the whole score. A SpannerBuilder lives for one render, over a document that
	 * doesn't change under it. Starts only: every connector is drawn from its start, and a
	 * stop's partner costs as much to find as a start's.
	 */
	private connectorsOf(note: Note): {
		slurs: SlurConnector[];
		techniques: SlurConnector[];
	} {
		const cached = this.connectors.get(note);
		if (cached) {
			return cached;
		}
		const resolved = {
			slurs: note.slurs
				.filter(
					(s) =>
						s.slurType === 'start' ||
						(this.documentCurves && s.slurType === 'continue'),
				)
				.map((s) => {
					const segment = this.documentCurves ? curveSegmentOf(s) : null;
					const partner = segment?.end.note ?? s.partner?.note ?? null;
					return {
						slurType: 'start',
						bezier: segment?.bezier ?? null,
						partner: partner && { note: partner },
						placement: s.placement ?? placementOfOrientation(s),
						dash: lineDashOf(s),
					};
				}),
			techniques: [
				...note.hammerOns
					.filter((h) => h.hammerOnType === 'start')
					.map((h) => ({
						slurType: h.hammerOnType,
						bezier: null,
						partner: h.partner,
						placement: null,
						dash: null,
					})),
				...note.pullOffs
					.filter((p) => p.pullOffType === 'start')
					.map((p) => ({
						slurType: p.pullOffType,
						bezier: null,
						partner: p.partner,
						placement: null,
						dash: null,
					})),
			],
		};
		this.connectors.set(note, resolved);
		return resolved;
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
			for (const slur of this.connectorsOf(note).slurs) {
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
	/*
	 * How far a note's articulations reach on one side, or null when it has none there. Read
	 * off the drawn marks: vexflow only settles where a mark sits (stacked over its
	 * neighbours, lifted off a beam) while drawing it, and both slur passes run after the
	 * notes have drawn.
	 */
	private marksOnSide(
		note: StaveNote,
		above: boolean,
	): { top: number; bottom: number } | null {
		const side = above ? Modifier.Position.ABOVE : Modifier.Position.BELOW;
		let top = Infinity;
		let bottom = -Infinity;
		for (const mod of note.getModifiers()) {
			if (mod instanceof Articulation && mod.getPosition() === side) {
				const box = mod.getBoundingBox();
				top = Math.min(top, box.getY());
				bottom = Math.max(bottom, box.getY() + box.getH());
			}
		}
		return top === Infinity ? null : { top, bottom };
	}

	/*
	 * Scores the slur bowing up and bowing down and returns the cheaper side. A side costs
	 * what the notes under the bow stand past the chord joining its two ends on that side
	 * (so a side another voice or a high note sits in costs more), plus half of each stem
	 * that points into the bow, which the bow has to leave through. The side the rules
	 * chose carries `PREFERRED_SIDE_BONUS` px off, so only a clear win moves it.
	 */
	private cheaperSide(
		from: StaveNote,
		to: StaveNote,
		span: StaveNote[],
		preferUp: boolean,
	): boolean {
		const xL = from.getAbsoluteX();
		const width = to.getAbsoluteX() - xL;
		const costOf = (up: boolean) => {
			const dir = up ? -1 : 1;
			const headY = (n: StaveNote) => {
				const { yTop, yBottom } = n.getNoteHeadBounds();
				return up ? yTop : yBottom;
			};
			const yL = headY(from);
			const yR = headY(to);
			let cost = 0;
			for (const n of span) {
				if (n === from || n === to) {
					continue;
				}
				const s = width ? (n.getAbsoluteX() - xL) / width : 0.5;
				const extents = this.noteExtents(n);
				const y = up ? extents.top : extents.bottom;
				cost += Math.max(0, dir * (y - (yL + s * (yR - yL))));
			}
			for (const n of [from, to]) {
				if (n.hasStem() && (n.getStemDirection() === 1) === up) {
					const { topY, baseY } = n.getStemExtents();
					cost += Math.abs(topY - baseY) / 2;
				}
			}
			return cost - (up === preferUp ? PREFERRED_SIDE_BONUS : 0);
		};
		return costOf(true) <= costOf(false);
	}

	/* The drawn boxes of a note's accidentals. */
	private accidentalBoxes(note: StaveNote) {
		return note
			.getModifiers()
			.filter((mod) => mod.getCategory() === 'Accidental')
			.map((mod) => mod.getBoundingBox());
	}

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
			showNumber: marker.showNumber,
			showType: marker.showType,
			actualValue: displayValue(marker.actual),
			normalValue: displayValue(marker.normal),
			curved: marker.getAttribute('line-shape') === 'curved',
		};
	}
}

/*
 * A built slur, with the vertical extent it will be drawn at. A slur is not movable: it's
 * pinned to its two noteheads, so the only way it can stop printing through a neighbouring
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

/*
 * The slur-like connectors starting/stopping on a note: its <slur> markers plus any
 * <hammer-on>/<pull-off> in <technical>. In standard notation a hammer-on/pull-off IS
 * just a slur curve (the "H"/"P" label is a tab-only convention), so buildSlurs draws
 * them the same way, including grace-to-main graces. A technique a real <slur> already
 * covers is dropped, so an exporter that emits both doesn't double the arc: either the
 * slur reaches the same partner, or (`spans`) one slur arcs over both of the technique's
 * ends. The second case is a legato run written as one long <slur> plus a hammer-on/pull-off
 * per adjacent pair: the run gets its one arc, not that arc plus a bump over every pair.
 */
type TieEnd = {
	bezier: DocumentBezier | null;
	partner: Note | null;
	dash: number[] | null;
	/* <tied orientation>: "over" bows the tie up, "under" down. */
	orientation: string | null;
};

/* <slur orientation> as the placement it implies, for a slur that states no placement. */
function placementOfOrientation(slur: {
	getAttribute(name: string): string | null;
}): string | null {
	const orientation = slur.getAttribute('orientation');
	if (orientation === 'over') {
		return 'above';
	}
	return orientation === 'under' ? 'below' : null;
}

type SlurConnector = {
	bezier: DocumentBezier | null;
	slurType: string;
	partner: { note: Note } | null;
	placement: string | null;
	/* The canvas dash array from <slur line-type>, or null for a solid curve. A
	 * hammer-on/pull-off has no line-type, so it is always solid. */
	dash: number[] | null;
};

/*
 * The direction vexflow's Beam picks when it auto-stems a group (its calculateStemDirection,
 * which it does not export): the noteheads' summed distance from the middle line, down when
 * they sit on or above it on balance.
 */
function beamStem(notes: readonly StaveNote[]): number {
	let sum = 0;
	for (const note of notes) {
		for (const props of note.getKeyProps()) {
			sum += props.line - 3;
		}
	}
	return sum >= 0 ? Stem.DOWN : Stem.UP;
}

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

// The fan of a beam group: the first <beam fan> on any of its notes that asks for a feather.
function fanOf(group: BeamRun, reader: ScoreReader): BeamFan | null {
	for (const note of group.notes) {
		for (const beam of reader.beamsOf(note)) {
			const fan = beam.getAttribute('fan');
			if (fan === 'accel' || fan === 'rit') {
				return fan;
			}
		}
	}
	return null;
}
