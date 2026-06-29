// Tunable magic numbers, centralized. Spacing/margins are px at the reference layout
// width; the finished result is then scaled to its container.

/** Default standard-layout width. */
export const DEFAULT_WIDTH = 900;

/** Left/right page margin. Leaves room for the brace/bracket drawn left of the stave. */
export const PAGE_MARGIN_X = 15;

/** Top margin: the first system's y. */
export const PAGE_MARGIN_TOP = 40;

/** Top margin when the first measure carries a metronome mark (extra headroom so the
 * mark can lift clear of a high first note). */
export const PAGE_MARGIN_TOP_WITH_TEMPO = 70;

/** Bottom whitespace kept below the lowest drawn content. */
export const PAGE_MARGIN_BOTTOM = 40;

/** Pedal "Ped…*" text / bracket draws at the stave's bottom-text line 3 (vexflow's
 * PedalMarking adds 3 to its line=0). The crop grows to this line plus the glyph
 * descent below so the mark isn't clipped. */
export const PEDAL_BOTTOM_TEXT_LINE = 3;
export const PEDAL_BOTTOM_MARGIN = 12;

/** Vertical gap between stacked systems, plus room for the next system's notes that
 * rise above its top staff. The default for `Config.systemSpacing`. */
export const SYSTEM_GAP = 30;

/** Vertical gap between staves within one part (a brace-joined group reads as one
 * instrument because this exceeds INTER_PART_SPACING). */
export const INTRA_PART_SPACING = 120;

/** Vertical gap between adjacent parts. */
export const INTER_PART_SPACING = 80;

/** Absolute floor for a measure's note area. */
export const BASE_VOICE_WIDTH = 80;

/** Reference note value for the logarithmic spacing curve: VexFlow ticks in a quarter
 * note (RESOLUTION / 4). A quarter note gets exactly one `noteSpacing` of width. */
export const QUARTER_NOTE_TICKS = 4096;

/** Logarithmic spacing curve shape: extra note width per *doubling* of duration, as a
 * fraction of `noteSpacing` (and that much less per halving). ~0.17 reproduces the
 * ~+50px-per-8-notes-per-doubling that engravers use. The shape is fixed here; `noteSpacing`
 * scales the whole curve. */
export const LOG_SPACING_RATIO = 0.17;

/** Floor on the curve's per-note multiplier, so very short notes (32nds and below) keep
 * a sane share before the collision-free minimum takes over. */
export const MIN_LOG_FACTOR = 0.4;

/** Lead glyph width estimate (px a stave prints before its notes): a continuation
 * measure carries only a barline. Lead estimates are deliberately generous so notes
 * never collide with the glyphs; measure stave.getNoteStartX() if exact alignment is
 * ever needed. */
export const LEAD_BARLINE = 12;

/** Lead glyph width for a clef, re-stated at every system start. */
export const LEAD_CLEF = 32;

/** Lead glyph width for a key signature, when present. */
export const LEAD_KEY = 40;

/** Lead glyph width for a time signature, printed once at the piece start. */
export const LEAD_TIME = 32;

/** Horizontal gap between a right-aligned part label and the stave it sits beside.
 * Wide enough to clear the brace drawn on multi-stave parts. Shared by layout (reserved
 * indent) and draw (drawn position) so they agree. */
export const LABEL_GAP = 28;

/** Estimated label width per char for 13px Arial (no render context in layout to
 * measure) — a hair over the ~6.9px actual, so the longest label never clips. */
export const LABEL_CHAR_WIDTH = 7.5;

/** Part label font size. */
export const LABEL_FONT_SIZE = 13;

/** Minimum width per tab note. Floors each note's share so dense tab measures still
 * breathe past vexflow's cramped fret-digit packing. */
export const TAB_MIN_NOTE_SPACING = 32;

/** Bump tab fret digits bolder/larger than vexflow's thin default (1.258 * 9pt ≈ 15px). */
export const TAB_FRET_SCALE = 1.258;

/** Lead clearance (px) before a notation grace cluster: padded onto the RIGHT of the note
 * that precedes the grace's host, so the host and its attached grace shift right together
 * and the grace gets breathing room from that note while staying snug to its host. The
 * measure's width allocation grows by this too (see graceWidthOf) so the clearance is real
 * space, not stolen from the bar's other notes. Skipped when the preceding note carries
 * augmentation dots — vexflow draws those after the displaced-head gap, so padding it would
 * fling the dots out to the right. */
export const GRACE_SPACING = 16;

/** Grace tab frets, as a fraction of the (enlarged) main-note size. */
export const TAB_GRACE_SCALE = 2 / 3;

