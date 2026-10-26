import type { MDocument } from '@stringsync/mdom';
import type { Rect } from 'webappwiz/geometry';
import type { Config } from './config';
import { DefaultDecorations } from './default-decorations';
import type { Drawing } from './drawing';
import type { ElementFactory } from './element-factory';
import type { ElementIndex } from './element-index';
import type { Fold } from './fold';
import type { FontLoader, FontSample } from './font-loader';
import { FontSamples } from './font-samples';
import { GlyphCollector } from './glyph-collector';
import type { Host } from './host';
import type { IdleScheduler } from './idle-scheduler';
import { Page } from './page';
import type { PagePainter } from './page-painter';
import type { PaintProbe } from './paint-probe';
import type { ProgressiveSink, ProgressiveView } from './progressive-engraving';
import { ProgressiveRecording } from './progressive-recording';
import { type GapInfo, Score } from './score';
import type { Engraving } from './score-drawer';
import type { ScoreEngraver } from './score-engraver';
import type { ScoreParser } from './score-parser';
import type { ScoreSnapshot } from './score-snapshot';
import type { Scroller } from './scroller';
import type { Sequence } from './sequence';
import type { SequenceFactory } from './sequence-factory';
import { type ReadSnapshot, SnapshotReader } from './snapshot-reader';
import type { SnapshotSource } from './snapshot-source';
import { StoredSnapshot } from './stored-snapshot';

/* What the renderer needs from the stage: the container fonts/CSS vars land on, the base element
 * the engraving is shown in, the probe its recording measures text with, where the engraving and
 * a sticky fold go, the Host surface handed to the Score, and the painter its pages draw with.
 * Stage implements it for real; a unit test injects a fake. */
export interface RenderStage
	extends Host,
		PagePainter,
		ProgressiveSink,
		ProgressiveView {
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
		private readonly engraver: ScoreEngraver,
		private readonly elementFactory: ElementFactory,
		private readonly sequenceFactory: SequenceFactory,
		// Runs a progressive render's slices (see Config.progressive).
		private readonly scheduler: IdleScheduler,
	) {}

	async render(
		input: string | Blob | MDocument | ScoreSnapshot,
	): Promise<Score> {
		this.engraver.check();
		// Fonts before ANY layout or drawing: load() puts the fonts and CSS vars on the container
		// (the base element inherits them) and sets VexFlow's global glyph fonts, which both the
		// planner's measurements and the drawer's engraving read.
		const fonts = this.fontLoader.load(this.stage.container, this.config.fonts);
		if (SnapshotReader.isSnapshot(input)) {
			// A snapshot that carries its text's outlines draws nothing in a font, its notes'
			// color stamps included, so its Score needn't wait on one: the fonts finish loading
			// for whatever a caller draws later. A failed load leaves them on their fallbacks.
			const read = new SnapshotReader(this.config).read(input);
			if (input.outlines) {
				fonts.catch(() => {});
			} else {
				await fonts;
				// Its text paints in the fonts, so every glyph it paints must be resident first.
				await this.fontLoader.ensure(this.textOf(read.engraving));
			}
			return this.restore(input, read);
		}
		await fonts;

		// A face split by unicode-range loads each file on the first glyph it covers, so the first
		// engraving may have measured a rare glyph in a fallback. It notes what it measured; when
		// a face of that had to load, the engraving starts over from a fresh parse (gaps insert
		// into vexml's own) with the faces resident, as it would have with the whole face loaded.
		const collector = new GlyphCollector(this.stage.probe);
		const first = await this.engrave(input, collector);
		if (!(await this.fontLoader.ensure(collector.samples()))) {
			return first();
		}
		this.stage.probe.forget();
		return (await this.engrave(input, this.stage.probe))();
	}

	/* Lay out `input` with `probe` measuring, drawing nothing on the stage yet: the returned
	 * function shows it and makes the Score. */
	private async engrave(
		input: string | Blob | MDocument,
		probe: PaintProbe,
	): Promise<() => Score> {
		const document = await this.parser.parse(input);
		// The stage is the Viewport (score<->client transform) the elements map through, and the
		// decorations draw on overlay layers the stage hands them.
		const decorations = new DefaultDecorations(this.stage);
		// Only a standard layout is drawn a system at a time: a panoramic line is one system,
		// and a paged score is placed on its pages as a whole.
		const progressive =
			this.config.progressive && this.config.layout.type === 'standard'
				? this.engraver.beginProgressive(
						document,
						probe,
						this.stage,
						decorations,
						this.scheduler,
						this.stage,
					)
				: null;
		if (progressive) {
			return () => {
				progressive.drawFirstScreen(this.stage);
				const score = this.score(
					progressive.elements,
					decorations,
					progressive.sequence,
					progressive.gaps,
					[],
					new ProgressiveRecording(progressive),
					progressive,
				);
				progressive.start();
				return score;
			};
		}
		const engraved = this.engraver.engrave(
			document,
			probe,
			this.stage,
			decorations,
		);
		return () => {
			this.show(engraved.drawn.engraving, engraved.drawn.fold);
			return this.score(
				engraved.elements,
				decorations,
				engraved.sequence,
				engraved.gaps,
				engraved.drawn.pages,
				engraved.recording,
			);
		};
	}

	/* Build the Score a snapshot recorded: decoded, not parsed, laid out or drawn. Its config was
	 * checked against this one before the stage was built (see render.ts). */
	private restore(snapshot: ScoreSnapshot, read: ReadSnapshot): Score {
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

	/* The text an engraving paints, by font. */
	private textOf(engraving: Engraving | null): FontSample[] {
		const samples = new FontSamples();
		for (const op of engraving?.ops ?? []) {
			if (op.call.kind === 'fillText' || op.call.kind === 'strokeText') {
				samples.add(String(op.state.props.font), op.call.text);
			}
		}
		return samples.list();
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
		drawing?: Drawing,
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
			drawing,
		);
	}
}
