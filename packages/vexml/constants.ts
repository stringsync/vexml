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

/** How far the pedal's ink rises above that baseline — the "Ped."/"*" glyphs measure ~23px
 * tall and the bracket only 10, so this is the taller of the two. The band it defines is
 * what gets dropped clear of notes hanging below the staff. */
export const PEDAL_INK_RISE = 24;

/** Vertical gap between stacked systems, plus room for the next system's notes that
 * rise above its top staff. The default for `Config.systemSpacing`. */
export const SYSTEM_GAP = 30;

/** Vertical gap between staves within one part (a brace-joined group reads as one
 * instrument because this exceeds INTER_PART_SPACING).
 *
 * A FLOOR, not the spacing: 100 leaves 6 staff spaces of air between the two staves, which
 * is about what a reference engraving gives a grand staff with nothing in the gap, and the
 * draw pass opens it further wherever the music needs it (see SpillResolver.spacedOffsets).
 * It used to be the whole answer at 120, sized for music it couldn't see. Keep it clear of
 * INTER_PART_SPACING: the re-spacing pass tells a within-part gap from a between-part one
 * by its planned size, so the two must stay distinct numbers. */
export const INTRA_PART_SPACING = 100;

/** Vertical gap between adjacent parts. */
export const INTER_PART_SPACING = 80;

/** Clearance kept between what one stave's music reaches down to and what the next stave's
 * reaches up to. Both gaps above are the *planned* spacing, sized for ordinary music; when
 * the drawn notes spill past their staff lines far enough to close that gap, the draw pass
 * widens it so this much air survives between the two (see SpillResolver.spacedOffsets). */
export const STAVE_CLEARANCE = 12;

/** Width of one x column in a stave's spill profile. Spill is measured per column, and two
 * staves only push each other apart where their profiles overlap — a deep stem hanging over
 * an empty patch of the stave below costs nothing, which is what keeps a gap sized for the
 * one bar that needs it rather than for the worst drop plus the worst rise in the system.
 * Coarse enough that a notehead and a stem a few px apart share a column (they'd read as
 * colliding anyway), fine enough that one bar's extremes stay out of its neighbours'. */
export const SPILL_COLUMN = 8;

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

/** Lead glyph width for a mid-system clef CHANGE, which draws at vexflow's smaller
 * "change clef" size rather than the full system-start size. */
export const LEAD_CLEF_CHANGE = 24;

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

/** Default gap-measure label font size (overridable per gap via GapStyle.fontSize).
 * Shared by layout (width estimate) and draw (drawn size) so they agree. */
export const GAP_LABEL_FONT_SIZE = 16;

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

/** Shape of a tab hammer-on/pull-off arc, drawn with the notation slur renderer (see
 * TabCurve): how far the ends are lifted off the fret digits, and the bezier control-point
 * rise that sets the bow's depth (the apex stands 0.75 of it above the ends). The slur
 * counterparts are SLUR_Y_SHIFT / SLUR_MIN_CP_Y; a fret digit is taller than a notehead and
 * sits on its string line, so the lift is larger, and the arc spans two frets rather than a
 * whole phrase, so the bow is shallower. */
export const TAB_CURVE_Y_SHIFT = 12;
export const TAB_CURVE_CP_Y = 12;

/** How far a full-height tab arc bows above the fret digits it springs from — the ends' lift
 * plus the apex's share of the control-point rise. Used both to scale the arc down under the
 * string line above it and to reserve the band it occupies as a collision obstacle. */
export const TAB_CURVE_RISE = TAB_CURVE_Y_SHIFT + 0.75 * TAB_CURVE_CP_Y;

/** The span (px, notehead edge to notehead edge) at which a tab arc gets its full height.
 * Below it the arc scales down in proportion, so a short one — a grace note hammering into
 * the note beside it, or the stub half of an arc split across a system break — shrinks
 * instead of drawing as a tall narrow spike. Set just under the span of a normal
 * fret-to-fret arc, which keeps its full height. */
export const TAB_CURVE_FULL_WIDTH = 28;

/** Gap (px) a tab arc on an inner string keeps below the string line above it, so it stays
 * visibly attached to its own fret digits instead of bowing into the string above's. */
export const TAB_CURVE_LINE_CLEARANCE = 2;

