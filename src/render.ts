import { MDOMParser, type MDocument } from '@stringsync/mdom';
import { VexFlow } from 'vexflow';
import { drawScore } from './draw';
import { type FontConfig, loadFonts } from './font-loader';
import { computeLayout, type Layout, type MeasureNumbering } from './layout';

export type { MeasureNumbering };

export type RenderOptions = {
	/** Font overrides. CSS custom properties on the container are the primary override API;
	 * use this for self-hosted or offline fonts. */
	fonts?: FontConfig;
	/** How measures are placed across systems (default: standard at 1000px). */
	layout?: Layout;
	/** *How much space the notes get* (not how its divided): horizontal px per tick of musical
	 * time. The spacing-density knob — bigger spreads every measure wider, so identical content
	 * stays the same width everywhere in the piece. */
	pxPerTick?: number;
	/** *How the space notes get is divided* (not how much): vexflow's note-spacing curve.
	 * Given the width pxPerTick allots, higher exaggerates the long-vs-short note ratio. A
	 * shape constant, independent of overall density. */
	softmaxFactor?: number;
	/** Print each part's instrument name to the left of the first system (default: false). */
	showPartLabels?: boolean;
	/** When to print measure numbers above the staff (default: 'system'). 'none' prints
	 * none; 'system' numbers the first measure of each system; 'every' numbers every
	 * measure; 'every-2'/'every-3' number every 2nd/3rd measure plus every system start. */
	measureNumbering?: MeasureNumbering;
	/** Print the "H"/"P" labels on tablature hammer-ons/pull-offs (default: false). The
	 * connecting tie arc always draws; this only toggles the letters above it. */
	showTabHammerPullText?: boolean;
	/** Print the "sl." label on tablature slides (default: false). The slide line always
	 * draws; this only toggles the label above it. */
	showTabSlideText?: boolean;
};

export async function render(
	input: string | Blob,
	element: HTMLElement,
	options?: RenderOptions,
) {
	loadFonts(element, options?.fonts);
	// VexFlow engraves glyphs from its own bundled font modules via global state, not the
	// --vexml-font-notation CSS var. setFonts sets a CSS font-family stack the browser falls
	// through per glyph: music glyphs (noteheads, clefs, the stacked "TAB" clef) come from the
	// notation font, and everything VexFlow types — tab fret numbers, "H"/"P", bend/annotation
	// labels — from the next family that has the letter, so it matches the part labels (both
	// default to Source Sans 3). The trailing sans-serif keeps text off the browser's serif
	// default. Families MUST be quoted: an unquoted multi-word name like Source Sans 3 makes
	// the whole CSS font string invalid and every glyph falls back to serif. Reset each call
	// so one render's font choice can't leak into the next.
	VexFlow.setFonts(
		`'${options?.fonts?.notation?.family ?? 'Bravura'}'`,
		`'${options?.fonts?.text?.family ?? 'Source Sans 3'}'`,
		'sans-serif',
	);
	if (typeof input === 'string') {
		return renderMusicXML(input, element, options);
	}
	if (input instanceof Blob) {
		return renderMXL(input, element, options);
	}
	throw new TypeError('render: input is not a string or Blob');
}

function renderMusicXML(
	musicXML: string,
	element: HTMLElement,
	options?: RenderOptions,
) {
	const parser = new MDOMParser();
	const mdoc = parser.parseFromString(musicXML);
	return renderMDoc(mdoc, element, options);
}

async function renderMXL(
	mxl: Blob,
	element: HTMLElement,
	options?: RenderOptions,
) {
	const parser = new MDOMParser();
	const mdoc = await parser.parseFromBlob(mxl);
	return renderMDoc(mdoc, element, options);
}

function renderMDoc(
	mdoc: MDocument,
	element: HTMLElement,
	options?: RenderOptions,
) {
	const parts = mdoc.score.parts;
	if (parts.length === 0) {
		return;
	}
	drawScore(element, parts, computeLayout(parts, options));
}
