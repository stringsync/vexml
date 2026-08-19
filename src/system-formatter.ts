import type { BeamRun, Chord, Note } from '@stringsync/mdom';
import {
	Barline,
	BarNote,
	Bend,
	ClefNote,
	Formatter,
	GraceNoteGroup,
	Modifier,
	type RenderContext,
	Stave,
	type StaveModifier,
	StaveModifierPosition,
	StaveNote,
	Stem,
	type StemmableNote,
	type TabNote,
	type TabStave,
	TimeSignature,
	Vibrato,
	type Voice,
} from 'vexflow';
import type { ChordTranslator } from './chord-translator';
import type { CollisionResolver } from './collision-resolver';
import type { ConnectorDrawer } from './connector-drawer';
import {
	GRACE_GROUP_SPACING_STAVE,
	LYRIC_NOTE_CLEARANCE,
	LYRIC_Y_OFFSET,
	TAB_CURVE_RISE,
	TECHNICAL_EDGE_GAP,
	TIE_APEX_RISE,
} from './constants';
import { Rect } from './geometry';
import type { LyricPlacer } from './lyric-placer';
import type { NoteTranslator } from './note-translator';
import type { SpannerBuilder } from './spanner-builder';
import type { SpillTracker } from './spill-tracker';
import { isTechnicalMark } from './technical-mark/technical-mark';

// One stave's notes, built but not yet formatted or drawn. A part's staves are
// formatted together (see formatAndDraw) so notes at the same tick line up
// vertically across staves, so the build (voice/spanner construction) is split from
// the format+draw step.
export type PendingStave = {
	stave: Stave;
	// Which global stave row this is, so the pass can attribute the content drawn on it
	// to that row and report how far it spilled (see observedStaveSpill).
	row: number;
	isTab: boolean;
	vexVoices: Voice[];
	beams: ReturnType<SpannerBuilder['buildBeams']>;
	// Beam groups read off this stave's voices, waiting on the rest of the part's staves
	// before they can be built — a cross-staff run names notes another stave drew. Consumed
	// (and emptied into `beams`) by VoiceBuilder.buildPartBeams.
	beamPlans: Array<{
		groups: BeamRun[];
		defaultStem?: 'up' | 'down';
	}>;
	tuplets: ReturnType<SpannerBuilder['buildTuplets']>;
	// Each voice's chords, waiting alongside beamPlans: a tuplet hides its bracket when its
	// notes are already beamed, so it has to be built AFTER the beams are.
	tupletChords: Chord[][];
	// Real notes only (no gap-filling ghosts), for the bottom-bound calc.
	staveNotes: StaveNote[];
	// StaveNotes whose lead carries a tie — they get a tie-apex collision obstacle once their
	// stem direction is final (stem-down ties bow up over the noteheads). See tieApexRect.
	tiedNotes: Set<StaveNote>;
	// Each real (non-grace) note paired with its mdom chord, so the hit index can map every
	// notehead/fret back to its note after formatting. One of these is populated per stave kind.
	noteChords: Array<{ note: StaveNote; chord: Chord }>;
	tabChords: Array<{ note: TabNote; chord: Chord }>;
	// Grace noteheads, paired like noteChords. Captured into the hit index so playback can sound
	// and light them, but kept out of the pointer tree (hit.ts) so they don't steal clicks.
	graceChords: Array<{ note: StaveNote; chord: Chord }>;
	// The tab analog of graceChords: grace fret glyphs, so a tab grace colors with its notation one.
	graceTabChords: Array<{ note: TabNote; chord: Chord }>;
	// Mid-measure dividers whose <bar-style> vexflow can't draw: the invisible BarNote holding
	// the divider's place, painted at its formatted x once the voice is drawn.
	midBars: Array<{ note: BarNote; style: string }>;
};

/* Push every modifier in `group` out to the rightmost x any of them reached. */
function squareUp(group: StaveModifier[]): number | null {
	if (group.length < 2) {
		return group[0]?.getX() ?? null;
	}
	const x = Math.max(...group.map((modifier) => modifier.getX()));
	for (const modifier of group) {
		modifier.setX(x);
	}
	return x;
}

/*
 * The GraceNoteGroup attached to a note (the small notes drawn just left of it), if any.
 */
function graceGroupOf(
	translator: NoteTranslator,
	note: { getModifiers(): { getCategory(): string }[] },
): GraceNoteGroup | undefined {
	return translator.findModifier<GraceNoteGroup>(note, GraceNoteGroup.CATEGORY);
}

