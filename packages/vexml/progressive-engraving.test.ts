import { describe, expect, it } from 'bun:test';
import * as path from 'node:path';
import { BarlineTranslator } from './barline-translator';
import { ChordTranslator } from './chord-translator';
import {
	type Config,
	DEFAULT_CONFIG,
	DEFAULT_PANORAMIC_LAYOUT,
	DEFAULT_STANDARD_LAYOUT,
} from './config';
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

const DATA_DIR = path.resolve(import.meta.dir, '../integration/__data__');
// Many systems, so a first screen leaves most of the score to the slices.
const LONG = 'score_schubert_gute_nacht.musicxml';
// A tie whose two halves sit on either side of a system break.
const TIE_ACROSS_BREAK = 'tie_system_break.musicxml';
// A rights credit, which prints as the footer under the last system.
const FOOTER = 'header_extras.musicxml';
const FOOTER_TEXT = 'Copyright 2026 Public Domain';
// Narrow enough to break the tie fixture's two measures onto two systems.
const NARROW = { ...DEFAULT_STANDARD_LAYOUT, referenceWidth: 360 };

describe('ProgressiveEngraving', () => {
	it('resolves render() with the first screen drawn and the rest pending', async () => {
		const whole = await render(LONG);
		const { score, stage, scheduler } = await render(LONG, {
			progressive: true,
		});

		expect(score.isComplete()).toBe(false);
		expect(scheduler.pending).toBe(1);
		expect(stage.shownSystems()).toBeLessThan(whole.score.getSystems().length);
		expect(score.getMeasureCount()).toBe(whole.score.getMeasureCount());
		expect(score.getDurationMs()).toBe(whole.score.getDurationMs());
		expect(score.getSequence().length).toBe(whole.score.getSequence().length);
	});

	it("draws the rest in slices, naming each slice's systems in a draw event, then completes", async () => {
		const { score, scheduler } = await render(LONG, { progressive: true });
		const drawn: number[][] = [];
		let completes = 0;
		score.events.on('draw', (e) => drawn.push([...e.systems]));
		score.events.on('complete', () => completes++);
		const settled = Promise.race([
			score.whenComplete().then(() => 'complete'),
			Promise.resolve('pending'),
		]);

		// A zero budget runs one piece of a system per slice: the first settles none, and each
		// event names exactly one.
		scheduler.run(0);
		expect(drawn).toEqual([]);
		expect(score.isComplete()).toBe(false);
		await expect(settled).resolves.toBe('pending');
		scheduler.runAll(0);
		expect(new Set(drawn.map((systems) => systems.length))).toEqual(
			new Set([1]),
		);

		const systems = drawn.flat();
		expect(systems).toEqual([...systems].sort((a, b) => a - b));
		expect(systems.at(-1)).toBe(score.getSystems().length - 1);
		expect(score.isComplete()).toBe(true);
		expect(completes).toBe(1);
		expect(scheduler.pending).toBe(0);
		await score.whenComplete();
	});

	it('spends an idle slice on as many systems as its budget holds', async () => {
		const { score, scheduler } = await render(LONG, { progressive: true });
		const drawn: number[][] = [];
		score.events.on('draw', (e) => drawn.push([...e.systems]));

		scheduler.run(Number.POSITIVE_INFINITY);

		expect(drawn).toHaveLength(1);
		expect(score.isComplete()).toBe(true);
	});

	it('matches a whole render once complete: ops, element boxes and step geometry', async () => {
		const whole = await render(LONG);
		const { score, stage, scheduler } = await render(LONG, {
			progressive: true,
		});
		scheduler.runAll();

		const engraving = stage.engravings.at(-1);
		expect(engraving?.ops).toEqual(whole.stage.engravings[0]?.ops ?? []);
		expect(engraving?.height).toBe(whole.stage.engravings[0]?.height ?? -1);
		expect(boxesOf(score)).toEqual(boxesOf(whole.score));
		expect(stepsOf(score)).toEqual(stepsOf(whole.score));
		expect(score.getElements().all().length).toBe(
			whole.score.getElements().all().length,
		);
	});

	it('shows the stage only the ops each system adds', async () => {
		const { stage, scheduler } = await render(LONG, { progressive: true });
		scheduler.runAll();

		for (let i = 1; i < stage.extensions.length; i++) {
			const previous = stage.extensions[i - 1];
			const current = stage.extensions[i];
			expect(current?.from).toBe(previous?.engraving.ops.length ?? -1);
		}
	});

	it('places a cursor moved onto an undrawn system where a whole render would', async () => {
		const whole = await render(LONG);
		const { score, scheduler } = await render(LONG, { progressive: true });
		const lastMs = score.getDurationMs() - 1;
		const expected = cursorRectAt(whole.score, lastMs);

		const before = score.isComplete();
		const rect = cursorRectAt(score, lastMs);

		expect(before).toBe(false);
		expect(rect).toEqual(expected);
		expect(score.isComplete()).toBe(true);
		scheduler.runAll();
		expect(scheduler.pending).toBe(0);
	});

	it('pauses a system part way through, showing none of it until a cursor moved past finishes it', async () => {
		const whole = await render(LONG);
		const { score, stage, scheduler } = await render(LONG, {
			progressive: true,
		});
		const shown = stage.extensions.length;
		const lastMs = score.getDurationMs() - 1;

		// The plan's piece, then the next system's draw.
		scheduler.run(0);
		scheduler.run(0);
		const paused = stage.extensions.length;
		const rect = cursorRectAt(score, lastMs);
		scheduler.runAll();

		expect(paused).toBe(shown);
		expect(rect).toEqual(cursorRectAt(whole.score, lastMs));
		expect(stage.engravings.at(-1)?.ops).toEqual(
			whole.stage.engravings[0]?.ops ?? [],
		);
		expect(boxesOf(score)).toEqual(boxesOf(whole.score));
		expect(stepsOf(score)).toEqual(stepsOf(whole.score));
	});

	it('forecasts the undrawn systems, keeping every column on a system until the count settles', async () => {
		const whole = await render(LONG);
		const { score, scheduler } = await render(LONG, { progressive: true });
		const counts = [score.getSystems().length];
		const strays = straySystemsOf(score);
		// A zero budget settles one system per event: the systems are checked after each.
		score.events.on('draw', () => {
			counts.push(score.getSystems().length);
			strays.push(...straySystemsOf(score));
		});
		scheduler.runAll(0);

		// The forecast moves the count as the plan lands; the drawn systems hold it afterwards.
		expect(strays).toEqual([]);
		expect(new Set(counts).size).toBeGreaterThan(1);
		expect(counts.at(-1)).toBe(whole.score.getSystems().length);
		expect(boxesOf(score)).toEqual(boxesOf(whole.score));
	});

	it('widens the page when a later system is wider, drawing the header again across it', async () => {
		// Too narrow for the score's widest measures: a system planned after the first screen
		// widens the page, which a whole render knew from the start.
		const layout = { ...DEFAULT_STANDARD_LAYOUT, referenceWidth: 200 };
		const whole = await render(LONG, { layout });
		const { stage, scheduler } = await render(LONG, {
			progressive: true,
			layout,
		});
		const firstScreen = stage.engravings.at(-1);
		scheduler.runAll();

		// The systems drawn before the page widened keep their draw, so only the header, drawn
		// again, and the page are the whole render's.
		const final = stage.engravings.at(-1);
		expect(firstScreen?.width).toBeLessThan(final?.width ?? 0);
		expect(final?.width).toBe(whole.stage.engravings[0]?.width ?? -1);
		expect(textOpsOf(final, 'Gute Nacht')).toEqual(
			textOpsOf(whole.stage.engravings[0], 'Gute Nacht'),
		);
	});

	it('draws the footer under the last system, whole and progressively', async () => {
		const whole = await render(FOOTER, { showHeader: true });
		const { stage, scheduler } = await render(FOOTER, {
			showHeader: true,
			progressive: true,
		});
		scheduler.runAll();

		expect(textOpsOf(whole.stage.engravings[0], FOOTER_TEXT)).toHaveLength(1);
		expect(stage.engravings.at(-1)?.ops).toEqual(
			whole.stage.engravings[0]?.ops ?? [],
		);
	});

	it('finds nothing under a pointer over an undrawn system', async () => {
		const whole = await render(LONG);
		const { score } = await render(LONG, { progressive: true });
		const box = whole.score.getSystems().at(-1)?.getMeasureBoxes().at(-1);
		if (!box) {
			throw new Error('fixture has no measure in its last system');
		}
		const point = {
			x: box.rect.x + box.rect.w / 2,
			y: box.rect.y + box.rect.h / 2,
		};

		expect(whole.score.getElements().at(point)).not.toBeNull();
		expect(score.getElements().at(point)).toBeNull();
		expect(score.getTimeAt(point)).toBeNull();
	});

	it('cancels the pending slice on dispose, and a late slice does nothing', async () => {
		const { score, scheduler } = await render(LONG, { progressive: true });
		let completes = 0;
		score.events.on('complete', () => completes++);

		score.dispose();

		expect(scheduler.pending).toBe(0);
		expect(() => scheduler.runAll()).not.toThrow();
		expect(completes).toBe(0);
	});

	it('draws a tie across a system break whole, each half with its system', async () => {
		const whole = await render(TIE_ACROSS_BREAK, { layout: NARROW });
		// A view too short for a second system: the tie's end waits for a slice.
		const { score, stage, scheduler } = await render(
			TIE_ACROSS_BREAK,
			{ progressive: true, layout: NARROW },
			0,
		);
		expect(score.getSystems().length).toBeGreaterThan(1);
		expect(score.isComplete()).toBe(false);

		scheduler.runAll();

		expect(stage.engravings.at(-1)?.ops).toEqual(
			whole.stage.engravings[0]?.ops ?? [],
		);
	});

	it('draws whatever is left before taking a snapshot', async () => {
		const whole = await render(LONG);
		const { score } = await render(LONG, { progressive: true });

		const snapshot = score.snapshot();

		expect(score.isComplete()).toBe(true);
		expect(snapshot.engraving).toEqual(whole.score.snapshot().engraving);
	});

	it('gives each measure the lines of its staves, in score space', async () => {
		const { score } = await render(LONG);
		const [voice, piano] = score.getParts();
		const box = voice?.getMeasures()[0]?.getBox();

		const [stave] = voice?.getMeasures()[0]?.getStaves() ?? [];
		const lines = stave?.getLineYs() ?? [];
		expect(stave?.getNumber()).toBe(1);
		expect(lines).toHaveLength(5);
		expect(
			new Set(lines.slice(1).map((y, i) => y - (lines[i] ?? 0))).size,
		).toBe(1);
		expect(box?.rect.containsRect(stave?.getRect() ?? box.rect)).toBe(true);
		expect(stave?.getNoteStartX()).toBeGreaterThan(stave?.getRect().x ?? 0);
		expect(
			piano
				?.getMeasures()[0]
				?.getStaves()
				.map((s) => s.getNumber()),
		).toEqual([1, 2]);
	});

	it("places each measure's staves as its system is drawn", async () => {
		const whole = await render(LONG);
		const { score, scheduler } = await render(LONG, { progressive: true });
		const last = score.getParts()[0]?.getMeasures().at(-1);

		expect(last?.getStaves()).toEqual([]);
		scheduler.runAll();
		expect(stavesOf(score)).toEqual(stavesOf(whole.score));
	});

	it('keeps the staves in a snapshot', async () => {
		const whole = await render(LONG);

		const { score } = await render(
			JSON.parse(JSON.stringify(whole.score.snapshot())),
		);

		expect(stavesOf(score)).toEqual(stavesOf(whole.score));
	});

	it('draws a panoramic layout whole', async () => {
		const { score, scheduler } = await render(LONG, {
			progressive: true,
			layout: DEFAULT_PANORAMIC_LAYOUT,
		});

		expect(score.isComplete()).toBe(true);
		expect(scheduler.pending).toBe(0);
	});
});

