import type { LoupeOptions } from './loupe.js';
/** The most device px² any one canvas vexml makes may hold. Size a canvas, or a budget of
 * canvases, so its bitmap area stays at or under this. */
export declare const MAX_CANVAS_AREA: number;
/** How many device px² of tiles one surface (the engraving, or a content layer) may keep
 * painted at once. */
export declare const TILE_BUDGET: number;
/** A tile's side in CSS px. */
export declare const TILE_SIZE = 512;
/** Default standard-layout width. */
export declare const DEFAULT_WIDTH = 900;
/** Default stem stroke width (px) when the document declares no `<appearance>` stem width. */
export declare const DEFAULT_STEM_WIDTH = 1.2;
export declare const DEFAULT_BEAM_WIDTH = 5;
/** Default notation stave-line thickness (px) when the document declares no `<appearance>` staff width. */
export declare const DEFAULT_STAFF_LINE_WIDTH = 1.3;
/** Left/right page margin. Leaves room for the brace/bracket drawn left of the stave. */
export declare const PAGE_MARGIN_X = 15;
/** Room a sticky panoramic fold leaves after its widest key signature before its edge. */
export declare const FOLD_PADDING = 6;
/** How far the shadow a sticky panoramic fold casts reaches over the music beside it. */
export declare const FOLD_SHADOW_WIDTH = 14;
/** Top margin: the first system's y. */
export declare const PAGE_MARGIN_TOP = 40;
/** Top margin when the first measure carries a metronome mark (extra headroom so the
 * mark can lift clear of a high first note). */
export declare const PAGE_MARGIN_TOP_WITH_TEMPO = 70;
/** Bottom whitespace kept below the lowest drawn content. */
export declare const PAGE_MARGIN_BOTTOM = 40;
/** Stave bottom-text line a pedal mark draws on. */
export declare const PEDAL_BOTTOM_TEXT_LINE = 3;
export declare const PEDAL_BOTTOM_MARGIN = 12;
/** How far a pedal mark's ink rises above its baseline. */
export declare const PEDAL_INK_RISE = 24;
/** Vertical gap between stacked systems, plus room for the next system's notes that
 * rise above its top staff. The default for `Config.systemSpacing`. */
export declare const SYSTEM_GAP = 30;
/** The smallest vertical gap between staves within one part; the music can open it further. */
export declare const INTRA_PART_SPACING = 100;
/** Vertical gap between adjacent parts. */
export declare const INTER_PART_SPACING = 80;
/** Minimum air between one stave's music and the next stave's. */
export declare const STAVE_CLEARANCE = 12;
/** Width (px) of one column when measuring how far notes spill past a stave. */
export declare const SPILL_COLUMN = 8;
/** Absolute floor for a measure's note area. */
export declare const BASE_VOICE_WIDTH = 80;
/** Reference note value for the logarithmic spacing curve: VexFlow ticks in a quarter
 * note (RESOLUTION / 4). A quarter note gets exactly one `noteSpacing` of width. */
export declare const QUARTER_NOTE_TICKS = 4096;
/** Extra note width per doubling of duration, as a fraction of `noteSpacing`. */
export declare const LOG_SPACING_RATIO = 0.17;
/** Floor on the curve's per-note multiplier, so very short notes (32nds and below) keep
 * a sane share before the collision-free minimum takes over. */
export declare const MIN_LOG_FACTOR = 0.4;
/** Estimated width (px) of the lead glyphs of a continuation measure, which carries only a barline. */
export declare const LEAD_BARLINE = 12;
/** Lead glyph width for a clef, re-stated at every system start. */
export declare const LEAD_CLEF = 32;
/** Lead glyph width for a mid-system clef CHANGE, which draws at vexflow's smaller
 * "change clef" size rather than the full system-start size. */