/* The measure loop's locals the system formatter reads, snapshotted at the call. */
export interface FormatColumn {
	/** Which system the column belongs to — the band its lyric-drop and spill
	 * measurements report under. */
	systemIndex: number;
	/** Width at the LEFT end of the measure the notes must not format into, so a centered
	 * words directive on the first note prints clear of the opening barline (see MeasureBox). */
	measureLeadingPad: number;
	/** The same at the RIGHT end, so a words directive on the last note has room to print
	 * before the barline (see MeasureBox). */
	measureTrailingPad: number;
}

/*
 * The bookkeeping the draw pass keeps for itself while a column's notes land, handed over
 * as a narrow structural view: which system each stave was registered under, which is the
 * band the formatter's spill measurements accumulate against.
 */
export interface SystemReporter {
	/** Which system a stave belongs to (the column's own system while it's being built). */
	systemOf(stave: Stave): number;
}

export interface SystemFormatterOptions {
	/** The formatter's proportional-spacing exponent, shared with the layout's width
	 * planning so measures format at the width they were planned for. */
	softmaxFactor: number;
	/** The context's default ink (see DrawPass.notationColor): stems and ledger lines
	 * override vexflow's hardcoded styles to match it. */
	notationColor: string;
	/** The pass-wide lead-note registry, read to rebuild this stave's slurs for the
	 * collision measurement. The voice builder keeps filling it; the reference is stable. */
	byLead: ReadonlyMap<Note, StaveNote>;
	/** Notes whose beam group spans two staves (see VoiceBuilder.buildPartBeams): their
	 * cross-gap stems are kept out of the stave spill that sizes that gap. */
	crossStaveNotes: ReadonlySet<StaveNote>;
}

/*
 * Justifies and draws one system's pending staves once its measure column completes: the
 * shared vexflow format that aligns same-tick notes across the column's staves, and the
 * measurement/pinning that has to ride on it — lyric baselines, technical columns, tab
 * bend/vibrato stretching, and the collision obstacles for everything just drawn. One
 * instance lives and dies with its DrawPass.
 */
export class SystemFormatter {
	private readonly softmaxFactor: number;
	private readonly notationColor: string;
	private readonly byLead: ReadonlyMap<Note, StaveNote>;
	private readonly crossStaveNotes: ReadonlySet<StaveNote>;

	constructor(
		private readonly context: RenderContext,
		private readonly translator: NoteTranslator,
		private readonly chords: ChordTranslator,
		private readonly spanners: SpannerBuilder,
		private readonly connectorDrawer: ConnectorDrawer,
		private readonly lyricPlacer: LyricPlacer,
		private readonly collisionResolver: CollisionResolver,
		private readonly spill: SpillTracker,
		private readonly reporter: SystemReporter,
		opts: SystemFormatterOptions,
	) {
		this.softmaxFactor = opts.softmaxFactor;
		this.notationColor = opts.notationColor;
		this.byLead = opts.byLead;
		this.crossStaveNotes = opts.crossStaveNotes;
	}

	/*
	 * Square up the opening repeat sign and the time signature across a measure's staves, and
	 * return the repeat's x (null when the measure opens with none).
	 *
	 * Both belong to the MEASURE rather than to one stave, so they should read as one vertical
	 * column — but vexflow lays each stave's begin modifiers out on its own, so they shear apart
	 * whenever the glyphs ahead of them differ in width: a treble clef plus a time signature is
	 * wider than a bare "TAB" glyph, and a grand staff can carry a different key per stave
	 * (staves_different_keys), or a key on one stave and none on another (transpose). The widest
	 * stave wins and the rest are pushed out to match.
	 *
	 * The clef and key are deliberately NOT squared up, which is where this parts company with
	 * vexflow's own Stave.formatBegModifiers: a key signature is engraved flush after its own
	 * clef, so those already sit where they belong, and equalizing them would pad every
	 * multi-stave system's opening for nothing. The note start is unified separately, in
	 * formatAndDraw.
	 *
	 * One pass for both, because Stave.format() reassigns every modifier's x — running two
	 * alignments in sequence would have the second one's format() undo the first.
	 */
	alignBegModifiers(staves: readonly Stave[]): number | null {
		const repeats: StaveModifier[] = [];
		const timeSignatures: StaveModifier[] = [];
		for (const stave of staves) {
			stave.format(); // modifier x isn't assigned until the stave lays itself out
			for (const modifier of stave.getModifiers(StaveModifierPosition.BEGIN)) {
				if (
					modifier instanceof Barline &&
					modifier.getType() === Barline.type.REPEAT_BEGIN
				) {
					repeats.push(modifier);
				} else if (modifier.getCategory() === TimeSignature.CATEGORY) {
					timeSignatures.push(modifier);
				}
			}
		}
		squareUp(timeSignatures);
		return repeats.length > 0 ? squareUp(repeats) : null;
	}

