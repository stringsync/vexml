import { MDOMParser } from '@stringsync/mdom';
import { VexFlow } from 'vexflow';
import { type Config, DEFAULT_CONFIG } from './config';
import { Decorations } from './decorations';
import { drawScore } from './draw';
import { loadFonts } from './fonts';
import { Rect } from './geometry';
import { buildTargets, type RawGeometry } from './hit';
import { computeLayout } from './layout';
import { Score } from './score';
import { Stage } from './stage';

const EMPTY_GEOMETRY: RawGeometry = {
	bounds: new Rect(0, 0, 0, 0),
	notes: [],
	measures: [],
};

/*
 * Render a MusicXML score into a container: parse the input (a MusicXML string or a compressed
 * .mxl Blob), build the stage inside the div, lay the score out, and draw it onto the stage's
 * managed canvas. The caller never sees the canvas — only the returned Score, which owns the DOM
 * and is the handle for events/decorations/layers (and dispose). Merges the caller's partial
 * config over the defaults and sets VexFlow's global glyph fonts before drawing.
 */
export async function render(
	input: string | Blob,
	container: HTMLDivElement,
	config?: Partial<Config>,
): Promise<Score> {
	const resolved: Config = { ...DEFAULT_CONFIG, ...config };
	if (resolved.minLastSystemFill < 0 || resolved.minLastSystemFill > 1) {
		throw new RangeError('render: minLastSystemFill must be between 0 and 1');
	}

	const stage = new Stage(container);
	// Fonts and CSS vars go on the container; the managed canvas inherits them, so drawScore's
	// getComputedStyle(canvas) read of --vexml-font-text still resolves.
	const { notation, text } = loadFonts(container, resolved.fonts);
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

	const parser = new MDOMParser();
	const mdoc =
		typeof input === 'string'
			? parser.parseFromString(input)
			: input instanceof Blob
				? await parser.parseFromBlob(input)
				: null;
	if (mdoc === null) {
		throw new TypeError('render: input is not a string or Blob');
	}

	const parts = mdoc.score.parts;
	const geometry =
		parts.length > 0
			? drawScore(stage.base, parts, computeLayout(parts, resolved), resolved)
			: EMPTY_GEOMETRY;

	// The stage is the Viewport (score<->client transform) the targets map through, and the
	// decorations are the Decorator their color/halo toggles delegate to (drawing on a content
	// layer the stage hands them). Both feed buildTargets, which links the targets and indexes them.
	const decorations = new Decorations(stage);
	const index = buildTargets(geometry, stage, decorations);
	return new Score(stage, index, decorations);
}
