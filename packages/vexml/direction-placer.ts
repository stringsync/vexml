import type { Harmony, Measure } from '@stringsync/mdom';
import {
	Element,
	type RenderContext,
	type Stave,
	type StaveNote,
	StaveTempo,
	TabNote,
} from 'vexflow';
import { Rect } from 'webappwiz/geometry';
import { ChordDiagramGlyph, type ChordFrame } from './chord-diagram-glyph';
import type { CollisionKind, CollisionResolver } from './collision-resolver';
import {
	CHORD_DIAGRAM_GAP,
	CHORD_DIAGRAM_HEIGHT,
	CHORD_DIAGRAM_PADDING,
	CHORD_DIAGRAM_WIDTH,
	DIRECTION_LINE_HOOK,
	DIRECTION_LINE_TEXT_LINE,
	DYNAMICS_FONT_SIZE,
	HARMONY_ACCIDENTAL_FONT_SIZE,
	HARMONY_ACCIDENTAL_KERN,
	HARMONY_ACCIDENTALS,
	HARMONY_FONT_SIZE,
	HARMONY_NOTE_CLEARANCE,
	HARMONY_PADDING,
	HARMONY_Y_OFFSET,
	NAVIGATION_FONT_SIZE,
	PAGE_MARGIN_X,
	REHEARSAL_FONT_SIZE,
	REHEARSAL_NOTE_CLEARANCE,
	REHEARSAL_PADDING,
	REHEARSAL_Y_OFFSET,
	TEMPO_MARK_GAP,
	TEMPO_NOTE_CLEARANCE,
	TEMPO_SCALE,
	WORDS_FONT_SIZE,
	WORDS_NOTE_CLEARANCE,
	WORDS_Y_OFFSET,
} from './constants';
import { DynamicGlyphs } from './dynamic-glyphs';
import type { GeometryCollector } from './geometry-collector';
import { MetronomeGlyph, type TempoModulation } from './metronome-glyph';
import type {
	DirectionLineSpan,
	LineEnd,
	Placement,
	ScoreReader,
	TempoMark,
} from './score-reader';
import type { SpillTracker } from './spill-tracker';

// Above-stave text (chord symbols, words) clears notes, ties, and other placed text, but NOT
// chord diagrams — a diagram deliberately draws on top of any text it shares a spot with. All
// nudge logic funnels through the CollisionResolver; see AGENTS.md, "Collisions and nudges".
const TEXT_CLEAR_KINDS: CollisionKind[] = ['note', 'tie', 'annotation'];

// A dynamic that sets a sustained LEVEL rather than accenting one note: any run of p's or
// f's, plus mp/mf. These stay in force until the next one, so an immediate restatement of
// the level already sounding is redundant and doesn't print. Everything else (sfz, fp, rfz,
// fz, an <other-dynamics>) marks a single note and always prints, however often it repeats.
const SUSTAINED_DYNAMIC = /^(p+|f+|mp|mf)$/;

// How far a restatement of the sounding level can be from the last one printed and still
// count as redundant, in measures. GuitarPro exports the level on EVERY measure, which this
// swallows; a composer restating a dynamic further along — Schumann re-marking `p` at a new
// stanza after the voice has rested — is a fresh reminder to the player and prints.
const DYNAMIC_RESTATE_GAP = 1;

// The SMuFL glyphs of the two navigation signs. They engrave as music, not as text — a
// segno is a symbol a player recognizes by shape, so spelling it "Segno" would not do.
const NAVIGATION_GLYPHS: Record<'segno' | 'coda', string> = {
	segno: '\uE047', // segno
	coda: '\uE048', // coda
};

// The face drawWords types a beside-stave string in. A words directive gets the text font
// in italics; a dynamics marking gets the notation font (SMuFL glyphs are not text) at its
// own larger size, so it engraves as music.
type SideTextStyle = {
	font: string;
	size: number;
	italic: boolean;
	color?: string;
	/** Where the string sits relative to its anchor x. Default 'left' — a directive is a
	 * phrase reading rightward from its note; a dynamic centers on its notehead, and a
	 * repeat-times label ends at the barline it labels. */
	align?: 'left' | 'center' | 'right';
};

/**
 * One measure's metronome mark(s): the rate from a `<beat-unit>` metronome, the note-group
 * relation from a `<metronome-note>` one, or both. At least one is non-null.
 */
export type TempoTask = {
	tempo: TempoMark | null;
	modulation: TempoModulation | null;
};

/** A queued chord symbol (or fret diagram) and what to print there. */
export type HarmonyTask = {
	// A notation note when the part has a notation stave, else the tab note — a
	// tab-only part still prints its chord symbols.
	staveNote: StaveNote | TabNote;
	text: string;
	frame: ChordFrame | null;
	source: Harmony;
};

/** A queued words direction, drawn on its stave's `placement` side at the laid-out x of
 * the note it applies to. */
export type WordsTask = {
	stave: Stave;
	text: string;
	anchor: StaveNote | TabNote | undefined;
	placement: Placement;
};

/** A queued dynamics marking: a words task plus whether the marking spells out of SMuFL's
 * dynamic letters (and so engraves as glyphs in the notation font). */
export type DynamicsTask = {
	stave: Stave;
	text: string;
	glyph: boolean;
	anchor: StaveNote | TabNote | undefined;
	placement: Placement;
};