	/*
	 * Format a system's staves together and draw their notes. A note's absolute x is its
	 * (shared) tick-context x plus its own stave's note-start x, so two things must hold
	 * for same-tick notes to line up across staves: a single Formatter shares the tick
	 * contexts, and every stave starts its note area at the same x. Staves are equalized
	 * to the widest note start (a treble clef is wider than the "TAB" glyph) — otherwise
	 * the columns shear apart even when the ticks match. Returns the topmost/lowest y any
	 * content reaches so the page can grow to fit high notes and deep ledger lines.
	 */
	formatAndDraw(
		pending: PendingStave[],
		column: FormatColumn,
	): {
		top: number;
		bottom: number;
	} {
		if (pending.length === 0) {
			return { top: Infinity, bottom: 0 };
		}

		// The leading pad sits inside the stave but off-limits to the formatter, the mirror of
		// the trailing one below: the first note starts clear of the barline so a directive
		// centered on it prints in the gap instead of over the divider.
		const startX =
			Math.max(...pending.map((p) => p.stave.getNoteStartX())) +
			column.measureLeadingPad;
		let noteEndX = 0;
		for (const p of pending) {
			p.stave.setNoteStartX(startX);
			noteEndX = p.stave.getNoteEndX();
			for (const vexVoice of p.vexVoices) {
				vexVoice.setStave(p.stave);
				// Voice.setStave doesn't reach the tickables — Voice.draw does that, which is
				// too late for a cross-staff beam: it draws with its owning stave's row, before
				// the lower row's voices have drawn, so its notes a stave away still sit at the
				// stave-less origin and their stems shoot off the top of the page. Setting each
				// note's stave here is what Voice.draw would do anyway, just early enough for
				// every beam to read real y's.
				for (const note of vexVoice.getTickables()) {
					note.setStave(p.stave);
				}
			}
		}

		// joinVoices per stave (voices on one stave share accidental/stem columns), then
		// format every voice at once to share tick contexts across staves. The note area
		// was sized to a global px-per-tick, so spacing stays consistent across measures.
		const formatter = new Formatter({ softmaxFactor: this.softmaxFactor });
		for (const p of pending) {
			formatter.joinVoices(p.vexVoices);
		}
		const allVoices = pending.flatMap((p) => p.vexVoices);
		// The trailing pad is inside the stave but off-limits to the formatter, so the last
		// note stops short of the barline and its words directive prints in the gap.
		const justifyWidth =
			noteEndX - startX - Stave.defaultPadding - column.measureTrailingPad;
		formatter.format(allVoices, justifyWidth, { context: this.context });
		this.closeGraceGaps(allVoices);

		let bottom = 0;
		// Track how high content rises above the staves from each note's noteheads and its
		// (beam-extended) stem tip. Deliberately NOT note.getBoundingBox().getY(): that
		// unions in attached modifiers, and a GraceNoteGroup's box reports a bogus near-
		// origin y that would wrongly claim the note reaches the top of the page. Beams/
		// tuplets sit a hair higher than the stem; the PAGE_MARGIN_TOP buffer the crop keeps
		// above this top covers them (their own getBoundingBox is unreliable too).
		let top = Infinity;
		// A notation grace group's width, keyed by its main note's (shared) tick context, so a
		// tab grace group at the same tick can match its notation counterpart by identity.
		const notationGraceWidths = new Map<unknown, number>();
		for (const p of pending) {
			if (p.isTab) {
				continue;
			}
			for (const vexVoice of p.vexVoices) {
				for (const note of vexVoice.getTickables() as StaveNote[]) {
					const group = graceGroupOf(this.translator, note);
					if (group) {
						notationGraceWidths.set(note.getTickContext(), group.getWidth());
					}
				}
			}
		}
		// One lyric baseline per stave row, shared by every measure of the system: a verse is a
		// line of text, so its syllables all have to hang at the same height. Measured here as
		// a DROP below the bottom staff line — how far this column's lowest note pushes the
		// verse past LYRIC_Y_OFFSET, so a note on ledger lines below the stave doesn't print
		// through its own syllable. The column can only see its own measure, so the drop the
		// rest of the system needs arrives from the previous pass (see LyricPlacer);
		// on the first pass each column still rides its own notes and the verse steps.
		const lyricDrops = new Map<number, number>();
		for (const p of pending) {
			if (p.isTab) {
				continue;
			}
			const floorY = p.stave.getBottomLineY();
			let drop = Math.max(lyricDrops.get(p.row) ?? 0, LYRIC_Y_OFFSET);
			for (const note of p.staveNotes) {
				// The stave reaches the notes via Voice.draw, which hasn't run yet; the note
				// bounds need it now. Setting it early is what draw would do anyway.
				note.setStave(p.stave);
				drop = Math.max(
					drop,
					this.noteBottom(note) + LYRIC_NOTE_CLEARANCE - floorY,
				);
			}
			lyricDrops.set(p.row, drop);
			this.lyricPlacer.recordDrop(column.systemIndex, p.row, drop);
		}
		for (const p of pending) {
			if (p.isTab) {
				// setStave before stretching so each note's getAbsoluteX() is in true stave
				// coordinates — the stretch helpers compare it against stave.getNoteEndX().
				const tabStave = p.stave as TabStave;
				// Center each fret (and its cleared staff-line gap) under the notation
				// notehead, which is left-anchored at the shared start x: shift the tab note
				// area right by half a notehead. Safe post-format — the column's staves are
				// already drawn before the format pass and the formatter never reads
				// getAbsoluteX, so only the notes, their gaps, and note-anchored modifiers
				// (bends/annotations) move.
				tabStave.setNoteStartX(startX + this.translator.noteheadHalfWidth());
				for (const vexVoice of p.vexVoices) {
					for (const note of vexVoice.getTickables()) {
						note.setStave(tabStave);
					}
				}
				this.stretchVibratos(tabStave, p.vexVoices);
				this.stretchBends(tabStave, p.vexVoices);
				this.alignTabGraces(p.vexVoices, notationGraceWidths);
			}
			this.pinTechnicals(p);
			this.lyricPlacer.pin(
				p.staveNotes,
				p.row,
				p.stave.getBottomLineY() +
					Math.max(
						lyricDrops.get(p.row) ?? LYRIC_Y_OFFSET,
						this.lyricPlacer.carriedDrop(column.systemIndex, p.row),
					),
			);
			for (const vexVoice of p.vexVoices) {
				for (const note of vexVoice.getTickables()) {
					// A mid-measure BarNote or ClefNote has no stem and no ledger lines to
					// restyle; both draw in the context ink like the stave does.
					if (note instanceof BarNote || note instanceof ClefNote) {
						continue;
					}
					// VexFlow's Metrics hand every Stem a hardcoded strokeStyle:'black' that its
					// drawWithStyle lays over the context ink — so stems ignore notation.color while
					// the noteheads/staves/clefs it colors don't. Restyle each note's stem to match.
					// Covers beamed stems too: the beam renders this same Stem object.
					(note as StemmableNote).getStem()?.setStyle({
						strokeStyle: this.notationColor,
					});
					// Ledger lines use the stave's hardcoded defaultLedgerLineStyle (gray #444),
					// overriding the context ink the same way. Only restyle when a notation color
					// is set so an uncolored render stays byte-identical; lineWidth is left to the
					// stave default.
					if (this.notationColor !== '#000000' && note instanceof StaveNote) {
						note.setLedgerLineStyle({ strokeStyle: this.notationColor });
					}
				}
			}
			// The score's own per-element colors (<note color>, <notehead color>, <stem color>)
			// go on last so they win over the configured notation ink above.
			for (const { note, chord } of [...p.noteChords, ...p.graceChords]) {
				this.chords.applyNoteColors(note, chord);
			}
			for (const vexVoice of p.vexVoices) {
				vexVoice.draw(this.context, p.stave);
			}
			// The mid-measure dividers vexflow drew nothing for: their BarNote reserved the
			// width and now has a formatted x, so paint the real stroke over it.
			for (const { note, style } of p.midBars) {
				this.connectorDrawer.paintBarStyle(p.stave, note.getAbsoluteX(), style);
			}
			for (const beam of p.beams) {
				beam.setContext(this.context).draw();
			}
			for (const tuplet of p.tuplets) {
				tuplet.setContext(this.context).draw();
			}
			for (const note of p.staveNotes) {
				const box = note.getBoundingBox();
				bottom = Math.max(bottom, box.getY() + box.getH());
				top = Math.min(top, this.noteTop(note), this.accidentalTop(note));
				// The page still has to fit a cross-staff stem (hence `top`/`bottom` above
				// reading it), but the gap between the staves does not — see crossStaveNotes.
				const heads = this.crossStaveNotes.has(note)
					? note.getNoteHeadBounds()
					: null;
				const spillTop = heads ? heads.yTop : this.noteTop(note);
				const spillBottom = heads ? heads.yBottom : box.getY() + box.getH();
				// The note's own x span, so the gap only opens where this note actually sits
				// over (or under) the neighbouring stave's music — not everywhere in the system.
				this.recordStaveSpill(
					p,
					new Rect(box.getX(), spillTop, box.getW(), spillBottom - spillTop),
				);
				// Register each note as a collision obstacle now that its position is final, so the
				// above-stave annotations drawn next can be nudged clear of it (and of high ties).
				this.collisionResolver.add({
					rect: this.noteRect(note),
					kind: 'note',
					band: p.row,
				});
				if (p.tiedNotes.has(note) && note.getStemDirection() === Stem.DOWN) {
					this.collisionResolver.add({
						rect: this.tieApexRect(note),
						kind: 'tie',
						band: p.row,
					});
				}
			}
			for (const { note, chord } of p.tabChords) {
				const rect = this.tabArcApexRect(p.stave, note, chord.lead);
				if (rect) {
					this.collisionResolver.add({ rect, kind: 'tie', band: p.row });
				}
				const bend = this.tabBendRect(p.stave, note);
				if (bend) {
					this.collisionResolver.add({ rect: bend, kind: 'note', band: p.row });
				}
			}
			// A slur bows into the same band the above-stave annotations drawn next sit in,
			// and it can't yield — it's pinned to its noteheads — so it's an obstacle, the
			// way a tie's apex is. The real curves are built (and drawn) in
			// SpannerResolver.resolve; this rebuilds them over this stave's own chords just
			// to measure the bow.
			//
			// ponytail: within-measure slurs only. A bow crossing a barline has one endpoint
			// outside `noteChords`, so slurSpans never pairs it and it registers nothing —
			// widen to the system's chords if a wrapping bow ever collides with text.
			for (const slur of this.spanners.buildSlurs(
				p.noteChords.map(({ chord }) => chord),
				this.byLead,
			)) {
				if (slur.stave === p.stave && !slur.crossStave) {
					this.collisionResolver.add({
						rect: new Rect(
							slur.left,
							slur.top,
							slur.right - slur.left,
							slur.bottom - slur.top,
						),
						kind: 'tie',
						band: p.row,
					});
				}
			}
		}
		return { top, bottom };
	}

