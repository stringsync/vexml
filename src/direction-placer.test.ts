import { describe, expect, it } from 'bun:test';
import type { Measure } from '@stringsync/mdom';
import {
	type RenderContext,
	type Stave,
	type StaveNote,
	TabNote,
	TickContext,
} from 'vexflow';
import { Rect } from 'webappwiz/geometry';
import { CollisionResolver } from './collision-resolver';
import {
	DIRECTION_LINE_HOOK,
	HARMONY_ACCIDENTAL_KERN,
	REHEARSAL_PADDING,
	WORDS_NOTE_CLEARANCE,
	WORDS_Y_OFFSET,
} from './constants';
import {
	type DirectionColumn,
	type DirectionLineTask,
	DirectionPlacer,
} from './direction-placer';
import { DynamicGlyphs } from './dynamic-glyphs';
import { GeometryCollector } from './geometry-collector';
import { type DirectionLineSpan, ScoreReader } from './score-reader';
import { SpillTracker } from './spill-tracker';

describe('DirectionPlacer', () => {
	// The staff-line and note-area geometry every side-text placement reads. One shape
	// serves notation and direction-line tests; the y anchors are round numbers so the
	// offset math stays legible in the expectations.
	const stave = () =>
		({
			getX: () => 40,
			getWidth: () => 300,
			getYForLine: () => 100,
			getBottomLineY: () => 140,
			getNoteStartX: () => 60,
			getYForTopText: () => 80,
			getYForBottomText: () => 160,
		}) as unknown as Stave;

	const note = (x: number, anchorStave = stave()) =>
		({
			getAbsoluteX: () => x,
			getGlyphWidth: () => 10,
			checkStave: () => anchorStave,
			getStave: () => anchorStave,
		}) as unknown as StaveNote;

	// A real tab note, laid out at `x` by a tick context: the placer centers text over a
	// tab anchor, and it tells one apart from a notation note by class.
	const tabNote = (x: number) => {
		const note = new TabNote({
			positions: [{ str: 2, fret: '5' }],
			duration: 'q',
		});
		const context = new TickContext();
		context.addTickable(note);
		context.setX(x);
		return note.setTickContext(context);
	};

	const column = (
		overrides: Partial<DirectionColumn> = {},
	): DirectionColumn => ({
		measureIndex: 0,
		systemIndex: 0,
		topStave: undefined,
		measure: undefined,
		repeatTimesLabel: null,
		words: [],
		dynamics: [],
		figuredBasses: [],
		harmonies: [],
		tempos: [],
		...overrides,
	});

	// A real reader with the case's canned answers layered over it. The placer calls reader
	// methods a given case says nothing about, so a bare object literal leaves holes.
	const makePlacer = (overrides: Partial<ScoreReader> = {}) => {
		const reader = Object.assign(new ScoreReader(), overrides);
		// Captures every typed string with the ink it was typed in, and every stroked
		// segment, so placements and direction-line paths are assertable.
		const texts: Array<{ text: string; x: number; y: number; fill: string }> =
			[];
		const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> =
			[];
		let fill = '';
		let pen = { x: 0, y: 0 };
		const context = {
			save() {},
			restore() {},
			setFont() {},
			setFillStyle(style: string) {
				fill = style;
			},
			setStrokeStyle() {},
			setLineWidth() {},
			setLineDash() {},
			beginPath() {},
			closePath() {},
			stroke() {},
			moveTo(x: number, y: number) {
				pen = { x, y };
			},
			lineTo(x: number, y: number) {
				segments.push({ x1: pen.x, y1: pen.y, x2: x, y2: y });
				pen = { x, y };
			},
			measureText(text: string) {
				return { width: text.length * 10 };
			},
			fillText(text: string, x: number, y: number) {
				texts.push({ text, x, y, fill });
			},
		} as unknown as RenderContext;
		const spills: Rect[] = [];
		const drops: Rect[] = [];
		const pageTops: number[] = [];
		const pageBottoms: number[] = [];
		const resolver = new CollisionResolver(new Rect(0, 0, 2000, 2000));
		const spill = new SpillTracker();
		const placer = new DirectionPlacer(
			context,
			reader,
			resolver,
			new GeometryCollector(),
			spill,
			{
				rowOf: () => 3,
				recordAnnotationSpill: (_stave, rect) => {
					spills.push(rect);
				},
				recordAnnotationDrop: (_stave, rect) => {
					drops.push(rect);
				},
				growPageTop: (top) => {
					pageTops.push(top);
				},
				growPageBottom: (bottom) => {
					pageBottoms.push(bottom);
				},
			},
			{
				labelFont: 'Arial',
				notationFont: 'Bravura',
				notationColor: '#000001',
				textColor: '#000002',
				scratchViewport: new Rect(0, 0, 2000, 2000),
			},
		);
		return {
			placer,
			texts,
			segments,
			spills,
			drops,
			pageTops,
			pageBottoms,
			resolver,
			spill,
		};
	};

	it('suppresses a sustained dynamic restated within the gap', () => {
		const { placer } = makePlacer();
		expect(placer.suppressesDynamic('0:1', 'p', 0)).toBe(false);
		expect(placer.suppressesDynamic('0:1', 'p', 1)).toBe(true);
	});

	it('prints a sustained dynamic restated beyond the gap', () => {
		const { placer } = makePlacer();
		expect(placer.suppressesDynamic('0:1', 'p', 0)).toBe(false);
		expect(placer.suppressesDynamic('0:1', 'p', 3)).toBe(false);
	});

	it('keeps an unbroken per-measure restatement chain suppressed end to end', () => {
		const { placer } = makePlacer();
		expect(placer.suppressesDynamic('0:1', 'f', 0)).toBe(false);
		expect(placer.suppressesDynamic('0:1', 'f', 1)).toBe(true);
		// The suppressed statement still stamped the run, so the next measure's copy
		// measures its distance from measure 1, not measure 0.
		expect(placer.suppressesDynamic('0:1', 'f', 2)).toBe(true);
	});

	it('always prints per-note accents, however often they repeat', () => {
		const { placer } = makePlacer();
		expect(placer.suppressesDynamic('0:1', 'sfz', 0)).toBe(false);
		expect(placer.suppressesDynamic('0:1', 'sfz', 0)).toBe(false);
	});

	it('tracks the sounding level per staff key', () => {
		const { placer } = makePlacer();
		expect(placer.suppressesDynamic('0:1', 'mp', 0)).toBe(false);
		expect(placer.suppressesDynamic('0:2', 'mp', 0)).toBe(false);
	});

	it('left-anchors an above-stave directive at its note and reports the rise', () => {
		const { placer, texts, spills, pageTops, spill } = makePlacer();
		placer.placeColumn(
			column({
				words: [
					{
						stave: stave(),
						text: 'rit.',
						anchor: note(200),
						placement: 'above',
					},
				],
			}),
		);
		// Baseline one words offset over the top line; the box is one font size tall.
		expect(texts).toEqual([{ text: 'rit.', x: 200, y: 86, fill: '#000002' }]);
		expect(spills[0]?.y).toBe(73);
		expect(pageTops).toEqual([73]);
		expect(spill.decorationTopOf(0)).toBe(73);
	});

	it('drops a below-placement directive under the stave without lifting the crop', () => {
		const { placer, texts, drops, spills, pageTops } = makePlacer();
		placer.placeColumn(
			column({
				words: [
					{
						stave: stave(),
						text: 'dolce',
						anchor: note(200),
						placement: 'below',
					},
				],
			}),
		);
		expect(texts[0]?.y).toBe(140 + WORDS_Y_OFFSET + 13);
		expect(drops).toHaveLength(1);
		expect(spills).toHaveLength(0);
		expect(pageTops).toHaveLength(0);
	});

	it('centers tab-anchored text on its fret column', () => {
		const { placer, texts } = makePlacer();
		placer.placeColumn(
			column({
				words: [
					{
						stave: stave(),
						text: 'let.',
						anchor: tabNote(200),
						placement: 'above',
					},
				],
			}),
		);
		expect(texts[0]?.x).toBe(200 - 20);
	});

	it('keeps centered text right of the note area over a first-column anchor', () => {
		const { placer, texts } = makePlacer();
		// Centered on the very first fret column, the left half would reach back into the
		// clef/key area; the note-start x is the bound.
		placer.placeColumn(
			column({
				words: [
					{
						stave: stave(),
						text: 'let.',
						anchor: tabNote(60),
						placement: 'above',
					},
				],
			}),
		);
		expect(texts[0]?.x).toBe(60);
	});

	it('lifts an above-stave directive clear of a note in its column', () => {
		const { placer, texts, pageTops, resolver } = makePlacer();
		resolver.add({ rect: new Rect(190, 60, 30, 30), kind: 'note' });
		placer.placeColumn(
			column({
				words: [
					{
						stave: stave(),
						text: 'rit.',
						anchor: note(200),
						placement: 'above',
					},
				],
			}),
		);
		// The baseline rises until the box bottom clears the notehead by the words gap.
		expect(texts[0]?.y).toBe(60 - WORDS_NOTE_CLEARANCE);
		expect(pageTops).toEqual([60 - WORDS_NOTE_CLEARANCE - 13]);
	});

	it('engraves a SMuFL dynamic in the notation ink, centered on its note', () => {
		const { placer, texts } = makePlacer();
		placer.placeColumn(
			column({
				dynamics: [
					{
						stave: stave(),
						text: 'p',
						glyph: true,
						anchor: note(200),
						placement: 'below',
					},
				],
			}),
		);
		const glyph = new DynamicGlyphs().spell('p');
		expect(texts).toEqual([
			{
				text: glyph,
				x: 200 - (glyph.length * 10) / 2,
				y: 140 + WORDS_Y_OFFSET + 24,
				fill: '#000001',
			},
		]);
	});

	it('stacks figured-bass rows downward off each other', () => {
		const { placer, texts } = makePlacer();
		placer.placeColumn(
			column({
				figuredBasses: [
					{ stave: stave(), figures: ['6', '4'], anchor: note(200) },
				],
			}),
		);
		// The first row hangs at the below-stave baseline; the second drop-clears it.
		expect(texts.map((t) => t.y)).toEqual([
			167,
			167 + WORDS_NOTE_CLEARANCE + 13,
		]);
		expect(texts.map((t) => t.x)).toEqual([195, 195]);
	});

	it('kerns a chord-symbol accidental tight against its root letter', () => {
		const { placer, texts, spills, pageTops } = makePlacer();
		placer.placeColumn(
			column({
				harmonies: [
					{
						staveNote: note(200),
						text: 'B♭',
						frame: null,
						source: {} as never,
					},
				],
			}),
		);
		// The flat pulls in by the kern instead of advancing a full glyph width.
		expect(texts.map((t) => t.x)).toEqual([
			200,
			200 + 10 - HARMONY_ACCIDENTAL_KERN,
		]);
		expect(texts.map((t) => t.y)).toEqual([86, 86]);
		expect(spills).toHaveLength(1);
		expect(pageTops).toEqual([73]);
	});

	it('boxes a rehearsal mark at the measure left edge over the top stave', () => {
		const { placer, texts, spills, pageTops } = makePlacer({
			navigationsOf: () => [],
			rehearsalsOf: () => ['A'],
		});
		placer.placeColumn(column({ topStave: stave(), measure: {} as Measure }));
		expect(texts).toEqual([
			{
				text: 'A',
				x: 40 + REHEARSAL_PADDING,
				y: 100 - 8 - REHEARSAL_PADDING,
				fill: '#000002',
			},
		]);
		expect(spills).toHaveLength(1);
		expect(pageTops).toHaveLength(1);
	});

	it('right-aligns the repeat-times label on the closing barline', () => {
		const { placer, texts } = makePlacer();
		placer.placeColumn(column({ topStave: stave(), repeatTimesLabel: '3x' }));
		expect(texts).toEqual([
			{ text: '3x', x: 340 - 20, y: 86, fill: '#000002' },
		]);
	});

	it('skips direction lines missing an endpoint or running backwards', () => {
		const { placer, segments, pageTops } = makePlacer();
		const span = {
			above: true,
			dash: null,
			startEnd: 'none',
			stopEnd: 'none',
		} as unknown as DirectionLineSpan;
		const lines: DirectionLineTask[] = [
			{ span, start: undefined, stop: note(200) },
			// A span wrapping onto a later system runs right-to-left and is dropped.
			{ span, start: note(300), stop: note(100) },
		];
		placer.drawDirectionLines(lines);
		expect(segments).toHaveLength(0);
		expect(pageTops).toHaveLength(0);
	});

	it('hooks an above-stave bracket down toward the staff at both ends', () => {
		const { placer, segments, pageTops, pageBottoms } = makePlacer();
		const span = {
			above: true,
			dash: null,
			startEnd: 'down',
			stopEnd: 'down',
		} as unknown as DirectionLineSpan;
		placer.drawDirectionLines([{ span, start: note(100), stop: note(200) }]);
		// Down the start hook, along the line at the top-text y, down the stop hook.
		expect(segments).toEqual([
			{ x1: 100, y1: 80 + DIRECTION_LINE_HOOK, x2: 100, y2: 80 },
			{ x1: 100, y1: 80, x2: 210, y2: 80 },
			{ x1: 210, y1: 80, x2: 210, y2: 80 + DIRECTION_LINE_HOOK },
		]);
		expect(pageTops).toEqual([80 - DIRECTION_LINE_HOOK]);
		expect(pageBottoms).toEqual([80 + DIRECTION_LINE_HOOK]);
	});
});
