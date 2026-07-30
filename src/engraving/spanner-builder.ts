import type { Chord, Note } from '@stringsync/mdom';
import {
	Articulation,
	Beam,
	Curve,
	type CurveOptions,
	Modifier,
	PedalMarking,
	type RenderContext,
	type StaveNote,
	StaveTie,
	Stem,
	type StemmableNote,
	type TabNote,
	TabSlide,
	TabTie,
	type TieNotes,
	Tuplet,
} from 'vexflow';
import {
	SINGLE_SLIDE_GAP,
	SINGLE_SLIDE_LEN,
	SINGLE_SLIDE_RISE,
	SLIDE_MIN_SLANT,
	SLIDE_PADDING,
	SLUR_GRACE_ANCHOR,
	SLUR_GRACE_CP_Y,
	SLUR_GRACE_MARGIN,
	SLUR_GRACE_Y_SHIFT,
	SLUR_MARGIN,
	SLUR_MIN_CP_Y,
	SLUR_WIDTH_FACTOR,
	SLUR_Y_SHIFT,
	TAB_TIE_CP1,
	TAB_TIE_CP2,
} from '../constants';
import type { PedalMark } from './score-reader';

/*
 * A standard-notation slide/glissando line, tilted by the slide direction: it runs from just
 * clear of the start notehead into the target notehead, rising for an up-slide and falling for
 * a down-slide. The tilt is
 * floored at SLIDE_MIN_SLANT so a near-unison slide still reads instead of going flat (and a
 * chord's near-equal slides stay ~parallel like the tab), and capped to the horizontal run so
 * a wide interval over a short grace-to-main gap doesn't spike near-vertical. (vexflow's
 * StaveLine can't do either — it just connects the heads flatly.) Drawn like the other
 * spanners via setContext().draw().
 */
class NotationSlide {
	private context?: RenderContext;
	constructor(
		private readonly from: StaveNote,
		private readonly fromIndex: number,
		private readonly to: StaveNote,
		private readonly toIndex: number,
	) {}
	setContext(context: RenderContext): this {
		this.context = context;
		return this;
	}
	draw(): void {
		const ctx = this.context;
		if (!ctx) {
			return;
		}
		// getModifierStartXY(...).y is each note's notehead Y (ys[index]). Start the line clear
		// of the start notehead's outer edge plus a gap (its center plus half its glyph width
		// plus 2*SLIDE_PADDING — the extra clears its stem so the line doesn't look like it grows
		// out of the note), and end it just into the target notehead (its center minus
		// SLIDE_PADDING) so the slide reads as running into the note. The start note is always
		// left of the target, so x1 < x2 holds.
		const startY = this.from.getModifierStartXY(
			Modifier.Position.RIGHT,
			this.fromIndex,
		).y;
		const endY = this.to.getModifierStartXY(
			Modifier.Position.LEFT,
			this.toIndex,
		).y;
		const x1 =
			this.from.getAbsoluteX() +
			this.from.getGlyphWidth() / 2 +
			2 * SLIDE_PADDING;
		const x2 = this.to.getAbsoluteX() - SLIDE_PADDING;
		const width = Math.max(x2 - x1, 1);
		// Rise from the start head to the target head; the target lower (larger y) is a
		// down-slide. Floor the tilt so a near-unison slide still reads, but cap it to the
		// horizontal width so a wide interval over a short grace-to-main run doesn't spike
		// near-vertical. A true unison defaults to a down tilt.
		const rise = endY - startY;
		const sign = rise < 0 ? -1 : 1;
		const dy =
			sign * Math.min(Math.max(Math.abs(rise), SLIDE_MIN_SLANT), width);
		ctx.beginPath();
		ctx.moveTo(x1, startY);
		ctx.lineTo(x2, startY + dy);
		ctx.stroke();
	}
}