	/*
	 * The collision obstacle for a tab arc (a <slur>, or a <hammer-on>/<pull-off> drawn as
	 * one): the band it bows into above the fret digits it springs from. Same problem
	 * tieApexRect solves — the arc is a spanner drawn in the finish pass, so there's no glyph
	 * for the above-stave annotations to clear when they're placed here — and the same
	 * answer, reconstructed from the rise TabCurve.draw bows by.
	 *
	 * Only an arc on the top string gets one: TabCurve caps an inner-string arc under the
	 * line above it, where no above-stave text can reach. Returns null when there's no arc.
	 *
	 * ponytail: registered at the notes that carry the slur marker — its two ends — not at
	 * the notes in between, and at the arc's full height whatever it scales down to. Widen
	 * to the drawn span if a chord symbol ever lands mid-arc.
	 */
	private tabArcApexRect(stave: Stave, note: TabNote, lead: Note): Rect | null {
		if (!lead.slurs.length && !lead.hammerOns.length && !lead.pullOffs.length) {
			return null;
		}
		const y = Math.min(...note.getYs());
		if (y - stave.getSpacingBetweenLines() >= stave.getYForLine(0)) {
			return null;
		}
		const hw = this.translator.noteheadHalfWidth();
		return new Rect(
			note.getAbsoluteX() - hw,
			y - TAB_CURVE_RISE,
			2 * hw,
			TAB_CURVE_RISE,
		);
	}

