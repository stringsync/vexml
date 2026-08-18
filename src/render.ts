import {
	type Config,
	type ConfigInput,
	DEFAULT_CONFIG,
	DEFAULT_STANDARD_LAYOUT,
	type Layout,
} from './config';
import { ElementFactory } from './element-factory';
import { DefaultFontLoader } from './font-loader/default-font-loader';
import { Gaps } from './gaps';
import { Stage } from './host/stage';
import { LayoutPlanner } from './layout-planner';
import { NoteTranslator } from './note-translator';
import type { Score } from './score';
import { ScoreDrawer } from './score-drawer';
import { DefaultScoreParser } from './score-parser/default-score-parser';
import { ScoreReader } from './score-reader';
import { ScoreRenderer } from './score-renderer';
import { SequenceFactory } from './sequence-factory';
import { SpannerBuilder } from './spanner-builder';

/*
 * Render a MusicXML score into a container: parse the input (a MusicXML string or a compressed
 * .mxl Blob), build the stage inside the div, lay the score out, and draw it onto the stage's
 * managed canvas. The caller never sees the canvas — only the returned Score, which owns the DOM
 * and is the handle for events/decorations/layers (and dispose).
 */
// The composition root: it merges the caller's partial config over the defaults and wires the
// production classes into a ScoreRenderer. No logic lives here, so a change to how the score is
// built belongs in one of those classes rather than in this function.
export function render(
	input: string | Blob,
	container: HTMLDivElement,
	config?: ConfigInput,
): Promise<Score> {
	// `layout` is the one nested config object, so the top-level spread would blow away the
	// knobs a caller left out of `{ type: 'standard' }`. Fill it from its own defaults first.
	const layoutInput = config?.layout ?? DEFAULT_CONFIG.layout;
	const layout: Layout =
		layoutInput.type === 'standard'
			? { ...DEFAULT_STANDARD_LAYOUT, ...layoutInput }
			: layoutInput;
	const resolved: Config = { ...DEFAULT_CONFIG, ...config, layout };
	// Scale-to-fit + center by default for a system-stacked layout that isn't a horizontal scroll
	// box: the score is engraved once at its reference width, then shrunk to fit a narrower container
	// (never blown up past that width) and centered. A panoramic layout, or one the caller capped into
	// a horizontal scroll box, wants its intrinsic width and to scroll — so it opts out.
	const fit =
		resolved.layout.type === 'standard' &&
		resolved.width == null &&
		resolved.maxWidth == null;
	const stage = new Stage(container, {
		height: resolved.height,
		maxHeight: resolved.maxHeight,
		width: resolved.width,
		maxWidth: resolved.maxWidth,
		backgroundColor: resolved.backgroundColor,
		fit,
	});
	// ONE translator instance shared by layout and draw: both must build identical vexflow
	// voices for the measured widths to match the drawn ones.
	const translator = new NoteTranslator(resolved.tabStemPlacement);
	const reader = new ScoreReader();
	const gaps = new Gaps(resolved.gaps);
	return new ScoreRenderer(
		resolved,
		stage,
		new DefaultFontLoader(),
		new DefaultScoreParser(),
		new LayoutPlanner(translator, reader, gaps),
		new ScoreDrawer(resolved, translator, reader, new SpannerBuilder(), gaps),
		new ElementFactory(),
		new SequenceFactory(reader, gaps),
		gaps,
	).render(input);
}
