import { beforeEach, describe, expect, it } from 'bun:test';
import { BarlineTranslator } from './barline-translator';
import { ChordTranslator } from './chord-translator';
import { type Config, DEFAULT_CONFIG, DEFAULT_PAGED_LAYOUT } from './config';
import { DurationTranslator } from './duration-translator';
import { DynamicGlyphs } from './dynamic-glyphs';
import { ElementFactory } from './element-factory';
import { FakeHost } from './fake-host';
import { FakePaintProbe } from './fake-paint-probe';
import { FakeScoreParser } from './fake-score-parser';
import type { Fold } from './fold';
import { GapInserter } from './gap-inserter';
import { Gaps } from './gaps';
import { LayoutPlanner } from './layout-planner';
import { NotationTranslator } from './notation-translator';
import { RecordingFontLoader } from './recording-font-loader';
import { type Engraving, ScoreDrawer } from './score-drawer';
import { ScoreReader } from './score-reader';
import { type RenderStage, ScoreRenderer } from './score-renderer';
import { SequenceFactory } from './sequence-factory';
import { SignatureTranslator } from './signature-translator';
import { SpannerBuilder } from './spanner-builder';
import { SpillResolver } from './spill-resolver';
import { StavePlan } from './stave-plan';
import { TabVoiceTranslator } from './tab-voice-translator';
import { VoiceTranslator } from './voice-translator';

describe('ScoreRenderer', () => {
	let stage: FakeStage;
	let fontLoader: RecordingFontLoader;
	let parser: FakeScoreParser;

	beforeEach(() => {
		stage = new FakeStage();
		fontLoader = new RecordingFontLoader();
		parser = new FakeScoreParser();
	});

	// The config is the only thing a test varies, and it reaches three collaborators, so the
	// renderer is built per test rather than in beforeEach.
	const renderer = (overrides?: Partial<Config>) => {
		const config = { ...DEFAULT_CONFIG, ...overrides };
		const reader = new ScoreReader(new DynamicGlyphs());
		const durations = new DurationTranslator(reader);
		const barlines = new BarlineTranslator();
		const signatures = new SignatureTranslator();
		const staves = new StavePlan({ showTabs: true, showNotation: true });
		const tab = new TabVoiceTranslator(durations, 'none');
		const chords = new ChordTranslator(durations, new NotationTranslator());
		const translator = new VoiceTranslator(chords, durations, barlines, reader);
		const gaps = new Gaps([], new GapInserter(reader));
		return new ScoreRenderer(
			config,
			stage,
			fontLoader,
			parser,
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
			new ElementFactory(),
			new SequenceFactory(reader, gaps),
			gaps,
		);
	};

	it('rejects a negative minLastSystemFill before doing any work', async () => {
		const scoreRenderer = renderer({ minLastSystemFill: -0.1 });
		await expect(scoreRenderer.render('<xml/>')).rejects.toThrow(RangeError);
		expect(fontLoader.calls).toHaveLength(0);
		expect(parser.parses).toBe(0);
	});

	it('rejects a minLastSystemFill above 1 before doing any work', async () => {
		const scoreRenderer = renderer({ minLastSystemFill: 1.1 });
		await expect(scoreRenderer.render('<xml/>')).rejects.toThrow(RangeError);
		expect(fontLoader.calls).toHaveLength(0);
		expect(parser.parses).toBe(0);
	});

	it('rejects a pixelRatio that is not positive before doing any work', async () => {
		const scoreRenderer = renderer({ pixelRatio: 0 });
		await expect(scoreRenderer.render('<xml/>')).rejects.toThrow(RangeError);
		expect(fontLoader.calls).toHaveLength(0);
	});

	it('rejects a page no larger than its margins before doing any work', async () => {
		const scoreRenderer = renderer({
			layout: { ...DEFAULT_PAGED_LAYOUT, pageHeight: 96, margin: 48 },
		});
		await expect(scoreRenderer.render('<xml/>')).rejects.toThrow(RangeError);
		expect(fontLoader.calls).toHaveLength(0);
	});

	it('gives a score with no parts no pages', async () => {
		const score = await renderer({ layout: DEFAULT_PAGED_LAYOUT }).render(
			'<xml/>',
		);
		expect(score.getPages()).toEqual([]);
	});

	it('loads fonts (with the config fonts) before parsing', async () => {
		await renderer().render('<xml/>');
		expect(fontLoader.calls).toEqual([DEFAULT_CONFIG.fonts]);
		expect(parser.parses).toBe(1);
	});

	it('renders an empty Score without drawing when the document has no parts', async () => {
		const score = await renderer().render('<xml/>');
		expect(score.getDurationMs()).toBe(0);
		expect(score.getDurationBeats()).toBe(0);
		expect(score.getMeasureCount()).toBe(0);
		expect(score.getElements().all()).toEqual([]);
		expect(score.getTimeAt({ x: 0, y: 0 })).toBeNull();
	});

	it('hands the stage to the Score it returns, which tears it down on dispose', async () => {
		const score = await renderer().render('<xml/>');
		score.dispose();
		expect(stage.disposed).toBe(true);
	});
});

// A headless stage: the Host fake plus what RenderStage adds. The empty-parts path
// never touches container/base, so inert placeholders are enough, and any layout or draw attempt
// would crash on them, which is what proves the path was skipped.
class FakeStage extends FakeHost implements RenderStage {
	readonly container = {} as HTMLDivElement;
	readonly base = {} as HTMLElement;
	readonly probe = new FakePaintProbe();
	readonly folds: Fold[] = [];
	readonly engravings: Engraving[] = [];

	engrave(engraving: Engraving): void {
		this.engravings.push(engraving);
	}

	setFold(fold: Fold): void {
		this.folds.push(fold);
	}

	readonly pixelRatio = 1;

	paperColor(): string {
		return '#ffffff';
	}

	paintEngraving(): void {}
}