export declare const LEAD_CLEF_CHANGE = 24;
/** Lead glyph width for a key signature, when present. */
export declare const LEAD_KEY = 40;
/** Lead glyph width for a time signature, printed once at the piece start. */
export declare const LEAD_TIME = 32;
/** Extra lead width for an opening forward repeat barline (`||:`) beyond a plain barline. */
export declare const LEAD_REPEAT_BEGIN = 16;
/** Horizontal gap (px) between a right-aligned part label and its stave. */
export declare const LABEL_GAP = 28;
/** Estimated label width per char for 13px Arial, for sizing a part label where there is
 * nothing to measure it with. */
export declare const LABEL_CHAR_WIDTH = 7.5;
/** Score header font sizes: the title, each subtitle, and the lyricist/composer lines. */
export declare const HEADER_TITLE_SIZE = 24;
export declare const HEADER_SUBTITLE_SIZE = 15;
export declare const HEADER_CREDIT_SIZE = 13;
export declare const HEADER_SYMBOL_SIZE = 30;
export declare const HEADER_FOOTER_SIZE = 10;
/** Gap between the last system's content and the copyright footer under it. */
export declare const FOOTER_GAP = 16;
/** Gap between the score header's last line and the first system's highest ink. */
export declare const HEADER_GAP = 20;
/** Part label font size. */
export declare const LABEL_FONT_SIZE = 13;
/** Default gap-measure label font size (overridable per gap via GapStyle.fontSize).
 * Shared by layout (width estimate) and draw (drawn size) so they agree. */
export declare const GAP_LABEL_FONT_SIZE = 16;
/** Minimum width per tab note. Floors each note's share so dense tab measures still
 * breathe past vexflow's cramped fret-digit packing. */
export declare const TAB_MIN_NOTE_SPACING = 32;
/** Minimum width, in px, a measure gives each outermost tuplet group in a voice, so runs of
 * triplet brackets and their numerals do not touch. */
export declare const TUPLET_MIN_GROUP_WIDTH = 64;
/** VexFlow's default distance between staff lines, in pixels. */
export declare const STAVE_LINE_DISTANCE = 10;
/** Space between tablature string lines, in px. Wider than a notation staff's 10px so stacked
 * fret digits and inner-string hammer-on arcs have vertical breathing room. */
export declare const TAB_LINE_DISTANCE = 15;
/** Bump tab fret digits bolder/larger than vexflow's default (1.022 * 11pt ≈ 15px). */
export declare const TAB_FRET_SCALE = 1.022;
/** Lead clearance (px) before a notation grace cluster. */
export declare const GRACE_SPACING = 16;
/** Grace tab frets, as a fraction of the main-note fret size (~80%). */
export declare const TAB_GRACE_SCALE = 0.8;
/** Padding added to a tab grace group's width (vexflow's groupSpacingTab is 0). */
export declare const TAB_GRACE_SPACING = 14;
/** How high a tab hammer-on/pull-off arc sits above its fret digits. */
export declare const TAB_CURVE_Y_SHIFT = 12;
export declare const TAB_CURVE_CP_Y = 12;
/** How far a full-height tab arc bows above the fret digits it springs from. */
export declare const TAB_CURVE_RISE: number;
/** How wide a tab arc must be to reach full height. */
export declare const TAB_CURVE_FULL_WIDTH = 28;
/** Gap (px) a tab arc on an inner string keeps below the string line above it, so it stays
 * visibly attached to its own fret digits instead of bowing into the string above's. */
export declare const TAB_CURVE_LINE_CLEARANCE = 2;
/** Smallest vertical rise/fall (SLIDE_MIN_SLANT) and end inset (SLIDE_PADDING), in px, of a notation slide line. */
export declare const SLIDE_MIN_SLANT = 6;
export declare const SLIDE_PADDING = 3;
/** Length and rise (px) of the short tick drawn for a slide with no partner note. */
export declare const SINGLE_SLIDE_LEN = 10;
export declare const SINGLE_SLIDE_RISE = 7;
/** Extra gap (past SLIDE_PADDING) between a note glyph and the head-touching end of a
 * single-note slide tick. A bare tab fret digit needs more air than a notehead, so the tab
 * ticks and the notation slide-out (which reads cramped against the head) widen the gap by this. */
export declare const SINGLE_SLIDE_GAP = 5;
/** Pixels a notation+tab bracket is shifted left of the stave, so it sits just outside
 * the system's left line with a small gap. */
