import { BarlineTranslator } from './barline-translator';
import { ChordTranslator } from './chord-translator';
import {
	type Config,
	type ConfigInput,
	DEFAULT_CONFIG,
	DEFAULT_STANDARD_LAYOUT,
	type Layout,
} from './config';
import { DefaultFontLoader } from './default-font-loader';
import { DefaultScoreParser } from './default-score-parser';
import { DurationTranslator } from './duration-translator';
import { ElementFactory } from './element-factory';
import { Gaps } from './gaps';
import { LayoutPlanner } from './layout-planner';
import { NotationTranslator } from './notation-translator';
import { NoteTranslator } from './note-translator';
import type { Score } from './score';
import { ScoreDrawer } from './score-drawer';
import { ScoreReader } from './score-reader';
import { ScoreRenderer } from './score-renderer';
import { SequenceFactory } from './sequence-factory';
import { SignatureTranslator } from './signature-translator';
import { SpannerBuilder } from './spanner-builder';
import { SpillResolver } from './spill-resolver';
import { Stage } from './stage';
import { StavePlan } from './stave-plan';
import { TabTranslator } from './tab-translator';

/*
 * Render a MusicXML score into a container: parse the input (a MusicXML string or a compressed
 * .mxl Blob), build the stage inside the div, lay the score out, and draw it onto the stage's
 * managed canvas. The caller never sees the canvas — only the returned Score, which owns the DOM
 * and is the handle for events/decorations/layers (and dispose).
 *
 * This is the composition root: it merges the caller's partial config over the defaults and wires
 * the production classes into a ScoreRenderer. No logic lives here, so a change to how the score
 * is built belongs in one of those classes rather than in this function.
 */
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
	const durations = new DurationTranslator();
	const barlines = new BarlineTranslator();
	const signatures = new SignatureTranslator();
	const staves = new StavePlan({
		showTabs: resolved.showTabs,
		showNotation: resolved.showNotation,
	});
	const tab = new TabTranslator(durations, resolved.tabStemPlacement);
	const chords = new ChordTranslator(durations, new NotationTranslator());
	// ONE translator instance shared by layout and draw: both must build identical vexflow
	// voices for the measured widths to match the drawn ones.
	const translator = new NoteTranslator(chords, durations, barlines);
	const reader = new ScoreReader();
	const gaps = new Gaps(resolved.gaps);
	return new ScoreRenderer(
		resolved,
		stage,
		new DefaultFontLoader(),
		new DefaultScoreParser(),
		new LayoutPlanner(translator, tab, signatures, staves, reader, gaps),
		new ScoreDrawer(
			resolved,
			translator,
			chords,
			tab,
			signatures,
			staves,
			barlines,
			reader,
			new SpannerBuilder(),
			gaps,
			new SpillResolver(),
		),
		new ElementFactory(),
		new SequenceFactory(reader, gaps),
		gaps,
	).render(input);
}