/** A queued <figured-bass> stack. `figures` is the whole stack, top row first; it draws as
 * one row per figure under the stave. */
export type FiguredBassTask = {
	stave: Stave;
	figures: string[];
	anchor: StaveNote | TabNote | undefined;
};

/** A <bracket>/<dashes> span with its endpoint notes as drawn — undefined when an endpoint
 * sits on a hidden staff. */
export type DirectionLineTask = {
	span: DirectionLineSpan;
	start: StaveNote | undefined;
	stop: StaveNote | undefined;
};

/*
 * One measure column's direction inputs, snapshotted from the measure loop at each call:
 * the annotation tasks queued while the column's staves and notes were built, plus the
 * measure-level facts behind the marks printed once over the column's top stave.
 */
export interface DirectionColumn {
	measureIndex: number;
	systemIndex: number;
	/** The system's top stave at this column, where measure-level marks print; undefined
	 * until a stave exists. */
	topStave: Stave | undefined;
	/** The first part's measure — a rehearsal or navigation mark belongs to the measure
	 * rather than to one part (every part carries the same one), so it's read from the
	 * first part like the barline decorations. */
	measure: Measure | undefined;
	/** The printed "Nx" label of a repeat played more than twice, or null. */
	repeatTimesLabel: string | null;
	words: readonly WordsTask[];
	dynamics: readonly DynamicsTask[];
	figuredBasses: readonly FiguredBassTask[];
	harmonies: readonly HarmonyTask[];
	tempos: ReadonlyArray<{ stave: Stave } & TempoTask>;
}

/*
 * The bookkeeping the draw pass keeps for itself while directions land, handed over as a
 * narrow structural view: stave→row resolution lives with the pass's pending registry, and
 * the page crop grows with the rest of its page state.
 */
export interface DirectionReporter {
	/** Which stave row (of the current measure column) a stave sits on — the collision
	 * band its text registers under. */
	rowOf(stave: Stave): number | undefined;
	/** How far an above-stave annotation reached over its stave, so pass two opens the gap
	 * to the stave above wide enough to hold it. */
	recordAnnotationSpill(stave: Stave, rect: Rect): void;
	/** The below-stave mirror of recordAnnotationSpill: how far a below-stave annotation
	 * reached under its stave (also grows the page and system bottoms). */
	recordAnnotationDrop(stave: Stave, rect: Rect): void;
	/** Ink that reached `top`: keeps the page crop above it. */
	growPageTop(top: number): void;
	/** Ink that reached `bottom`: keeps the page crop below it. */
	growPageBottom(bottom: number): void;
}

export interface DirectionPlacerOptions {
	/** The face beside-stave text is typed in. */
	labelFont: string;
	/** The SMuFL face for markings that engrave as music (dynamics, segno/coda). */
	notationFont: string;
	notationColor: string;
	textColor: string;
	/** The drawable region of the scratch canvas; a mark anchored near its right edge is
	 * nudged back inside rather than clipped. */
	scratchViewport: Rect;
}

/*
 * Places and draws the text a score types beside its staves — rehearsal marks, tempo
 * marks, chord symbols and diagrams, words directives, dynamics, figured bass, and
 * direction lines — nudging each clear of the notes and text already placed via the shared
 * collision resolver. One instance lives and dies with its DrawPass.
 */
export class DirectionPlacer {
	private readonly labelFont: string;
	private readonly notationFont: string;
	private readonly notationColor: string;
	private readonly textColor: string;
	private readonly scratchViewport: Rect;

	// The sustained dynamic level currently sounding on each staff (keyed by the caller's
	// `<partIndex>:<staffNumber>`), and the measure it was last STATED in (printed or
	// suppressed), so a restatement of it can be dropped. Runs across the whole score: the
	// measure loop visits measures once, in order.
	private readonly soundingDynamic = new Map<
		string,
		{ text: string; measure: number }
	>();

	// The one dependency this builds rather than takes: it is a pure spelling table with no
	// state, and nothing about a render varies it.
	private readonly dynamics = new DynamicGlyphs();

	constructor(
		private readonly context: RenderContext,
		private readonly reader: ScoreReader,
		private readonly collisionResolver: CollisionResolver,
		private readonly geometry: GeometryCollector,
		private readonly spill: SpillTracker,
		private readonly reporter: DirectionReporter,
		opts: DirectionPlacerOptions,
	) {
		this.labelFont = opts.labelFont;
		this.notationFont = opts.notationFont;
		this.notationColor = opts.notationColor;
		this.textColor = opts.textColor;
		this.scratchViewport = opts.scratchViewport;
	}

	/*
	 * Whether a dynamics marking merely restates the dynamic already sounding on its staff,
	 * and so prints nothing — some exporters (GuitarPro) repeat the level on every measure.
	 * Only sustained LEVELS dedupe: sfz/fp/rfz and friends are per-note accents, so a repeat
	 * of one is meaningful and always prints. Stamped on every statement, printed or not: a
	 * suppressed one still keeps the run alive, so an unbroken per-measure chain stays
	 * suppressed end to end instead of resurfacing every other measure.
	 */
	suppressesDynamic(key: string, text: string, measureIndex: number): boolean {
		if (!SUSTAINED_DYNAMIC.test(text)) {
			return false;
		}
		const sounding = this.soundingDynamic.get(key);
		const redundant =
			sounding?.text === text &&
			measureIndex - sounding.measure <= DYNAMIC_RESTATE_GAP;
		this.soundingDynamic.set(key, { text, measure: measureIndex });
		return redundant;
	}

