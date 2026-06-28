import { SYSTEM_GAP } from './constants';
import type { FontConfig } from './fonts';
import type { Layout, MeasureNumbering } from './layout';

/** Fully-resolved render configuration. Every property is required: `render` fills
 * any the caller omits from `DEFAULT_CONFIG`, so internal code passes a complete
 * `Config` around instead of threading optionals. The public entrypoint accepts a
 * `Partial<Config>`. */
export type Config = {
	/** Font overrides. CSS custom properties on the container are the primary override API;
	 * use this for self-hosted or offline fonts. */
	fonts: FontConfig;
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
	layout: { type: 'standard' },
	noteSpacing: 36,
	softmaxFactor: 10,
	systemSpacing: SYSTEM_GAP,
	showPartLabels: false,
	measureNumbering: 'system',
	showTabHammerPullText: false,
	showTabSlideText: false,
	stretchSingleSystem: true,
	minLastSystemFill: 0.75,
	maxSystemFill: 0.9,
};