	/*
	 * The collision obstacle for a tab <bend>: the band its arrow and label occupy above the
	 * fret it springs from. Same problem tabArcApexRect solves — a Bend is a note modifier
	 * that vexflow gives no bounding box, so above-stave words placed later see nothing there
	 * and print straight through the arrow. Reconstructed from Bend.draw's own geometry: the
	 * arrow tips out (textLine + 1) stave spaces above the fret, with the "full"/"1/2" label
	 * centered a text height above that. `textLine` is protected — hence the cast, as in
	 * stretchBends, which is also what sets the leg widths this reads.
	 */
	private tabBendRect(stave: Stave, note: TabNote): Rect | null {
		const bend = this.translator.findModifier<Bend>(note, Bend.CATEGORY);
		if (!bend) {
			return null;
		}
		const { textLine, phrase } = bend as unknown as {
			textLine: number;
			phrase: { drawWidth?: number }[];
		};
		const fretY = Math.min(...note.getYs());
		const top =
			fretY -
			(textLine + 1) * stave.getSpacingBetweenLines() -
			1 -
			bend.getTextHeight();
		const left = note.getAbsoluteX();
		// Mirrors stretchBends' start x, plus the drawn legs, plus the label's overhang past
		// the arrow tip it's centered on.
		const right =
			note.getAbsoluteX() +
			note.getWidth() +
			5 +
			phrase.reduce((sum, leg) => sum + (leg.drawWidth ?? 0), 0) +
			bend.getWidth() / 2;
		return new Rect(left, top, right - left, fretY - top);
	}