// The ops drawing `text`, as the title's placement: once, centered on the page.
function textOpsOf(engraving: Engraving | undefined, text: string) {
	return (engraving?.ops ?? []).filter(
		(op) =>
			(op.call.kind === 'fillText' || op.call.kind === 'strokeText') &&
			op.call.text === text,
	);
}

// What is wrong with the score's systems right now, as `system:measure` entries: a system not
// at its index, a column listed by a system other than its own or out of measure order, or a
// measure column no system lists. Empty when every column sits on exactly one system.
function straySystemsOf(score: Score): string[] {
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

function boxesOf(score: Score): string[] {
	return score
		.getElements()
		.measureBoxes()
		.map((box) => `${box.getIndex()}:${JSON.stringify(box.rect)}`);
}

function stavesOf(score: Score): string[] {
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

function stepsOf(score: Score): string[] {
	return score
		.getSequence()
		.getSteps()
		.map(
			(s) => `${s.index}:${s.x}:${s.glideToX}:${JSON.stringify(s.systemRect)}`,
		);
}

function cursorRectAt(score: Score, ms: number) {
	const cursor = score.createCursor();
	const view = new FakeCursorView();
	cursor.sync(view);
	cursor.seekMs(ms);
	const rect = view.events.at(-1)?.position.rect;
	cursor.dispose();
	return rect;
}

async function render(
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
	const chords = new ChordTranslator(durations, new NotationTranslator());
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
				new SpannerBuilder(),
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
class ProgressiveFakeStage extends FakeHost implements RenderStage {
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
