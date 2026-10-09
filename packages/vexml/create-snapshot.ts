import type { MDocument } from '@stringsync/mdom';
import { CanvasPaintProbe } from './canvas-paint-probe';
import { type ConfigInput, resolveConfig } from './config';
import { DefaultScoreParser } from './default-score-parser';
import { DetachedViewport } from './detached-viewport';
import { DynamicGlyphs } from './dynamic-glyphs';
import { ElementFactory } from './element-factory';
import { GapInserter } from './gap-inserter';
import { Gaps } from './gaps';
import {
	type FontRegistry,
	type HeadlessFont,
	HeadlessFonts,
} from './headless-fonts';
import { InertDecoration } from './inert-decoration';
import { ScoreEngraver } from './score-engraver';
import { ScoreReader } from './score-reader';
import type { ScoreSnapshot } from './score-snapshot';
import { SequenceFactory } from './sequence-factory';
import { TextOutliner } from './text-outliner';

/** What createSnapshot measures text on: a canvas from a canvas library, such as
 * `createCanvas(1, 1)` from @napi-rs/canvas. Any size will do. */
export interface SnapshotCanvas {
	getContext(contextId: '2d'): unknown;
}

/** How createSnapshot engraves. */
export interface SnapshotOptions {
	/** The config the snapshot is rendered with later. As with `render`, everything that shapes
	 * the engraving must match then; sizes, pixel ratio and colors are free to differ. */
	config?: ConfigInput;
	/** The fonts the config names, as bytes or files. vexml brings its own Bravura. A family the
	 * canvas library cannot find measures in its fallback face. */
	fonts?: HeadlessFont[];
	/** Where to register `fonts` (and vexml's Bravura) so the canvas measures text in them, such
	 * as @napi-rs/canvas's `GlobalFonts`. Leave it out when they are registered already. */
	fontRegistry?: FontRegistry;
}

/**
 * Snapshot a MusicXML score with no DOM, under Bun or Node: what `Score.snapshot()` returns for
 * the same input and config, so a server can draw it ahead of time and a page can `render` (or
 * `paint`) it. Text is measured on `canvas`, whose metrics can differ a little from a
 * browser's; rendering the snapshot never lays it out again, so it shows as engraved here.
 * Gaps are placed as `render` places them: `config.gaps` positions over text or a .mxl Blob,
 * or gap measures already in an MDocument.
 */
export async function createSnapshot(
	input: string | Blob | MDocument,
	canvas: SnapshotCanvas,
	opts: SnapshotOptions = {},
): Promise<ScoreSnapshot> {
	const config = resolveConfig(opts.config);
	const reader = new ScoreReader(new DynamicGlyphs());
	const gaps = new Gaps(config.gaps, new GapInserter(reader));
	gaps.check(input);
	const engraver = ScoreEngraver.create(
		config,
		reader,
		gaps,
		new ElementFactory(),
		new SequenceFactory(reader, gaps),
	);
	engraver.check();
	const context = canvas.getContext('2d') as CanvasRenderingContext2D | null;
	if (!context) {
		throw new Error('createSnapshot: the canvas has no 2D context');
	}
	const fonts = new HeadlessFonts(opts.fontRegistry ?? null, opts.fonts ?? []);
	await fonts.load(config.fonts);
	const document = await new DefaultScoreParser().parse(input);
	const engraved = engraver.engrave(
		document,
		new CanvasPaintProbe(context),
		new DetachedViewport(),
		{ color: new InertDecoration(), halo: new InertDecoration() },
	);
	return new TextOutliner(fonts.all).outline(engraved.recording.snapshot());
}
