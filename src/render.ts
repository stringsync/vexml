import { MDOMParser, type MDocument } from '@stringsync/mdom';
import { VexFlow } from 'vexflow';
import { type Config, DEFAULT_CONFIG } from './config';
import { drawScore } from './draw';
import { loadFonts } from './fonts';
import { computeLayout } from './layout';

/*
 * Render a MusicXML score onto a canvas: parse the input (a MusicXML string or a
 * compressed .mxl Blob), lay it out, and draw it. Merges the caller's partial config
 * over the defaults and sets VexFlow's global glyph fonts before drawing.
 */
export async function render(
	input: string | Blob,
	canvas: HTMLCanvasElement,
	config?: Partial<Config>,
) {
	const resolved: Config = { ...DEFAULT_CONFIG, ...config };
	if (resolved.minLastSystemFill < 0 || resolved.minLastSystemFill > 1) {
		throw new RangeError('render: minLastSystemFill must be between 0 and 1');
	}
	const { notation, text } = loadFonts(canvas, resolved.fonts);
	// VexFlow engraves glyphs from its own bundled font modules via global state, not the
	// --vexml-font-notation CSS var. setFonts sets a CSS font-family stack the browser falls
	// through per glyph: music glyphs (noteheads, clefs, the stacked "TAB" clef) come from the
	// notation font, and everything VexFlow types — tab fret numbers, "H"/"P", bend/annotation
	// labels — from the next family that has the letter, so it matches the part labels (both
	// default to Source Sans 3). The trailing sans-serif keeps text off the browser's serif
	// default. Families MUST be quoted: an unquoted multi-word name like Source Sans 3 makes
	// the whole CSS font string invalid and every glyph falls back to serif. Reset each call
	// so one render's font choice can't leak into the next.
	VexFlow.setFonts(`'${notation}'`, `'${text}'`, 'sans-serif');
	if (typeof input === 'string') {
		return renderMusicXML(input, canvas, resolved);
	}
	if (input instanceof Blob) {
		return renderMXL(input, canvas, resolved);
	}
	throw new TypeError('render: input is not a string or Blob');
}

function renderMusicXML(
	musicXML: string,
	canvas: HTMLCanvasElement,
	config: Config,
) {
	const parser = new MDOMParser();
	const mdoc = parser.parseFromString(musicXML);
	return renderMDoc(mdoc, canvas, config);
}

async function renderMXL(mxl: Blob, canvas: HTMLCanvasElement, config: Config) {
	const parser = new MDOMParser();
	const mdoc = await parser.parseFromBlob(mxl);
	return renderMDoc(mdoc, canvas, config);
}

function renderMDoc(
	mdoc: MDocument,
	canvas: HTMLCanvasElement,
	config: Config,
) {
	const parts = mdoc.score.parts;
	if (parts.length === 0) {
		return;
	}
	drawScore(canvas, parts, computeLayout(parts, config), config);
}
