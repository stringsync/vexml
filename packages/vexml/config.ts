import type { Measure } from '@stringsync/mdom';
import { DEFAULT_WIDTH, SYSTEM_GAP } from './constants';

/** Fully-resolved render configuration: every property is set. You pass a
 * `Partial<Config>` to `render`, which fills whatever you leave out from
 * `DEFAULT_CONFIG`. */
export type Config = {
	/** Font overrides. CSS custom properties on the container are the primary override API;
	 * use this for self-hosted or offline fonts. Each font's optional `color` recolors the ink
	 * drawn in it: `notation.color` the engraved glyphs (noteheads, stems, staves, clefs),
	 * `text.color` the words vexml types (part labels, measure numbers, chord symbols). */
	fonts: FontConfig;
	/** Device pixels per CSS pixel the score is painted at, or null for the screen's
	 * `window.devicePixelRatio` (default: null). Set it to print sharper than the screen, e.g. 2–3
	 * for pages exported with `Page.toBlob`; it costs canvas memory on screen too. */
	pixelRatio: number | null;
	/** CSS color painted on the container behind the score, or null for transparent
	 * (default: null). Pair with `fonts.notation.color`/`fonts.text.color` for a dark theme.
	 * Canvas layers added at negative z-index still draw over it. */
	backgroundColor: string | null;
	/** Non-musical measures in the score (default: none). Each occupies space on the page
	 * and a fixed ms of playback time. Use it for syncing notation to media where the music
	 * pauses (e.g. an instructor talking). See `GapPlacement` for naming them; the rendered
	 * score's measure indexes include the gaps (measure *numbers* skip them). A gap before
	 * the first measure or after the last is drawn as a box outside the staves: the system's
	 * bracket, clef and signatures open on the first measure, and the final barline closes
	 * the last. Gaps between measures sit on the staves. Retrieve their timing with
	 * `Score.getGaps()`. */
	gaps: Gap[];
	/** How measures are placed across systems (default: standard at 8.5in / 816px), and for
	 * a standard layout, how it resolves a document line that won't fit that width. */
	layout: Layout;
	/** *How much space the notes get* (not how it's divided): the px a quarter note gets,
	 * the base of a logarithmic spacing curve. A note gets a little more space per doubling
	 * of its duration and a little less per halving (see LOG_SPACING_RATIO), so a measure's
	 * width grows mostly with its note *count* and only weakly with note *value*; denser
	 * measures are wider, the way engravers space music. The spacing-density knob: bigger
	 * spreads every measure wider. */
	noteSpacing: number;
	/** *How the space notes get is divided* (not how much): vexflow's note-spacing curve.
	 * Given the width noteSpacing allots, higher exaggerates the long-vs-short note ratio. A
	 * shape constant, independent of overall density. */
	softmaxFactor: number;
	/** Vertical gap in px between stacked systems (default: SYSTEM_GAP). Smaller packs
	 * systems closer together down the page. */
	systemSpacing: number;
	/** Print each part's instrument name to the left of the first system (default: false). */
	showPartLabels: boolean;
	/** When to print measure numbers above the staff (default: 'system'). 'none' prints
	 * none; 'system' numbers the first measure of each system; 'every' numbers every
	 * measure; 'every-2'/'every-3' number every 2nd/3rd measure plus every system start. */
	measureNumbering: MeasureNumbering;
	/** Print the "sl." label on tablature slides (default: false). The slide line always
	 * draws; this only toggles the label above it. */
	showTabSlideText: boolean;
	/** Draw stems (and flags) on tablature notes (default: 'none'). 'none' gives the usual
	 * bare fret numbers; 'above' draws a rhythm stem above each fret, 'below' below it. Useful
	 * for a lone tab stave with no paired notation. Beams are not drawn; short notes get
	 * individual flags. */
	tabStemPlacement: TabStemPlacement;
	/** Render tablature staves (default: true). When false, every TAB stave is dropped: a
	 * notation+tab guitar part collapses to its notation staff alone (no bracket), and a
	 * tab-only part disappears entirely. Notation staves are unaffected. */
	showTabs: boolean;
	/** Render standard notation staves (default: true). When false, every notation stave is
	 * dropped: a notation+tab guitar part collapses to its TAB stave alone (no bracket), and a
	 * notation-only part disappears entirely. Tablature staves are unaffected. */
	showNotation: boolean;
	/** Fraction (0–1) of the reference width the last system's measures must already fill
	 * before it is justified to the page edge (default: 0.75). Below it the trailing line
	 * stays ragged at its natural width; at or above it the line stretches to fill, so a
	 * nearly-full last system snaps flush instead of leaving an awkward sliver of margin.
	 * 0 always stretches, 1 never does. */
	minLastSystemFill: number;
	/** Whether a score that fits on a single system always stretches to the reference width
	 * (default: true). When true a lone system is always justified to the page edge. When
	 * false it is treated like a trailing line and obeys minLastSystemFill: it stays ragged
	 * at its intrinsic width when its measures fill less than minLastSystemFill of the line,
	 * and only stretches once they reach that fraction. Useful so a short incipit or excerpt
	 * isn't blown up across the whole page. No effect on multi-system scores. */
	stretchSingleSystem: boolean;
	/** Fraction (0–1) of the reference width a system may fill before the breaker bumps
	 * the next measure to a new system (default: 0.9). Lower leaves more air; 1 packs each
	 * system to the edge. Only affects near-full systems: a line
	 * whose measures already sit below this fill breaks at the same place either way. */
	maxSystemFill: number;
	/** Fixed container height in px, or null for none (default: null). When set, vexml puts the score
	 * in a vertical scroll box at exactly this height. Meant for system-stacked (standard) layouts taller
	 * than the space you want them to take. Prefer maxHeight to cap only when the score overflows. */
	height: number | null;
	/** Max container height in px, or null for none (default: null). The score scrolls vertically once
	 * it exceeds this; shorter scores keep their natural height. */
	maxHeight: number | null;
	/** Fixed container width in px, or null for none (default: null). When set, vexml puts the score in
	 * a horizontal scroll box at this width. Meant for panoramic (single-row) layouts wider than the space
	 * available. Prefer maxWidth to cap only when the score overflows. */
	width: number | null;
	/** Max container width in px, or null for none (default: null). The score scrolls horizontally once
	 * it exceeds this; narrower scores keep their natural width. */
	maxWidth: number | null;
	/** An element you own that scrolls the score, or null to use the render container
	 * (default: null). Set it when you render into a box that sits inside your own scroller:
	 * a cursor's visibility test, `scrollIntoView()`/`follow()` and the Score's `scroll`
	 * event then measure and move this element instead of the (non-scrolling) container.
	 * It must be an ancestor of the container with `overflow: auto` or `scroll`. */
	scrollContainer: HTMLElement | null;
};