export declare const BRACKET_X_SHIFT = 3;
/** Horizontal step between nested <part-group> connectors, so an outer group's symbol
 * clears the inner one's glyph rather than printing over it. Wider than BRACKET_X_SHIFT
 * (a mere gap) because a bracket's curls have real width. */
export declare const PART_GROUP_STEP = 10;
/** How far a bracket's bar and curl glyphs reach left of the (already shifted) stave x.
 * Reserve it so a system-start measure box grows to contain the bracket instead of
 * clipping it. */
export declare const BRACKET_GLYPH_OVERHANG = 8;
/** How far a bracket's curls overhang past the top/bottom staff lines (px). */
export declare const CONNECTOR_VERTICAL_OVERHANG = 10;
/** How far a brace reaches left of the stave x (px). */
export declare const BRACE_LEFT_OVERHANG = 14;
/** Chord-symbol (from `<harmony>`) text size, a touch smaller than the part label so it
 * reads as an annotation above the notes. */
export declare const HARMONY_FONT_SIZE = 13;
/** How far a chord symbol's baseline sits above the top staff line. */
export declare const HARMONY_Y_OFFSET = 14;
/** Clearance kept between a chord symbol's baseline and the top of a high note it
 * sits over, so the symbol lifts clear instead of colliding with the notehead. */
export declare const HARMONY_NOTE_CLEARANCE = 8;
/** Extra clearance below a chord symbol, so it lifts off a note under it. */
export declare const HARMONY_PADDING = 15;
/** How far a tie arches above its note. */
export declare const TIE_APEX_RISE = 13;
/** Width and height (px) of a chord diagram drawn above the stave. */
export declare const CHORD_DIAGRAM_WIDTH = 88;
export declare const CHORD_DIAGRAM_HEIGHT = 84;
/** Gap kept between the bottom of a chord diagram and the top staff line. */
export declare const CHORD_DIAGRAM_GAP = 6;
/** Padding added below a chord diagram's collision box (which sits CHORD_DIAGRAM_GAP above
 * the top staff line), so the box rises off a note in the top stave space instead of
 * overlapping it. */
export declare const CHORD_DIAGRAM_PADDING = 15;
/** Words-direction (e.g. "ritardando") text size; it matches the chord-symbol size so
 * both read as annotations above the notes. */
export declare const WORDS_FONT_SIZE = 13;
/** Default text size for tempo indications (`<words>` paired with `<sound tempo>` or
 * `<metronome>`), larger than ordinary text so tempo headings stand out (Behind Bars p. 182). */
export declare const TEMPO_WORDS_FONT_SIZE = 16;
/** How far a words-direction baseline sits above the top staff line. */
export declare const WORDS_Y_OFFSET = 14;
/** Estimated px per character of a words directive, for reserving room where text can't be measured. */
export declare const WORDS_CHAR_WIDTH = 8.5;
/** Clearance kept between a words-direction baseline and the top of a high note it sits over. */
export declare const WORDS_NOTE_CLEARANCE = 14;
/** Dynamics-marking glyph size. */
export declare const DYNAMICS_FONT_SIZE = 24;
/** Percussion pictogram glyph size. SMuFL draws a pictogram about two staff spaces tall at
 * the stave's own em, which reads as an instrument picture without crowding the line. */
export declare const PICTOGRAM_FONT_SIZE = 30;
/** An accordion registration circle's diameter: two staff spaces, the size SMuFL draws its
 * register glyphs at, so three middle dots still read as three. */
export declare const ACCORDION_REGISTRATION_SIZE = 20;
/** Segno/coda glyph size. Sized like a dynamics marking rather than like text: both are
 * SMuFL glyphs, and a navigation sign is a landmark a player finds while sight-reading, so
 * it wants to be at least as visible as an "mf". */
