import type { Chord, Note } from '@stringsync/mdom';
import {
	Font,
	type PedalMarking,
	type RenderContext,
	type Stave,
	type StaveNote,
	type TabNote,
	TextBracket,
} from 'vexflow';
import { Rect } from 'webappwiz/geometry';
import { CollisionResolver } from './collision-resolver';
import {
	OTTAVA_TEXT_LINE,
	PEDAL_BOTTOM_MARGIN,
	PEDAL_BOTTOM_TEXT_LINE,
	PEDAL_INK_RISE,
	WORDS_NOTE_CLEARANCE,
} from './constants';
import type { DirectionPlacer } from './direction-placer';
import type { Hairpin } from './hairpin';
import type { NoteTranslator } from './note-translator';
import type {
	DirectionLineSpan,
	OctaveShiftSpan,
	PedalMark,
	WedgeMark,
} from './score-reader';
import type { SpannerBuilder } from './spanner-builder';
import type { SpillTracker } from './spill-tracker';

/*
 * The whole-pass endpoint registries handed to resolve(), snapshotted once every note is
 * placed: each spanner looks its lead notes up here to find the drawn note its endpoints
 * landed on — the notation map for ties/slurs/wedges/pedals, the tab map for
 * hammer-ons/pull-offs and slides.
 */
export interface SpannerAnchors {
	byLead: Map<Note, StaveNote>;
	byTabLead: Map<Note, TabNote>;
}

/*
 * The bookkeeping the draw pass keeps for itself while the spanners land, handed over as
 * a narrow structural view: the note obstacles come from the pass's own note
 * measurements, and the page crop grows with the rest of its page state.
 */
export interface SpannerReporter {
	/** The collision obstacle for a drawn note: a box from its top (notehead ∪
	 * beam-extended stem tip ∪ above articulations) to its bottom, one notehead wide —
	 * what a pedal band or ottava label has to drop/lift clear of. */
	noteObstacle(note: StaveNote): Rect;
	/** Ink that reached `top`: keeps the page crop above it. */
	growPageTop(top: number): void;
	/** Ink that reached `bottom`: keeps the page crop below it. */
	growPageBottom(bottom: number): void;
}

export interface SpannerResolverOptions {
	/** The score's <octave-shift> spans; the notes were drawn at the shifted position, and
	 * resolve() draws the bracket that says so over them. */
	octaveShiftSpans: readonly OctaveShiftSpan[];
	/** The score's <bracket>/<dashes> spans, drawn alongside the other spanners. */
	directionLineSpans: readonly DirectionLineSpan[];
	/** Print the "sl." label on tablature slides (the line always draws). */
	showTabSlideText: boolean;
	/** The drawable region of the scratch canvas, bounding the scoped collision probes. */
	scratchViewport: Rect;
}

/*
 * Resolves and draws the whole-score spanners once every note is placed: ties, slurs, tab
 * hammer-ons/pull-offs and slides, glissandos, ottava brackets, direction lines, trill
 * extensions, wedges, and pedals. A spanner's endpoints can sit in different measures, so
 * none of them can be built inside the measure loop — the loop records each measure's
 * chords, markers, and staves in here, and resolve() runs after the last one. One
 * instance lives and dies with its DrawPass.
 */
export class SpannerResolver {
	private readonly octaveShiftSpans: readonly OctaveShiftSpan[];
	private readonly directionLineSpans: readonly DirectionLineSpan[];
	private readonly showTabSlideText: boolean;
	// The drawable region of the scratch canvas, the bounds each scoped resolver probes in.
	private readonly scratchViewport: Rect;

	private readonly allChords: Chord[] = [];
	// Pedal directions are spanners too (a start..stop pair), collected per measure
	// and resolved over the whole score alongside ties and slurs.
	private readonly allPedals: PedalMark[] = [];
	// Wedge (hairpin) markers, resolved into StaveHairpins over the whole score alongside
	// the pedals — a hairpin can span barlines, so it can't be built per measure.
	private readonly allWedges: WedgeMark[] = [];
	// The same arrangement for tablature staves: hammer-ons/pull-offs also span
	// barlines, so the tab chords accumulate into their own list.
	private readonly allTabChords: Chord[] = [];
	// Which stave row and system every stave built this pass sits on. The measure loop
	// only sees the system being built; the spanners resolve at the end of the pass, over
	// staves from every system, and report the band each one landed in so the next pass
	// can open room for it (see SpillTracker).
	private readonly staveRows = new Map<
		Stave,
		{ row: number; system: number }
	>();