export interface FontOverride {
	family: string;
	/** woff2 URL, loaded with an injected @font-face. If omitted, the family is assumed
	 * already loaded (a system font or your own @font-face), except notation Bravura, which
	 * vexml then loads from its shipped `@stringsync/vexml/fonts/bravura.woff2`. Pass that
	 * file's bundled URL here to preload or cache it yourself. */
	url?: string;
	/** CSS color for glyphs drawn in this font; if omitted, the renderer's default is used. */
	color?: string;
}

export interface FontConfig {
	/** Engraving glyphs: noteheads, clefs, rests, accidentals. */
	notation?: FontOverride;
	/** Typeset words: part/instrument names, lyrics, titles, directions that vexml draws
	 * itself, plus the tablature text VexFlow types (fret numbers, "H"/"P", bend labels). */
	text?: FontOverride;
}

/** How a gap's overlay is drawn over its measure. */
export type GapStyle = {
	/** CSS font family for the label (default: the text font). */
	fontFamily?: string;
	/** Label font size in px (default: 16). */
	fontSize?: number;
	/** CSS color for the label (default: the text font color, i.e. black unless
	 * `fonts.text.color` is set). */
	fontColor?: string;
	/** CSS color painted over the gap's note area, e.g. to dim the staff lines
	 * (`'rgba(255, 255, 255, 0.8)'`). Omit for none. */
	fill?: string;
	/** CSS color of a 1px outline around that area (`'#e5e5e5'`). Omit for none. */
	border?: string;
};