	/*
	 * Pull a note's LEADING grace cluster back onto the note when the same note also carries an
	 * after-grace cluster.
	 *
	 * vexflow sizes both clusters together: GraceNoteGroup.format takes the wider one's width
	 * and adds it to the tick context's left shift AND its right shift, so a note with a group
	 * on each side reserves that width twice. Placing a left-side modifier then subtracts the
	 * whole reserved block — left plus right — which slides the leading graces a cluster's width
	 * off the note they lead, leaving them stranded between the two notes. Handing that width
	 * back through the group's own spacing (the one term the left-side placement adds) lands
	 * them against their note again; the after-graces are placed from the note's x and don't
	 * move. Run after the format pass, which is what sets the spacing in the first place.
	 */
	private closeGraceGaps(voices: Voice[]): void {
		for (const voice of voices) {
			for (const note of voice.getTickables()) {
				const groups = note
					.getModifiers()
					.filter(
						(m): m is GraceNoteGroup =>
							m.getCategory() === GraceNoteGroup.CATEGORY,
					);
				if (groups.length < 2) {
					continue;
				}
				const leading = groups.find(
					(g) => g.getPosition() !== Modifier.Position.RIGHT,
				);
				leading?.setSpacingFromNextModifier(
					leading.getSpacingFromNextModifier() +
						note.checkTickContext().getMetrics().modRightPx,
				);
			}
		}
	}

	/*
	 * The highest y a single note reaches: its top notehead, and — when it has a stem —
	 * the stem tip, which a beam extends up to its beam line. Excludes modifiers on
	 * purpose (see formatAndDraw). Falls back to the notehead bound if the stem
	 * extents aren't available (e.g. a stemless whole note).
	 */
	private noteTop(note: StaveNote): number {
		let top = this.noteGlyphTop(note);
		// Clear articulations sitting above the notehead too (e.g. a staccato dot on a
		// stem-down note), and the stacked <technical> marks — a chord's fingering column
		// reaches much further than any single glyph does. They're drawn before the
		// harmony/words/tempo pass, so their bounding box is final; the notehead and stem
		// alone miss them, which would let a chord symbol land on the dot and would crop the
		// page through the top of the column. Only above-side marks raise the top —
		// below-side ones ride the note's own bounding box instead.
		for (const mod of note.getModifiers()) {
			if (isTechnicalMark(mod)) {
				if (!mod.below) {
					top = Math.min(top, mod.getBoundingBox().getY());
				}
			} else if (
				mod.getCategory() === 'Articulation' &&
				mod.getPosition() === Modifier.Position.ABOVE
			) {
				top = Math.min(top, mod.getBoundingBox().getY());
			}
		}
		return top;
	}

	/*
	 * The top of a note's accidentals, or Infinity when it has none. A flat's ascender climbs
	 * well past the notehead it belongs to, so a volta bracket lifted to clear the noteheads
	 * alone still slices through it.
	 *
	 * Deliberately NOT folded into {@link noteTop}: that also builds the note's collision
	 * obstacle (see noteRect), which is one notehead wide and centered on the notehead — an
	 * accidental sits to its LEFT, so widening the box upward there claims height at an x the
	 * accidental never occupies, and below-stave spanners resolving against it shift for a
	 * glyph that isn't over them.
	 */
	private accidentalTop(note: StaveNote): number {
		let top = Infinity;
		for (const mod of note.getModifiers()) {
			if (mod.getCategory() === 'Accidental') {
				top = Math.min(top, mod.getBoundingBox().getY());
			}
		}
		return top;
	}

	/*
	 * The top of a note's own glyphs — its top notehead, and the stem tip when it has one.
	 * Modifier-free, so it is readable BEFORE the note draws (which {@link noteTop} is not,
	 * since a modifier's bounding box is only final once it's drawn).
	 */
	private noteGlyphTop(note: StaveNote): number {
		let top = note.getNoteHeadBounds().yTop;
		if (note.getStem()) {
			const { topY, baseY } = note.getStemExtents();
			top = Math.min(top, topY, baseY);
		}
		return top;
	}

	/*
	 * The lowest y a single note reaches — the mirror of {@link noteTop}: its bottom
	 * notehead, and the stem tip when it stems down. Modifiers are excluded on purpose,
	 * lyrics included: a lyric's own baseline is what this feeds, so reading it back would
	 * ratchet the row down a little further on every render pass.
	 */
	private noteBottom(note: StaveNote): number {
		let bottom = note.getNoteHeadBounds().yBottom;
		if (note.getStem()) {
			const { topY, baseY } = note.getStemExtents();
			bottom = Math.max(bottom, topY, baseY);
		}
		return bottom;
	}

