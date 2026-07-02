import { type Config, DEFAULT_CONFIG } from './config';
import { ElementFactory } from './elements/element-factory';
import { DefaultFontLoader } from './engraving/fonts';
import { LayoutPlanner } from './engraving/layout-planner';
import { NoteTranslator } from './engraving/note-translator';
import { ScoreDrawer } from './engraving/score-drawer';
import { ScoreReader } from './engraving/score-reader';
import { SpannerBuilder } from './engraving/spanner-builder';
import { Stage } from './host/stage';
import { SequenceFactory } from './playback/sequence-factory';
import type { Score } from './score';
import { DefaultScoreParser } from './score-parser';
import { ScoreRenderer } from './score-renderer';

/*
 * Render a MusicXML score into a container: parse the input (a MusicXML string or a compressed
 * .mxl Blob), build the stage inside the div, lay the score out, and draw it onto the stage's
 * managed canvas. The caller never sees the canvas — only the returned Score, which owns the DOM
 * and is the handle for events/decorations/layers (and dispose).
 *
 * The composition root: merges the caller's partial config over the defaults and wires the
 * production classes into a ScoreRenderer — no logic lives here.
 */
export function render(
	input: string | Blob,
	container: HTMLDivElement,
	config?: Partial<Config>,
): Promise<Score> {
	const resolved: Config = { ...DEFAULT_CONFIG, ...config };
	const stage = new Stage(container, {
		height: resolved.height,
		maxHeight: resolved.maxHeight,
		width: resolved.width,
		maxWidth: resolved.maxWidth,
	});
	// ONE translator instance shared by layout and draw: both must build identical vexflow
	// voices for the measured widths to match the drawn ones.
	const translator = new NoteTranslator();
	const reader = new ScoreReader();
	return new ScoreRenderer(
		resolved,
		stage,
		new DefaultFontLoader(),
		new DefaultScoreParser(),
		new LayoutPlanner(translator, reader),
		new ScoreDrawer(resolved, translator, reader, new SpannerBuilder()),
		new ElementFactory(),
		new SequenceFactory(reader),
	).render(input);
}