/** A non-musical measure in the score: it occupies horizontal space and a fixed playback
 * duration (independent of tempo), for syncing notation to media where nothing is being
 * played. See `Config.gaps`. */
export type Gap = GapPlacement & {
	/** Playback time the gap occupies, in ms. Fixed: tempo marks don't affect it. */
	durationMs: number;
	/** Text printed centered in the gap (e.g. "What are pitches?"). Omit for a silent
	 * spacer. */
	label?: string;
	/** Minimum width in px of the gap's empty note area. The gap can stretch wider
	 * when its system justifies, like any measure (default: a typical empty-measure
	 * width, grown to fit the label). */
	minWidth?: number;
	style?: GapStyle;
};

/** Which measure is the gap. Rendering an `MDocument`, name a measure already in it
 * (typically one `insertGaps` returned). vexml never edits a caller's document. Rendering
 * MusicXML text or an .mxl Blob, give a `GapPosition` and vexml inserts the measure into
 * its own parse. */
export type GapPlacement =
	| (GapPosition & { measure?: never })
	| {
			/** The gap measure, in the document being rendered. Any part's measure names
			 * the whole column. */
			measure: Measure;
			beforeMeasureIndex?: never;
			beforeBarIndex?: never;
	  };

/** Where `insertGaps` puts a gap measure: exactly one of the two indexes, read against the
 * document before any gap of the same call is inserted, so gaps never shift each other. */
export type GapPosition =
	| {
			/** Measure index to insert before (0 inserts before the first measure; the
			 * measure count appends after the last), as the document is written. Inside a
			 * repeat, the gap plays on every pass. */
			beforeMeasureIndex: number;
			beforeBarIndex?: never;
	  }
	| {
			/** Playback bar index to insert before: measures counted as they play, with
			 * repeats and voltas unrolled (0 is before the first bar; the bar count appends
			 * after the last). A bar inside a repeat throws (a plain measure there would
			 * play on every pass), but a gap before a repeat's first bar, or after its last,
			 * is fine. */
			beforeBarIndex: number;
			beforeMeasureIndex?: never;
	  };

/** What gives when a system's music cannot fit the page at its collision-free minimum,
 * i.e. when the document's engraved line and the reference width disagree. The notes are
 * never squeezed into an unreadable line: one of the two has to lose, and this picks which.
 *
 * - `'wrap'` (the page wins): the line is broken where the document said not to, and every
 *   system fits the reference width. See the caveat on `Layout.overflow`.
 * - `'allow'` (the document wins): the system keeps its measures and spills past the
 *   reference width. The page's bounding box grows to cover the spill, so the score scales
 *   into its container instead of being clipped; systems that do fit still justify to the
 *   reference width, leaving the over-wide line sticking out to the right.
 * - `'widen'` (neither loses): the reference width itself grows until every system fits at
 *   its ideal spacing. The whole score is engraved wider and therefore renders smaller in a
 *   given container. */
export type SystemOverflow = 'wrap' | 'allow' | 'widen';

