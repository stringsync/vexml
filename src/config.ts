import { SYSTEM_GAP } from './constants';

export interface FontOverride {
	family: string;
	/** woff2 URL; if omitted, assumed already loaded (system font or user's own @font-face). */
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
	/** CSS color for the label (default: black). */
	fontColor?: string;
	/** CSS color painted over the gap's note area, e.g. to dim the staff lines
	 * (`'rgba(255, 255, 255, 0.8)'`). Omit for none. */
	fill?: string;
};

/** A non-musical measure inserted into the score: it occupies horizontal space and a
 * fixed playback duration (independent of tempo), for syncing notation to media where
 * nothing is being played. See `Config.gaps`. */
export type Gap = {
	/** Source-document measure index to insert before (0 inserts before the first
	 * measure; the measure count appends after the last). Indexes refer to the
	 * MusicXML as written — gaps never shift each other. */
	beforeMeasureIndex: number;
	/** Playback time the gap occupies, in ms. Fixed — tempo marks don't affect it. */
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

/** How measures are placed across systems. */
export type Layout =
	| {
			/** Wrap measures onto stacked systems (print-like). */
			type: 'standard';
			/** Reference layout width in px (default: DEFAULT_WIDTH). The score is laid out
			 * to this width once; the result is then scaled to whatever container it's placed
			 * in, so resizing the container never re-flows or re-spaces it. */
			referenceWidth?: number;
	  }
	| {
			/** Lay every measure on one system (horizontal scroll); width is computed
			 * from the content. */
			type: 'panoramic';
	  };

/** Whether and where to draw stems on tablature notes. */
export type TabStemPlacement = 'none' | 'above' | 'below';

/** When to print measure numbers above the staff. */
export type MeasureNumbering =
	| 'none'
	| 'system'
	| 'every'
	| 'every-2'
	| 'every-3';

/** Fully-resolved render configuration. Every property is required: `render` fills
 * any the caller omits from `DEFAULT_CONFIG`, so internal code passes a complete
 * `Config` around instead of threading optionals. The public entrypoint accepts a
 * `Partial<Config>`. */
export type Config = {
	/** Font overrides. CSS custom properties on the container are the primary override API;
	 * use this for self-hosted or offline fonts. */
	fonts: FontConfig;
	/** Non-musical measures to insert into the score (default: none). Each occupies
	 * space on the page and a fixed ms of playback time — for syncing notation to media
	 * where the music pauses (e.g. an instructor talking). `beforeMeasureIndex` is a
	 * source-document index; the rendered score's measure indexes include the inserted
	 * gaps (measure *numbers* skip them). Retrieve their timing with `Score.getGaps()`. */
	gaps: Gap[];
	/** How measures are placed across systems (default: standard at 8.5in / 816px). */
	layout: Layout;
	/** *How much space the notes get* (not how it's divided): the px a quarter note gets,
	 * the base of a logarithmic spacing curve. A note gets a little more space per doubling
	 * of its duration and a little less per halving (see LOG_SPACING_RATIO), so a measure's
	 * width grows mostly with its note *count* and only weakly with note *value* — denser
	 * measures are wider, the way engravers space music. The spacing-density knob: bigger
	 * spreads every measure wider. (Replaces a fixed px-per-tick, which made width purely
	 * proportional to total duration regardless of note count.) */
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
	/** Print the "H"/"P" labels on tablature hammer-ons/pull-offs (default: false). The
	 * connecting tie arc always draws; this only toggles the letters above it. */
	showTabHammerPullText: boolean;
	/** Print the "sl." label on tablature slides (default: false). The slide line always
	 * draws; this only toggles the label above it. */
	showTabSlideText: boolean;
	/** Draw stems (and flags) on tablature notes (default: 'none'). 'none' gives the usual
	 * bare fret numbers; 'above' draws a rhythm stem above each fret, 'below' below it — useful
	 * for a lone tab stave with no paired notation. Beams are not drawn — short notes get
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
	 * and only stretches once they reach that fraction — useful so a short incipit or excerpt
	 * isn't blown up across the whole page. No effect on multi-system scores. */
	stretchSingleSystem: boolean;
	/** Fraction (0–1) of the reference width a system may fill before the breaker bumps
	 * the next measure to a new system (default: 0.9). Lower leaves more air; 1 packs each
	 * system to the edge (the old greedy behavior). Only affects near-full systems — a line
	 * whose measures already sit below this fill breaks at the same place either way. */
	maxSystemFill: number;
	/** Fixed container height in px, or null for none (default: null). When set, vexml puts the score
	 * in a vertical scroll box at exactly this height — for system-stacked (standard) layouts taller
	 * than the space you want them to take. Prefer maxHeight to cap only when the score overflows. */
	height: number | null;
	/** Max container height in px, or null for none (default: null). The score scrolls vertically once
	 * it exceeds this; shorter scores keep their natural height. */
	maxHeight: number | null;
	/** Fixed container width in px, or null for none (default: null). When set, vexml puts the score in
	 * a horizontal scroll box at this width — for panoramic (single-row) layouts wider than the space
	 * available. Prefer maxWidth to cap only when the score overflows. */
	width: number | null;
	/** Max container width in px, or null for none (default: null). The score scrolls horizontally once
	 * it exceeds this; narrower scores keep their natural width. */
	maxWidth: number | null;
};

/** Default fonts: bundled Bravura for notation, Source Sans 3 for text. Families only —
 * the font loader resolves these to the bundled woff2 / Google Fonts. The single source
 * of the family-name fallbacks; `satisfies` keeps `notation`/`text` known-present so the
 * loader can read `.family` without re-defaulting. */
export const DEFAULT_FONT_CONFIG = {
	notation: { family: 'Bravura' },
	text: { family: 'Source Sans 3' },
} satisfies FontConfig;

/** The defaults `render` merges a caller's `Partial<Config>` onto. */
export const DEFAULT_CONFIG: Config = {
	fonts: DEFAULT_FONT_CONFIG,
	gaps: [],
	layout: { type: 'standard' },
	noteSpacing: 36,
	softmaxFactor: 10,
	systemSpacing: SYSTEM_GAP,
	showPartLabels: false,
	measureNumbering: 'system',
	showTabHammerPullText: false,
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
};
