import type { MDocument } from '@stringsync/mdom';
import { Rect } from 'webappwiz/geometry';
import type { Config } from './config';
import { DefaultDecorations } from './default-decorations';
import type { ElementFactory } from './element-factory';
import type { ElementIndex } from './element-index';
import type { Fold } from './fold';
import type { FontLoader } from './font-loader';
import type { Gaps } from './gaps';
import type { Host } from './host';
import type { LayoutPlanner } from './layout-planner';
import { MetricsPatch } from './metrics-patch';
import { Page } from './page';
import type { PagePainter } from './page-painter';
import type { PaintProbe } from './paint-probe';
import { ProbeTextCanvas } from './probe-text-canvas';
import { type GapInfo, Score } from './score';
import type { Engraving, RawGeometry, ScoreDrawer } from './score-drawer';
import type { ScoreParser } from './score-parser';
import { ScoreRecording } from './score-recording';
import type { ScoreSnapshot } from './score-snapshot';
import type { Scroller } from './scroller';
import type { Sequence } from './sequence';
import type { SequenceFactory } from './sequence-factory';
import { snapshotConfig } from './snapshot-config';
import { SnapshotReader } from './snapshot-reader';
import type { SnapshotSource } from './snapshot-source';
import { StoredSnapshot } from './stored-snapshot';

const EMPTY_GEOMETRY: RawGeometry = {
	bounds: new Rect(0, 0, 0, 0),
	notes: [],
	measures: [],
	chordDiagrams: [],
};

/* What the renderer needs from the stage: the container fonts/CSS vars land on, the base element
 * the engraving is shown in, the probe its recording measures text with, where the engraving and
 * a sticky fold go, the Host surface handed to the Score, and the painter its pages draw with.
 * Stage implements it for real; a unit test injects a fake. */
export interface RenderStage extends Host, PagePainter {
	readonly container: HTMLDivElement;
	readonly base: HTMLElement;
	readonly probe: PaintProbe;
	/* Show the recorded engraving (see Engraving). */
	engrave(engraving: Engraving): void;
	readonly scroller: Scroller & { cancel(): void; suspendForResize(): void };
	/* Pin a fold at the scroll box's left edge (see Fold). */
	setFold(fold: Fold): void;
}

/*
 * Runs the render pipeline over injected collaborators: fonts, parse, plan, draw, then the
 * interaction model (elements/decorations/sequence) wrapped into the returned Score. A snapshot
 * skips parse, plan and draw: its engraving, elements and timeline are decoded instead.
 */
// render() constructs this with the production classes; every collaborator is an interface, so a
// unit test injects fakes for the ones it does not want to run for real.
export class ScoreRenderer {
	constructor(
		private readonly config: Config,
		// scry-ignore classes-over-function-exports: RenderStage is already the interface Stage implements; score-renderer.test.ts injects its FakeStage through it.
		private readonly stage: RenderStage,
		private readonly fontLoader: FontLoader,
		private readonly parser: ScoreParser,
		private readonly layoutPlanner: LayoutPlanner,
		private readonly scoreDrawer: ScoreDrawer,
		private readonly elementFactory: ElementFactory,
		private readonly sequenceFactory: SequenceFactory,
		private readonly configuredGaps: Gaps,
	) {}