/** A notation slide/glissando line (see NotationSlide) runs between the two notehead centers,
 * tilted by the slide direction. SLIDE_MIN_SLANT is the smallest vertical rise/fall it is
 * allowed (so a near-unison slide still reads instead of going flat, and a chord's near-equal
 * slides stay ~parallel); the tilt is also capped to the horizontal run so a wide interval over
 * a short grace-to-main gap doesn't spike near-vertical. SLIDE_PADDING insets each end: the
 * line starts just past the start notehead's outer edge and ends just into the target head. */
export const SLIDE_MIN_SLANT = 6;
export const SLIDE_PADDING = 3;

/** A single-note slide (a slide into or out of a note whose other end is indeterminate — an
 * unpaired <slide> start/stop) has no partner notehead to run to, so instead of a full line it
 * draws a short "/" tick beside the note: SINGLE_SLIDE_LEN long horizontally, rising
 * SINGLE_SLIDE_RISE from the far end up to the notehead. A slide-in sits just left of the head
 * (rising into it); a slide-out just right (rising out of it). */
export const SINGLE_SLIDE_LEN = 10;
export const SINGLE_SLIDE_RISE = 7;

/** Extra gap (past SLIDE_PADDING) between a note glyph and the head-touching end of a
 * single-note slide tick. A bare tab fret digit needs more air than a notehead, so the tab
 * ticks and the notation slide-out (which reads cramped against the head) widen the gap by this. */
export const SINGLE_SLIDE_GAP = 5;

/** Pixels a notation+tab bracket is shifted left of the stave, so it sits just outside
 * the system's left line with a small gap. */
export const BRACKET_X_SHIFT = 3;

/** Horizontal step between nested <part-group> connectors, so an outer group's symbol
 * clears the inner one's glyph rather than printing over it. Wider than BRACKET_X_SHIFT
 * (a mere gap) because a bracket's curls have real width. */
export const PART_GROUP_STEP = 10;

/** How far a bracket's bar and curl glyphs reach left of the (already shifted) stave x —
 * vexflow insets them ~5px more, plus a hair of glyph overhang. Reserved so a system-start
 * measure box grows to contain the bracket instead of clipping it. */
export const BRACKET_GLYPH_OVERHANG = 8;

/** How far a bracket's curls overhang past the top/bottom staff lines (vexflow raises the
 * top and drops the bottom ~6px, plus glyph height). Reserved for the measure box. */
export const CONNECTOR_VERTICAL_OVERHANG = 10;

/** How far a brace (grand staff connector) reaches left of the stave x — vexflow draws it
 * ~14px out. Reserved so a braced part's system-start measure box contains it. */
export const BRACE_LEFT_OVERHANG = 14;

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

/** Estimated px per character of a words directive at WORDS_FONT_SIZE, used by the layout
 * planner to reserve room for a directive on a measure's last note (no render context there
 * to measure with). Deliberately over the ~8.0px italic Arial measures, because an
 * under-estimate is what puts the text back over the barline. */
export const WORDS_CHAR_WIDTH = 8.5;

/** Clearance kept between a words-direction baseline and the top of a high note it sits
 * over, so the directive lifts clear instead of colliding with the notehead. Matched to
 * WORDS_Y_OFFSET so a lifted directive keeps the same air over a notehead that an
 * uncollided one keeps over the top staff line — at 8 the text grazed the noteheads. */
export const WORDS_NOTE_CLEARANCE = WORDS_Y_OFFSET;

/** Dynamics-marking glyph size. Larger than the text annotations because SMuFL's dynamic
 * letters are drawn small within their em box — at WORDS_FONT_SIZE a "p" reads as a
 * footnote next to the noteheads. */
export const DYNAMICS_FONT_SIZE = 24;

/** Segno/coda glyph size. Sized like a dynamics marking rather than like text: both are
 * SMuFL glyphs, and a navigation sign is a landmark a player finds while sight-reading, so
 * it wants to be at least as visible as an "mf". */
export const NAVIGATION_FONT_SIZE = 24;

/** How tall a crescendo/diminuendo hairpin's open mouth is. */
export const HAIRPIN_HEIGHT = 10;

/** Gap between a hairpin's near edge and the staff line it sits off — matched to the air a
 * words directive keeps, so a wedge and a directive on the same side read as one band. */
export const HAIRPIN_STAVE_GAP = 14;

