import * as path from 'node:path';
import type { MDocument } from '@stringsync/mdom';
import { BarlineTranslator } from './barline-translator';
import { ChordTranslator } from './chord-translator';
import { type Config, DEFAULT_CONFIG } from './config';
import { DefaultScoreParser } from './default-score-parser';
import { DurationTranslator } from './duration-translator';
import { DynamicGlyphs } from './dynamic-glyphs';
import { ElementFactory } from './element-factory';
import { FakeIdleScheduler } from './fake-idle-scheduler';
import { FakeStage } from './fake-stage';
import { GapInserter } from './gap-inserter';
import { Gaps } from './gaps';
import { LayoutPlanner } from './layout-planner';
import { NotationTranslator } from './notation-translator';
import { RecordingFontLoader } from './recording-font-loader';
import { ScoreDrawer } from './score-drawer';
import { ScoreEngraver } from './score-engraver';
import { ScoreReader } from './score-reader';
import { ScoreRenderer } from './score-renderer';
import type { ScoreSnapshot } from './score-snapshot';
import { SequenceFactory } from './sequence-factory';
import { SignatureTranslator } from './signature-translator';
import { SpannerBuilder } from './spanner-builder';
import { SpillResolver } from './spill-resolver';
import { StavePlan } from './stave-plan';
import { TabVoiceTranslator } from './tab-voice-translator';
import { VoiceTranslator } from './voice-translator';

const DATA_DIR = path.resolve(import.meta.dir, '../integration/__data__');

/* Test-only: a score rendered from an integration fixture, a document or a snapshot through the
 * real engraving pipeline onto a FakeStage, with no DOM. */
export async function renderedScore(
	input: string | MDocument | ScoreSnapshot,
	overrides: Partial<Config> = {},
	visibleBottom = 400,
) {
	const config = { ...DEFAULT_CONFIG, ...overrides };
	const stage = new FakeStage(visibleBottom);
	const scheduler = new FakeIdleScheduler();
	const reader = new ScoreReader(new DynamicGlyphs());
	const durations = new DurationTranslator(reader);
	const barlines = new BarlineTranslator();
	const signatures = new SignatureTranslator();
	const staves = new StavePlan({ showTabs: true, showNotation: true });
	const tab = new TabVoiceTranslator(durations, reader, 'none');
	const chords = new ChordTranslator(
		durations,
		new NotationTranslator(reader),
		reader,
	);
	const translator = new VoiceTranslator(chords, durations, barlines, reader);
	const gaps = new Gaps([], new GapInserter(reader));
	const elements = new ElementFactory();
	const sequences = new SequenceFactory(reader, gaps);
	const parser = new DefaultScoreParser();
	const renderer = new ScoreRenderer(
		config,
		stage,
		new RecordingFontLoader(),
		parser,
		new ScoreEngraver(
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
				new SpannerBuilder(reader),
				gaps,
				new SpillResolver(),
			),
			elements,
			sequences,
			gaps,
			reader,
			staves,
		),
		elements,
		sequences,
		scheduler,
	);
	let document: MDocument | null = null;
	let resolved = input;
	if (typeof input === 'string') {
		document = await parser.parse(
			await Bun.file(path.join(DATA_DIR, input)).text(),
		);
		resolved = document;
	}
	const score = await renderer.render(resolved);
	return { score, document, scheduler, stage };
}
