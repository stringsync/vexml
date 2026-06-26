// Tunable magic numbers, centralized. Spacing/margins are px at the reference layout
// width; the SVG viewBox scales the finished result to its container.

/** Page width floor, and the panoramic mode's starting width. */
export const REFERENCE_WIDTH = 1000;

/** Left/right page margin. Leaves room for the brace/bracket drawn left of the stave. */
export const PAGE_MARGIN_X = 30;

/** Top margin: the first system's y. */
export const PAGE_MARGIN_TOP = 40;

/** Top margin when the first measure carries a metronome mark (extra headroom so the
 * mark can lift clear of a high first note). */
export const PAGE_MARGIN_TOP_WITH_TEMPO = 70;

/** Bottom whitespace kept below the lowest drawn content. */
export const PAGE_MARGIN_BOTTOM = 40;

/** Vertical gap between stacked systems, plus room for the next system's notes that
 * rise above its top staff. */
export const SYSTEM_GAP = 90;

/** Vertical gap between staves within one part (a brace-joined group reads as one
 * instrument because this exceeds INTER_PART_SPACING). */
export const INTRA_PART_SPACING = 120;

/** Vertical gap between adjacent parts. */
export const INTER_PART_SPACING = 80;

/** Absolute floor for a measure's note area. */
export const BASE_VOICE_WIDTH = 80;

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

/** Grace tab frets, as a fraction of the (enlarged) main-note size. */
export const TAB_GRACE_SCALE = 2 / 3;

/** Padding added to a tab grace group's width (vexflow's groupSpacingTab is 0). */
export const TAB_GRACE_SPACING = 14;

/** Clearance between the bottom of a metronome mark and the top of the first note. */
export const TEMPO_NOTE_CLEARANCE = 6;

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
