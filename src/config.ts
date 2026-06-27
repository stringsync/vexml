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
	/** How measures are placed across systems (default: standard at 1000px). */
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
	layout: { type: 'standard', width: 1000 },
	noteSpacing: 36,
	softmaxFactor: 10,
	showPartLabels: false,
	measureNumbering: 'system',
	showTabHammerPullText: false,
	showTabSlideText: false,
};