/*
 * A slide into or out of a single note, where the other end is indeterminate (an unpaired
 * <slide>/<glissando> — a stop with no start, or a start with no stop). There's no partner
 * notehead, so it draws a short "/" tick beside the head instead of a line between two: a
 * slide-in ('in') sits just left of the head and rises up into it; a slide-out ('out') sits
 * just right and rises up out of it. Works for both a StaveNote (notation) and a TabNote (tab)
 * — both expose getAbsoluteX/getGlyphWidth/getModifierStartXY. Drawn via setContext().draw()
 * like the other spanners. (vexflow's TabSlide/StaveTie render a partial only by running the
 * line to the stave edge, which is right for a system-break wrap but not a mid-measure gesture.)
 */
class SingleSlide {
	private context?: RenderContext;
	constructor(
		private readonly note: StaveNote | TabNote,
		private readonly index: number,
		private readonly kind: 'in' | 'out',
		// Extra gap between the note glyph and the near (head-touching) end of the tick, on top
		// of SLIDE_PADDING. The default padding hugs a notehead well, but a bare tab fret digit
		// wants more air, so callers widen it per case.
		private readonly extraPad = 0,
	) {}
	setContext(context: RenderContext): this {
		this.context = context;
		return this;
	}
	draw(): void {
		const ctx = this.context;
		if (!ctx) {
			return;
		}
		const side =
			this.kind === 'in' ? Modifier.Position.LEFT : Modifier.Position.RIGHT;
		const y = this.note.getModifierStartXY(side, this.index).y;
		const half = this.note.getGlyphWidth() / 2;
		const pad = SLIDE_PADDING + this.extraPad;
		// The end touching the notehead sits at its Y; the far end drops SINGLE_SLIDE_RISE so the
		// tick always leans up-right ("/"), like the tab "/8" slide-in in the reference image. A
		// slide-in tucks just left of the head (running up into it); a slide-out just right.
		const near = this.note.getAbsoluteX();
		const [x1, y1, x2, y2] =
			this.kind === 'in'
				? [
						near - half - pad - SINGLE_SLIDE_LEN,
						y + SINGLE_SLIDE_RISE,
						near - half - pad,
						y,
					]
				: [
						near + half + pad,
						y,
						near + half + pad + SINGLE_SLIDE_LEN,
						y - SINGLE_SLIDE_RISE,
					];
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
	}
}

/*
 * A slur whose endpoints are pinned to explicit Ys. vexflow's Curve can only anchor an
 * end at getStemExtents(): NEAR_TOP is the stem tip, NEAR_HEAD the notehead *opposite*
 * the stem. On a stem-down chord neither names the notehead a bow should touch —
 * NEAR_HEAD lands on the chord's topmost note (so a grace slur shoots up over the
 * chord's accidentals as a near-straight diagonal instead of bowing under it) and
 * NEAR_TOP lands below the beam. Take the endpoint Ys as given; the X, the bezier and
 * the fill still come from vexflow.
 */
class HeadCurve extends Curve {
	constructor(
		from: StaveNote | undefined,
		to: StaveNote | undefined,
		options: CurveOptions,
		private readonly fromY: number,
		private readonly toY: number,
	) {
		super(from, to, options);
	}

	override draw(): boolean {
		this.checkContext();
		this.setRendered();
		const { from, to } = this;
		// One of the two is always set (Curve's constructor rejects neither), so this
		// picks the stave of whichever end exists on a system-break half-curve.
		const stave = (from ?? to)?.checkStave();
		if (!stave) {
			return false;
		}
		this.renderCurve({
			firstX: from ? from.getTieRightX() : stave.getTieStartX(),
			lastX: to ? to.getTieLeftX() : stave.getTieEndX(),
			firstY: this.fromY,
			lastY: this.toY,
			direction: this.renderOptions.openingDirection === 'down' ? -1 : 1,
		});
		return true;
	}
}

// A beam run: the notes joined by their primary (8th-level) beam, plus the indexes
// within the run where the secondary (16th+) beam breaks into sub-beams.
type BeamGroup = { notes: Note[]; secondaryBreaks: number[] };

