import type { Config } from './config';
import { DefaultDecorator } from './elements/decorations';
import type { ElementFactory } from './elements/element-factory';
import type { FontLoader } from './engraving/fonts';
import type { LayoutPlanner } from './engraving/layout-planner';
import type { RawGeometry, ScoreDrawer } from './engraving/score-drawer';
import { Rect } from './geometry';
import type { Scroller } from './host/scroll-controller';
import type { Host } from './host/stage';
import type { SequenceFactory } from './playback/sequence-factory';
import { Score } from './score';
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
	readonly scroller: Scroller & { cancel(): void };
}

/*
 * Runs the render pipeline over injected collaborators: fonts, parse, plan, draw, then the
 * interaction model (elements/decorator/sequence) wrapped into the returned Score. Constructed by
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
		const geometry =
			parts.length > 0
				? this.scoreDrawer.draw(
						this.stage.base,
						parts,
						this.layoutPlanner.plan(parts, this.config),
					)
				: EMPTY_GEOMETRY;

		// The stage is the Viewport (score<->client transform) the elements map through, and the
		// decorator is what their color/halo toggles delegate to (drawing on a content layer the
		// stage hands it). Both feed the factory, which links the elements and indexes them.
		const decorator = new DefaultDecorator(this.stage);
		const elements = this.elementFactory.build(
			geometry,
			parts,
			this.stage,
			decorator,
		);
		// The playback timeline: the parsed parts give onsets/meter/tempo/repeats/ties, the
		// geometry gives note x and system boxes, and noteLookup ties active notes to the same
		// identities hit-testing returns. Built for every score (empty when there are no parts).
		const sequence = this.sequenceFactory.create(
			parts,
			geometry,
			elements.noteLookup,
		);
		return new Score(
			this.stage,
			elements,
			decorator,
			sequence,
			this.stage.scroller,
		);
	}
}