/** Lyric-syllable text size. A notch under the other typeset annotations (a chord symbol or
 * words directive is a heading and prints larger), which is also what a syllable can afford:
 * a verse sets one syllable per note, so its text — not the notes — decides how wide a sung
 * measure has to be, and every point of type here costs horizontal room on every line the
 * voice sings. */
export const LYRIC_FONT_SIZE = 11;

/** Air a lyric syllable claims either side of its text, so adjacent syllables read as
 * separate words instead of running together ("lowhighledg") when a measure is formatted
 * at its minimum width. A word gap, not a column: this is doubled between neighbours and
 * paid on every syllable, so it drives the minimum width of a sung line more than any
 * notehead does. */
export const LYRIC_PADDING = 3;

/** How far a lyric row's baseline sits below the bottom staff line. */
export const LYRIC_Y_OFFSET = 18;

/** Clearance kept between a lyric row's baseline and the bottom of a note hanging below
 * the stave on ledger lines. Bigger than LYRIC_Y_OFFSET: the offset is measured from a
 * staff line with the empty bottom space already between it and the text, while this is
 * measured from ink, so it has to cover the syllable's own ascent plus that same air. */
export const LYRIC_NOTE_CLEARANCE = 26;

/** Vertical pitch between stacked verses — each extra verse drops one row further below
 * the stave. Roomy enough that a descender ("g", "y") clears the row under it. */
export const LYRIC_LINE_HEIGHT = LYRIC_FONT_SIZE + 5;

/** <technical><fingering>/<pluck> label size. Smaller than the other annotations: a
 * fingering is a performance hint read off the notehead it labels, not a heading, and a
 * chord's worth of them stacks into a column that has to stay compact. */
export const FINGERING_FONT_SIZE = 11;

/** <technical><string> indicator: the digit's size, the radius of the ring drawn around it,
 * and that ring's stroke width. */
export const STRING_NUMBER_FONT_SIZE = 11;
export const STRING_NUMBER_RADIUS = 7;
export const STRING_NUMBER_RING_WIDTH = 1;

/** How far the digit's baseline sits below its ring's center — half the cap height of a
 * STRING_NUMBER_FONT_SIZE digit, which has no descender to allow for. */
export const STRING_NUMBER_DIGIT_RISE = 4;

/** Air between two stacked <technical> marks in one note's column. */
export const TECHNICAL_ROW_GAP = 4;

/** Air between the column's first mark and whatever it clears — the stave's near line, or a
 * note reaching past it. Wider than the gap between rows: a digit sitting that close to a
 * notehead reads as part of the note, whereas the rows above it read as one column. */
export const TECHNICAL_EDGE_GAP = 9;

/** Extra room between the brackets of NESTED tuplets, on top of vexflow's own 15px
 * Tuplet.NESTING_OFFSET. Its step is shorter than the numeral it centers on each bracket
 * line, so without this an outer "3" and an inner "5" print through each other. */
export const TUPLET_NESTING_EXTRA_GAP = 10;

/** Rehearsal-mark (section header, e.g. "A" or "Chorus") text size — bigger and bolder than
 * the other above-stave annotations, since it's the label a player navigates the chart by. */
export const REHEARSAL_FONT_SIZE = 14;

/** Air between a rehearsal mark's text and its enclosing box. */
export const REHEARSAL_PADDING = 4;

/** How far the bottom of a rehearsal mark's box sits above the top staff line. */
export const REHEARSAL_Y_OFFSET = 8;

/** Clearance kept between a rehearsal mark's box and anything it lifts clear of. Matched to
 * REHEARSAL_Y_OFFSET so a lifted mark keeps the same air over a notehead that an uncollided
 * one keeps over the top staff line. */
export const REHEARSAL_NOTE_CLEARANCE = REHEARSAL_Y_OFFSET;

/** Clearance kept between the bottom of a metronome mark's ink and whatever it lifts clear
 * of. A note obstacle is a thin box at the notehead's center (vexflow reports notehead
 * positions, not glyph extents), so this has to cover half a notehead plus the air. */
export const TEMPO_NOTE_CLEARANCE = 10;

/** Uniform scale applied to the metronome mark — vexflow's StaveTempo defaults
 * (14pt text, 25pt note glyph) render oversized, so shrink it. */
export const TEMPO_SCALE = 0.7;