	constructor(
		private readonly context: RenderContext,
		private readonly spanners: SpannerBuilder,
		private readonly translator: NoteTranslator,
		private readonly spill: SpillTracker,
		private readonly directionPlacer: DirectionPlacer,
		private readonly reporter: SpannerReporter,
		opts: SpannerResolverOptions,
	) {
		this.octaveShiftSpans = opts.octaveShiftSpans;
		this.directionLineSpans = opts.directionLineSpans;
		this.showTabSlideText = opts.showTabSlideText;
		this.scratchViewport = opts.scratchViewport;
	}

	/* Where a freshly built stave sits: its stave row (the collision/spill band its
	 * spanners report under) and its system (what they reserve headroom against). */
	registerStave(stave: Stave, row: number, system: number): void {
		this.staveRows.set(stave, { row, system });
	}

	/* Which system a registered stave belongs to, or undefined before its part is built. */
	systemOf(stave: Stave): number | undefined {
		return this.staveRows.get(stave)?.system;
	}

	/* A drawn notation voice's chords, the pool ties/slurs/wedges resolve their pairs from. */
	addChords(chords: readonly Chord[]): void {
		this.allChords.push(...chords);
	}

	/* The tab counterpart of addChords, feeding the hammer-on/pull-off and slide pairing. */
	addTabChords(chords: readonly Chord[]): void {
		this.allTabChords.push(...chords);
	}

	addPedals(pedals: readonly PedalMark[]): void {
		this.allPedals.push(...pedals);
	}

	addWedges(wedges: readonly WedgeMark[]): void {
		this.allWedges.push(...wedges);
	}