export declare const NAVIGATION_FONT_SIZE = 24;
/** Barline fermata glyph size: the notation font's own size, so it matches a note's fermata. */
export declare const BARLINE_FERMATA_FONT_SIZE = 30;
/** Height (px) of a barline fermata's ink. */
export declare const BARLINE_FERMATA_INK_HEIGHT = 12;
/** Air a segno/coda keeps beside other above-stave text. A sign sharing a baseline with
 * text it only abuts reads as part of it: "D.S. al Coda" ending on the barline runs straight
 * into the coda that opens the next bar. So text within this distance of the sign's side
 * lifts the sign above it, the way MuseScore stacks the two. */
export declare const NAVIGATION_TEXT_GAP = 4;
/** How tall a crescendo/diminuendo hairpin's open mouth is. */
export declare const HAIRPIN_HEIGHT = 10;
/** Fraction of a hairpin's mouth height kept open at the broken end of a system wrap
 * (the left of a continuing crescendo, the right of a continuing diminuendo). */
export declare const HAIRPIN_BREAK_OPEN_RATIO = 0.4;
/** Horizontal air between a crescendo and the diminuendo immediately following it. */
export declare const HAIRPIN_CHAIN_GAP = 4;
/** Air between a dynamic and the hairpin that starts past it. */
export declare const HAIRPIN_DYNAMIC_GAP = 3;
/** Furthest a downbeat note may sit past its barline (in staff spaces) for an incoming
 * crescendo resolving into a dynamic there to stop at the barline instead of crossing it. */
export declare const HAIRPIN_BARLINE_STOP_MAX_SPACES = 3;
/** Radius of the circle at a niente hairpin's point. */
export declare const HAIRPIN_NIENTE_RADIUS = 3;
/** Gap between a hairpin's near edge and the staff line it sits off, matched to the air a
 * words directive keeps, so a wedge and a directive on the same side read as one band. */
export declare const HAIRPIN_STAVE_GAP = 14;
/** Lyric-syllable text size. A notch under the other typeset annotations (a chord symbol or
 * words directive is a heading and prints larger), which is also what a syllable can afford:
 * a verse sets one syllable per note, so its text (not the notes) decides how wide a sung
 * measure has to be, and every point of type here costs horizontal room on every line the
 * voice sings. */
export declare const LYRIC_FONT_SIZE = 11;
/** Air a lyric syllable claims either side of its text, so adjacent syllables stay separate. */
export declare const LYRIC_PADDING = 3;
/** How far a lyric row's baseline sits below the bottom staff line. */
export declare const LYRIC_Y_OFFSET = 18;
/** Clearance kept between a lyric row's baseline and the bottom of a note hanging below the stave. */
export declare const LYRIC_NOTE_CLEARANCE = 26;
/** Vertical pitch between stacked verses: each extra verse drops one row further below
 * the stave. Roomy enough that a descender ("g", "y") clears the row under it. */
export declare const LYRIC_LINE_HEIGHT: number;
/** <technical><fingering>/<pluck> label size. Smaller than the other annotations: a
 * fingering is a performance hint read off the notehead it labels, not a heading, and a
 * chord's worth of them stacks into a column that has to stay compact. */
export declare const FINGERING_FONT_SIZE = 11;
/** <technical><string> indicator: the digit's size, the radius of the ring drawn around it,
 * and that ring's stroke width. */
export declare const STRING_NUMBER_FONT_SIZE = 11;
export declare const STRING_NUMBER_RADIUS = 7;
export declare const STRING_NUMBER_RING_WIDTH = 1;
/** Vertical offset of a string-number digit inside its ring. */
export declare const STRING_NUMBER_DIGIT_RISE = 4;
/** Air between two stacked <technical> marks in one note's column. */
export declare const TECHNICAL_ROW_GAP = 4;
/** Air between the column's first mark and whatever it clears: the stave's near line, or a
 * note reaching past it. Wider than the gap between rows: a digit sitting that close to a
 * notehead reads as part of the note, whereas the rows above it read as one column. */
