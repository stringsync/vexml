import { MDOMParser, type MDocument } from '@stringsync/mdom';
import { VexFlow } from 'vexflow';
import { drawScore } from './draw';
import { type FontConfig, loadFonts } from './font-loader';
import { computeLayout, type Layout } from './layout';

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
};

export async function render(
	input: string | Blob,
	element: HTMLElement,
	options?: RenderOptions,
) {
	loadFonts(element, options?.fonts);
	// VexFlow engraves glyphs from its own bundled font modules via global state, not the
	// --vexml-font-notation CSS var. Set it here so fonts.notation actually swaps the
	// engraving font (e.g. Petaluma). Reset to Bravura each call so one render's choice
	// can't leak into the next. ponytail: global font stack is vexflow's only API;
	// per-render fonts would need upstream support.
	VexFlow.setFonts(options?.fonts?.notation?.family ?? 'Bravura', 'Academico');
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