/** Air between a "note = bpm" mark and a note-group metric modulation printed beside it.
 * Wider than the 3px StaveTempo puts between its own pieces, so the two read as two
 * statements rather than one long equation. Pre-scale, like everything else in the mark. */
export const TEMPO_MARK_GAP = 12;

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

/** Arc height grows with slur width so long slurs get a rounder bow. Kept small: a
 * long slur is drawn FLAT, not as a deep dome — the bow over a whole measure should
 * still read as roughly two staff spaces deep, not four. */
export const SLUR_WIDTH_FACTOR = 0.03;

/** How much of each end of a slur's span is exempt from setting the bow's DEPTH, as a
 * fraction of its width. The bow is pinned to its endpoints, so buying clearance for a
 * note lying under one of them means doming the whole arc far past what the rest of the
 * span needs. Such a note is cleared by lifting the endpoints instead (see shapeFor). */
export const SLUR_END_ZONE = 0.15;

/** Ceiling on how far past its base lift a slur will stand off its chord to clear
 * things, as a fraction of its width — covering both knobs shapeFor has, the bow's depth
 * and the endpoint lift. A span can hold obstacles no slur can get over (a second voice,
 * the stem of a run beamed into the other hand); past this the slur stops trying and
 * stays a slur rather than deforming into a spike or floating off its own noteheads. */
export const SLUR_MAX_ASPECT = 0.25;

/** How much height difference a slur will accept between its two ends to anchor them on
 * the stem tips rather than the noteheads, as a fraction of its width. Stem tips are the
 * right anchors when a stem (or the beam it runs into) sits between the notehead and the
 * bow — otherwise the curve leaves its notehead by cutting straight through the beam. But
 * an end on a stem tip and an end on a notehead can be most of a stave apart, which over
 * a short span draws a near-vertical whip rather than a bow. A long span carries the same
 * drop as a gentle slant, so the test is against the width, not an absolute height. */
export const SLUR_STEM_TIP_SLANT = 0.5;

/** A grace-to-main curve (an explicit slur or a hammer-on/pull-off) is drawn as a
 * small tight bow hugging directly under the two noteheads, not the fuller slur arc —
 * a subtler endpoint lift, a shallow control-point rise, and a tighter clearance
 * margin. CP_Y is a floor, not a fixed rise: when the two noteheads sit far apart
 * (a grace into a wide chord) the arc still inflates enough to stay concave and clear
 * of what it spans, instead of flattening into a straight diagonal across them. */
export const SLUR_GRACE_Y_SHIFT = 4;
export const SLUR_GRACE_CP_Y = 6;
export const SLUR_GRACE_MARGIN = 5;

/** Which point on a note a grace curve starts and stops at. vexflow's own Curve can
 * only name two spots per note and neither is reliably the right one on a chord, so
 * vexml resolves the Y itself (see HeadCurve) and this picks which one. Change this
 * one value to re-aim every grace curve in the score:
 *
 * - 'stem-base': the far end of the stem — below a stem-down note, above a stem-up one.
 *   On a stem-down chord this is the stem's bottom tip, past every notehead.
 * - 'notehead': the bulge-side notehead itself, ignoring the stem. Tighter, but on a
 *   stem-down chord it stops well short of where the stem ends.
 *
 * Both read the bulge side, so an above-bulging curve mirrors each rule upward. */
export const SLUR_GRACE_ANCHOR: 'stem-base' | 'notehead' = 'stem-base';

/** Guards float drift when comparing dyadic beat positions. */
export const EPSILON = 1e-6;

/** Accidental glyphs in a chord symbol; pulled tight against their root letter. */
export const HARMONY_ACCIDENTALS = new Set(['♯', '♭', '♮']);

/** How far a chord-symbol accidental is kerned in toward its root letter on each side. */
export const HARMONY_ACCIDENTAL_KERN = 2.5;

/** Chord-symbol accidental font size — a touch smaller than the root letter. */
export const HARMONY_ACCIDENTAL_FONT_SIZE = HARMONY_FONT_SIZE - 3;

/** vexflow's GraceNoteGroup.format spaces a stave grace group this many px off its note; tab
 * groups get 0. The value is private to vexflow, mirrored here. */
export const GRACE_GROUP_SPACING_STAVE = 4;