export declare const TECHNICAL_EDGE_GAP = 9;
/** Extra room between the brackets of nested tuplets, on top of vexflow's own spacing. */
export declare const TUPLET_NESTING_EXTRA_GAP = 10;
/** Half the height (px) of a tuplet numeral's band around its bracket line. */
export declare const TUPLET_NUMERAL_HALF_HEIGHT = 8;
/** Minimum vertical air (px) a longer tuplet bracket keeps outside a shorter or intersecting slur on the same side. */
export declare const TUPLET_SLUR_GAP = 4;
/** Rehearsal-mark (section header, e.g. "A" or "Chorus") text size, bigger and bolder than
 * the other above-stave annotations, since it's the label a player navigates the chart by. */
export declare const REHEARSAL_FONT_SIZE = 14;
/** Air between a rehearsal mark's text and its enclosing box. */
export declare const REHEARSAL_PADDING = 4;
/** Air between a words direction or dynamic and the enclosure its document draws around
 * it: a little tighter than a rehearsal mark's, as the text is smaller. */
export declare const ENCLOSURE_PADDING = 3;
/** Where enclosed text stands in its font-size box, as a share of the box's height from its
 * top: the ink of a font sits in the box's lower part, so standing on the box's bottom it
 * reads as low inside its shape. */
export declare const ENCLOSED_BASELINE = 0.85;
/** How far a text's first underline sits under its baseline. */
export declare const UNDERLINE_OFFSET = 2;
/** The step between a text's underlines when it has more than one. */
export declare const UNDERLINE_GAP = 2;
/** How far the bottom of a rehearsal mark's box sits above the top staff line. */
export declare const REHEARSAL_Y_OFFSET = 8;
/** Clearance kept between a rehearsal mark's box and anything it lifts clear of. Matched to
 * REHEARSAL_Y_OFFSET so a lifted mark keeps the same air over a notehead that an uncollided
 * one keeps over the top staff line. */
export declare const REHEARSAL_NOTE_CLEARANCE = 8;
/** Clearance kept between the bottom of a metronome mark's ink and whatever it lifts clear
 * of. */
export declare const TEMPO_NOTE_CLEARANCE = 10;
/** Uniform scale applied to the metronome mark. */
export declare const TEMPO_SCALE = 0.7;
/** Air between a "note = bpm" mark and a metric modulation printed beside it. */
export declare const TEMPO_MARK_GAP = 12;
/** Horizontal gap (px) between a tempo word and a following inline metronome mark in the
 * same `<direction>` (e.g. `Tempo I (quarter = 72)`). */
export declare const TEMPO_WORD_METRONOME_GAP = 6;
/** bpm a metronome directive falls back to when it carries no number. */
export declare const DEFAULT_TEMPO_BPM = 120;
/** Extra room (px) per system for content below the stave, such as deep ledger lines. */
export declare const LEDGER_HEADROOM = 300;
/** Raises a slur's endpoints off the notes. */
export declare const SLUR_Y_SHIFT = 10;
/** Minimum vertical clearance (px) an open system-break slur end keeps outside the closing barline. */
export declare const SLUR_BARLINE_GAP = 4;
/** How much further a slur end lifts to clear a tie on its own note (px). */
export declare const SLUR_TIE_GAP = 7;
/** How much further an outer nested slur's shared endpoint lifts past an inner slur's endpoint (px). */
export declare const SLUR_NESTED_END_GAP = 4;
/** Minimum vertical air an outer nested slur keeps outside an inner slur's arc (px). */
export declare const SLUR_NESTED_GAP = 3;
/** How much further a longer slur's endpoint lifts past a shorter same-side tuplet bracket (px). */
export declare const SLUR_TUPLET_END_GAP = 4;
/** Minimum vertical air a longer slur keeps outside a shorter same-side tuplet bracket and numeral (px). */
export declare const SLUR_TUPLET_GAP = 4;
/** Extra clearance the arc keeps above/below the most extreme note it spans. */
export declare const SLUR_MARGIN = 14;
/** The gap a slur keeps off an accidental it passes: only one it would cross lifts it. */
export declare const SLUR_ACCIDENTAL_GAP = 2;
/** Minimum vertical air a slur arc keeps outside a mid-phrase fermata on its bulge side (Behind Bars p. 189). */
export declare const SLUR_FERMATA_GAP = 6;
/** The air a slur end keeps past an articulation on its own note (a staccato it starts or
 * ends over), in px. Tighter than SLUR_MARGIN: the end is meant to read as attached to the
 * note, just clear of the mark. */