/** Wrap measures onto stacked systems (print-like). */
export type StandardLayout = {
	type: 'standard';
	/** Reference layout width in px (default: DEFAULT_WIDTH). The score is laid out
	 * to this width once; the result is then scaled to whatever container it's placed
	 * in, so resizing the container never re-flows or re-spaces it. */
	referenceWidth: number;
	/** Whether the document's own system breaks are honored (default: true). A
	 * `<print new-system="yes">`, or the first measure of a `new-page="yes"`, forces a break
	 * before its measure, and an explicit `<print new-system="no">` suppresses vexml's
	 * width-based wrap, squeezing the system to keep the measure on its engraved line (down to
	 * the width at which its notes would start to collide, past which `overflow` decides what
	 * happens). Silence is not a statement: a measure with no `<print>` wraps purely on width,
	 * so a file that only sprinkles a few hand-forced breaks still reflows. When false the
	 * breaker ignores the document's breaks entirely and wraps purely on width, which is useful when
	 * the source's engraved line breaks were made for a different page size than the one being
	 * rendered. */
	honorSystemBreaks: boolean;
	/** What gives when a system's music cannot fit the page at its collision-free minimum
	 * (default: 'wrap'). See SystemOverflow.
	 *
	 * `'wrap'` fits every system to the page in all but one case: a *single* measure whose
	 * minimum exceeds the usable width has nowhere to wrap to, so it spills like `'allow'`.
	 * That needs a very small `referenceWidth` or a very large `noteSpacing`, and the measure
	 * is still drawn at its collision-free minimum, so it reads correctly, it just runs past
	 * the margin. */
	overflow: SystemOverflow;
};

/** Lay every measure on one system (horizontal scroll); width is computed from the content. */
export type PanoramicLayout = {
	type: 'panoramic';
	/** Whether the clef and key signature stay in view as the score scrolls right
	 * (default: false). Once the opening's clefs and keys have scrolled wholly out of view,
	 * a strip holding the staff lines, braces, clefs and key signatures in effect stays
	 * pinned to the scroll box's left edge, like the page folded over there, and follows
	 * clef and key changes as they scroll under it. A score that scrolls less than that
	 * never shows it. The time signature is not repeated.
	 *
	 * The fold's paper runs the full height of the container, over its padding, and takes
	 * `backgroundColor` or else the nearest painted background behind the score. Restyle it
	 * with CSS variables on the container or any ancestor: `--vexml-fold-background` (the
	 * paper), `--vexml-fold-shadow` (the crease's `background`) and
	 * `--vexml-fold-shadow-width`. */
	stickySignatures: boolean;
	/** CSS px each score px is shown at (default: 1). The line is engraved as usual and then
	 * shown at this size, its canvases painted at the shown resolution: 0.5 is half as tall and
	 * half as wide, as sharp as at 1. Layers, markers, decorations, cursor positions and element
	 * rects all follow it, and so does the sticky fold. Scale here rather than with CSS `zoom`
	 * or a `transform` on an ancestor, which vexml can't see. Ignored when `fitHeight` is set. */
	scale: number;
	/** Fit the line into a strip this many CSS px tall, or null to show it whole (default:
	 * null). The staves are centered in the strip, and the line is scaled so whatever reaches
	 * furthest above or below them (a high ledger note, a chord symbol, a lyric) touches the
	 * strip's edge: the blank margin vexml engraves around the line is cropped off rather than
	 * shrinking the music. The score's box is then exactly this tall. */
	fitHeight: number | null;
};

/** Wrap measures onto stacked systems, then fit the systems onto pages of a fixed size, for
 * print. A system is never split across pages: one that would cross a page's bottom margin
 * starts the next page. The score is shown as its pages stacked edge to edge, and each page can
 * be drawn on its own canvas with `Score.getPages()`, so a long score prints sharp at any
 * `pixelRatio`, page by page. Letter is 816×1056 CSS px, A4 794×1123. */