export class SpannerBuilder {
	/*
	 * Group a voice's chord run into beam runs off the primary <beam number="1">
	 * markers. Unlike mdom's measure.beams, an "end" does NOT close the run: only a
	 * "begin" (new run) or a non-beamed note does. This keeps a beat whose primary beam
	 * is split at a sub-beam boundary — e.g. Guitar Pro encoding a triplet-of-16ths +
	 * 2-16ths beat as begin,continue,end,continue,end — as one continuous primary beam
	 * (mdom instead drops the orphaned continue/end notes, leaving them flagged).
	 * The secondary beam still breaks at those boundaries: any <beam number="2"> "end"
	 * that isn't the run's last note marks where the 16th beam splits.
	 * A rest with no beam markers does NOT close the run either: it can sit under a
	 * beam, so it's skipped and the surrounding notes stay in one beam.
	 */
	groupBeams(chords: Chord[]): BeamGroup[] {
		const groups: BeamGroup[] = [];
		let current: BeamGroup | null = null;
		for (const chord of chords) {
			const note = chord.lead;
			const primary = note.beams.find((b) => b.number === '1')?.beamValue;
			if (primary === 'begin') {
				current = { notes: [note], secondaryBreaks: [] };
				groups.push(current);
			} else if (primary === 'continue' || primary === 'end') {
				if (!current) {
					current = { notes: [note], secondaryBreaks: [] };
					groups.push(current);
				} else {
					current.notes.push(note);
				}
			} else if (note.isRest) {
				// A rest carries no beam markers but can sit *under* a beam (a "continue"
				// run that resumes after it). Don't close the run — skip the rest so the
				// following notes stay in the same beam, as the golden engraving shows.
				continue;
			} else {
				current = null;
				continue;
			}
			// A secondary (16th+) beam that ends mid-run splits the sub-beams there. Record
			// the break at this note's index; the last note's "end" is the run end, not a split.
			if (note.beams.some((b) => b.number !== '1' && b.beamValue === 'end')) {
				current.secondaryBreaks.push(current.notes.length - 1);
			}
		}
		// The break index recorded for the run's final note is its terminus, not a split.
		for (const group of groups) {
			group.secondaryBreaks = group.secondaryBreaks.filter(
				(i) => i < group.notes.length - 1,
			);
		}
		return groups;
	}

