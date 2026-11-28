import { describe, expect, it } from 'bun:test';
import type { Part } from '@stringsync/mdom';
import type { RenderContext, Stave } from 'vexflow/core';
import {
	type ConnectorColumn,
	ConnectorDrawer,
	type ConnectorDrawerOptions,
} from './connector-drawer';
import {
	BRACE_LEFT_OVERHANG,
	BRACKET_GLYPH_OVERHANG,
	BRACKET_X_SHIFT,
	CONNECTOR_VERTICAL_OVERHANG,
} from './constants';
import type { ScoreReader } from './score-reader';
import type { StavePlan } from './stave-plan';

describe('ConnectorDrawer', () => {
	type FillRect = { x: number; y: number; w: number; h: number };

	// The barline geometry paintBarStyle reads off a stave, and the edges drawCustomBarline
	// anchors to. Bare identity objects (no overrides) are enough for barlineRuns, which
	// only groups references.
	const stave = (opts: StaveOptions = {}) => {
		let x = opts.x ?? 0;
		return {
			getX: () => x,
			setX(next: number) {
				x = next;
				return this;
			},
			getWidth: () => opts.width ?? 100,
			getNumLines: () => 5,
			getTopLineTopY: () => opts.lineTop ?? 100,
			getBottomLineBottomY: () => opts.lineBottom ?? 140,
			getSpacingBetweenLines: () => opts.spacing ?? 10,
			getYForLine: (line = 0) =>
				(opts.lineTop ?? 100) + line * (opts.spacing ?? 10),
			getBottomLineY: () => opts.lineBottom ?? 140,
		} as unknown as Stave;
	};

	interface StaveOptions {
		x?: number;
		width?: number;
		lineTop?: number;
		lineBottom?: number;
		spacing?: number;
	}

	const column = (
		overrides: Partial<ConnectorColumn> = {},
	): ConnectorColumn => ({
		measureX: 200,
		systemIndex: 0,
		isSystemStart: false,
		isLastMeasure: false,
		barStyle: null,
		repeatEnd: false,
		repeatBoth: false,
		begRepeatX: null,
		systemTop: undefined,
		systemBottom: undefined,
		partStaves: [],
		...overrides,
	});

	const makeDrawer = (
		overrides: Partial<ConnectorDrawerOptions> = {},
		staves: Partial<StavePlan> = {},
	) => {
		// Captures every filled bar and brace curve so custom barlines and braces are assertable.
		const rects: FillRect[] = [];
		let braces = 0;
		const context = {
			openGroup() {},
			closeGroup() {},
			save() {},
			restore() {},
			setFillStyle() {},
			beginPath() {},
			moveTo() {},
			bezierCurveTo() {},
			fill() {
				braces++;
			},
			stroke() {},
			fillRect(x: number, y: number, w: number, h: number) {
				rects.push({ x, y, w, h });
			},
		} as unknown as RenderContext;
		const drawer = new ConnectorDrawer(
			context,
			{} as unknown as ScoreReader,
			staves as unknown as StavePlan,
			{
				parts: [],
				partGroups: [],
				barlineBreaks: new Set(),
				totalStaves: 2,
				labelIndent: 0,
				partLabelIndent: 0,
				laterLabelIndent: 0,
				abbreviationIndent: 0,
				labelFont: 'Arial',
				notationColor: '#000000',
				textColor: '#000000',
				...overrides,
			},
		);
		return { drawer, rects, getBraces: () => braces };
	};

	it('runs one barline over the whole system when no breaks are declared', () => {
		const { drawer } = makeDrawer();
		const top = stave();
		const bottom = stave();
		expect(
			drawer.barlineRuns(column({ systemTop: top, systemBottom: bottom })),
		).toEqual([{ top, bottom }]);
	});

	it('returns no barline runs before any stave exists', () => {
		const { drawer } = makeDrawer();
		expect(drawer.barlineRuns(column())).toEqual([]);
	});

	it('splits barline runs at each declared part boundary', () => {
		const { drawer } = makeDrawer({ barlineBreaks: new Set([0]) });
		const p0 = { top: stave(), bottom: stave() };
		const p1 = { top: stave(), bottom: stave() };
		expect(
			drawer.barlineRuns(
				column({
					systemTop: p0.top,
					systemBottom: p1.bottom,
					partStaves: [p0, p1],
				}),
			),
		).toEqual([
			{ top: p0.top, bottom: p0.bottom },
			{ top: p1.top, bottom: p1.bottom },
		]);
	});

	it('lets a run pass over a part with no measure in the column', () => {
		const { drawer } = makeDrawer({ barlineBreaks: new Set([1]) });
		const p0 = { top: stave(), bottom: stave() };
		const p2 = { top: stave(), bottom: stave() };
		expect(
			drawer.barlineRuns(
				column({
					systemTop: p0.top,
					systemBottom: p2.bottom,
					// Part 1 is absent, so its break closes the run that opened on part 0.
					partStaves: [p0, undefined, p2],
				}),
			),
		).toEqual([
			{ top: p0.top, bottom: p0.bottom },
			{ top: p2.top, bottom: p2.bottom },
		]);
	});

	it('paints nothing for a bar style vexflow already draws itself', () => {
		const { drawer, rects } = makeDrawer();
		drawer.paintBarStyle(stave(), 500, 'light-heavy');
		expect(rects).toEqual([]);
	});

	it('paints a heavy-light barline as a beam-weight bar a third of a space before an ordinary one', () => {
		const { drawer, rects } = makeDrawer();
		drawer.paintBarStyle(
			stave({ lineTop: 100, lineBottom: 140 }),
			500,
			'heavy-light',
		);
		expect(rects).toEqual([
			{ x: 491, y: 100, w: 5, h: 40 },
			{ x: 499, y: 100, w: 2, h: 40 },
		]);
	});

	it('spans a tick barline half a staff space either side of the top line', () => {
		const { drawer, rects } = makeDrawer();
		drawer.paintBarStyle(stave({ lineTop: 100, spacing: 10 }), 500, 'tick');
		expect(rects).toEqual([{ x: 500, y: 95, w: 1, h: 10 }]);
	});

	it('walks a dashed barline in on/off runs and clips the last dash', () => {
		const { drawer, rects } = makeDrawer();
		// Height 34 = four full 4px dashes at 8px steps plus a 2px remainder.
		drawer.paintBarStyle(
			stave({ lineTop: 100, lineBottom: 134 }),
			500,
			'dashed',
		);
		expect(rects.map((r) => r.y)).toEqual([100, 108, 116, 124, 132]);
		expect(rects.map((r) => r.h)).toEqual([4, 4, 4, 4, 2]);
	});

	it('draws the custom barline at the stave right edge', () => {
		const { drawer, rects } = makeDrawer();
		drawer.drawCustomBarline(
			stave({ x: 400, width: 100, lineTop: 100, lineBottom: 140 }),
			column({ barStyle: 'heavy' }),
		);
		expect(rects).toEqual([{ x: 496, y: 100, w: 5, h: 40 }]);
	});

	it('lets a repeat sign at the same edge win over the custom barline', () => {
		const { drawer, rects } = makeDrawer();
		drawer.drawCustomBarline(
			stave(),
			column({ barStyle: 'heavy', repeatEnd: true }),
		);
		drawer.drawCustomBarline(
			stave(),
			column({ barStyle: 'heavy', repeatBoth: true }),
		);
		drawer.drawCustomBarline(stave(), column({ barStyle: null }));
		expect(rects).toEqual([]);
	});

	it('reports no connector extent away from a system start', () => {
		const { drawer } = makeDrawer({}, { partsPairTabWithNotation: () => true });
		expect(
			drawer.connectorExtent(
				column({ systemTop: stave(), systemBottom: stave() }),
			),
		).toBeNull();
	});

	it('grows the extent around the cross-part bracket and its overhangs', () => {
		const { drawer } = makeDrawer(
			{},
			{
				systemSymbol: () => 'bracket',
				systemOverhang: () => BRACKET_X_SHIFT + BRACKET_GLYPH_OVERHANG,
			},
		);
		const extent = drawer.connectorExtent(
			column({
				isSystemStart: true,
				measureX: 200,
				systemTop: stave({ lineTop: 100 }),
				systemBottom: stave({ lineBottom: 300 }),
			}),
		);
		expect(extent).toEqual({
			left: 200 - BRACKET_X_SHIFT - BRACKET_GLYPH_OVERHANG,
			top: 100 - CONNECTOR_VERTICAL_OVERHANG,
			bottom: 300 + CONNECTOR_VERTICAL_OVERHANG,
		});
	});

	it('reaches the extent left to a brace, staying inside the staff lines', () => {
		const { drawer } = makeDrawer(
			{ parts: [{} as Part] },
			{
				systemSymbol: () => 'brace',
				systemOverhang: () => BRACE_LEFT_OVERHANG,
			},
		);
		const extent = drawer.connectorExtent(
			column({
				isSystemStart: true,
				measureX: 200,
				systemTop: stave({ lineTop: 100 }),
				systemBottom: stave({ lineBottom: 300 }),
			}),
		);
		expect(extent).toEqual({
			left: 200 - BRACE_LEFT_OVERHANG,
			top: 100,
			bottom: 300,
		});
	});

	it('reports no extent when the only connector is the plain left line', () => {
		// A single-staff part draws no brace/bracket, and the plain line sits on measureX.
		const { drawer } = makeDrawer(
			{ parts: [{} as Part] },
			{ systemSymbol: () => null, systemOverhang: () => 0 },
		);
		expect(
			drawer.connectorExtent(
				column({
					isSystemStart: true,
					systemTop: stave(),
					systemBottom: stave(),
				}),
			),
		).toBeNull();
	});

	it('draws a compressed brace on a single-stave part wrapped in a braced part-group', () => {
		const manual = stave({ x: 15, lineTop: 100, lineBottom: 140 });
		const pedal = stave({ x: 15, lineTop: 200, lineBottom: 240 });
		const { drawer, getBraces } = makeDrawer(
			{
				partGroups: [
					{
						fromPart: 0,
						toPart: 0,
						symbol: 'brace',
						depth: 0,
						name: null,
						abbreviation: null,
					},
				],
			},
			{ partsPairTabWithNotation: () => false },
		);
		drawer.drawSystemStart(
			column({
				isSystemStart: true,
				measureX: 15,
				systemTop: manual,
				systemBottom: pedal,
				partStaves: [
					{ top: manual, bottom: manual },
					{ top: pedal, bottom: pedal },
				],
			}),
		);
		expect(getBraces()).toBe(1);
		expect(manual.getX()).toBe(15);
	});

	it('skips a single-part braced part-group on a multi-stave part to avoid duplicating its brace', () => {
		const voice = stave({ x: 15, lineTop: 100, lineBottom: 140 });
		const pianoTop = stave({ x: 15, lineTop: 200, lineBottom: 240 });
		const pianoBottom = stave({ x: 15, lineTop: 300, lineBottom: 340 });
		const { drawer, getBraces } = makeDrawer(
			{
				totalStaves: 3,
				partGroups: [
					{
						fromPart: 1,
						toPart: 1,
						symbol: 'brace',
						depth: 0,
						name: null,
						abbreviation: null,
					},
				],
			},
			{ partsPairTabWithNotation: () => false },
		);
		drawer.drawSystemStart(
			column({
				isSystemStart: true,
				measureX: 15,
				systemTop: voice,
				systemBottom: pianoBottom,
				partStaves: [
					{ top: voice, bottom: voice },
					{ top: pianoTop, bottom: pianoBottom },
				],
			}),
		);
		expect(getBraces()).toBe(0);
	});
});
