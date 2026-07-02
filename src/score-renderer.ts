import type { Config } from './config';
import {
	ColorStyle,
	DefaultDecoration,
	HaloStyle,
} from './elements/decorations';
import type { ElementFactory } from './elements/element-factory';
import type { FontLoader } from './engraving/fonts';
import type { LayoutPlanner } from './engraving/layout-planner';
import type { RawGeometry, ScoreDrawer } from './engraving/score-drawer';
import { gapDocumentIndexes, insertGapMeasures } from './gaps';
import { Rect } from './geometry';
import type { Scroller } from './host/scroll-controller';
import type { Host } from './host/stage';
import type { SequenceFactory } from './playback/sequence-factory';
import { type GapInfo, Score } from './score';
import type { ScoreParser } from './score-parser';

const EMPTY_GEOMETRY: RawGeometry = {
	bounds: new Rect(0, 0, 0, 0),
	notes: [],
	measures: [],
	chordDiagrams: [],
};

/* What the renderer needs from the stage: the container fonts/CSS vars land on, the base canvas
 * the score draws onto, and the Host surface handed to the Score. Stage implements it for real;
 * a unit test injects a fake. */
export interface RenderStage extends Host {
	readonly container: HTMLDivElement;
	readonly base: HTMLCanvasElement;
	readonly scroller: Scroller & { cancel(): void; suspendForResize(): void };
}

/*
 * Runs the render pipeline over injected collaborators: fonts, parse, plan, draw, then the
 * interaction model (elements/decorations/sequence) wrapped into the returned Score. Constructed by
 * render() (the composition root) with the production classes; unit tests swap in NoopFontLoader /
 * FakeScoreParser and a fake stage.
 */
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
	) {}

	async render(input: string | Blob): Promise<Score> {
		if (
			this.config.minLastSystemFill < 0 ||
			this.config.minLastSystemFill > 1
		) {
			throw new RangeError('render: minLastSystemFill must be between 0 and 1');
		}
		// Fonts before ANY layout or drawing: load() puts the fonts and CSS vars on the container
		// (the managed canvas inherits them) and sets VexFlow's global glyph fonts, which both the
		// planner's measurements and the drawer's engraving read.
		this.fontLoader.load(this.stage.container, this.config.fonts);

		const mdoc = await this.parser.parse(input);

		const parts = mdoc.score.parts;
		// Gap measures go into the parsed document itself, so everything downstream
		// (layout, draw, elements, sequence) sees them as ordinary empty measures.
		if (this.config.gaps.length > 0 && parts.length > 0) {
			insertGapMeasures(parts, this.config.gaps);
		}
		const geometry =
			parts.length > 0
				? this.scoreDrawer.draw(
						this.stage.base,
						parts,
						this.layoutPlanner.plan(parts, this.config),
					)
				: EMPTY_GEOMETRY;

		// The stage is the Viewport (score<->client transform) the elements map through, and the
		// decorations are what their color/halo toggles delegate to (drawing on overlay layers the
		// stage hands them). Both feed the factory, which links the elements and indexes them.
		const decorations = {
			color: new DefaultDecoration(this.stage, new ColorStyle()),
			halo: new DefaultDecoration(this.stage, new HaloStyle()),
		};
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
				? gapDocumentIndexes(this.config.gaps).map(({ gap, measureIndex }) => {
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
		return new Score(
			this.stage,
			elements,
			[decorations.color, decorations.halo],
			sequence,
			this.stage.scroller,
			gaps,
		);
	}
}