	/*
	 * Beams: map each beam group's notes to their StaveNotes. Built before formatting
	 * so the beamed notes drop their flags.
	 */
	buildBeams(
		groups: BeamGroup[],
		byLead: Map<Note, StaveNote>,
		defaultStem?: 'up' | 'down',
	): Beam[] {
		const beams: Beam[] = [];
		for (const group of groups) {
			const notes = group.notes
				// Grace notes are beamed by their own GraceNoteGroup; they live in byLead
				// only for slur resolution, so skip them here to avoid a second, conflicting
				// auto-stemmed beam drawn over the ornament.
				.filter((note) => !note.isGrace)
				.map((note) => byLead.get(note))
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
				if (group.secondaryBreaks.length > 0) {
					beam.breakSecondaryAt(group.secondaryBreaks);
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
	private isFlatBeam(group: BeamGroup, byLead: Map<Note, StaveNote>): boolean {
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
		const position = articulationPosition(staveNote);
		for (const mod of staveNote.getModifiers()) {
			if (mod instanceof Articulation && ARTICULATION_CODE_SET.has(mod.type)) {
				mod.setPosition(position);
			}
		}
	}

	/*
	 * Tuplets: a <tuplet>start..stop span covers every note between the two markers
	 * (the inner notes carry no marker), so slice the chord run by index. The ratio
	 * comes from the start note's <time-modification> (e.g. 3:2 -> "3").
	 *
	 * The bracket goes where the start marker's `placement` says, and otherwise on
	 * the stem side of the group — the engraving default, and what MuseScore does.
	 * Beams are built before tuplets, so the stem directions are already settled.
	 */
	buildTuplets<T extends StemmableNote>(
		chords: Chord[],
		byLead: Map<Note, T>,
	): Tuplet[] {
		const tuplets: Tuplet[] = [];
		let start = -1;
		let placement: string | null = null;
		chords.forEach((chord, i) => {
			for (const tuplet of chord.lead.tuplets) {
				if (tuplet.tupletType === 'start') {
					start = i;
					placement = tuplet.getAttribute('placement');
				} else if (tuplet.tupletType === 'stop' && start >= 0) {
					const group = chords
						.slice(start, i + 1)
						.map((c) => byLead.get(c.lead))
						.filter((n): n is T => n !== undefined);
					if (group.length > 1) {
						const ratio = chords[start]?.lead.timeModification;
						// ponytail: the first non-rest speaks for the group — a mixed-stem
						// tuplet would need a majority vote.
						const stemmed = group.find((n) => !n.isRest()) ?? group[0];
						const isBelow =
							placement === 'below' ||
							(placement !== 'above' &&
								stemmed?.getStemDirection() === Stem.DOWN);
						tuplets.push(
							new Tuplet(group, {
								location: isBelow
									? Tuplet.LOCATION_BOTTOM
									: Tuplet.LOCATION_TOP,
								...(ratio && {
									numNotes: ratio.actual,
									notesOccupied: ratio.normal,
								}),
							}),
						);
					}
					start = -1;
					placement = null;
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
					let partnerNote =
						(tie.partner &&
							samePitchMember(note, chordOf.get(tie.partner.note))) ??
						tie.partner?.note;
					// A chain-middle note carries both a tie stop and a tie start. When the
					// exporter orders <tied start> before <tied stop> on that note, mdom's
					// document-order pairing matches the start to the note's OWN stop — a
					// degenerate self-tie that draws nothing. Re-resolve to the next same-pitch
					// note carrying a tie stop, so each link of the chain draws its own arc.
					if (
						tie.tieType === 'start' &&
						(!partnerNote || partnerNote === note)
					) {
						partnerNote = nextTieStopMember(note, chords);
					}
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

					const specs = tieSpecs(
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
	 * Hammer-ons and pull-offs on a TAB stave. Both are notated with a plain <slur>;
	 * vexflow draws each as a TabTie labelled "H" or "P". When no explicit
	 * <hammer-on>/<pull-off> marker says which, infer from the fret motion of the
	 * lead string: a higher target fret is a hammer-on, a lower one a pull-off (pulling
	 * off to an open string is just a target fret of 0).
	 */
	buildHammerPulls(
		chords: Chord[],
		byTabLead: Map<Note, TabNote>,
		showText: boolean,
	): TabTie[] {
		const ties: TabTie[] = [];
		for (const chord of chords) {
			const firstNote = byTabLead.get(chord.lead);
			if (!firstNote) {
				continue;
			}
			for (const slur of chord.lead.slurs) {
				if (slur.slurType !== 'start') {
					continue;
				}
				const partner = slur.partner?.note;
				const lastNote = partner && byTabLead.get(partner);
				// An unclosed slur (no resolved partner) isn't a real hammer-on/pull-off;
				// skip it rather than drawing a dangling tie.
				if (!partner || !lastNote) {
					continue;
				}
				const hammer =
					(explicitTechnique(chord.lead) ??
						((partner.fret ?? 0) > (chord.lead.fret ?? 0)
							? 'hammer'
							: 'pull')) === 'hammer';
				const { firstIndexes, lastIndexes } = pairByString(firstNote, lastNote);
				const specs = tieSpecs(firstNote, lastNote, firstIndexes, lastIndexes);
				for (const notes of specs) {
					const tie = hammer
						? TabTie.createHammeron(notes)
						: TabTie.createPulloff(notes);
					// Widen TabTie's narrowed control points so the filled arc is as thick as
					// the stave-note slurs (vexflow defaults it thinner than a StaveTie).
					tie.renderOptions.cp1 = TAB_TIE_CP1;
					tie.renderOptions.cp2 = TAB_TIE_CP2;
					// The arc always draws; clear the "H"/"P" label when the text is off.
					if (!showText) {
						tie.setText('');
					}
					ties.push(tie);
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
	): Array<TabSlide | SingleSlide> {
		const slides: Array<TabSlide | SingleSlide> = [];
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
					const slide =
						fret > from.fret
							? TabSlide.createSlideUp(notes)
							: TabSlide.createSlideDown(notes);
					// The line always draws; clear the "sl." label when the text is off.
					if (!showText) {
						slide.setText('');
					}
					slides.push(slide);
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
	 * Sustain pedals (<direction><pedal>): a start..stop pair drawn as a vexflow
	 * PedalMarking under the stave — the "Ped…*" text by default, or a bracket line
	 * when the MusicXML carries line="yes". Paired by `number` and resolved over the
	 * whole score (a pedal can span barlines) like the other spanners; the markers
	 * arrive in document order, so each stop closes the matching open start.
	 * ponytail: a pedal whose stop wraps onto a later system isn't split — vexflow
	 * throws on descending x, so a wrapping pedal would need the partial-span handling
	 * buildTies uses; add it if a fixture needs one.
	 */
	buildPedals(
		markers: PedalMark[],
		byLead: Map<Note, StaveNote>,
	): PedalMarking[] {
		const pedals: PedalMarking[] = [];
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
				const pedal = PedalMarking.createSustain([from.note, staveNote]);
				if (from.line) {
					pedal.setType(PedalMarking.type.BRACKET);
				}
				pedals.push(pedal);
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
	buildSlurs(chords: Chord[], byLead: Map<Note, StaveNote>): Curve[] {
		const slurs: Curve[] = [];
		chords.forEach((chord, i) => {
			const from = byLead.get(chord.lead);
			const isGrace = chord.lead.isGrace;
			for (const slur of slurConnectors(chord.lead)) {
				if (slur.slurType !== 'start' || !slur.partner || !from) {
					continue;
				}
				const partner = slur.partner.note;
				const to = byLead.get(partner);
				if (!to) {
					continue;
				}
				const j = chords.findIndex((c) => c.lead === partner);
				const span =
					j > i
						? chords
								.slice(i, j + 1)
								.map((c) => byLead.get(c.lead))
								.filter((n): n is StaveNote => n !== undefined)
						: [from, to];

				// Bulge up for placement="above", down for "below", otherwise opposite the
				// stems (slurs sit on the notehead side). The opening direction forces the
				// arc's sign even when the two endpoints' stems disagree. A grace-to-main
				// slur always hugs under (under the grace, down to the main notehead),
				// ignoring placement — grace slurs read as a consistent underneath bow.
				const bulgeUp = isGrace
					? false
					: slur.placement === 'above'
						? true
						: slur.placement === 'below'
							? false
							: from.getStemDirection() !== 1;

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
				const useStemTips = spread(stemAnchorY) <= spread(headAnchorY);
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
					return noteExtents(n);
				};
				// A grace-to-main curve hugs directly under the two noteheads with a small
				// tight bow instead of the fuller slur arc (see the SLUR_GRACE_* constants).
				const yShift = isGrace ? SLUR_GRACE_Y_SHIFT : SLUR_Y_SHIFT;

				// The control-point lift needed for a curve whose endpoints both sit at
				// `midEnd` (the bulge-side Y) and that must clear the extreme note among
				// `spanNotes` over the horizontal `width`. For a full slur only the notes it
				// passes *over* count — the endpoints are where it attaches, so their own stems
				// must not inflate it. A note beamed up out of the stave has a stem taller than
				// the stave itself, and clearing that from a notehead anchor turns a two-note
				// slur into a narrow spike; with no interior notes the arc takes the floor. A
				// grace curve measures against its own endpoint anchors (extentsOf collapses to
				// anchorY), never a stem, so it has nothing to exclude.
				const clearanceOf = (spanNotes: StaveNote[]) =>
					isGrace ? spanNotes : spanNotes.filter((n) => n !== from && n !== to);
				const cpYFor = (
					midEnd: number,
					spanNotes: StaveNote[],
					width: number,
				) => {
					const clearing = clearanceOf(spanNotes);
					const extreme = bulgeUp
						? Math.min(...clearing.map((n) => extentsOf(n).top))
						: Math.max(...clearing.map((n) => extentsOf(n).bottom));
					const need = clearing.length
						? Math.abs(midEnd - extreme) +
							(isGrace ? SLUR_GRACE_MARGIN : SLUR_MARGIN)
						: 0;
					// A grace bow stays tight — it takes the clearance it needs and no more,
					// where a full slur also widens with its span.
					const floor = isGrace
						? SLUR_GRACE_CP_Y
						: Math.max(SLUR_MIN_CP_Y, width * SLUR_WIDTH_FACTOR);
					return Math.max(floor, (need - yShift) / 0.75);
				};
				// The exact Y each end of the curve will be drawn at: what HeadCurve was handed
				// for a grace, and what vexflow reads off getStemExtents() for everything else.
				const endpointY = (note: StaveNote) => {
					if (isGrace) {
						return anchorY(note);
					}
					const { topY, baseY } = note.getStemExtents();
					return metric(note) === Curve.Position.NEAR_TOP ? topY : baseY;
				};

				const pushCurve = (
					curveFrom: StaveNote | undefined,
					curveTo: StaveNote | undefined,
					position: number,
					positionEnd: number,
					cpY: number,
				) => {
					// vexflow offsets each control point from its OWN endpoint, so when the two
					// ends sit at very different heights the far control point lands well past
					// the near end and the curve whips into it — a sharp hook right where the
					// bow should be settling onto the note. Put both control points at a single
					// absolute depth instead. The midpoint is unchanged (the algebra works out
					// to depth = midpoint + cpY, so clearance still holds) but each end is now
					// approached on a gentle tangent. Endpoints at equal heights reduce to the
					// old symmetric cps exactly, so only lopsided curves move.
					const dir = bulgeUp ? -1 : 1;
					const only = (curveFrom ?? curveTo) as StaveNote;
					const y0 = endpointY(curveFrom ?? only);
					const y1 = endpointY(curveTo ?? only);
					const depth = (y0 + y1) / 2 + dir * cpY;
					const options: CurveOptions = {
						position,
						positionEnd,
						openingDirection: bulgeUp ? 'down' : 'up',
						yShift,
						cps: [
							{ x: 0, y: dir * (depth - y0) },
							{ x: 0, y: dir * (depth - y1) },
						],
					};
					if (isGrace) {
						slurs.push(new HeadCurve(curveFrom, curveTo, options, y0, y1));
					} else {
						slurs.push(new Curve(curveFrom, curveTo, options));
					}
				};

				// When the stop note wraps onto a later system its stave sits lower on the
				// page (greater Y), so a single Curve would slant across the page gap. Split
				// it into two partial curves like a wrapped tie (see tieSpecs): one bowing off
				// the right edge of the start note's stave ("slur to nothing") and one bowing
				// in from the left edge of the stop note's ("slur from nothing"). vexflow
				// renders a Curve given only a `from` or only a `to` exactly so, anchoring the
				// open end at the stave's tie edge. (Y, not X: a slur whose start note is the
				// first in its system shares the stop note's left X but not its row.)
				const fromStave = from.getStave();
				const toStave = to.getStave();
				if (toStave && fromStave && toStave.getY() > fromStave.getY()) {
					const fromSpan = span.filter((n) => n.getStave() === fromStave);
					const toSpan = span.filter((n) => n.getStave() === toStave);
					const fromY = extentsOf(from);
					const toY = extentsOf(to);
					pushCurve(
						from,
						undefined,
						metric(from),
						metric(from),
						cpYFor(
							bulgeUp ? fromY.top : fromY.bottom,
							fromSpan,
							fromStave.getTieEndX() - from.getTieRightX(),
						),
					);
					pushCurve(
						undefined,
						to,
						metric(to),
						metric(to),
						cpYFor(
							bulgeUp ? toY.top : toY.bottom,
							toSpan,
							to.getTieLeftX() - toStave.getTieStartX(),
						),
					);
					continue;
				}

				const width = Math.abs(to.getTieLeftX() - from.getTieRightX());
				const fromY = extentsOf(from);
				const toY = extentsOf(to);
				const midEnd = bulgeUp
					? (fromY.top + toY.top) / 2
					: (fromY.bottom + toY.bottom) / 2;
				pushCurve(
					from,
					to,
					metric(from),
					metric(to),
					cpYFor(midEnd, span, width),
				);
			}
		});
		return slurs;
	}
}

// MusicXML <articulations> name -> vexflow articulation code.
const ARTICULATION_CODES: Record<string, string> = {
	staccato: 'a.',
	accent: 'a>',
	tenuto: 'a-',
	staccatissimo: 'av',
	'strong-accent': 'a^',
};

const ARTICULATION_CODE_SET = new Set(Object.values(ARTICULATION_CODES));

/*
 * Notehead-side articulations sit opposite the stem: BELOW for stem-up notes,
 * ABOVE otherwise.
 */
function articulationPosition(staveNote: StaveNote): number {
	return staveNote.getStemDirection() === Stem.UP
		? Modifier.Position.BELOW
		: Modifier.Position.ABOVE;
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
 * The position indexes a hammer-on/pull-off arc connects: each string played by both
 * notes, paired up. A hammer-on runs along one string, so a two-string chord hammering
 * into another draws one arc per shared string. Positions with no counterpart drop out —
 * that's how an arpeggiated chord hammering into a single note stays drawable, since
 * TabTie rejects mismatched index counts. Falls back to the lead position on both sides
 * when the two share no string at all (a slur across strings isn't really a hammer-on,
 * but it still has to draw something).
 */
function pairByString(
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

function tieSpecs(
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
 * The next same-pitch note after `note` (in document order) that carries a tie stop.
 * Used to recover the partner of a chain-middle tie start when mdom mis-pairs it to
 * the note's own stop (see buildTies). null when the chain dangles past the score.
 */
function nextTieStopMember(note: Note, chords: Chord[]): Note | undefined {
	const p = note.pitch;
	if (!p) {
		return undefined;
	}
	const flat = chords.flatMap((chord) => chord.notes);
	for (let i = flat.indexOf(note) + 1; i < flat.length; i++) {
		const n = flat[i];
		if (
			n?.pitch?.step === p.step &&
			n.pitch?.octave === p.octave &&
			n.pitch?.alter === p.alter &&
			n.ties.some((t) => t.tieType === 'stop')
		) {
			return n;
		}
	}
	return undefined;
}

/*
 * The member of `chord` whose pitch matches `note` (a tie's two ends are always the
 * same pitch), or null when there's no chord or no match.
 */
function samePitchMember(note: Note, chord: Chord | undefined): Note | null {
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

/*
 * The slur-like connectors starting/stopping on a note: its <slur> markers plus any
 * <hammer-on>/<pull-off> in <technical>. In standard notation a hammer-on/pull-off IS
 * just a slur curve (the "H"/"P" label is a tab-only convention), so buildSlurs draws
 * them the same way — including grace-to-main graces. A technique whose target a real
 * <slur> already reaches is dropped, so an exporter that emits both doesn't double the arc.
 */
type SlurConnector = {
	slurType: string;
	partner: { note: Note } | null;
	placement: string | null;
};
function slurConnectors(note: Note): SlurConnector[] {
	const slurTargets = new Set(note.slurs.map((s) => s.partner?.note));
	const techniques: SlurConnector[] = [
		...note.hammerOns.map((h) => ({
			slurType: h.hammerOnType,
			partner: h.partner,
			placement: null,
		})),
		...note.pullOffs.map((p) => ({
			slurType: p.pullOffType,
			partner: p.partner,
			placement: null,
		})),
	].filter((t) => !slurTargets.has(t.partner?.note));
	return [...note.slurs, ...techniques];
}

/*
 * An explicit hammer-on/pull-off marker in <notations><technical>, or null when
 * neither is present (the common case — most tab is notated with only a slur).
 */
function explicitTechnique(note: Note): 'hammer' | 'pull' | null {
	if (note.hammerOns.length > 0) {
		return 'hammer';
	}
	if (note.pullOffs.length > 0) {
		return 'pull';
	}
	return null;
}

/*
 * The highest (smallest y) and lowest (largest y) drawn point of a note,
 * covering both its noteheads and, when present, its stem tip.
 */
function noteExtents(note: StaveNote): { top: number; bottom: number } {
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
