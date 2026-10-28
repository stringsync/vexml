import { describe, expect, it } from 'bun:test';
import * as path from 'node:path';
import type { MDocument } from '@stringsync/mdom';
import { BarlineTranslator } from './barline-translator';
import { ChordTranslator } from './chord-translator';
import { type Config, DEFAULT_CONFIG } from './config';
import { DefaultScoreParser } from './default-score-parser';
import { DurationTranslator } from './duration-translator';
import { DynamicGlyphs } from './dynamic-glyphs';
import { ElementFactory } from './element-factory';
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

describe('structural element geometry', () => {
	it('resolves a point in each staff column to that part only', async () => {
		const { score } = await render('structure_two_parts.musicxml');
		const measures = score.getElements().measures();
		expect(measures).toHaveLength(2);
		for (const measure of measures) {
			const point = center(measure.rect);
			expect(score.getElements().at(point)).toBe(measure);
			const hits = score.getElements().allAt(point);
			expect(hits).toContain(measure);
			expect(hits).toContain(measure.getBox());
			expect(hits).not.toContain(
				measures.find((candidate) => candidate !== measure),
			);
		}
	});

	it('hits middle and implicit right barlines with their document provenance', async () => {
		const { score, document } = await render('barline_mid_measure.musicxml');
		const middle = only(
			score
				.getElements()
				.barlines()
				.filter((barline) => barline.getLocation() === 'middle'),
			'middle barline',
		);
		const right = only(
			score
				.getElements()
				.barlines()
				.filter((barline) => barline.getLocation() === 'right'),
			'right barline',
		);
		expect(score.getElements().at(center(middle.rect))).toBe(middle);
		expect(score.getElements().at(center(right.rect))).toBe(right);
		expect(score.getTimeAt(center(middle.rect))).not.toBeNull();
		expect(score.getTimeAt(center(right.rect))).not.toBeNull();
		expect(
			score.getTimeAt({
				x: middle.getMeasure().rect.x + middle.getMeasure().rect.w / 4,
				y: center(middle.getMeasure().rect).y,
			}),
		).not.toBeNull();
		expect(middle.getSources()).toEqual([
			only(
				document?.score.parts[0]?.measures[0]?.barlines.filter(
					(barline) => barline.location === 'middle',
				) ?? [],
				'middle source',
			),
		]);
		expect(right.getSources()).toEqual([]);
	});

	it('hits explicit repeat edges and ordinary implicit edges', async () => {
		const { score } = await render('repeats.musicxml');
		const barlines = score.getElements().barlines();
		const forward = barlines.find(
			(barline) =>
				barline.getLocation() === 'left' &&
				barline.getSources()[0]?.repeat === 'forward',
		);
		const backward = barlines.find(
			(barline) =>
				barline.getLocation() === 'right' &&
				barline.getSources()[0]?.repeat === 'backward',
		);
		const implicit = barlines.find(
			(barline) =>
				barline.getLocation() === 'right' && barline.getSources().length === 0,
		);
		expect(forward).toBeDefined();
		expect(backward).toBeDefined();
		expect(implicit).toBeDefined();
		for (const barline of [forward, backward, implicit]) {
			if (barline) {
				expect(score.getElements().at(center(barline.rect))).toBe(barline);
			}
		}
	});

	it('resolves barlines on every wrapped system', async () => {
		const { score } = await render('print_new_system.musicxml');
		const systems = score.getSystems();
		expect(systems.length).toBeGreaterThan(1);
		for (const system of systems) {
			const box = only(system.getMeasureBoxes().slice(0, 1), 'system measure');
			const measure = only(box.getMeasures(), 'part measure');
			const right = only(
				score
					.getElements()
					.barlines()
					.filter(
						(barline) =>
							barline.getMeasure() === measure &&
							barline.getLocation() === 'right',
					),
				'system right barline',
			);
			expect(score.getElements().at(center(right.rect))).toBe(right);
		}
	});

	it('matches whole-render barlines after progressive drawing and snapshot replay', async () => {
		const whole = await render('print_new_system.musicxml');
		const progressive = await render(
			'print_new_system.musicxml',
			{ progressive: true },
			0,
		);
		progressive.scheduler.runAll();
		expect(barlineGeometry(progressive.score)).toEqual(
			barlineGeometry(whole.score),
		);

		const restored = await render(whole.score.snapshot());
		expect(barlineGeometry(restored.score)).toEqual(
			barlineGeometry(whole.score),
		);
		for (const barline of restored.score.getElements().barlines()) {
			expect(barline.getSources()).toEqual([]);
			expect(restored.score.getElements().at(center(barline.rect))).toBe(
				barline,
			);
		}
	});

	it('builds fresh elements over the same document on rerender', async () => {
		const first = await render('repeats.musicxml');
		const document = first.document;
		if (!document) {
			throw new Error('missing parsed document');
		}
		const firstBarline = only(
			first.score.getElements().barlines().slice(0, 1),
			'first barline',
		);
		const second = await render(document);
		const secondBarline = only(
			second.score.getElements().barlines().slice(0, 1),
			'second barline',
		);
		expect(secondBarline).not.toBe(firstBarline);
		expect(secondBarline.getSources()).toEqual(firstBarline.getSources());
		expect(second.score.getElements().at(center(secondBarline.rect))).toBe(
			secondBarline,
		);
	});
});

function center(rect: { x: number; y: number; w: number; h: number }) {
	return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

function only<T>(values: readonly T[], what: string): T {
	if (values.length !== 1 || !values[0]) {
		throw new Error(`expected one ${what}, got ${values.length}`);
	}
	return values[0];
}

function barlineGeometry(score: Score): string[] {
	return score
		.getElements()
		.barlines()
		.map(
			(barline) =>
				`${barline.getMeasure().getPart().getId()}:${barline.getMeasure().getIndex()}:${barline.getLocation()}:${JSON.stringify(barline.rect)}`,
		)
		.sort();
}

async function render(
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
	return { score, document, scheduler };
}

class FakeStage extends FakeHost implements RenderStage {
	readonly container = {} as HTMLDivElement;
	readonly base = {} as HTMLElement;
	readonly probe = new FakePaintProbe();
	readonly folds: Fold[] = [];
	readonly engravings: Engraving[] = [];
	readonly pixelRatio = 1;

	constructor(private readonly bottom: number) {
		super();
	}

	engrave(engraving: Engraving): void {
		this.engravings.push(engraving);
	}

	extendEngraving(engraving: Engraving): void {
		this.engravings.push(engraving);
	}

	visibleBottom(): number {
		return this.bottom;
	}

	setFold(fold: Fold): void {
		this.folds.push(fold);
	}

	paperColor(): string {
		return '#ffffff';
	}

	paintEngraving(): void {}
}
