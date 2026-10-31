import type { Score } from '@stringsync/mdom';
import type { Rect } from 'core/geometry';
import type { BarlineTranslator } from './barline-translator';
import type { ChordTranslator } from './chord-translator';
import type { Config } from './config';
import type { Fold } from './fold';
import type { Gaps } from './gaps';
import type {
	RawChordDiagram,
	RawMeasure,
	RawNote,
} from './geometry-collector';
import type { LayoutPlan } from './layout-plan';
import type { ScoreLayout } from './layout-planner';
import type { PaintOp } from './paint-op';
import type { PaintProbe } from './paint-probe';
import type { ScoreReader } from './score-reader';
import type { SignatureTranslator } from './signature-translator';
import type { SpannerBuilder } from './spanner-builder';
import type { SpillResolver } from './spill-resolver';
import type { StavePlan } from './stave-plan';
import { SystemDraw } from './system-draw';
import type { TabVoiceTranslator } from './tab-voice-translator';
import type { GridOrigin } from './tile-grid';
import type { VoiceTranslator } from './voice-translator';
import { WholeLayoutPlan } from './whole-layout-plan';

/* Everything the draw pass emits for the index, in score space (crop already applied). */
export interface RawGeometry {
	bounds: Rect;
	notes: RawNote[];
	measures: RawMeasure[];
	chordDiagrams: RawChordDiagram[];
}

/* The engraving as recorded ops, ready for the stage to replay: its size in score px, where
 * the recording's origin lands in score space (the headroom above the first system is cropped;
 * exact, the stage snaps it to its device pixels), and the CSS px each score px is shown at (a
 * panoramic scale or fitHeight; 1 otherwise). */
export interface Engraving {
	ops: readonly PaintOp[];
	width: number;
	height: number;
	origin: GridOrigin;
	scale: number;
	/* Names the ops, for a snapshot's: a paint of the same snapshot carries it, and the stage
	 * adopts that paint's tiles (see Stage.engrave). */
	fingerprint?: string;
}

/* What a draw hands back: the hit-index geometry, the engraving, the sticky panoramic fold
 * when the config asks for one, and each page's box in score space (none unless paged). */
export interface DrawResult {
	geometry: RawGeometry;
	engraving: Engraving;
	fold: Fold | null;
	pages: Rect[];
}

/*
 * Draws the laid-out score into a recording, a system at a time (see SystemDraw): the whole
 * score at once, or begun and continued by a caller that shows the first systems before the
 * rest are drawn. The stage replays the recording into tiles.
 */
export class ScoreDrawer {
	constructor(
		private config: Config,
		private translator: VoiceTranslator,
		private chords: ChordTranslator,
		private tab: TabVoiceTranslator,
		private signatures: SignatureTranslator,
		private staves: StavePlan,
		private barlines: BarlineTranslator,
		private reader: ScoreReader,
		private spanners: SpannerBuilder,
		private gaps: Gaps,
		private spillResolver: SpillResolver,
	) {}

	/*
	 * Draw the whole score: one stave per part-staff per measure,
	 * placed at the boxes computed by the layout planner, with clefs/keys/time
	 * signatures, notes, and the brace/barline connectors that group parts into
	 * systems. Returns the hit-index geometry (notehead/fret/measure boxes) in final
	 * score space, the engraving, and the sticky fold when a panoramic layout asks for one.
	 * `probe` answers the text measurements the recording needs.
	 */
	draw(probe: PaintProbe, score: Score, layout: ScoreLayout): DrawResult {
		const run = this.begin(probe, score, new WholeLayoutPlan(layout));
		while (!run.done()) {
			run.drawNext();
		}
		return run.result();
	}

	/* Begin a draw to continue a system at a time (see SystemDraw), over a layout placed as the
	 * systems are drawn or planned whole (see LayoutPlan). */
	begin(probe: PaintProbe, score: Score, plan: LayoutPlan): SystemDraw {
		return new SystemDraw(
			{
				config: this.config,
				translator: this.translator,
				chords: this.chords,
				tab: this.tab,
				signatures: this.signatures,
				staves: this.staves,
				barlines: this.barlines,
				reader: this.reader,
				spanners: this.spanners,
				gaps: this.gaps,
				spillResolver: this.spillResolver,
			},
			probe,
			score,
			plan,
		);
	}
}
