import type { MDocument } from '@stringsync/mdom';
import { Rect } from 'webappwiz/geometry';
import { BarlineTranslator } from './barline-translator';
import { ChordTranslator } from './chord-translator';
import type { Config } from './config';
import type { Decorations } from './decoration';
import { DurationTranslator } from './duration-translator';
import type { ElementFactory } from './element-factory';
import type { ElementIndex } from './element-index';
import { FontShorthandPatch } from './font-shorthand-patch';
import type { Gaps } from './gaps';
import { LayoutPlanner } from './layout-planner';
import { MetricsPatch } from './metrics-patch';
import { NotationTranslator } from './notation-translator';
import type { PaintProbe } from './paint-probe';
import { ProbeTextCanvas } from './probe-text-canvas';
import type { GapInfo } from './score';
import { type DrawResult, ScoreDrawer } from './score-drawer';
import type { ScoreReader } from './score-reader';
import { ScoreRecording } from './score-recording';
import type { Sequence } from './sequence';
import type { SequenceFactory } from './sequence-factory';
import { SignatureTranslator } from './signature-translator';
import { snapshotConfig } from './snapshot-config';
import { SpannerBuilder } from './spanner-builder';
import { SpillResolver } from './spill-resolver';
import { StavePlan } from './stave-plan';
import { TabVoiceTranslator } from './tab-voice-translator';
import type { Viewport } from './viewport';
import { VoiceTranslator } from './voice-translator';

/* What engraving a document builds: the draw (null engraving for a score with no parts), the
 * elements, the timeline, each gap's timing, and the recording a snapshot is taken from. */
export interface EngravedScore {
	drawn: Omit<DrawResult, 'engraving'> & {
		engraving: DrawResult['engraving'] | null;
	};
	elements: ElementIndex;
	sequence: Sequence;
	gaps: GapInfo[];
	recording: ScoreRecording;
}

/*
 * Turns a parsed document into an engraved score: gaps placed, layout, the recorded draw, the
 * elements and the timeline. Shared by render, which shows what it builds on a stage, and by
 * createSnapshot, which keeps only the recording, so a snapshot made with no DOM is the one a
 * render would make. Text is measured through the probe it is handed, a browser canvas's or a
 * canvas library's.
 */
export class ScoreEngraver {
	constructor(
		private readonly config: Config,
		private readonly layoutPlanner: LayoutPlanner,
		private readonly scoreDrawer: ScoreDrawer,
		private readonly elementFactory: ElementFactory,
		private readonly sequenceFactory: SequenceFactory,
		private readonly configuredGaps: Gaps,
	) {}

	/* The engraver wired with the production classes, for the composition roots (render,
	 * createSnapshot). */
	static create(
		config: Config,
		reader: ScoreReader,
		gaps: Gaps,
		elements: ElementFactory,
		sequences: SequenceFactory,
	): ScoreEngraver {
		const durations = new DurationTranslator(reader);
		const barlines = new BarlineTranslator();
		const signatures = new SignatureTranslator();
		const staves = new StavePlan({
			showTabs: config.showTabs,
			showNotation: config.showNotation,
		});
		const tab = new TabVoiceTranslator(durations, config.tabStemPlacement);
		const chords = new ChordTranslator(durations, new NotationTranslator());
		// ONE translator instance shared by layout and draw: both must build identical vexflow
		// voices for the measured widths to match the drawn ones.
		const translator = new VoiceTranslator(chords, durations, barlines, reader);
		return new ScoreEngraver(
			config,
			new LayoutPlanner(translator, tab, signatures, staves, reader, gaps),
			new ScoreDrawer(
				config,
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
			elements,
			sequences,
			gaps,
		);
	}

	/* Throw on a config no engraving can honor, before any work. */
	check(): void {
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
	}

	/* Engrave `document`, its fonts already set up. The elements map through `viewport` and
	 * delegate their color and halo to `decorations`. */
	engrave(
		document: MDocument,
		probe: PaintProbe,
		viewport: Viewport,
		decorations: Decorations,
	): EngravedScore {
		// A gap is an ordinary measure of the document: found where the caller put it, or
		// inserted into vexml's own parse.
		if (document.score.parts.length > 0) {
			this.configuredGaps.resolve(document);
		}
		const parts = document.score.parts;
		// Before the layout, which builds the first vexflow elements: each measures its glyph
		// and copies its category's font and style.
		new ProbeTextCanvas(probe).install();
		new MetricsPatch().install();
		new FontShorthandPatch().install();
		const drawn =
			parts.length > 0
				? this.scoreDrawer.draw(
						probe,
						document.score,
						this.layoutPlanner.plan(document.score, this.config),
					)
				: {
						geometry: {
							bounds: new Rect(0, 0, 0, 0),
							notes: [],
							measures: [],
							chordDiagrams: [],
						},
						engraving: null,
						fold: null,
						pages: [],
					};
		const { geometry } = drawn;

		// The viewport is the score<->client transform the elements map through, and the
		// decorations are what their color/halo toggles delegate to. Both feed the factory, which
		// links the elements and indexes them.
		const model = this.elementFactory.model(geometry, parts);
		const elements = this.elementFactory.build(model, viewport, decorations);
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
			probe,
		);
		return { drawn, elements, sequence, gaps, recording };
	}
}