	async render(
		input: string | Blob | MDocument | ScoreSnapshot,
	): Promise<Score> {
		if (
			this.config.minLastSystemFill < 0 ||
			this.config.minLastSystemFill > 1
		) {
			throw new RangeError('render: minLastSystemFill must be between 0 and 1');
		}
		const { pixelRatio, layout } = this.config;
		if (pixelRatio != null && !(pixelRatio > 0)) {
			throw new RangeError('render: pixelRatio must be positive');
		}
		if (
			layout.type === 'panoramic' &&
			!(
				layout.scale > 0 &&
				Number.isFinite(layout.scale) &&
				(layout.fitHeight === null ||
					(layout.fitHeight > 0 && Number.isFinite(layout.fitHeight)))
			)
		) {
			throw new RangeError(
				'render: a panoramic scale and fitHeight must be positive',
			);
		}
		if (
			layout.type === 'paged' &&
			!(
				layout.margin >= 0 &&
				layout.pageWidth > 2 * layout.margin &&
				layout.pageHeight > 2 * layout.margin
			)
		) {
			throw new RangeError(
				'render: a page must be larger than its margins on both axes',
			);
		}
		// Fonts before ANY layout or drawing: load() puts the fonts and CSS vars on the container
		// (the base element inherits them) and sets VexFlow's global glyph fonts, which both the
		// planner's measurements and the drawer's engraving read.
		await this.fontLoader.load(this.stage.container, this.config.fonts);
		if (SnapshotReader.isSnapshot(input)) {
			return this.restore(input);
		}

		const mdoc = await this.parser.parse(input);
		// A gap is an ordinary measure of the document: found where the caller put it, or
		// inserted into vexml's own parse.
		if (mdoc.score.parts.length > 0) {
			this.configuredGaps.resolve(mdoc);
		}
		const parts = mdoc.score.parts;
		// Before the layout, which builds the first vexflow elements: each measures its glyph
		// and copies its category's font and style.
		new ProbeTextCanvas(this.stage.probe).install();
		new MetricsPatch().install();
		const drawn =
			parts.length > 0
				? this.scoreDrawer.draw(
						this.stage.base,
						this.stage.probe,
						mdoc.score,
						this.layoutPlanner.plan(mdoc.score, this.config),
					)
				: {
						geometry: EMPTY_GEOMETRY,
						engraving: null,
						fold: null,
						pages: [],
					};
		const { geometry } = drawn;
		this.show(drawn.engraving, drawn.fold);

		// The stage is the Viewport (score<->client transform) the elements map through, and the
		// decorations are what their color/halo toggles delegate to (drawing on overlay layers the
		// stage hands them). Both feed the factory, which links the elements and indexes them.
		const decorations = new DefaultDecorations(this.stage);
		const model = this.elementFactory.model(geometry, parts);
		const elements = this.elementFactory.build(model, this.stage, decorations);
		// The playback timeline: the parsed parts give onsets/meter/tempo/repeats/ties, the
		// geometry gives note x and system boxes, and noteLookup ties active notes to the same
		// identities hit-testing returns. Built for every score (empty when there are no parts).
		const sequence = this.sequenceFactory.create(
			parts,
			geometry,
			elements.noteLookup,
		);
		// Each gap's sync metadata, in config order (Score.getGaps' contract). A gap
		// renders exactly one step; under repeats that's its first occurrence.
		const gaps: GapInfo[] =
			parts.length > 0
				? this.configuredGaps.documentIndexes().map(({ gap, measureIndex }) => {
						const range = sequence.getStepRangeOfMeasure(measureIndex);
						const step = range ? sequence.getStep(range.start) : null;
						return {
							measureIndex,
							label: gap.label ?? null,
							startMs: step?.startMs ?? 0,
							endMs: step?.endMs ?? 0,
						};
					})
				: [];
		const recording = new ScoreRecording(
			{
				config: snapshotConfig(this.config),
				engraving: drawn.engraving,
				fold: drawn.fold,
				pages: drawn.pages,
				elements: model,
				notes: elements.notes(),
				sequence,
				gaps,
			},
			this.stage.probe,
		);
		return this.score(
			elements,
			decorations,
			sequence,
			gaps,
			drawn.pages,
			recording,
		);
	}

	/* Build the Score a snapshot recorded: decoded, not parsed, laid out or drawn. Its config was
	 * checked against this one before the stage was built (see render.ts). */
	private restore(snapshot: ScoreSnapshot): Score {
		const read = new SnapshotReader(this.config).read(snapshot);
		this.show(read.engraving, read.fold);
		const decorations = new DefaultDecorations(this.stage);
		const elements = this.elementFactory.build(
			read.elements,
			this.stage,
			decorations,
		);
		const sequence = this.sequenceFactory.restore(
			read.sequence,
			elements.notes(),
		);
		return this.score(
			elements,
			decorations,
			sequence,
			snapshot.gaps.map((gap) => ({ ...gap })),
			read.pages,
			new StoredSnapshot(snapshot),
		);
	}

	private show(engraving: Engraving | null, fold: Fold | null): void {
		if (engraving) {
			this.stage.engrave(engraving);
		}
		if (fold) {
			this.stage.setFold(fold);
		}
	}

	private score(
		elements: ElementIndex,
		decorations: DefaultDecorations,
		sequence: Sequence,
		gaps: GapInfo[],
		pageRects: readonly Rect[],
		snapshots: SnapshotSource,
	): Score {
		// Each page holds the systems whose top lands on it (a system never straddles two).
		const systems = elements.systems();
		const pages = pageRects.map(
			(rect, index) =>
				new Page(
					index,
					rect,
					systems.filter(
						(system) =>
							system.rect.y >= rect.y && system.rect.y < rect.y + rect.h,
					),
					this.stage,
				),
		);
		return new Score(
			this.stage,
			elements,
			decorations,
			sequence,
			this.stage.scroller,
			gaps,
			pages,
			snapshots,
		);
	}
}