	/*
	 * Draw the above-stave annotations queued for this measure, after the system is
	 * formatted so every anchor x is real: words, then chord symbols/diagrams, then
	 * tempo marks.
	 */
	placeColumn(column: DirectionColumn): void {
		// Words go before the diagrams so a chord diagram draws on top of any words it
		// shares a measure with — the fret box stays fully legible, the text yields.
		for (const w of column.words) {
			// A tab fret glyph is drawn CENTERED on its column x, but a notation notehead is
			// drawn FROM it — so text left-anchored at that x starts at the fret's middle and
			// reads as shifted right of the fret AND of the notehead above it. Center it over a
			// tab anchor so it lines up with both. On a notation stave, left-anchored at the
			// notehead is already right (and is what MuseScore draws), so leave that alone.
			const placed = this.drawWords(
				w.stave,
				w.text,
				w.anchor,
				w.placement,
				w.anchor instanceof TabNote
					? {
							font: this.labelFont,
							size: WORDS_FONT_SIZE,
							italic: true,
							align: 'center',
						}
					: { font: this.labelFont, size: WORDS_FONT_SIZE, italic: true },
			);
			// A below-stave directive grows the crop downward instead (drawWords already
			// reported the drop); only above-stave text lifts the measure box's top.
			if (w.placement !== 'below') {
				this.reporter.growPageTop(placed.y);
				this.spill.growDecorationTop(column.systemIndex, placed.y);
			}
		}
		// Dynamics ride the same path as words — they're just typed in the music font. A
		// marking spelled out of SMuFL's dynamic letters engraves as glyphs; an
		// <other-dynamics> keeps its literal text in the words face.
		for (const d of column.dynamics) {
			const placed = this.drawWords(
				d.stave,
				d.glyph ? this.dynamics.spell(d.text) : d.text,
				d.anchor,
				d.placement,
				d.glyph
					? {
							font: this.notationFont,
							size: DYNAMICS_FONT_SIZE,
							italic: false,
							color: this.notationColor,
							align: 'center',
						}
					: {
							font: this.labelFont,
							size: WORDS_FONT_SIZE,
							italic: true,
							align: 'center',
						},
			);
			if (d.placement !== 'below') {
				this.reporter.growPageTop(placed.y);
				this.spill.growDecorationTop(column.systemIndex, placed.y);
			}
		}
		// Figured bass: one row per <figure> under the stave, top figure first. Each row goes
		// through the same below-stave path as a dynamic, so the collision resolver drops each
		// one clear of the row already placed above it and the stack builds downward on its
		// own — no per-row offset arithmetic. Upright rather than italic: the numerals are read
		// as figures, not as an expression marking.
		for (const f of column.figuredBasses) {
			for (const figure of f.figures) {
				this.drawWords(f.stave, figure, f.anchor, 'below', {
					font: this.labelFont,
					size: WORDS_FONT_SIZE,
					italic: false,
					align: 'center',
				});
			}
		}
		// Diagrams sit at their lead note's x; two on notes either side of a barline can be
		// close enough to overlap (especially at a narrow width). The resolver pushes each
		// box clear of any already-placed diagram in its band (replacing the old running
		// cursor) so crowded diagrams separate instead of stacking. It also lifts each box
		// above any notes, ties, or words in its column (the diagrams pass runs after the
		// notes and words), so a high note or a word like "(as taught)" stays put and the
		// box rises over it.
		// Diagrams read left to right in chord order, so a box crowded against the page edge
		// has to leave room for the ones still to come rather than take the edge for itself.
		// Counted down as they place: `pending` is the room (boxes + gaps) owed to this
		// column's right.
		let pending = column.harmonies.filter((h) => h.frame).length;
		for (const h of column.harmonies) {
			// A <harmony> with a <frame> draws as a fret box (chord name as its title)
			// above the stave; one without draws as the plain chord-symbol text.
			const stave = h.frame ? h.staveNote.getStave() : null;
			if (h.frame && stave) {
				pending--;
				const top =
					stave.getYForLine(0) - CHORD_DIAGRAM_GAP - CHORD_DIAGRAM_HEIGHT;
				// Size to the frame: one column per string, enough fret rows to hold the
				// deepest dot/barre (min 4 so a sparse chord still looks like a fretboard).
				const frets = [
					...h.frame.chord.map(([, f]) => (typeof f === 'number' ? f : 0)),
					...(h.frame.barres ?? []).map((b) => b.fret),
				];
				const natural = new Rect(
					h.staveNote.getAbsoluteX(),
					top,
					CHORD_DIAGRAM_WIDTH,
					CHORD_DIAGRAM_HEIGHT,
				);
				const band = this.reporter.rowOf(stave);
				// Lift, THEN space — not the other way round. A diagram over a run of high
				// notes rises a long way off its default row, so the boxes already placed in
				// this system sit well above where an unlifted box would probe: pushRightOf
				// there matches nothing and two crowded diagrams print through each other.
				// Lifting first puts the box in the row its neighbours are actually in.
				//
				// Padded below its bottom so the lift-clear probe reaches a high note (or its
				// tie) poking up into the box's column — the same padding treatment a chord
				// symbol uses. The box then rises off the note instead of overlapping it; with
				// nothing in the way it keeps its default position. Banded to its own stave
				// row: without it, a lower part's diagram sees the part above's notes and
				// lyrics in the same column and climbs over the whole part, stranding the box
				// above music it doesn't label.
				const lift = (box: Rect) =>
					this.collisionResolver.liftClear(
						new Rect(
							box.x,
							box.y,
							box.w,
							CHORD_DIAGRAM_HEIGHT + CHORD_DIAGRAM_PADDING,
						),
						CHORD_DIAGRAM_GAP,
						{ kinds: TEXT_CLEAR_KINDS, band },
					);
				// Recover the real (unpadded) box; the padding only extended the probe.
				const unpad = (box: Rect) =>
					new Rect(box.x, box.y, CHORD_DIAGRAM_WIDTH, CHORD_DIAGRAM_HEIGHT);
				const lifted = unpad(lift(natural));
				// A box anchored at a note near the right edge would overrun the canvas and be
				// clipped (page overflow has no crop-growth knob like the vertical edges do), so
				// nudge it back inside the drawable region — minus the room this column's later
				// boxes are owed, so they land beside it instead of on top of it.
				//
				// Clamp BEFORE spacing, not after. Clamping last pins every crowded box to the
				// same margin, and the pull left lands the box back on the neighbour
				// pushRightOf had just cleared; spacing last keeps them in chord order, since
				// pushRightOf only ever moves a box right of what is already placed.
				const clamped = this.collisionResolver.nudgeInsideX(
					lifted,
					new Rect(
						this.scratchViewport.x,
						this.scratchViewport.y,
						this.scratchViewport.w -
							pending * (CHORD_DIAGRAM_WIDTH + CHORD_DIAGRAM_GAP),
						this.scratchViewport.h,
					),
					PAGE_MARGIN_X,
				);
				const spaced = this.collisionResolver.pushRightOf(
					clamped,
					'diagram',
					CHORD_DIAGRAM_GAP,
				);
				// Spacing moved it into a different column, which may hold taller notes than
				// the one it was lifted out of — so lift again where it actually landed.
				const placed = spaced.x === lifted.x ? lifted : unpad(lift(spaced));
				const diagram = new ChordDiagramGlyph(placed.x, placed.y, {
					...h.frame,
					title: h.text || undefined,
					width: CHORD_DIAGRAM_WIDTH,
					height: CHORD_DIAGRAM_HEIGHT,
					stringCount: h.frame.chord.length,
					fretCount: Math.max(4, ...frets),
					showTuning: false,
					fontFamily: this.labelFont,
					// ponytail: only the ink follows the engraving color; the open-string bgColor
					// stays white. Thread backgroundColor through if a dark theme needs it too.
					color: this.notationColor,
				});
				// Register the whole drawn extent (title included), not just the board: a later
				// box stacking above this one must clear the title, or its board prints
				// through the "C" it stacked over.
				this.collisionResolver.add({
					rect: new Rect(
						placed.x,
						diagram.top,
						placed.w,
						placed.bottom - diagram.top,
					),
					kind: 'diagram',
					band: this.reporter.rowOf(stave),
				});
				diagram.draw(this.context);
				this.reporter.growPageTop(diagram.top);
				// Report the box (title included) so pass two opens the gap to the stave above
				// wide enough to hold it. Without this a lower part's diagram has nowhere to go
				// and lands on the part above's lyrics.
				this.reporter.recordAnnotationSpill(
					stave,
					new Rect(
						placed.x,
						diagram.top,
						placed.w,
						placed.bottom - diagram.top,
					),
				);
				// Unlike words/chord symbols, a chord diagram is NOT folded into the measure
				// box (no growDecorationTop): the diagram is a tall floating fret box, and a
				// playback cursor bar stretching all the way up to it reads as disconnected.
				// The bar should span only the stave region — as if the diagram weren't there.
				// The diagram is still kept on-canvas (pageTop) and reserved against the system
				// above (systemHighestTop); it just doesn't lift the cursor/measure box.
				// The diagram rises above the stave, so it also counts toward this system's
				// upward overflow — otherwise no systemSpacing is reserved for it and a
				// diagram on a stacked system collides with the system above.
				this.spill.growHighestTop(column.systemIndex, diagram.top);
				// Emit the placed box for the element index (the whole drawn extent, title
				// included), still in scratch space — the caller shifts it with the crop.
				this.geometry.addChordDiagram({
					rect: new Rect(
						placed.x,
						diagram.top,
						placed.w,
						placed.bottom - diagram.top,
					),
					harmonySource: h.source,
					measureIndex: column.measureIndex,
					frame: h.frame,
					title: h.text || null,
				});
			} else {
				const top = this.drawHarmony(h.staveNote, h.text);
				this.reporter.growPageTop(top);
				this.spill.growDecorationTop(column.systemIndex, top);
			}
		}
		// The tempo mark goes last so it stacks on top of anything else above the stave. A
		// chord symbol and a metronome mark in the same measure both anchor at the first
		// note, so they land in the same spot; engraving convention (and MuseScore) puts the
		// symbol nearest the staff and the tempo above it, which is what drawing last gives.
		for (const t of column.tempos) {
			const top = this.drawTempo(t.stave, t);
			this.reporter.growPageTop(top);
			this.spill.growDecorationTop(column.systemIndex, top);
		}
		// A rehearsal mark belongs to the measure, not to one part — every part carries the
		// same one — so it's read from the first part (like the barline decorations) and
		// printed once, over the column's top stave. It goes last of all: engraving puts the
		// section header at the very top of the above-stave stack, clear of tempo and chords.
		const topStave = column.topStave;
		const measure = column.measure;
		// Segno/coda: measure-level landmarks like a rehearsal mark, so they're read from the
		// first part and printed once over the column's top stave, at its left edge — where a
		// player scanning for "the sign" looks. Drawn before the rehearsal marks so a mark in
		// the same measure stacks above rather than over them.
		if (topStave && measure) {
			for (const kind of this.reader.navigationsOf(measure)) {
				const placed = this.drawWords(
					topStave,
					NAVIGATION_GLYPHS[kind],
					topStave.getX(),
					'above',
					{
						font: this.notationFont,
						size: NAVIGATION_FONT_SIZE,
						italic: false,
						color: this.notationColor,
					},
				);
				this.reporter.growPageTop(placed.y);
				this.spill.growDecorationTop(column.systemIndex, placed.y);
			}
		}
		// "Nx" over a repeat played more than twice: like the rehearsal mark it belongs to the
		// measure rather than to a part, so it prints once over the column's top stave.
		// Right-aligned on the closing barline, which is the sign it qualifies.
		const timesLabel = column.repeatTimesLabel;
		if (topStave && timesLabel) {
			const placed = this.drawWords(
				topStave,
				timesLabel,
				topStave.getX() + topStave.getWidth(),
				'above',
				{
					font: this.labelFont,
					size: WORDS_FONT_SIZE,
					italic: false,
					align: 'right',
				},
			);
			this.reporter.growPageTop(placed.y);
			this.spill.growDecorationTop(column.systemIndex, placed.y);
		}
		if (topStave && measure) {
			for (const text of this.reader.rehearsalsOf(measure)) {
				const top = this.drawRehearsal(topStave, text);
				this.reporter.growPageTop(top);
				this.spill.growDecorationTop(column.systemIndex, top);
			}
		}
	}