	/*
	 * Stack each note's <technical> marks (fingering/pluck labels, string-number rings) into
	 * a column running away from the stave, and register each one as a collision obstacle so
	 * the above-stave text placed later lifts clear of it.
	 *
	 * The column starts past whichever is further out — the stave's near line or the note's
	 * own glyphs — so a chord on ledger lines pushes its digits out with it instead of
	 * printing them over its own noteheads. Each mark then steps one of its own row heights
	 * further out, which is the part vexflow's Annotation stacking gets wrong (see
	 * TechnicalAnnotation): it hands every mark on a note low in the stave the same row.
	 *
	 * Called after format and before draw, like LyricPlacer.pin — the notes' x/y are final by then
	 * but nothing has rendered, so the marks' own bounding boxes aren't readable yet and the
	 * column is measured off the note's glyphs alone (noteGlyphTop/noteBottom).
	 */
	private pinTechnicals(p: PendingStave): void {
		for (const note of p.staveNotes) {
			const marks = note.getModifiers().filter(isTechnicalMark);
			if (marks.length === 0) {
				continue;
			}
			// The stave reaches the notes via Voice.draw, which hasn't run yet.
			note.setStave(p.stave);
			const sides = [
				{
					below: false,
					edge:
						Math.min(p.stave.getYForLine(0), this.noteGlyphTop(note)) -
						TECHNICAL_EDGE_GAP,
				},
				{
					below: true,
					edge:
						Math.max(p.stave.getBottomLineY(), this.noteBottom(note)) +
						TECHNICAL_EDGE_GAP,
				},
			];
			for (const { below, edge } of sides) {
				let y = edge;
				for (const mark of marks.filter((m) => m.below === below)) {
					const height = mark.rowHeight();
					// A row's baseline is its bottom edge, so a column growing DOWN steps
					// before placing the mark and one growing UP steps after.
					if (below) {
						y += height;
					}
					mark.setBaselineY(y);
					// Pin the ink the same way LyricPlacer.pin does — a mark drawn inside a colored
					// notehead's style would otherwise take that notehead's color.
					mark.setStyle({ fillStyle: this.notationColor });
					const w = mark.getWidth();
					this.collisionResolver.add({
						rect: new Rect(note.getAbsoluteX() - w / 2, y - height, w, height),
						kind: 'annotation',
						band: p.row,
					});
					if (!below) {
						y -= height;
					}
				}
			}
		}
	}

	/*
	 * The collision obstacle for a note: a box from its top (noteTop — notehead ∪ beam-extended
	 * stem tip ∪ above articulations) down to its bottom (noteBottom — the mirror), one notehead
	 * wide, centered on its laid-out x. Deliberately built from noteTop/noteBottom, NOT
	 * note.getBoundingBox() (which unions attached modifiers and reports a bogus near-origin y
	 * for grace groups).
	 *
	 * The bottom edge reaches the stem tip, not just the lowest notehead, so a stem-down beam is
	 * an obstacle to the things that stack UNDER a stave — an ottava bracket, a pedal, a
	 * below-stave words direction all sat in the band a low beam reaches into.
	 */
	noteRect(note: StaveNote): Rect {
		const top = this.noteTop(note);
		const bottom = this.noteBottom(note);
		const hw = this.translator.noteheadHalfWidth();
		return new Rect(note.getAbsoluteX() - hw, top, 2 * hw, bottom - top);
	}

	/*
	 * The collision obstacle for a stem-down note's tie: the band the tie ribbon bows up into,
	 * from its reconstructed apex (TIE_APEX_RISE above the top notehead) down to that notehead.
	 * The tie is a separate spanner drawn later, so there's no glyph to measure — this lets an
	 * annotation clear the arc the same way it clears a notehead.
	 */
	private tieApexRect(note: StaveNote): Rect {
		const headTop = Math.min(...note.getYs());
		const hw = this.translator.noteheadHalfWidth();
		return new Rect(
			note.getAbsoluteX() - hw,
			headTop - TIE_APEX_RISE,
			2 * hw,
			TIE_APEX_RISE,
		);
	}