export declare const SLUR_MARK_GAP = 3;
/** Depth of a slur's bow, in px, which grows with the slur's width up to SLUR_BOW_MAX. */
export declare const SLUR_BOW_MIN = 9.1;
export declare const SLUR_BOW_FLAT_WIDTH = 51;
export declare const SLUR_BOW_GROWTH = 0.12;
export declare const SLUR_BOW_MAX = 14.5;
/** The most a slur narrower than SLUR_BOW_FLAT_WIDTH bows, as a fraction of its width, so a
 * tight one doesn't draw as a spike. */
export declare const SLUR_BOW_ASPECT = 0.22;
/** Where a slur's control points sit, as a fraction of its width from each end. */
export declare const SLUR_SHOULDER = 0.16;
/** The tallest a slur's arch may grow, whatever its width. */
export declare const SLUR_MAX_CP_Y = 64;
/** Closest to its ends a long slur may pull its control points, as a fraction of its width. */
export declare const SLUR_MIN_SHOULDER = 0.05;
/** Fraction of a slur's width at each end that does not set the bow's depth. */
export declare const SLUR_END_ZONE = 0.15;
/** The most a slur may lift off its notes to clear obstacles, as a fraction of its width. */
export declare const SLUR_MAX_ASPECT = 0.25;
/** How much height difference a slur will accept between its two ends to anchor them on
 * the stem tips rather than the noteheads, as a fraction of its width. */
export declare const SLUR_STEM_TIP_SLANT = 0.5;
/** Endpoint lift, control-point rise and clearance margin (px) of a grace-to-main curve, a small tight bow under the two noteheads. */
export declare const SLUR_GRACE_Y_SHIFT = 4;
export declare const SLUR_GRACE_CP_Y = 6;
export declare const SLUR_GRACE_MARGIN = 5;
/** A cross-stave slur whose run across is under this fraction of its rise is too steep to
 * read as a bow: it ends on a ghost note instead, on its start's stave under the stop. */
export declare const SLUR_GHOST_STEEPNESS: number;
/** How far, in px, a cross-stave bow may still run into a note it passes before it counts as
 * blocked. */
export declare const SLUR_GHOST_OVERLAP = 4;
/** A cross-stave slur over more of its own voices' notes than this joins a phrase, and keeps
 * its real end however it has to bend. */
export declare const SLUR_GHOST_MAX_BETWEEN = 2;
/** How far across its notehead, from the left, a grace curve starts. */
export declare const GRACE_START = 0.35;
/** Horizontal clearance (px) a below grace slur keeps left of a down-stem target note so the tip does not touch the stem. */
export declare const GRACE_END_STEM_GAP = 4;
/** Guards float drift when comparing dyadic beat positions. */
export declare const EPSILON = 0.000001;
/** Accidental glyphs in a chord symbol; pulled tight against their root letter. */
export declare const HARMONY_ACCIDENTALS: Set<string>;
/** How far a chord-symbol accidental is kerned in toward its root letter on each side. */
export declare const HARMONY_ACCIDENTAL_KERN = 2.5;
/** Chord-symbol accidental font size, a touch smaller than the root letter. */
export declare const HARMONY_ACCIDENTAL_FONT_SIZE: number;
/** Font size of the degrees a chord symbol stacks (`<kind stack-degrees="yes">`), small
 * enough that two rows stand about as tall as the root letter beside them. */