	/*
	 * Draw a rehearsal mark (a section header like "A" or "Chorus") as boxed bold text above
	 * the stave, anchored at the measure's left edge — a player reading "from B" looks for
	 * the barline, not a note. The collision resolver lifts it clear of anything already in
	 * its column. Returns the y the box reaches up to so the caller can grow the page crop.
	 */
	private drawRehearsal(stave: Stave, text: string): number {
		this.context.save();
		this.context.setFont(this.labelFont, REHEARSAL_FONT_SIZE, 'bold');
		this.context.setFillStyle(this.textColor);
		this.context.setStrokeStyle(this.textColor);
		const w = this.context.measureText(text).width + 2 * REHEARSAL_PADDING;
		const h = REHEARSAL_FONT_SIZE + 2 * REHEARSAL_PADDING;
		const bottom = stave.getYForLine(0) - REHEARSAL_Y_OFFSET;
		const natural = new Rect(stave.getX(), bottom - h, w, h);
		const band = this.reporter.rowOf(stave);
		const placed = this.collisionResolver.liftClear(
			natural,
			REHEARSAL_NOTE_CLEARANCE,
			{ kinds: TEXT_CLEAR_KINDS, band },
		);
		this.reporter.recordAnnotationSpill(stave, placed);
		this.context.setLineWidth(1);
		this.context.beginPath();
		this.context.moveTo(placed.x, placed.y);
		this.context.lineTo(placed.right, placed.y);
		this.context.lineTo(placed.right, placed.bottom);
		this.context.lineTo(placed.x, placed.bottom);
		this.context.closePath();
		this.context.stroke();
		this.context.fillText(
			text,
			placed.x + REHEARSAL_PADDING,
			placed.bottom - REHEARSAL_PADDING,
		);
		this.context.restore();
		this.collisionResolver.add({ rect: placed, kind: 'annotation', band });
		return placed.y;
	}

