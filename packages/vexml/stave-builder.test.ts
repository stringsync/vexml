import { describe, expect, it } from 'bun:test';
import type { RenderContext } from 'vexflow';
import { Rect } from 'webappwiz/geometry';
import { CollisionResolver } from './collision-resolver';
import type { MeasureNumbering } from './config';
import { DynamicGlyphs } from './dynamic-glyphs';
import { Gaps } from './gaps';
import { ScoreReader } from './score-reader';
import { SignatureTranslator } from './signature-translator';
import { SpillTracker } from './spill-tracker';
import { StaveBuilder } from './stave-builder';
import { StavePlan } from './stave-plan';

describe('StaveBuilder', () => {
	// Measure numbering is decided from the configured mode alone, so a builder over an empty
	// score answers for it. Nothing below draws.
	const builder = (measureNumbering: MeasureNumbering) =>
		new StaveBuilder(
			new SignatureTranslator(),
			new ScoreReader(new DynamicGlyphs()),
			new StavePlan({ showTabs: true, showNotation: true }),
			{} as RenderContext,
			new CollisionResolver(new Rect(0, 0, 1000, 1000), {}),
			new SpillTracker(),
			new Gaps([]),
			{
				parts: [],
				partGroups: [],
				totalStaves: 1,
				measureNumbering,
				textColor: '#000000',
				staveOffsets: [0],
				systemStaveOffsets: undefined,
				voltaLifts: new Map(),
			},
		);

	it('shows no measure numbers under none', () => {
		expect(builder('none').showsMeasureNumber(0, true)).toBe(false);
	});

	it('numbers only system starts under system', () => {
		expect(builder('system').showsMeasureNumber(3, true)).toBe(true);
		expect(builder('system').showsMeasureNumber(3, false)).toBe(false);
	});

	it('numbers every measure under every', () => {
		expect(builder('every').showsMeasureNumber(3, false)).toBe(true);
	});

	it('numbers every Nth measure plus system starts under every-N', () => {
		const two = builder('every-2');
		expect(two.showsMeasureNumber(2, false)).toBe(true);
		expect(two.showsMeasureNumber(3, false)).toBe(false);
		expect(two.showsMeasureNumber(3, true)).toBe(true);
		const three = builder('every-3');
		expect(three.showsMeasureNumber(3, false)).toBe(true);
		expect(three.showsMeasureNumber(4, false)).toBe(false);
	});
});