/** Padding added to a tab grace group's width (vexflow's groupSpacingTab is 0). */
export const TAB_GRACE_SPACING = 14;

/** Top/bottom control points for a tab hammer-on/pull-off arc. vexflow's TabTie
 * narrows these to 9/11 (a ~1px filled band); widening back to the StaveTie default
 * 8/12 gives a ~2px band so the arc weight matches the stave-note slurs. */
export const TAB_TIE_CP1 = 8;
export const TAB_TIE_CP2 = 12;

/** Pixels a notation+tab bracket is shifted left of the stave, so it sits just outside
 * the system's left line with a small gap. */
export const BRACKET_X_SHIFT = 3;

/** Chord-symbol (from `<harmony>`) text size — a touch smaller than the part label so it
 * reads as an annotation above the notes. */
export const HARMONY_FONT_SIZE = 13;

/** How far a chord symbol's baseline sits above the top staff line. */
export const HARMONY_Y_OFFSET = 14;

/** Clearance kept between a chord symbol's baseline and the top of a high note it
 * sits over, so the symbol lifts clear instead of colliding with the notehead. */
export const HARMONY_NOTE_CLEARANCE = 8;

/** Padding added below a chord symbol's collision box, reaching down to the top staff line
 * (past its text baseline, which sits HARMONY_Y_OFFSET above that line). Lets the lift-clear
 * probe reach a notehead sitting in the top stave space — just under the baseline — so the
 * symbol nudges up off it instead of touching, leaving a little breathing room above the note.
 * Set a hair past HARMONY_Y_OFFSET so a note on the top line/space is reliably caught. */
export const HARMONY_PADDING = 15;

/** How far a single note's tie ribbon peaks above the notehead center when it bows
 * upward (stem-down note). Vexflow draws the tie as a bezier whose outer edge clears
 * the notehead by its yShift (7) plus the deeper control-point excursion (cp2 12) —
 * ~13px. A chord symbol over a tied note lifts past this so it doesn't touch the arc. */
export const TIE_APEX_RISE = 13;

/** Chord-diagram (fret box from a `<harmony><frame>`) overall width/height, drawn
 * above the stave at the lead note's x. Smaller than vexchords' 100×120 default so the
 * box reads as an inline annotation over the music. */
export const CHORD_DIAGRAM_WIDTH = 88;
export const CHORD_DIAGRAM_HEIGHT = 84;

/** Gap kept between the bottom of a chord diagram and the top staff line. */
export const CHORD_DIAGRAM_GAP = 6;

/** Padding added below a chord diagram's collision box (which sits CHORD_DIAGRAM_GAP above
 * the top staff line). Lets the lift-clear probe reach a note sitting in the top stave space
 * — just under the box — so the box rises off it instead of overlapping, the same padding
 * treatment a chord symbol's box uses (see HARMONY_PADDING). */
export const CHORD_DIAGRAM_PADDING = 15;

/** Words-direction (e.g. "ritardando") text size — matches the chord-symbol size so
 * both read as annotations above the notes. */
export const WORDS_FONT_SIZE = 13;

/** How far a words-direction baseline sits above the top staff line. */
export const WORDS_Y_OFFSET = 14;

/** Clearance kept between a words-direction baseline and the top of a high note it sits
 * over, so the directive lifts clear instead of colliding with the notehead. */
export const WORDS_NOTE_CLEARANCE = 8;

/** Clearance between the bottom of a metronome mark and the top of the first note. */
export const TEMPO_NOTE_CLEARANCE = 6;

/** Uniform scale applied to the metronome mark — vexflow's StaveTempo defaults
 * (14pt text, 25pt note glyph) render oversized, so shrink it. */
export const TEMPO_SCALE = 0.7;

/** bpm a metronome directive falls back to when it carries no number. */
export const DEFAULT_TEMPO_BPM = 120;

/** Per-system slack on the scratch canvas for content below the stave (deep ledger
 * lines); bump if an extreme low tessitura ever clips at the scratch bottom. */
export const LEDGER_HEADROOM = 300;

/** Raises a slur's endpoints off the notes. */
export const SLUR_Y_SHIFT = 12;

/** Extra clearance the arc keeps above/below the most extreme note it spans. */
export const SLUR_MARGIN = 14;

/** Minimum control-point rise, so even short slurs bow off the noteheads. */
export const SLUR_MIN_CP_Y = 16;

/** Arc height grows with slur width so long slurs get a rounder bow. */
export const SLUR_WIDTH_FACTOR = 0.12;

/** Guards float drift when comparing dyadic beat positions. */
export const EPSILON = 1e-6;
