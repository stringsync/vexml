import type { Config } from './config';
import { DefaultDecoration } from './decoration/default-decoration';
import { ColorStyle } from './decoration-style/color-style';
import { HaloStyle } from './decoration-style/halo-style';
import type { ElementFactory } from './element-factory';
import type { FontLoader } from './font-loader/font-loader';
import type { Gaps } from './gaps';
import { Rect } from './geometry';
import type { Host } from './host/host';
import type { LayoutPlanner } from './layout-planner';
import { type GapInfo, Score } from './score';
import type { RawGeometry, ScoreDrawer } from './score-drawer';
import type { ScoreParser } from './score-parser/score-parser';
import type { Scroller } from './scroller/scroller';
import type { SequenceFactory } from './sequence-factory';

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
		if (parts.length > 0) {
			this.configuredGaps.insertInto(parts);
		}
		const geometry =
			parts.length > 0
				? this.scoreDrawer.draw(
						this.stage.base,
						mdoc.score,
						this.layoutPlanner.plan(mdoc.score, this.config),
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