	/*
	 * The collision box of a metronome mark drawn at (`x`, `baseline`): StaveTempo lays the
	 * beat-unit glyph, "=", and the bpm out on one baseline with 3px gaps, all shrunk by
	 * TEMPO_SCALE. Measured with the same vexflow Elements (and Metrics font info) StaveTempo
	 * draws with, so the box matches the drawn glyphs — ink ascent AND descent, because the
	 * beat-unit glyph's origin is its notehead center, so half of it hangs below the baseline.
	 * ponytail: measured with the quarter-note glyph whatever the beat unit — the note glyphs
	 * are within a couple of pixels of each other at this size, except a stemless whole note,
	 * which just reserves a little more air than it needs.
	 */
	private tempoLayout(
		task: TempoTask,
		x: number,
		baseline: number,
	): { rect: Rect; markWidth: number } {
		const tempo = task.tempo;
		//  is SMuFL metNoteQuarterUp; vexflow's Glyphs enum isn't re-exported.
		const glyph = new Element('StaveTempo.glyph').setText('');
		//  is metAugmentationDot, the dot StaveTempo trails a dotted beat unit with.
		const dot = new Element('StaveTempo.glyph').setText('');
		const text = new Element('StaveTempo');
		const ink = glyph.getTextMetrics();
		let w = 0;
		let ascent = ink.actualBoundingBoxAscent;
		let descent = ink.actualBoundingBoxDescent;
		if (tempo) {
			// Walk the same pieces StaveTempo.draw lays down, each advancing by its own width
			// plus a 3px gap: an opening paren, the beat unit and its dots, "=", then either a
			// second dotted unit (the metric-modulation form) or the bpm, then a closing paren.
			const advance = (el: Element) => el.getWidth() + 3;
			w += tempo.parenthesis ? advance(text.setText('(')) : 0;
			w += advance(glyph) + (tempo.dots ?? 0) * advance(dot);
			w += advance(text.setText('='));
			w += tempo.duration2
				? advance(glyph) + (tempo.dots2 ?? 0) * advance(dot)
				: advance(text.setText(String(tempo.bpm)));
			if (tempo.parenthesis) {
				w += text.setText(')').getWidth();
			}
		}
		// How far the bpm mark alone reaches, which is where the note-group mark starts.
		const markWidth = w;
		if (task.modulation) {
			// The note-group mark follows the bpm one along the same baseline, so the box is the
			// union of the two: widths add, and a tuplet bracket reaches higher than a beat unit.
			const group = new MetronomeGlyph(task.modulation);
			w += (tempo ? TEMPO_MARK_GAP : 0) + group.width;
			ascent = Math.max(ascent, group.ascent);
			descent = Math.max(descent, group.descent);
		}
		return {
			rect: new Rect(
				x,
				baseline - ascent * TEMPO_SCALE,
				w * TEMPO_SCALE,
				(ascent + descent) * TEMPO_SCALE,
			),
			markWidth: markWidth + (tempo ? TEMPO_MARK_GAP : 0),
		};
	}