export declare const HARMONY_STACK_FONT_SIZE = 9;
/** Baseline-to-baseline step between a chord symbol's stacked degrees. */
export declare const HARMONY_STACK_LINE = 10;
/** How many px a stave grace group sits off its note; tab groups get 0. */
export declare const GRACE_GROUP_SPACING_STAVE = 4;
/** Half-size (CSS px) of the boxes that pick a note or fret under a pointer. */
export declare const NOTEHEAD_HALF_H = 5;
export declare const FRET_HALF_W = 6;
export declare const FRET_HALF_H = 7;
/** How long every smooth scroll takes, regardless of distance. */
export declare const SCROLL_DURATION_MS = 200;
/** Scroll speed (px/ms) above which a scroll jumps instead of animating. */
export declare const MAX_SCROLL_SPEED_PX_PER_MS = 3;
/** How often (ms) a smooth scroll advances. */
export declare const SCROLL_FRAME_MS = 16;
/** Breathing room left above a rect scrolled to the top of the viewport, so it isn't pinned flush. */
export declare const SCROLL_TOP_PADDING_PX = 16;
/** Breathing room left beside a rect scrolled to the near or far edge of the viewport, so it isn't
 * pinned flush against it. */
export declare const SCROLL_SIDE_PADDING_PX = 16;
/** How long the scroll box must go without a resize before the ScrollController resumes
 * scrolling. */
export declare const RESIZE_SETTLE_MS = 150;
/** How far a note's activity halo extends past the notehead's half-extent, so the note sits evenly
 * inside the circle. */
export declare const HALO_MARGIN = 8;
/** Default color of the built-in cursor bar. */
export declare const CURSOR_COLOR = "#2563eb";
/** Default width (px) of the built-in cursor bar. */
export declare const CURSOR_WIDTH_PX = 2;
/** Default loupe (CSS px): wide and tall enough to show the music around a thumb, not just the
 * beat under it. */
export declare const LOUPE_OPTIONS: Required<LoupeOptions>;
/** How long a loupe takes to grow out of its anchor when shown, and to shrink back into it when
 * hidden (ms), and the scale it grows from. Short, like the platform magnifiers: it says where the
 * loupe came from without delaying the drag it serves. */
export declare const LOUPE_ENTER_MS = 150;
export declare const LOUPE_EXIT_MS = 100;
export declare const LOUPE_MIN_SCALE = 0.5;
/** The far edge of a half-open collision probe rect. */
export declare const FAR = 1000000;
/** Playback bar width (px). */
export declare const BAR_WIDTH = 1;
/** Default guitar string tuning (low to high) for a chord diagram with no explicit tuning. */
export declare const DEFAULT_TUNING: string[];
/** How far a volta (ending) bracket's horizontal line sits above the top staff line:
 * roughly three staff spaces, enough to clear a note a couple of ledger lines up. */
export declare const VOLTA_STAVE_GAP = 34;
/** Which of vexflow's above/below-stave text lines a <bracket>/<dashes> span rides on. */
export declare const DIRECTION_LINE_TEXT_LINE = 2;
/** Line above the stave an ottava bracket starts on. */
export declare const OTTAVA_TEXT_LINE = 1;
/** Length (px) of the vertical hook a <bracket>'s `line-end` terminates in. */
export declare const DIRECTION_LINE_HOOK = 8;
/** Horizontal air (px) between a word (e.g. "cresc.") and the <dashes> line that continues it. */
export declare const DIRECTION_LINE_WORD_GAP = 4;
/** Inset (px) of a consolidated multi-bar rest's thick horizontal bar from each edge of its
 * measure, so the bar reads as sitting inside the measure rather than touching its barlines. */
export declare const MULTI_REST_PADDING = 12;
/** Width (px) floor for a measure holding a consolidated multi-bar rest. Its one whole rest
 * would otherwise size it like any empty bar, and the bar plus its count needs room to read as
 * a multirest rather than as a stray thick line. */
export declare const MULTI_REST_MIN_WIDTH = 110;
/** How far a volta bracket (its line plus the label hanging below it) clears the highest
 * glyph under it (a notehead, a stem tip, a slur bow) when a measure reaches past
 * VOLTA_STAVE_GAP and the bracket has to be lifted off its default height. */
export declare const VOLTA_NOTE_CLEARANCE = 12;
/** Height (px) of a volta bracket's box for lifting annotations clear of it. */
export declare const VOLTA_LABEL_DROP = 20;
/** Accepts a CSS unicode-range string. */
export declare const UNICODE_RANGE: RegExp;