	/*
	 * VexFlow draws a bend arrow at a fixed ~8px width. A guitar bend reads as sliding
	 * into the next note, so stretch each so its arrow reaches the next note — or the
	 * bar's end if it's the last note (same span as stretchVibratos). The arrow draws
	 * from getAbsoluteX() + width + 2 + 3 (TabNote RIGHT modifier x, +3 in Bend.draw),
	 * mirrored here (the modifier's own x isn't positioned until draw). getAbsoluteX()
	 * is in stave coordinates only because formatAndDraw setStave's the notes first — else
	 * it's stave-relative and the last note's span to getNoteEndX overshoots off the page.
	 * Bend.draw uses each phrase leg's drawWidth, which is protected — hence the cast. A
	 * bend-and-release (UP+DOWN) peaks at the midpoint and returns, so split across legs.
	 */
	private stretchBends(stave: TabStave, voices: Voice[]): void {
		for (const voice of voices) {
			const tickables = voice.getTickables() as TabNote[];
			tickables.forEach((note, i) => {
				const bend = this.translator.findModifier<Bend>(note, Bend.CATEGORY);
				if (!bend) {
					return;
				}
				const startX = note.getAbsoluteX() + note.getWidth() + 5;
				const endX = tickables[i + 1]?.getAbsoluteX() ?? stave.getNoteEndX();
				const width = Math.max(0, endX - startX);
				const { phrase } = bend as unknown as {
					phrase: { drawWidth?: number }[];
				};
				const [up, down] = phrase;
				if (!up) {
					return;
				}
				if (down) {
					up.drawWidth = width / 2;
					down.drawWidth = 0;
				} else {
					up.drawWidth = width;
				}
			});
		}
	}

	/*
	 * VexFlow's Vibrato draws a fixed 20px wavy line trailing the fret. A real vibrato
	 * sustains for the note's full sounding length, so stretch each to span up to the
	 * next note — or the bar's end if it's the last note. Widths depend on the formatted
	 * x positions, so this runs after formatToStave: set each Vibrato's width from the
	 * fret's right edge to the next note's x (or the stave's note-end x). The Vibrato
	 * draws from getAbsoluteX() + width + 2 (TabNote.getModifierStartXY for RIGHT), mirrored
	 * here. Like stretchBends, this relies on formatAndDraw having setStave'd the notes so
	 * getAbsoluteX() is in stave coordinates and the last note's span clamps to the barline.
	 */
	private stretchVibratos(stave: TabStave, voices: Voice[]): void {
		for (const voice of voices) {
			const tickables = voice.getTickables() as TabNote[];
			tickables.forEach((note, i) => {
				const vibrato = this.translator.findModifier<Vibrato>(
					note,
					Vibrato.CATEGORY,
				);
				if (!vibrato) {
					return;
				}
				const startX = note.getAbsoluteX() + note.getWidth() + 2;
				const endX = tickables[i + 1]?.getAbsoluteX() ?? stave.getNoteEndX();
				vibrato.setVibratoWidth(Math.max(0, endX - startX));
			});
		}
	}

	/*
	 * A tab grace group reserves no accidental space, so its frets would land left of the
	 * notation grace noteheads, which a flat/sharp pushes right within their own group. Shift
	 * each tab grace group right so its frets sit under the notehead: by the notation grace
	 * group's own left reservation (its width + GRACE_GROUP_SPACING_STAVE) minus the tab
	 * group's (note.getMetrics().modLeftPx). Match the notation group by the shared tick
	 * context — every stave formatted together shares one per tick. Deliberately NOT the tick
	 * context's modLeftPx: that's the max across the stave, so a main note with its OWN
	 * accidental (a chord) inflates it and overshoots the grace shift. With no notation
	 * counterpart (tab-only score) nothing moves. Runs before draw, which reads
	 * spacingFromNextModifier when positioning the grace notes.
	 */
	private alignTabGraces(
		voices: Voice[],
		notationGraceWidths: Map<unknown, number>,
	): void {
		for (const voice of voices) {
			for (const note of voice.getTickables() as TabNote[]) {
				const group = graceGroupOf(this.translator, note);
				if (!group) {
					continue;
				}
				const notationWidth = notationGraceWidths.get(note.getTickContext());
				if (notationWidth === undefined) {
					continue;
				}
				const own = note.getMetrics().modLeftPx;
				group.setSpacingFromNextModifier(
					group.getSpacingFromNextModifier() +
						Math.max(0, notationWidth + GRACE_GROUP_SPACING_STAVE - own),
				);
			}
		}
	}

	/*
	 * Note how far content on a stave row reached past its staff lines. `top`/`bottom` are
	 * absolute canvas y; they're stored relative to the stave so rows from different
	 * measures and systems (drawn at different y) accumulate into one per-row worst case.
	 *
	 * ponytail: only notation notes are measured — a tab row reports its staff lines alone,
	 * since its frets sit on them. Feed the tab bend/annotation extents in here too if one
	 * ever reaches the stave above.
	 */
	private recordStaveSpill(p: { stave: Stave; row: number }, rect: Rect): void {
		this.spill.recordStave(
			this.reporter.systemOf(p.stave),
			p.row,
			p.stave,
			rect,
		);
	}
}