	/*
	 * Draw a metronome mark ("<note> = bpm") above the stave, anchored just right of the
	 * clef/key/time (StaveTempo's own placement, over the first note). It normally sits one
	 * text line above the staff; the collision resolver lifts it clear of anything already in
	 * its column — a high note reaching up into that band, or a chord symbol/word placed
	 * earlier in this pass — and the layout reserves the matching top headroom. Returns the y
	 * the mark reaches up to so the caller can grow the page crop above it. Drawn after the
	 * notes are formatted so the anchor x and the note extents are real.
	 */
	private drawTempo(stave: Stave, task: TempoTask): number {
		const baseY = stave.getYForTopText(1);
		// vexflow's StaveTempo.draw reads stave.getModifierXShift(position), which uses the
		// position enum as an index into the stave's modifier array. ABOVE (the default, 3)
		// indexes modifiers[3], which is undefined — and throws — on a system-start stave that
		// re-states a clef but no time signature (begin barline + clef + end barline = 3
		// modifiers). CENTER (0) points at the always-present begin barline instead, yielding
		// the same start-of-notes x offset without the out-of-bounds read.
		const position = 0;
		const shiftX = stave.getModifierXShift(position);
		// StaveTempo's font sizes come from vexflow Metrics, which isn't reachable to override,
		// so shrink the whole mark with a context scale. Scaling multiplies every coordinate by
		// TEMPO_SCALE, which would also drag the mark up and left; pre-divide the x/y inputs so it
		// lands back on its original anchor. Internally StaveTempo draws at (this.x + shiftX + 10,
		// baseY + this.yShift); solving s·(passed) = target gives the compensated inputs below.
		const targetX = stave.getX() + shiftX + 10;
		const band = this.reporter.rowOf(stave);
		const { rect: natural, markWidth } = this.tempoLayout(task, targetX, baseY);
		const placed = this.collisionResolver.liftClear(
			natural,
			TEMPO_NOTE_CLEARANCE,
			{ kinds: TEXT_CLEAR_KINDS, band },
		);
		// liftClear only translates, so the box's rise is the mark's y-shift.
		const shiftY = placed.y - natural.y;
		this.reporter.recordAnnotationSpill(stave, placed);
		this.context.save();
		this.context.scale(TEMPO_SCALE, TEMPO_SCALE);
		// Everything below is drawn in the scaled space, so its coordinates are pre-divided too.
		let cursor = targetX / TEMPO_SCALE;
		const tempo = task.tempo;
		if (tempo) {
			new StaveTempo(
				{
					duration: tempo.duration,
					dots: tempo.dots,
					bpm: tempo.bpm,
					// StaveTempo prints the bpm only when there is no second unit, so the
					// metric-modulation form drops the number on its own.
					duration2: tempo.duration2 ?? undefined,
					dots2: tempo.dots2,
					parenthesis: tempo.parenthesis,
				},
				cursor - shiftX - 10,
				(baseY + shiftY) / TEMPO_SCALE - baseY,
			)
				.setStave(stave)
				.setPosition(position)
				.setContext(this.context)
				.draw();
			cursor += markWidth;
		}
		if (task.modulation) {
			new MetronomeGlyph(task.modulation).draw(
				this.context,
				cursor,
				(baseY + shiftY) / TEMPO_SCALE,
			);
		}
		this.context.restore();
		this.collisionResolver.add({ rect: placed, kind: 'annotation', band });
		return placed.y;
	}