	/*
	 * Build and draw every recorded spanner, resolved over the whole score now that every
	 * note is placed — so a span can cross a barline (its endpoints sit in different
	 * measures). Drawn last, on top of the notes.
	 */
	resolve(anchors: SpannerAnchors): void {
		for (const tie of this.spanners.buildTies(this.allChords, anchors.byLead)) {
			tie.setContext(this.context).draw();
		}
		// The bows, kept for the hairpin pass below: a wedge parks at a fixed gap from the
		// staff, which is the same band a slur bowing the same way lands in.
		const slurBows: { stave: Stave; rect: Rect }[] = [];
		for (const slur of this.spanners.buildSlurs(
			this.allChords,
			anchors.byLead,
		)) {
			// drawWithStyle, not draw: Curve.draw never applies its own style, and a
			// <slur line-type> rides on the element as a lineDash (see buildSlurs).
			slur.curve.setContext(this.context).drawWithStyle();
			// The bow is ink like any other, so the page has to cover it: a slur arcing over
			// the top stave of the first system rises into the cropped top slack, and one
			// dipping under the last system's bottom stave hangs past the floor. Without this
			// the crop cuts the arc off mid-air.
			this.reporter.growPageTop(slur.top);
			this.reporter.growPageBottom(slur.bottom);
			// A bow arcs past the notes it joins, so it can reach further off the stave than
			// anything the note pass measured — a slur over a beamed group climbs over the
			// beam, and in a song that lands on the singer's lyrics. Report it as spill so
			// pass two opens the gap instead (the arc is pinned to its noteheads and has
			// nowhere else to go).
			//
			// Except a cross-stave bow, which is a passenger in the gap rather than a thing
			// the gap has to hold: its height IS the distance between the two staves, so
			// reporting it would have the gap widen to make room for a curve that then grows
			// to match. Same reason crossStaveNotes drops a cross-staff stem tip.
			const placement = slur.stave && this.staveRows.get(slur.stave);
			if (slur.stave && placement && !slur.crossStave) {
				this.spill.recordStave(
					placement.system,
					placement.row,
					slur.stave,
					new Rect(
						slur.left,
						slur.top,
						slur.right - slur.left,
						slur.bottom - slur.top,
					),
				);
			}
			// And against the system above: a bow over a middle system's top stave has nothing
			// but the previous system over it, so report it the way an above-placed wedge does.
			if (placement) {
				this.spill.growHighestTop(placement.system, slur.top);
			}
			if (slur.stave) {
				slurBows.push({
					stave: slur.stave,
					rect: new Rect(
						slur.left,
						slur.top,
						slur.right - slur.left,
						slur.bottom - slur.top,
					),
				});
			}
		}
		// Tablature hammer-ons/pull-offs and slides, likewise resolved over the whole score.
		for (const tie of this.spanners.buildHammerPulls(
			this.allTabChords,
			anchors.byTabLead,
		)) {
			tie.setContext(this.context).draw();
		}
		for (const slide of this.spanners.buildSlides(
			this.allTabChords,
			anchors.byTabLead,
			this.showTabSlideText,
		)) {
			slide.setContext(this.context).draw();
		}
		// Standard-notation glissandos/slides (the StaveLine counterpart of the tab
		// slides above), e.g. a grace note that slides into the note it precedes.
		for (const line of this.spanners.buildGlissandos(
			this.allChords,
			anchors.byLead,
		)) {
			line.setContext(this.context).draw();
		}
		// Ottava brackets (<octave-shift>): the "8va"/"15mb" label and its dashed line over
		// (or under) the notes it covers. The notes were already drawn at the shifted
		// position by buildNotes; this is the label that says so.
		for (const span of this.octaveShiftSpans) {
			const first = span.notes[0];
			const last = span.notes.at(-1);
			const start = first && anchors.byLead.get(first);
			const stop = last && anchors.byLead.get(last);
			// Either endpoint off a hidden staff leaves nothing to bracket.
			if (!start || !stop) {
				continue;
			}
			const bracket = new TextBracket({
				start,
				stop,
				text: span.label,
				superscript: span.suffix,
				position: span.above
					? TextBracket.Position.TOP
					: TextBracket.Position.BOTTOM,
			});
			this.clearOctaveBracket(
				bracket,
				span.notes
					.map((note) => anchors.byLead.get(note))
					.filter((note): note is StaveNote => note !== undefined),
				span.above,
			);
			bracket.setContext(this.context).draw();
		}
		// The <bracket>/<dashes> spans, with each endpoint resolved to its drawn note (or
		// left undefined when it sits on a hidden staff).
		this.directionPlacer.drawDirectionLines(
			this.directionLineSpans.map((span) => ({
				span,
				start: anchors.byLead.get(span.from),
				stop: anchors.byLead.get(span.to),
			})),
		);
		// Trill extension lines, resolved over the whole score like the other spanners so a
		// trill can be held across a barline.
		for (const bracket of this.spanners.buildWavyLines(
			this.allChords,
			anchors.byLead,
		)) {
			bracket.setContext(this.context).draw();
		}
		// Hairpins, like the pedals below them, are resolved over the whole score so a wedge
		// can open in one measure and close in another. A below-stave one reaches under the
		// staff, so grow the bottom crop to its drawn extent.
		for (const wedge of this.spanners.buildWedges(
			this.allWedges,
			anchors.byLead,
		)) {
			this.clearWedge(wedge, slurBows);
			wedge.setContext(this.context).draw();
			this.reporter.growPageTop(wedge.bounds.top);
			this.reporter.growPageBottom(wedge.bounds.bottom);
			// A wedge pushed out past a slur can reach the neighbouring stave, so report the band
			// it ended up in and let pass two open the gap — within the system as spill, and
			// against the system above as overflow (an above-placed wedge on a system's top
			// stave has nothing but the previous system over it).
			const placement = this.staveRows.get(wedge.stave);
			if (placement) {
				this.spill.recordStave(
					placement.system,
					placement.row,
					wedge.stave,
					wedge.rect,
				);
				this.spill.growHighestTop(placement.system, wedge.bounds.top);
			}
		}
		// Pedals draw under the stave (vexflow's getYForBottomText), below the notes, so
		// grow the bottom crop to keep their "Ped…*" text / bracket from being clipped.
		// ponytail: only the final crop is grown — a pedal on a non-last system isn't
		// reserved against the system below it; add that if a fixture stacks one there.
		for (const { marking, notes } of this.spanners.buildPedals(
			this.allPedals,
			anchors.byLead,
			this.allChords,
		)) {
			this.dropPedalClear(marking, notes);
			marking.setContext(this.context).draw();
		}
		for (const marker of this.allPedals) {
			const stave = anchors.byLead.get(marker.lead)?.getStave();
			if (stave) {
				this.reporter.growPageBottom(
					stave.getYForBottomText(PEDAL_BOTTOM_TEXT_LINE) + PEDAL_BOTTOM_MARGIN,
				);
			}
		}
	}

	/*
	 * Drop a pedal's band below anything of its own that hangs under the staff — a low
	 * notehead and its ledger lines — instead of drawing the "Ped." glyph through it.
	 * vexflow positions the whole marking off one `line` offset, so the band moves as a
	 * unit and the drop converts to line units.
	 *
	 * The shared collision index is per-system (cleared at each system boundary) and pedals
	 * resolve after the last system, so this scopes a resolver to the pedal's own notes
	 * rather than reading a stale obstacle from an unrelated system at the same x.
	 */
	private dropPedalClear(marking: PedalMarking, notes: StaveNote[]): void {
		const stave = notes[0]?.getStave();
		if (!stave) {
			return;
		}
		const hw = this.translator.noteheadHalfWidth();
		const xs = notes.map((note) => note.getAbsoluteX());
		const left = Math.min(...xs) - hw;
		const baseline = stave.getYForBottomText(PEDAL_BOTTOM_TEXT_LINE);
		const natural = new Rect(
			left,
			baseline - PEDAL_INK_RISE,
			Math.max(...xs) + hw - left,
			PEDAL_INK_RISE,
		);
		const scoped = new CollisionResolver(this.scratchViewport);
		for (const note of notes) {
			scoped.add({ rect: this.reporter.noteObstacle(note), kind: 'note' });
		}
		const placed = scoped.dropClear(natural, WORDS_NOTE_CLEARANCE);
		marking.setLine((placed.y - natural.y) / stave.getSpacingBetweenLines());
		this.reporter.growPageBottom(placed.bottom + PEDAL_BOTTOM_MARGIN);
	}

