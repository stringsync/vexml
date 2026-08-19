import { beforeEach, describe, expect, it } from 'bun:test';
import { BarlineTranslator } from './barline-translator';
import { ChordTranslator } from './chord-translator';
import { DEFAULT_CONFIG, type FontConfig } from './config';
import { DurationTranslator } from './duration-translator';
import { ElementFactory } from './element-factory';
import { FakeHost } from './fake-host';
import { FakeScoreParser } from './fake-score-parser';
import { Gaps } from './gaps';
import { LayoutPlanner } from './layout-planner';
import { NoopFontLoader } from './noop-font-loader';
import { NotationTranslator } from './notation-translator';
import { ScoreDrawer } from './score-drawer';
import { ScoreReader } from './score-reader';
import { type RenderStage, ScoreRenderer } from './score-renderer';
import { SequenceFactory } from './sequence-factory';
import { SignatureTranslator } from './signature-translator';
import { SpannerBuilder } from './spanner-builder';
import { SpillResolver } from './spill-resolver';
import { StavePlan } from './stave-plan';
import { TabVoiceTranslator } from './tab-voice-translator';
import { VoiceTranslator } from './voice-translator';

// A headless stage: the Host fake plus the two DOM nodes RenderStage adds. The empty-parts path
// never touches container/base, so inert placeholders are enough — and any layout or draw attempt
// would crash on them, which is what proves the path was skipped.
class FakeStage extends FakeHost implements RenderStage {
	readonly container = {} as HTMLDivElement;
	readonly base = {} as HTMLCanvasElement;
}

// A FontLoader that records its calls, to pin the fonts-before-parse ordering.
class RecordingFontLoader extends NoopFontLoader {
	calls: Array<FontConfig | undefined> = [];
	override load(
		container: HTMLElement,
		config?: FontConfig,
	): { notation: string; text: string } {
		this.calls.push(config);
		return super.load(container, config);
	}
}

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
	const renderer = (overrides?: { minLastSystemFill?: number }) => {
		const config = { ...DEFAULT_CONFIG, ...overrides };
		const durations = new DurationTranslator();
		const barlines = new BarlineTranslator();
		const signatures = new SignatureTranslator();
		const staves = new StavePlan({ showTabs: true, showNotation: true });
		const tab = new TabVoiceTranslator(durations);
		const chords = new ChordTranslator(durations, new NotationTranslator());
		const translator = new VoiceTranslator(chords, durations, barlines);
		const reader = new ScoreReader();
		const gaps = new Gaps([]);
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