	/*
	 * The total kerned advance of a chord symbol as drawHarmony draws it: accidentals render a
	 * touch smaller and pull in by HARMONY_ACCIDENTAL_KERN on each side. Measured so the symbol's
	 * collision box matches the glyphs that get drawn.
	 */
	private harmonyWidth(text: string): number {
		let width = 0;
		for (const ch of text) {
			const accidental = HARMONY_ACCIDENTALS.has(ch);
			this.context.setFont(
				this.labelFont,
				accidental ? HARMONY_ACCIDENTAL_FONT_SIZE : HARMONY_FONT_SIZE,
			);
			width +=
				this.context.measureText(ch).width -
				(accidental ? 2 * HARMONY_ACCIDENTAL_KERN : 0);
		}
		return width;
	}

	/*
	 * Draw a chord symbol (from a <harmony>) above its note's stave, left-anchored at the note's
	 * x — the laid-out position of the note the harmony applies to. The collision resolver lifts
	 * it clear of any notehead, high tie, or already-placed annotation it would land on (all
	 * registered as obstacles); it sits at a fixed gap above the top staff line when nothing is in
	 * the way. Returns the y the text reaches up to so the caller can grow the page crop above it.
	 * Drawn after the notes are formatted so getAbsoluteX is real.
	 */
	private drawHarmony(staveNote: StaveNote | TabNote, text: string): number {
		const stave = staveNote.getStave();
		if (!stave) {
			return Infinity;
		}
		const baseY = stave.getYForLine(0) - HARMONY_Y_OFFSET;
		this.context.save();
		this.context.setFillStyle(this.textColor);
		// Pad the box below the text baseline so liftClear's downward probe reaches a notehead
		// sitting just under the baseline (a note in the top stave space) and nudges the symbol
		// clear of it, leaving a little breathing room. The drawn baseline stays HARMONY_PADDING
		// above the box bottom, so with nothing in the way the symbol keeps its default position.
		const natural = new Rect(
			staveNote.getAbsoluteX(),
			baseY - HARMONY_FONT_SIZE,
			this.harmonyWidth(text),
			HARMONY_FONT_SIZE + HARMONY_PADDING,
		);
		const band = this.reporter.rowOf(stave);
		const placed = this.collisionResolver.liftClear(
			natural,
			HARMONY_NOTE_CLEARANCE,
			{ kinds: TEXT_CLEAR_KINDS, band },
		);
		this.reporter.recordAnnotationSpill(stave, placed);
		const y = placed.bottom - HARMONY_PADDING;
		// The ♯/♭/♮ glyphs carry wide side-bearings in the text font, so a single fillText
		// of "B♭" reads as "B ♭". Draw char by char and pull the accidental in on both sides
		// so it sits tight against its root letter.
		this.context.setFont(this.labelFont, HARMONY_FONT_SIZE);
		let x = placed.x;
		for (const ch of text) {
			const accidental = HARMONY_ACCIDENTALS.has(ch);
			if (accidental) {
				x -= HARMONY_ACCIDENTAL_KERN;
				this.context.setFont(this.labelFont, HARMONY_ACCIDENTAL_FONT_SIZE);
			}
			this.context.fillText(ch, x, y);
			x += this.context.measureText(ch).width;
			if (accidental) {
				x -= HARMONY_ACCIDENTAL_KERN;
				this.context.setFont(this.labelFont, HARMONY_FONT_SIZE);
			}
		}
		this.context.restore();
		// Register the placed symbol so a later annotation in this system stacks above it.
		this.collisionResolver.add({ rect: placed, kind: 'annotation', band });
		return placed.y;
	}

