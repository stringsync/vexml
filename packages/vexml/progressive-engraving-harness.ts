import * as path from 'node:path';
import { BarlineTranslator } from './barline-translator';
import { ChordTranslator } from './chord-translator';
import { type Config, DEFAULT_CONFIG, DEFAULT_STANDARD_LAYOUT } from './config';
import { DefaultScoreParser } from './default-score-parser';
import { DurationTranslator } from './duration-translator';
import { DynamicGlyphs } from './dynamic-glyphs';
import { ElementFactory } from './element-factory';
import { FakeCursorView } from './fake-cursor-view';
import { FakeHost } from './fake-host';
import { FakeIdleScheduler } from './fake-idle-scheduler';
import { FakePaintProbe } from './fake-paint-probe';
import type { Fold } from './fold';
import { GapInserter } from './gap-inserter';
import { Gaps } from './gaps';
import { LayoutPlanner } from './layout-planner';
import { NotationTranslator } from './notation-translator';
import { RecordingFontLoader } from './recording-font-loader';
import type { Score } from './score';
import { type Engraving, ScoreDrawer } from './score-drawer';
import { ScoreEngraver } from './score-engraver';
import { ScoreReader } from './score-reader';
import { type RenderStage, ScoreRenderer } from './score-renderer';
import type { ScoreSnapshot } from './score-snapshot';
import { SequenceFactory } from './sequence-factory';
import { SignatureTranslator } from './signature-translator';
import { SpannerBuilder } from './spanner-builder';
import { SpillResolver } from './spill-resolver';
import { StavePlan } from './stave-plan';
import { TabVoiceTranslator } from './tab-voice-translator';
import { VoiceTranslator } from './voice-translator';

export const DATA_DIR = path.resolve(
	import.meta.dir,
	'../integration/__data__',
);
// Many systems, so a first screen leaves most of the score to the slices.
export const LONG = 'score_schubert_gute_nacht.musicxml';
// A tie whose two halves sit on either side of a system break.
export const TIE_ACROSS_BREAK = 'tie_system_break.musicxml';
// A rights credit, which prints as the footer under the last system.
export const FOOTER = 'header_extras.musicxml';
export const FOOTER_TEXT = 'Copyright 2026 Public Domain';
// Narrow enough to break the tie fixture's two measures onto two systems.
export const NARROW = { ...DEFAULT_STANDARD_LAYOUT, referenceWidth: 360 };
// The ops drawing `text`, as the title's placement: once, centered on the page.
export function textOpsOf(engraving: Engraving | undefined, text: string) {
	return (engraving?.ops ?? []).filter(
		(op) =>
			(op.call.kind === 'fillText' || op.call.kind === 'strokeText') &&
			op.call.text === text,
	);
}

// What is wrong with the score's systems right now, as `system:measure` entries: a system not
// at its index, a column listed by a system other than its own or out of measure order, or a
// measure column no system lists. Empty when every column sits on exactly one system.
export function straySystemsOf(score: Score): string[] {
	const systems = score.getSystems();
	const strays = systems
		.filter((system, i) => system.getIndex() !== i)
		.map((system) => `${system.getIndex()}:index`);
	const listed: number[] = [];
	for (const system of systems) {
		const boxes = system.getMeasureBoxes();
		strays.push(
			...boxes
				.filter(
					(box, i) =>
						box.getSystem() !== system ||
						(i > 0 && box.getIndex() < (boxes[i - 1]?.getIndex() ?? 0)),
				)
				.map((box) => `${system.getIndex()}:${box.getIndex()}`),
		);
		listed.push(...boxes.map((box) => box.getIndex()));
	}
	const all = score
		.getElements()
		.measureBoxes()
		.map((box) => box.getIndex());
	strays.push(
		...all.filter((m) => !listed.includes(m)).map((m) => `none:${m}`),
	);
	return strays;
}

export function boxesOf(score: Score): string[] {
	return score
		.getElements()
		.measureBoxes()
		.map((box) => `${box.getIndex()}:${JSON.stringify(box.rect)}`);
}

export function stavesOf(score: Score): string[] {
	return score
		.getParts()
		.flatMap((part) => part.getMeasures())
		.flatMap((measure) =>
			measure
				.getStaves()
				.map(
					(s) =>
						`${measure.getIndex()}:${s.getNumber()}:${s.getLineYs()}:${JSON.stringify(s.getRect())}:${s.getNoteStartX()}`,
				),
		);
}

export function stepsOf(score: Score): string[] {
	return score
		.getSequence()
		.getSteps()
		.map(
			(s) => `${s.index}:${s.x}:${s.glideToX}:${JSON.stringify(s.systemRect)}`,
		);
}

export function cursorRectAt(score: Score, ms: number) {
	const cursor = score.createCursor();
	const view = new FakeCursorView();
	cursor.sync(view);
	cursor.seekMs(ms);
	const rect = view.events.at(-1)?.position.rect;
	cursor.dispose();
	return rect;
}

// The whole render of LONG is the reference many tests read and none change, so it is built once.
let wholeLongRender: ReturnType<typeof render> | undefined;
export function wholeLong() {
	wholeLongRender ??= render(LONG);
	return wholeLongRender;
}

export async function render(
	fixture: string | ScoreSnapshot,
	overrides: Partial<Config> = {},
	visibleBottom = 400,
) {
	const config = { ...DEFAULT_CONFIG, ...overrides };
	const stage = new ProgressiveFakeStage(visibleBottom);
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
	const renderer = new ScoreRenderer(
		config,
		stage,
		new RecordingFontLoader(),
		new DefaultScoreParser(),
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
	const score = await renderer.render(
		typeof fixture === 'string'
			? await Bun.file(path.join(DATA_DIR, fixture)).text()
			: fixture,
	);
	return { score, stage, scheduler };
}

// A headless stage recording what it is shown: every engraving (whole or extended, the last one
// current) and each extension's `from`. Its view shows the score down to `bottom` (400 score px
// by default, a few systems of a long score).
export class ProgressiveFakeStage extends FakeHost implements RenderStage {
	readonly container = {} as HTMLDivElement;
	readonly base = {} as HTMLElement;
	readonly probe = new FakePaintProbe();
	readonly folds: Fold[] = [];
	readonly engravings: Engraving[] = [];
	readonly extensions: Array<{ engraving: Engraving; from: number }> = [];
	readonly pixelRatio = 1;

	constructor(private readonly bottom: number) {
		super();
	}

	engrave(engraving: Engraving): void {
		this.engravings.push(engraving);
	}

	extendEngraving(engraving: Engraving, from: number): void {
		this.engravings.push(engraving);
		this.extensions.push({ engraving, from });
	}

	visibleBottom(): number {
		return this.bottom;
	}

	/* How many systems the first screen showed: the extensions before render() resolved. */
	shownSystems(): number {
		return this.extensions.length;
	}

	setFold(fold: Fold): void {
		this.folds.push(fold);
	}

	paperColor(): string {
		return '#ffffff';
	}

	paintEngraving(): void {}
}
