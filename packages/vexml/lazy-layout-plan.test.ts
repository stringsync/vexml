import { describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
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
import { FakePaintProbe } from './fake-paint-probe';
import { FontShorthandPatch } from './font-shorthand-patch';
import { GapInserter } from './gap-inserter';
import { Gaps } from './gaps';
import { LayoutPlanner } from './layout-planner';
import { MetricsPatch } from './metrics-patch';
import { NotationTranslator } from './notation-translator';
import { ProbeTextCanvas } from './probe-text-canvas';
import { ScoreReader } from './score-reader';
import { SignatureTranslator } from './signature-translator';
import { StavePlan } from './stave-plan';
import { TabVoiceTranslator } from './tab-voice-translator';
import { VoiceTranslator } from './voice-translator';

const DATA_DIR = path.resolve(import.meta.dir, '../integration/__data__');
const FIXTURES = fs
	.readdirSync(DATA_DIR)
	.filter((f) => f.endsWith('.musicxml'))
	.sort();
const LONG = 'score_schubert_gute_nacht.musicxml';

describe('LazyLayoutPlan', () => {
	// The incremental plan's boxes are the whole plan's, placed a system at a time: every
	// fixture, since the systems' breaking, evening and placement are the same code in another
	// order.
	it('places every fixture as the whole plan does', async () => {
		const differing = await Promise.all(FIXTURES.map(lazyPlanDiffers));

		expect(differing.filter((fixture) => fixture !== null)).toEqual([]);
	});

	it('places a system once the two after it have begun, measuring only that far', async () => {
		const score = await parse(LONG);
		const plan = planner().begin(score, DEFAULT_CONFIG);
		const whole = planner().plan(score, DEFAULT_CONFIG);
		const systemsOf = (boxes: readonly { systemIndex: number }[]) =>
			new Set(boxes.map((b) => b.systemIndex)).size;

		plan.placeThrough(1);

		expect(plan.placedSystems()).toBe(2);
		expect(plan.isComplete()).toBe(false);
		expect(plan.layout.boxes.filter(Boolean)).toEqual(
			whole.boxes.filter((b) => b && b.systemIndex < 2),
		);
		expect(systemsOf(whole.boxes.filter(Boolean))).toBeGreaterThan(10);
	});

	it('forecasts a system for every measure, exact where placed, moving as the plan advances', async () => {
		const score = await parse(LONG);
		const whole = planner().plan(score, DEFAULT_CONFIG);
		const plan = planner().begin(score, DEFAULT_CONFIG);
		const wholeCount = new Set(whole.boxes.map((b) => b?.systemIndex)).size;

		plan.placeThrough(1);
		const early = plan.forecast();
		plan.placeThrough(10);
		const later = plan.forecast();

		expect(early.boxes.map((box) => box !== undefined)).toEqual(
			whole.boxes.map((box) => box !== undefined),
		);
		expect(early.boxes.slice(0, 4)).toEqual(whole.boxes.slice(0, 4));
		expect(later.version).toBeGreaterThan(early.version);
		// Calibrated on the measured systems, the forecast lands within a few systems of the
		// whole plan, and closer as more are measured.
		expect(Math.abs(early.systemCount - wholeCount)).toBeLessThan(6);
		expect(Math.abs(later.systemCount - wholeCount)).toBeLessThanOrEqual(
			Math.abs(early.systemCount - wholeCount),
		);
		expect(plan.systemOfMeasure(whole.boxes.length - 1)).toBe(
			later.systemCount - 1,
		);
		plan.complete();
		expect(plan.forecast().boxes).toEqual(whole.boxes);
	});

	it('comes complete for a panoramic layout, widen, and a layout following the document', async () => {
		const score = await parse(LONG);
		const configs: Config[] = [
			{ ...DEFAULT_CONFIG, layout: DEFAULT_PANORAMIC_LAYOUT },
			{
				...DEFAULT_CONFIG,
				layout: { ...DEFAULT_STANDARD_LAYOUT, overflow: 'widen' },
			},
			{
				...DEFAULT_CONFIG,
				layout: { ...DEFAULT_STANDARD_LAYOUT, documentLayout: 'follow' },
			},
		];
		const plans = configs.map((config) => planner().begin(score, config));

		expect(plans.map((plan) => plan.isComplete())).toEqual([true, true, true]);
		expect(plans.map((plan) => plan.layout)).toEqual(
			configs.map((config) => planner().plan(score, config)),
		);
	});
});

// The fixture's name when its lazy plan, placed a system at a time, differs from its whole
// plan, or places a system twice or out of order; null when they agree, or it has no score.
// Each system is placed once the two after it have begun; the end of the score places the
// last ones together.
async function lazyPlanDiffers(fixture: string): Promise<string | null> {
	const score = await parseAny(fixture);
	if (!score) {
		return null;
	}
	const whole = planner().plan(score, DEFAULT_CONFIG);
	const plan = planner().begin(score, DEFAULT_CONFIG);
	const placedAt: number[] = [];
	while (!plan.isComplete()) {
		plan.placeThrough(plan.placedSystems());
		placedAt.push(plan.placedSystems());
	}
	const ascending = placedAt.every(
		(n, i) => i === 0 || n > (placedAt[i - 1] ?? 0),
	);
	return Bun.deepEquals(plan.layout, whole) && ascending ? null : fixture;
}

function planner(): LayoutPlanner {
	const reader = new ScoreReader(new DynamicGlyphs());
	const durations = new DurationTranslator(reader);
	const staves = new StavePlan({ showTabs: true, showNotation: true });
	const tab = new TabVoiceTranslator(durations, reader, 'none');
	const translator = new VoiceTranslator(
		new ChordTranslator(durations, new NotationTranslator(reader), reader),
		durations,
		new BarlineTranslator(),
		reader,
	);
	return new LayoutPlanner(
		translator,
		tab,
		new SignatureTranslator(),
		staves,
		reader,
		new Gaps([], new GapInserter(reader)),
	);
}

// The layout builds vexflow elements, which measure text through the probe.
new ProbeTextCanvas(new FakePaintProbe()).install();
new MetricsPatch().install();
new FontShorthandPatch().install();

// Null for a fixture with no parts, which has no layout.
async function parseAny(fixture: string) {
	const document = await new DefaultScoreParser().parse(
		await Bun.file(path.join(DATA_DIR, fixture)).text(),
	);
	return document.score.parts.length > 0 ? document.score : null;
}

async function parse(fixture: string) {
	const score = await parseAny(fixture);
	if (!score) {
		throw new Error(`${fixture} has no parts`);
	}
	return score;
}