	/*
	 * Move a hairpin further from the staff until it clears any slur bowing into its band. A
	 * wedge parks at a fixed gap from the staff, which is exactly where a slur on the same
	 * side lands — an under-slur over low notes dips straight through a below-stave crescendo.
	 * The slur can't yield (it's pinned to its noteheads), so the wedge is the one that moves.
	 *
	 * Scoped like {@link dropPedalClear}: the shared index is per-system and wedges resolve
	 * after the last one, so this indexes only the bows drawn over this wedge's own stave.
	 */
	private clearWedge(
		wedge: Hairpin,
		bows: { stave: Stave; rect: Rect }[],
	): void {
		const natural = wedge.rect;
		const scoped = new CollisionResolver(this.scratchViewport);
		for (const bow of bows) {
			if (bow.stave === wedge.stave) {
				scoped.add({ rect: bow.rect, kind: 'tie' });
			}
		}
		const placed = wedge.above
			? scoped.liftClear(natural, WORDS_NOTE_CLEARANCE)
			: scoped.dropClear(natural, WORDS_NOTE_CLEARANCE);
		wedge.setOffset(wedge.above ? natural.y - placed.y : placed.y - natural.y);
	}

	/*
	 * Move an ottava bracket's row further from the stave until its label clears the notes it
	 * covers. vexflow parks a TextBracket one text line off the staff, which is right until a
	 * beam reaches into that band — a stem-down beam under an "8vb", a stem-up one over an
	 * "8va" — and then the label is drawn straight through the beam line.
	 *
	 * Same shape as {@link dropPedalClear}: a scoped resolver over the span's own notes (the
	 * shared index is per-system and brackets resolve after the last one), and the resolved
	 * shift converted back into the single `line` offset vexflow positions the whole bracket
	 * from. The note obstacles reach the beam-extended stem tip, which is what makes the beam
	 * visible to the probe at all (see SpannerReporter.noteObstacle).
	 */
	private clearOctaveBracket(
		bracket: TextBracket,
		notes: StaveNote[],
		above: boolean,
	): void {
		const stave = notes[0]?.getStave();
		if (!stave) {
			return;
		}
		// The baseline vexflow would draw the label on, reproduced from TextBracket.draw.
		// renderText draws upward from a baseline, so the label's ink band is the one font
		// size above it.
		// TextBracket adds Tables.TEXT_HEIGHT_OFFSET_HACK (1, and not exported) to a
		// below-stave line, so match it here or the probe measures the wrong row.
		const baseline = above
			? stave.getYForTopText(OTTAVA_TEXT_LINE)
			: stave.getYForBottomText(OTTAVA_TEXT_LINE + 1);
		const height = Font.convertSizeToPixelValue(bracket.fontInfo.size);
		const hw = this.translator.noteheadHalfWidth();
		const xs = notes.map((note) => note.getAbsoluteX());
		const left = Math.min(...xs) - hw;
		const natural = new Rect(
			left,
			baseline - height,
			Math.max(...xs) + hw - left,
			height,
		);
		const scoped = new CollisionResolver(this.scratchViewport);
		for (const note of notes) {
			scoped.add({ rect: this.reporter.noteObstacle(note), kind: 'note' });
		}
		const placed = above
			? scoped.liftClear(natural, WORDS_NOTE_CLEARANCE)
			: scoped.dropClear(natural, WORDS_NOTE_CLEARANCE);
		// getYForTopText counts away from the stave upward and getYForBottomText downward, so
		// the same "further out" shift has the opposite sign in line units.
		const shift =
			(above ? natural.y - placed.y : placed.y - natural.y) /
			stave.getSpacingBetweenLines();
		bracket.setLine(OTTAVA_TEXT_LINE + shift);
		this.reporter.growPageTop(placed.y);
		this.reporter.growPageBottom(placed.bottom);
		// Report the band the label ended up in so pass two opens room for it — as spill
		// against the neighbouring stave inside the system (a piano 8va sits in the gap
		// under the vocal part's lyrics), and as overflow against the system above.
		const placement = this.staveRows.get(stave);
		if (placement) {
			this.spill.recordStave(placement.system, placement.row, stave, placed);
			if (above) {
				this.spill.growHighestTop(placement.system, placed.y);
			}
		}
	}
}
