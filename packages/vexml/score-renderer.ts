import type { MDocument } from '@stringsync/mdom';
import { Rect } from 'webappwiz/geometry';
import type { Config } from './config';
import { DefaultDecorations } from './default-decorations';
import type { ElementFactory } from './element-factory';
import type { Fold } from './fold';
import type { FontLoader } from './font-loader';
import type { Gaps } from './gaps';
import type { Host } from './host';
import type { LayoutPlanner } from './layout-planner';
import { Page } from './page';
import type { PagePainter } from './page-painter';
import type { PaintProbe } from './paint-probe';
import { type GapInfo, Score } from './score';
import type { Engraving, RawGeometry, ScoreDrawer } from './score-drawer';
import type { ScoreParser } from './score-parser';
import type { Scroller } from './scroller';
import type { SequenceFactory } from './sequence-factory';

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
 * interaction model (elements/decorations/sequence) wrapped into the returned Score.
 */
// render() constructs this with the production classes; every collaborator is an interface, so a
// unit test injects fakes for the ones it does not want to run for real.
export class ScoreRenderer {
	constructor(
		private readonly config: Config,
		private readonly stage: RenderStage,
		private readonly fontLoader: FontLoader,
		private readonly parser: ScoreParser,
		private readonly layoutPlanner: LayoutPlanner,
		private readonly scoreDrawer: ScoreDrawer,
		private readonly elementFactory: ElementFactory,
		private readonly sequenceFactory: SequenceFactory,
		private readonly configuredGaps: Gaps,
	) {}

	async render(input: string | Blob | MDocument): Promise<Score> {
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

		const mdoc = await this.parser.parse(input);
		// A gap is an ordinary measure of the document: found where the caller put it, or
		// inserted into vexml's own parse.
		if (mdoc.score.parts.length > 0) {
			this.configuredGaps.resolve(mdoc);
		}
		const parts = mdoc.score.parts;
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
		if (drawn.engraving) {
			this.stage.engrave(drawn.engraving);
		}
		if (drawn.fold) {
			this.stage.setFold(drawn.fold);
		}

		// The stage is the Viewport (score<->client transform) the elements map through, and the
		// decorations are what their color/halo toggles delegate to (drawing on overlay layers the
		// stage hands them). Both feed the factory, which links the elements and indexes them.
		const decorations = new DefaultDecorations(this.stage);
		const elements = this.elementFactory.build(
			geometry,
			parts,
			this.stage,
			decorations,
		);
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
		// Each page holds the systems whose top lands on it (a system never straddles two).
		const systems = elements.systems();
		const pages = drawn.pages.map(
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
		);
	}
}
