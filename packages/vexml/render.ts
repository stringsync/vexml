import type { MDocument } from '@stringsync/mdom';
import { BRAVURA_URL } from './bravura-url';
import { type ConfigInput, resolveConfig } from './config';
import { DefaultFontLoader } from './default-font-loader';
import { DefaultScoreParser } from './default-score-parser';
import { DynamicGlyphs } from './dynamic-glyphs';
import { ElementFactory } from './element-factory';
import { GapInserter } from './gap-inserter';
import { Gaps } from './gaps';
import { Ink } from './ink';
import type { Score } from './score';
import { ScoreEngraver } from './score-engraver';
import { ScoreReader } from './score-reader';
import { ScoreRenderer } from './score-renderer';
import type { ScoreSnapshot } from './score-snapshot';
import { SequenceFactory } from './sequence-factory';
import { SnapshotReader } from './snapshot-reader';
import { Stage } from './stage';

/*
 * Render a MusicXML score into a container: parse text or a compressed .mxl Blob, or reuse an
 * editor-owned MDocument, which is never edited: its gaps must name measures already in it. A
 * ScoreSnapshot (Score.snapshot) skips parsing, layout and drawing and brings its own gaps
 * (config.gaps is ignored); one recorded by another snapshot version or with a different
 * engraving config throws SnapshotMismatchError before the container is touched.
 * Build the stage inside the div, lay the score out, and draw it onto the stage's
 * managed canvas. The caller never sees the canvas: only the returned Score, which owns the DOM
 * and is the handle for events/decorations/layers (and dispose).
 *
 * This is the composition root: it merges the caller's partial config over the defaults and wires
 * the production classes into a ScoreRenderer. No logic lives here, so a change to how the score
 * is built belongs in one of those classes rather than in this function.
 */
export function render(
	input: string | Blob | MDocument | ScoreSnapshot,
	container: HTMLDivElement,
	config?: ConfigInput,
): Promise<Score> {
	const resolved = resolveConfig(config);
	const reader = new ScoreReader(new DynamicGlyphs());
	const gaps = new Gaps(resolved.gaps, new GapInserter(reader));
	// Before the stage touches the container. A snapshot's gaps were placed when it was
	// recorded, so config.gaps is ignored for one, and the rest of its config must match.
	if (SnapshotReader.isSnapshot(input)) {
		new SnapshotReader(resolved).check(input);
	} else {
		gaps.check(input);
	}
	// Scale-to-fit + center by default for a system-stacked layout that isn't a horizontal scroll
	// box: the score is engraved once at its reference width, then shrunk to fit a narrower container
	// (never blown up past that width) and centered. A panoramic layout, or one the caller capped into
	// a horizontal scroll box, wants its intrinsic width and to scroll, so it opts out.
	const fit =
		resolved.layout.type !== 'panoramic' &&
		resolved.width == null &&
		resolved.maxWidth == null;
	const stage = new Stage(container, {
		height: resolved.height,
		maxHeight: resolved.maxHeight,
		width: resolved.width,
		maxWidth: resolved.maxWidth,
		backgroundColor: resolved.backgroundColor,
		pixelRatio: resolved.pixelRatio,
		fit,
		scrollContainer: resolved.scrollContainer,
		ink: new Ink(
			resolved.fonts.notation?.color ?? null,
			resolved.fonts.text?.color ?? null,
		),
	});
	const elements = new ElementFactory();
	const sequences = new SequenceFactory(reader, gaps);
	return new ScoreRenderer(
		resolved,
		stage,
		new DefaultFontLoader(BRAVURA_URL),
		new DefaultScoreParser(),
		ScoreEngraver.create(resolved, reader, gaps, elements, sequences),
		elements,
		sequences,
	).render(input);
}