/** Half-heights/half-widths (CSS px) for the note/fret hit-index boxes. A notehead's x-span is
 * measured exactly (getNoteHeadBeginX/EndX); its height and the fret box are approximated to ~one
 * notehead — enough to pick a target and draw a centered color/halo. */
export const NOTEHEAD_HALF_H = 5;
export const FRET_HALF_W = 6;
export const FRET_HALF_H = 7;

/** Constant duration of a self-driven smooth scroll, regardless of distance. We tween the scroll
 * box ourselves (native smooth scroll's duration is UA-defined and varies with distance) so every
 * scroll takes the same time. ponytail: tune to taste. */
export const SCROLL_DURATION_MS = 200;

/** Above this scroll speed (px of travel per ms, i.e. distance / SCROLL_DURATION_MS), the tween
 * would fling too fast to read, so we snap instantly instead. At 350ms this snaps travels beyond
 * ~1050px. ponytail: tune to taste. */
export const MAX_SCROLL_SPEED_PX_PER_MS = 3;

/** Tween step interval (~60fps). setTimeout, not requestAnimationFrame — rAF isn't available in the
 * bun unit-test runtime, and performance.now() keeps the tween's timing accurate despite setTimeout
 * jitter. */
export const SCROLL_FRAME_MS = 16;

/** Breathing room left above a rect scrolled to the top of the viewport, so it isn't pinned flush. */
export const SCROLL_TOP_PADDING_PX = 16;

/** How long the scroll box must go without a resize before the ScrollController resumes scrolling.
 * A resize arrives as a burst of ResizeObserver callbacks; scrolling mid-burst targets stale
 * geometry, so we suspend and only resume once the size holds still this long. */
export const RESIZE_SETTLE_MS = 150;

/** How far a note's activity halo extends past the notehead's half-extent, so the note sits evenly
 * inside the circle. */
export const HALO_MARGIN = 8;

/** Default color of the built-in cursor bar. */
export const CURSOR_COLOR = '#2563eb';

/** Default width (px) of the built-in cursor bar. */
export const CURSOR_WIDTH_PX = 2;

/** Finite sentinel for half-open collision probe rects (avoids Infinity arithmetic producing NaN). */
export const FAR = 1e6;

/** Playback bar width: the bar is a thin line the view thickens; a nonzero width keeps it a valid,
 * hit-testable box. */
export const BAR_WIDTH = 1;

/** Default guitar string tuning (low to high) for a chord diagram with no explicit tuning. */
export const DEFAULT_TUNING = ['E', 'A', 'D', 'G', 'B', 'E'];

/** How far a volta (ending) bracket's horizontal line sits above the top staff line —
 * roughly three staff spaces, enough to clear a note a couple of ledger lines up. */
export const VOLTA_STAVE_GAP = 34;

/** Which of vexflow's above/below-stave text lines a <bracket>/<dashes> span rides on. Line 1
 * is where the ottava brackets sit, so these take the next one out and stay clear of them. */
export const DIRECTION_LINE_TEXT_LINE = 2;

/** Where an ottava bracket (<octave-shift>) starts out, matching TextBracket's own default
 * line. It only ever moves further out from there — see DrawPass.clearOctaveBracket. */
export const OTTAVA_TEXT_LINE = 1;

/** Length (px) of the vertical hook a <bracket>'s `line-end` terminates in. */
export const DIRECTION_LINE_HOOK = 8;

/** Inset (px) of a consolidated multi-bar rest's thick horizontal bar from each edge of its
 * measure, so the bar reads as sitting inside the measure rather than touching its barlines. */
export const MULTI_REST_PADDING = 12;

/** Width (px) floor for a measure holding a consolidated multi-bar rest. Its one whole rest
 * would otherwise size it like any empty bar, and the bar plus its count needs room to read as
 * a multirest rather than as a stray thick line. */
export const MULTI_REST_MIN_WIDTH = 110;

/** How far a volta bracket (its line plus the label hanging below it) clears the highest
 * glyph under it — a notehead, a stem tip, a slur bow — when a measure reaches past
 * VOLTA_STAVE_GAP and the bracket has to be lifted off its default height. */
export const VOLTA_NOTE_CLEARANCE = 12;

/** How tall a volta bracket's obstacle box is: vexflow draws the "1." label hanging below
 * the bracket line, so the box has to reach past the text for above-stave annotations to
 * lift clear of the whole thing rather than just the line. */
export const VOLTA_LABEL_DROP = 20;