	/*
	 * Draw a words direction (e.g. "ritardando") beside the stave in italics, left-anchored at
	 * the x of the note it applies to. `placement` picks the side: 'above' is the default and
	 * lifts clear of any notehead/tie/annotation in its column, 'below' is the mirror image —
	 * it drops clear of everything hanging under the stave (low notes, stems, lyrics, an
	 * earlier below-stave mark) via the same resolver with the sign flipped. With nothing in
	 * the way either sits at a fixed gap from the near staff line. Returns the placed box so
	 * the caller can grow the page crop on the side the text reached. Drawn after the notes
	 * are formatted so getAbsoluteX is real.
	 *
	 * `style` picks the face: italic text-font by default (a words directive), or the
	 * notation font at the dynamics size for a marking spelled in SMuFL glyphs.
	 */
	private drawWords(
		stave: Stave,
		text: string,
		anchor: StaveNote | TabNote | number | undefined,
		placement: Placement,
		style: SideTextStyle,
	): Rect {
		const below = placement === 'below';
		const baseY = below
			? stave.getBottomLineY() + WORDS_Y_OFFSET
			: stave.getYForLine(0) - WORDS_Y_OFFSET;
		const anchorX =
			typeof anchor === 'number'
				? anchor
				: (anchor?.getAbsoluteX() ?? stave.getNoteStartX());
		this.context.save();
		this.context.setFont(
			style.font,
			style.size,
			'normal',
			style.italic ? 'italic' : 'normal',
		);
		this.context.setFillStyle(style.color ?? this.textColor);
		const w = this.context.measureText(text).width;
		let alignOffset = 0;
		if (style.align === 'center') {
			alignOffset = w / 2;
		} else if (style.align === 'right') {
			alignOffset = w;
		}
		const natural = new Rect(
			anchorX - alignOffset,
			below ? baseY : baseY - style.size,
			w,
			style.size,
		);
		const band = this.reporter.rowOf(stave);
		const cleared = below
			? this.collisionResolver.dropClear(natural, WORDS_NOTE_CLEARANCE, {
					kinds: TEXT_CLEAR_KINDS,
					band,
				})
			: this.collisionResolver.liftClear(natural, WORDS_NOTE_CLEARANCE, {
					kinds: TEXT_CLEAR_KINDS,
					band,
				});
		// The stave's opening modifiers own everything left of the note start x — clef, key,
		// time, and a begin-repeat's bars, which on a multi-stave system a connector carries
		// straight up through the band this text sits in (no lift can clear a line that spans
		// the whole gap). A tab annotation is CENTERED on its note (see placeColumn), so
		// over a measure's first note its left half reaches back into that area and prints
		// through the sign. Bound note-anchored text on the left by the note area — but not on
		// the right by the barline: a trailing "rit." on a measure's last note is supposed to
		// overrun it, so the right bound is the page, which the viewport nudge below owns.
		// Only note-anchored text: a caller passing an explicit x (the segno/coda at the
		// stave's left edge, the "Nx" on the closing barline) is stating where it wants to be.
		const bounded =
			typeof anchor === 'number'
				? cleared
				: this.collisionResolver.nudgeInsideX(
						cleared,
						new Rect(
							stave.getNoteStartX(),
							cleared.y,
							this.scratchViewport.right - stave.getNoteStartX(),
							cleared.h,
						),
						0,
					);
		// A mark anchored near the right edge would run off the canvas and be clipped (there's
		// no horizontal crop-growth knob), so pull it back inside — the same treatment a chord
		// diagram at the edge gets.
		const placed = this.collisionResolver.nudgeInsideX(
			bounded,
			this.scratchViewport,
			PAGE_MARGIN_X,
		);
		if (below) {
			this.reporter.recordAnnotationDrop(stave, placed);
		} else {
			this.reporter.recordAnnotationSpill(stave, placed);
		}
		this.context.fillText(text, placed.x, placed.bottom);
		this.context.restore();
		this.collisionResolver.add({ rect: placed, kind: 'annotation', band });
		return placed;
	}

	/*
	 * Draw the <bracket> and <dashes> spans: a horizontal line over (or under) the notes each
	 * one covers, stroked solid, dashed or dotted as its line-type says, terminating in the
	 * hook its `line-end` names. A hook points toward the staff by default ('down' above the
	 * staff), which is what makes a bracket read as enclosing the passage rather than as a
	 * stray rule.
	 *
	 * Drawn straight on the context rather than as a vexflow element: TextBracket, the nearest
	 * thing vexflow has, hooks only its stop end and only downward, so it can draw none of the
	 * five bracket forms MusicXML spells out. Placement is vexflow's own above/below-stave text
	 * line: they are drawn in the finish pass, after the per-system collision index has been
	 * cleared, so they take that fixed anchor instead of resolving (see AGENTS.md,
	 * "Collisions and nudges").
	 * ponytail: 'arrow' draws the same tick 'down' does — an arrowhead needs its own path and no
	 * fixture asks for one.
	 */
	drawDirectionLines(lines: readonly DirectionLineTask[]): void {
		for (const { span, start, stop } of lines) {
			// Either endpoint off a hidden staff leaves nothing to draw.
			if (!start || !stop) {
				continue;
			}
			const left = start.getAbsoluteX();
			const right = stop.getAbsoluteX() + stop.getGlyphWidth();
			// A span that wraps onto a later system runs right-to-left here; dropped rather than
			// drawn backwards (the same limit octaveShiftsOf documents).
			if (right <= left) {
				continue;
			}
			const stave = start.checkStave();
			const y = span.above
				? stave.getYForTopText(DIRECTION_LINE_TEXT_LINE)
				: stave.getYForBottomText(DIRECTION_LINE_TEXT_LINE);
			// A hook drops toward the staff from an above-stave line and rises toward it from a
			// below-stave one, so the whole bracket flips with its placement.
			const toward = span.above ? 1 : -1;
			const hookOf = (end: LineEnd) =>
				end === 'none'
					? 0
					: (end === 'up' ? -1 : 1) * toward * DIRECTION_LINE_HOOK;
			this.context.save();
			this.context.setStrokeStyle(this.notationColor);
			this.context.setLineWidth(1);
			if (span.dash) {
				this.context.setLineDash(span.dash);
			}
			this.context.beginPath();
			const startHook = hookOf(span.startEnd);
			if (startHook) {
				this.context.moveTo(left, y + startHook);
				this.context.lineTo(left, y);
			} else {
				this.context.moveTo(left, y);
			}
			this.context.lineTo(right, y);
			const stopHook = hookOf(span.stopEnd);
			if (stopHook) {
				this.context.lineTo(right, y + stopHook);
			}
			this.context.stroke();
			this.context.closePath();
			this.context.restore();
			this.reporter.growPageTop(y - DIRECTION_LINE_HOOK);
			this.reporter.growPageBottom(y + DIRECTION_LINE_HOOK);
		}
	}
}