export type PagedLayout = {
	type: 'paged';
	/** Page width in CSS px (default: 816, US Letter). */
	pageWidth: number;
	/** Page height in CSS px (default: 1056, US Letter). */
	pageHeight: number;
	/** Blank space kept inside every edge of the page, in CSS px (default: 48). The staves span
	 * the width between the side margins; a system taller than the space between the top and
	 * bottom margins runs into the bottom one. */
	margin: number;
	/** As StandardLayout.honorSystemBreaks (default: true). A `new-page="yes"` only starts a
	 * new system, not a new page. */
	honorSystemBreaks: boolean;
	/** As StandardLayout.overflow (default: 'wrap'). Anything wider than the page is cut off
	 * at the page's edge. */
	overflow: SystemOverflow;
};

/** How measures are placed across systems. */
export type Layout = StandardLayout | PanoramicLayout | PagedLayout;

/** Whether and where to draw stems on tablature notes. */
export type TabStemPlacement = 'none' | 'above' | 'below';

/** When to print measure numbers above the staff. */
export type MeasureNumbering =
	| 'none'
	| 'system'
	| 'every'
	| 'every-2'
	| 'every-3';

/** Default fonts: shipped Bravura for notation, Source Sans 3 for text. Families only:
 * the font loader resolves these to the shipped woff2 / Google Fonts. The single source
 * of the family-name fallbacks. */
export const DEFAULT_FONT_CONFIG = {
	notation: { family: 'Bravura' },
	text: { family: 'Source Sans 3' },
	// satisfies, not a type annotation: it checks the shape while keeping `notation` and
	// `text` known-present, so the loader reads `.family` without defaulting again.
} satisfies FontConfig;

/** What a caller may pass as `layout`: either layout's knobs are all optional, and
 * `render` fills them from DEFAULT_STANDARD_LAYOUT or DEFAULT_PANORAMIC_LAYOUT. */
export type LayoutInput =
	| (Partial<StandardLayout> & { type: 'standard' })
	| (Partial<PanoramicLayout> & { type: 'panoramic' })
	| (Partial<PagedLayout> & { type: 'paged' });

/** What `render` accepts: `Config` with everything optional, except that `layout` is a
 * nested object, so it takes its own partial rather than an all-or-nothing `Layout`. */
export type ConfigInput = Partial<Omit<Config, 'layout'>> & {
	layout?: LayoutInput;
};

/** The defaults `render` merges a caller's partial standard `layout` onto. */
export const DEFAULT_STANDARD_LAYOUT: StandardLayout = {
	type: 'standard',
	referenceWidth: DEFAULT_WIDTH,
	honorSystemBreaks: true,
	overflow: 'wrap',
};

/** The defaults `render` merges a caller's partial panoramic `layout` onto. */
export const DEFAULT_PANORAMIC_LAYOUT: PanoramicLayout = {
	type: 'panoramic',
	stickySignatures: false,
	scale: 1,
	fitHeight: null,
};

/** The defaults `render` merges a caller's partial paged `layout` onto: US Letter, half-inch
 * margins. */
export const DEFAULT_PAGED_LAYOUT: PagedLayout = {
	type: 'paged',
	pageWidth: 816,
	pageHeight: 1056,
	margin: 48,
	honorSystemBreaks: true,
	overflow: 'wrap',
};

/** The defaults `render` merges a caller's `ConfigInput` onto. */
export const DEFAULT_CONFIG: Config = {
	fonts: DEFAULT_FONT_CONFIG,
	pixelRatio: null,
	backgroundColor: null,
	gaps: [],
	layout: DEFAULT_STANDARD_LAYOUT,
	noteSpacing: 36,
	softmaxFactor: 10,
	systemSpacing: SYSTEM_GAP,
	showPartLabels: false,
	measureNumbering: 'system',
	showTabSlideText: false,
	tabStemPlacement: 'none',
	showTabs: true,
	showNotation: true,
	stretchSingleSystem: true,
	minLastSystemFill: 0.75,
	maxSystemFill: 0.9,
	height: null,
	maxHeight: null,
	width: null,
	maxWidth: null,
	scrollContainer: null,
};
