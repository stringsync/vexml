import { describe, expect, it } from 'bun:test';
import type { Direction, Measure } from '@stringsync/mdom';
import { Rect } from 'core/geometry';
import {
	Barline,
	Element,
	type RenderContext,
	type Stave,
	StaveModifierPosition,
	type StaveNote,
	TabNote,
	TickContext,
	TimeSignature,
} from 'vexflow/core';
import { openingRepeatLeftOffset } from './barline-width';
import { CollisionResolver } from './collision-resolver';
import {
	DIRECTION_LINE_HOOK,
	DIRECTION_LINE_WORD_GAP,
	ENCLOSED_BASELINE,
	HARMONY_ACCIDENTAL_KERN,
	REHEARSAL_FONT_SIZE,
	REHEARSAL_PADDING,
	TEMPO_SCALE,
	TEMPO_WORD_METRONOME_GAP,
	TEMPO_WORDS_FONT_SIZE,
	WORDS_FONT_SIZE,
	WORDS_NOTE_CLEARANCE,
	WORDS_Y_OFFSET,
} from './constants';
import {
	type DirectionColumn,
	type DirectionLineTask,
	DirectionPlacer,
	type DirectionPlacerOptions,
} from './direction-placer';
import { DynamicGlyphs } from './dynamic-glyphs';
import { GeometryCollector } from './geometry-collector';
import {
	type DirectionLineSpan,
	ScoreReader,
	type TextFormat,
} from './score-reader';
import { SpillTracker } from './spill-tracker';

describe('DirectionPlacer', () => {
	// A text element that asks for no formatting of its own.
	const PLAIN: TextFormat = {
		family: null,
		italic: null,
		bold: null,
		scale: 1,
		enclosure: null,
		underline: 0,
		rotation: 0,
		align: null,
		valign: null,
	};

	// The staff-line and note-area geometry every side-text placement reads. One shape
	// serves notation and direction-line tests; the y anchors are round numbers so the
	// offset math stays legible in the expectations.
	const stave = (
		modifiers: Array<{
			position: StaveModifierPosition;
			category: string;
			x: number;
		}> = [],
	) =>
		({
			getX: () => 40,
			getWidth: () => 300,
			getYForLine: () => 100,
			getBottomLineY: () => 140,
			getNoteStartX: () => 60,
			getYForTopText: () => 80,
			getYForBottomText: () => 160,
			getModifiers: (position?: StaveModifierPosition, category?: string) =>
				modifiers
					.filter(
						(m) =>
							(position === undefined || m.position === position) &&
							(category === undefined || m.category === category),
					)
					.map((m) => ({
						getX: () => m.x,
						getCategory: () => m.category,
						getPosition: () => m.position,
					})),
		}) as unknown as Stave;

	// A centered note is a whole-measure rest, drawn mid-bar whatever its tick x.
	const note = (x: number, anchorStave: Stave, centered = false) =>
		({
			isCenterAligned: () => centered,
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
		isSystemStart: false,
		topStave: undefined,
		measure: undefined,
		repeatTimesLabel: null,
		fermatas: [],
		words: [],
		dynamics: [],
		symbols: [],
		pictograms: [],
		figuredBasses: [],
		harpPedals: [],
		harmonies: [],
		tempos: [],
		capos: [],
		...overrides,
	});

	// A real reader with the case's canned answers layered over it. The placer calls reader
	// methods a given case says nothing about, so a bare object literal leaves holes.
	const makePlacer = (
		overrides: Partial<ScoreReader> = {},
		options: Pick<DirectionPlacerOptions, 'documentPositions'> = {},
	) => {
		const reader = Object.assign(
			new ScoreReader(new DynamicGlyphs()),
			overrides,
		);
		// Captures every typed string with the ink it was typed in, and every stroked
		// segment, so placements and direction-line paths are assertable.
		const texts: Array<{ text: string; x: number; y: number; fill: string }> =
			[];
		const fonts: Array<{
			text: string;
			family?: string;
			size?: number | string;
			weight?: string | number;
			style?: string;
		}> = [];
		const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> =
			[];
		let fill = '';
		let font: {
			family?: string;
			size?: number | string;
			weight?: string | number;
			style?: string;
		} = {};
		let pen = { x: 0, y: 0 };
		const context = {
			openGroup() {},
			closeGroup() {},
			save() {},
			restore() {},
			scale() {},
			setFont(
				family?: string,
				size?: number | string,
				weight?: string | number,
				style?: string,
			) {
				font = { family, size, weight, style };
			},
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
				fonts.push({ text, ...font });
			},
		} as unknown as RenderContext;
		const spills: Rect[] = [];
		const drops: Rect[] = [];
		const lyricDrops: Array<{ system: number; stave: Stave; rect: Rect }> = [];
		const pageTops: number[] = [];
		const pageBottoms: number[] = [];
		const resolver = new CollisionResolver(new Rect(0, 0, 2000, 2000), {});
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
				dropLyricsBelow: (system, stave, rect) => {
					lyricDrops.push({ system, stave, rect });
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
				...options,
			},
		);
		return {
			placer,
			texts,
			fonts,
			segments,
			spills,
			drops,
			lyricDrops,
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
						anchor: note(200, stave()),
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

	it('starts a directive over a whole-measure rest at the bar start, not the rest', () => {
		const { placer, texts } = makePlacer();
		placer.placeColumn(
			column({
				words: [
					{
						stave: stave(),
						text: 'Andantino',
						anchor: note(200, stave(), true),
						placement: 'above',
						opensBar: true,
					},
				],
			}),
		);
		// The stave's first note position (60), not the rest's x.
		expect(texts).toEqual([
			{ text: 'Andantino', x: 60, y: 86, fill: '#000002' },
		]);
	});

	it('keeps a directive later in a resting bar on the rest', () => {
		const { placer, texts } = makePlacer();
		placer.placeColumn(
			column({
				words: [
					{
						stave: stave(),
						text: 'D.S. al Coda',
						anchor: note(200, stave(), true),
						placement: 'above',
						opensBar: false,
					},
				],
			}),
		);
		expect(texts).toEqual([
			{ text: 'D.S. al Coda', x: 200, y: 86, fill: '#000002' },
		]);
	});

	it('ends a directive closing the bar at the right barline', () => {
		const { placer, texts } = makePlacer();
		placer.placeColumn(
			column({
				words: [
					{
						stave: stave(),
						text: 'D.S. al Coda',
						anchor: undefined,
						placement: 'above',
						closesBar: true,
					},
				],
			}),
		);
		// The barline is at 340 (stave x 40 + width 300) and the text is 120 wide.
		expect(texts).toEqual([
			{ text: 'D.S. al Coda', x: 220, y: 86, fill: '#000002' },
		]);
	});

	it('drops a below-placement directive under the stave without lifting the crop', () => {
		const { placer, texts, drops, spills, pageTops } = makePlacer();
		placer.placeColumn(
			column({
				words: [
					{
						stave: stave(),
						text: 'dolce',
						anchor: note(200, stave()),
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
						anchor: note(200, stave()),
						placement: 'above',
					},
				],
			}),
		);
		// The baseline rises until the box bottom clears the notehead by the words gap.
		expect(texts[0]?.y).toBe(60 - WORDS_NOTE_CLEARANCE);
		expect(pageTops).toEqual([60 - WORDS_NOTE_CLEARANCE - 13]);
	});

	// A words direction the document puts 30 tenths over the top line: its baseline.
	const placedWords = (
		position: { x?: number | null; y: number | null; dx: number; dy: number },
		side: 'above' | 'below' | null = null,
		format?: TextFormat,
	) =>
		column({
			words: [
				{
					stave: stave(),
					text: 'rit.',
					anchor: note(200, stave()),
					placement: 'above',
					position: { ...position, side },
					format,
				},
			],
		});

	it('ignores a document position unless the layout follows the document', () => {
		const { placer, texts } = makePlacer();
		placer.placeColumn(placedWords({ x: 85, y: 30, dx: 5, dy: 0 }));
		expect(texts[0]?.y).toBe(100 - WORDS_Y_OFFSET);
		expect(texts[0]?.x).toBe(200);
	});

	it("stands words on the document's default-y when following it", () => {
		const { placer, texts } = makePlacer({}, { documentPositions: 'follow' });
		placer.placeColumn(placedWords({ y: 30, dx: 0, dy: 0 }));
		expect(texts[0]?.y).toBe(70);
		expect(texts[0]?.x).toBe(200);
	});

	// vet-ignore simple-test-setup: each case builds its placer from the mode under test and stubs a text measurement canvas that no sibling uses
	it.each([
		['follow', 'top', 43],
		['strict', 'top', 43],
		['follow', 'middle', 38],
		['strict', 'middle', 38],
		['follow', 'bottom', 33],
		['strict', 'bottom', 33],
		['follow', 'baseline', 35],
		['strict', 'baseline', 35],
	] as const)('aligns text ink in %s on its %s', (mode, valign, expected) => {
		const { placer, texts } = makePlacer({}, { documentPositions: mode });
		const task = placedWords({ y: 60, dx: 0, dy: 5 }, null, {
			...PLAIN,
			valign,
		});
		const canvas = {
			getContext: () => ({
				font: '',
				measureText: () => ({
					width: 20,
					actualBoundingBoxAscent: 8,
					actualBoundingBoxDescent: 2,
				}),
			}),
		};
		Element.setTextMeasurementCanvas(canvas as unknown as HTMLCanvasElement);
		try {
			placer.placeColumn(task);
		} finally {
			Element.setTextMeasurementCanvas(
				undefined as unknown as HTMLCanvasElement,
			);
		}
		expect(texts.map(({ y }) => y)).toEqual([expected]);
	});

	it.each([undefined, 'follow'] as const)(
		'keeps automatic valign under %s without default-y',
		(mode) => {
			const { placer, texts } = makePlacer({}, { documentPositions: mode });
			const task = placedWords({ y: mode ? null : 60, dx: 0, dy: 0 }, null, {
				...PLAIN,
				valign: 'top',
			});
			placer.placeColumn(task);
			expect(texts.map(({ y }) => y)).toEqual([100 - WORDS_Y_OFFSET]);
		},
	);

	it.each(['follow', 'strict'] as const)(
		'places default-x from the measure start in %s',
		(mode) => {
			const { placer, texts } = makePlacer({}, { documentPositions: mode });
			placer.placeColumn(placedWords({ x: 85, y: 30, dx: 5, dy: 0 }));
			expect(texts[0]?.x).toBe(130);
		},
	);

	it.each(['follow', 'strict'] as const)(
		'keeps a zero default-x at the barline in %s',
		(mode) => {
			const { placer, texts } = makePlacer({}, { documentPositions: mode });
			placer.placeColumn(placedWords({ x: 0, y: 30, dx: 0, dy: 0 }));
			expect(texts[0]?.x).toBe(40);
		},
	);

	it('lifts a followed position clear of a note, but keeps a strict one', () => {
		const follow = makePlacer({}, { documentPositions: 'follow' });
		follow.resolver.add({ rect: new Rect(190, 60, 30, 30), kind: 'note' });
		follow.placer.placeColumn(placedWords({ y: 30, dx: 0, dy: 0 }));
		expect(follow.texts[0]?.y).toBe(60 - WORDS_NOTE_CLEARANCE);

		const strict = makePlacer({}, { documentPositions: 'strict' });
		strict.resolver.add({ rect: new Rect(190, 60, 30, 30), kind: 'note' });
		strict.placer.placeColumn(placedWords({ y: 30, dx: 0, dy: 0 }));
		expect(strict.texts[0]?.y).toBe(70);
		// Pinned, it still stands in the way of what vexml places after it.
		expect(
			strict.resolver
				.query(new Rect(200, 65, 1, 1))
				.filter((c) => c.other.kind === 'annotation').length,
		).toBe(1);
	});

	it("moves vexml's own position by the relative offsets", () => {
		const { placer, texts } = makePlacer({}, { documentPositions: 'follow' });
		placer.placeColumn(placedWords({ y: null, dx: 5, dy: -8 }));
		expect(texts[0]?.y).toBe(100 - WORDS_Y_OFFSET + 8);
		expect(texts[0]?.x).toBe(205);
	});

	it('takes the side a default-y implies for a direction naming none', () => {
		const { placer, texts, drops } = makePlacer(
			{},
			{ documentPositions: 'follow' },
		);
		placer.placeColumn(placedWords({ y: -70, dx: 0, dy: 0 }, 'below'));
		// Standing text under the staff: its baseline is the box bottom, on the default-y.
		expect(texts[0]?.y).toBe(170);
		expect(drops.length).toBe(1);
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
						anchor: note(200, stave()),
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

	it('moves a below dynamic beside a cross-staff stem instead of under it', () => {
		const { placer, texts, resolver } = makePlacer();
		resolver.add({ rect: new Rect(195, 140, 2, 100), kind: 'stem' });
		placer.placeColumn(
			column({
				dynamics: [
					{
						stave: stave(),
						text: 'p',
						glyph: true,
						anchor: note(200, stave()),
						placement: 'below',
					},
				],
			}),
		);
		expect(texts[0]?.x).toBe(197 + WORDS_NOTE_CLEARANCE);
		expect(texts[0]?.y).toBe(140 + WORDS_Y_OFFSET + 24);
	});

	it('stacks figured-bass rows downward off each other', () => {
		const { placer, texts } = makePlacer();
		placer.placeColumn(
			column({
				figuredBasses: [
					{ stave: stave(), figures: ['6', '4'], anchor: note(200, stave()) },
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
						staveNote: note(200, stave()),
						text: 'B♭',
						symbol: {
							text: 'B♭',
							head: 'B♭',
							stack: [],
							tail: '',
							hang: false,
						},
						frame: null,
						placement: 'above',
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

	it('centers segno and coda signs over the opening barline above the top stave', () => {
		const { placer, texts, spills, pageTops } = makePlacer({
			navigationsOf: () => [
				{ kind: 'segno', position: null },
				{ kind: 'coda', position: null },
			],
			rehearsalsOf: () => [],
		});
		placer.placeColumn(column({ topStave: stave(), measure: {} as Measure }));
		// Each single-character glyph measures 10px wide, so centering on stave.getX() = 40 puts x at 35.
		expect(texts.map((t) => ({ text: t.text, x: t.x, fill: t.fill }))).toEqual([
			{ text: '\uE047', x: 35, fill: '#000001' },
			{ text: '\uE048', x: 35, fill: '#000001' },
		]);
		expect(texts[0]?.y).toBe(100 - WORDS_Y_OFFSET);
		expect(spills).toHaveLength(2);
		expect(pageTops).toHaveLength(2);
	});

	it('boxes a rehearsal mark at the measure left edge over the top stave', () => {
		const { placer, texts, spills, pageTops } = makePlacer({
			navigationsOf: () => [],
			rehearsalsOf: () => [{ text: 'A', format: PLAIN, position: null }],
		});
		placer.placeColumn(column({ topStave: stave(), measure: {} as Measure }));
		expect(texts).toEqual([
			{
				text: 'A',
				x: 40 + REHEARSAL_PADDING,
				y: expect.any(Number),
				fill: '#000002',
			},
		]);
		// Enclosed text stands a little up from its box's bottom, so it sits centered in it.
		expect(texts[0]?.y).toBeCloseTo(
			100 -
				8 -
				REHEARSAL_PADDING -
				REHEARSAL_FONT_SIZE * (1 - ENCLOSED_BASELINE),
		);
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
			kind: 'bracket',
			above: true,
			dash: null,
			startEnd: 'none',
			stopEnd: 'none',
		} as unknown as DirectionLineSpan;
		const lines: DirectionLineTask[] = [
			{ span, start: undefined, stop: note(200, stave()) },
			// A span wrapping onto a later system runs right-to-left and is dropped.
			{ span, start: note(300, stave()), stop: note(100, stave()) },
		];
		placer.drawDirectionLines(lines);
		expect(segments).toHaveLength(0);
		expect(pageTops).toHaveLength(0);
	});

	it('hooks an above-stave bracket down toward the staff at both ends', () => {
		const { placer, segments, pageTops, pageBottoms } = makePlacer();
		const span = {
			kind: 'bracket',
			above: true,
			dash: null,
			startEnd: 'down',
			stopEnd: 'down',
		} as unknown as DirectionLineSpan;
		placer.drawDirectionLines([
			{ span, start: note(100, stave()), stop: note(200, stave()) },
		]);
		// Down the start hook, along the line at the top-text y, down the stop hook.
		expect(segments).toEqual([
			{ x1: 100, y1: 80 + DIRECTION_LINE_HOOK, x2: 100, y2: 80 },
			{ x1: 100, y1: 80, x2: 210, y2: 80 },
			{ x1: 210, y1: 80, x2: 210, y2: 80 + DIRECTION_LINE_HOOK },
		]);
		expect(pageTops).toEqual([80 - DIRECTION_LINE_HOOK]);
		expect(pageBottoms).toEqual([80 + DIRECTION_LINE_HOOK]);
	});

	// vet-ignore simple-test-setup: the placer, anchor stave and blocking note are specific to this below-stave scenario
	it('drops a below-stave bracket clear of words pushed onto its row', () => {
		const { placer, segments, resolver, drops, pageBottoms } = makePlacer();
		const anchorStave = stave();
		resolver.add({
			rect: new Rect(100, 150, 100, 20),
			kind: 'note',
		});
		placer.placeColumn(
			column({
				words: [
					{
						stave: anchorStave,
						text: 'cresc.',
						anchor: note(100, anchorStave),
						placement: 'below',
					},
				],
			}),
		);
		placer.drawDirectionLines([
			{
				span: {
					kind: 'bracket',
					above: false,
					dash: null,
					startEnd: 'none',
					stopEnd: 'none',
				} as unknown as DirectionLineSpan,
				start: note(100, anchorStave),
				stop: note(200, anchorStave),
			},
		]);
		const y = (drops[0]?.bottom ?? 0) + WORDS_NOTE_CLEARANCE;
		expect(segments).toEqual([{ x1: 100, y1: y, x2: 210, y2: y }]);
		expect(pageBottoms).toEqual([y + DIRECTION_LINE_HOOK]);
	});

	it.each(['above', 'below'] as const)(
		'starts dashes after a leading word on its line (%s the stave)',
		(placement) => {
			const { placer, segments, spills, drops } = makePlacer();
			const anchorStave = stave();
			placer.placeColumn(
				column({
					words: [
						{
							stave: anchorStave,
							text: 'cresc.',
							anchor: note(100, anchorStave),
							placement,
						},
					],
				}),
			);
			placer.drawDirectionLines([
				{
					span: {
						kind: 'dashes',
						above: placement === 'above',
						dash: [5, 5],
						startEnd: 'none',
						stopEnd: 'none',
					} as unknown as DirectionLineSpan,
					start: note(100, anchorStave),
					stop: note(200, anchorStave),
				},
			]);
			const word = (placement === 'above' ? spills : drops)[0];
			expect(word).toBeDefined();
			const expectedX1 = (word?.right ?? 0) + DIRECTION_LINE_WORD_GAP;
			const expectedY = (word?.bottom ?? 0) - (word?.h ?? 0) * 0.28;
			expect(segments).toEqual([
				{ x1: expectedX1, y1: expectedY, x2: 210, y2: expectedY },
			]);
		},
	);

	it('defaults tempo words to bold upright type larger than ordinary words, letting explicit attributes win', () => {
		const { placer, fonts } = makePlacer();
		const anchorStave = stave();
		placer.placeColumn(
			column({
				words: [
					{
						stave: anchorStave,
						text: 'Allegro',
						anchor: note(100, anchorStave),
						placement: 'above',
						tempo: true,
						format: PLAIN,
					},
					{
						stave: anchorStave,
						text: 'rubato',
						anchor: note(200, anchorStave),
						placement: 'above',
						tempo: true,
						explicitSize: true,
						format: { ...PLAIN, bold: false, italic: true, scale: 0.9 },
					},
				],
			}),
		);
		expect(fonts).toEqual([
			{
				text: 'Allegro',
				family: 'Arial',
				size: TEMPO_WORDS_FONT_SIZE,
				weight: 'bold',
				style: 'normal',
			},
			{
				text: 'rubato',
				family: 'Arial',
				size: WORDS_FONT_SIZE * 0.9,
				weight: 'normal',
				style: 'italic',
			},
		]);
	});

	it('records above-stave words on their stave for ottava clearance while leaving below words out', () => {
		const { placer } = makePlacer();
		const anchorStave = stave();
		const anchor = note(100, anchorStave);
		placer.placeColumn(
			column({
				words: [
					{
						stave: anchorStave,
						text: 'Allegro',
						anchor,
						placement: 'above',
						tempo: true,
						format: PLAIN,
					},
					{
						stave: anchorStave,
						text: 'espressivo',
						anchor,
						placement: 'below',
						format: PLAIN,
					},
				],
			}),
		);
		expect(placer.aboveAnnotationsOn(anchorStave)).toHaveLength(1);
	});

	it('aligns a bar-opening tempo word with a coinciding BEGIN time signature, ignoring END cautionary ones and mid-bar tempos', () => {
		const { placer, texts } = makePlacer();
		const opening = stave([
			{
				position: StaveModifierPosition.BEGIN,
				category: TimeSignature.CATEGORY,
				x: 92,
			},
		]);
		const cautionary = stave([
			{
				position: StaveModifierPosition.END,
				category: TimeSignature.CATEGORY,
				x: 310,
			},
		]);
		placer.placeColumn(
			column({
				words: [
					{
						stave: opening,
						text: 'Allegro',
						anchor: note(140, opening),
						placement: 'above',
						opensBar: true,
						tempo: true,
					},
					{
						stave: opening,
						text: 'Vivace',
						anchor: note(220, opening),
						placement: 'above',
						opensBar: false,
						tempo: true,
					},
					{
						stave: cautionary,
						text: 'Presto',
						anchor: note(140, cautionary),
						placement: 'above',
						opensBar: true,
						tempo: true,
					},
				],
			}),
		);
		expect(texts.map(({ text, x }) => ({ text, x }))).toEqual([
			{ text: 'Allegro', x: 92 },
			{ text: 'Vivace', x: 220 },
			{ text: 'Presto', x: 140 },
		]);
	});

	it('aligns a metronome mark with a coinciding BEGIN time signature, ignoring END cautionary ones', () => {
		const { placer, spills } = makePlacer();
		const noopContext = {
			save() {},
			restore() {},
			setFont() {},
			fillText() {},
		};
		const opening = Object.assign(
			stave([
				{
					position: StaveModifierPosition.BEGIN,
					category: TimeSignature.CATEGORY,
					x: 92,
				},
			]),
			{ getModifierXShift: () => 50, checkContext: () => noopContext },
		);
		const cautionary = Object.assign(
			stave([
				{
					position: StaveModifierPosition.END,
					category: TimeSignature.CATEGORY,
					x: 310,
				},
			]),
			{ getModifierXShift: () => 50, checkContext: () => noopContext },
		);
		placer.placeColumn(
			column({
				tempos: [
					{
						stave: opening,
						tempo: {
							duration: 'q',
							dots: 0,
							bpm: 96,
							duration2: null,
							dots2: 0,
							parenthesis: false,
							justify: null,
							position: null,
						},
						modulations: [],
						justify: null,
						position: null,
					},
					{
						stave: cautionary,
						tempo: {
							duration: 'q',
							dots: 0,
							bpm: 96,
							duration2: null,
							dots2: 0,
							parenthesis: false,
							justify: null,
							position: null,
						},
						modulations: [],
						justify: null,
						position: null,
					},
				],
			}),
		);
		expect(spills.map((s) => s.x)).toEqual([92, 40 + 50 + 10]);
	});

	it('aligns a bar-opening tempo word and metronome mark with a system-opening forward repeat sign, not a mid-system one', () => {
		const repeatModifier = (x: number) => {
			const barline = new Barline(Barline.type.REPEAT_BEGIN);
			barline.setPosition(StaveModifierPosition.BEGIN);
			barline.setX(x);
			return barline;
		};
		const noopContext = {
			save() {},
			restore() {},
			setFont() {},
			fillText() {},
		};
		const repeatStave = (x: number, withTimeSignature = false) => {
			const modifiers: Array<{
				getX: () => number;
				getCategory: () => string;
				getPosition: () => StaveModifierPosition;
			}> = [repeatModifier(x)];
			if (withTimeSignature) {
				modifiers.push({
					getX: () => 88,
					getCategory: () => TimeSignature.CATEGORY,
					getPosition: () => StaveModifierPosition.BEGIN,
				});
			}
			return Object.assign(stave(), {
				getModifierXShift: () => 50,
				checkContext: () => noopContext,
				getModifiers: (position?: StaveModifierPosition, category?: string) =>
					modifiers.filter(
						(m) =>
							(position === undefined || m.getPosition() === position) &&
							(category === undefined || m.getCategory() === category),
					),
			}) as unknown as Stave;
		};

		const { placer, texts, spills } = makePlacer();
		const systemStart = repeatStave(104);
		const midSystem = repeatStave(104);
		const withTime = repeatStave(104, true);

		// System-opening repeat sign: tempo word and metronome mark align with its heavy bar's left edge.
		placer.placeColumn(
			column({
				isSystemStart: true,
				words: [
					{
						stave: systemStart,
						text: 'Animando',
						anchor: note(140, systemStart),
						placement: 'above',
						opensBar: true,
						tempo: true,
					},
					{
						stave: withTime,
						text: 'Allegro',
						anchor: note(140, withTime),
						placement: 'above',
						opensBar: true,
						tempo: true,
					},
				],
				tempos: [
					{
						stave: systemStart,
						tempo: {
							duration: 'q',
							dots: 0,
							bpm: 120,
							duration2: null,
							dots2: 0,
							parenthesis: false,
							justify: null,
							position: null,
						},
						modulations: [],
						justify: null,
						position: null,
					},
				],
			}),
		);

		// Mid-system repeat sign acts as a barline: tempo word and metronome mark keep their note anchor.
		placer.placeColumn(
			column({
				isSystemStart: false,
				words: [
					{
						stave: midSystem,
						text: 'Più mosso',
						anchor: note(140, midSystem),
						placement: 'above',
						opensBar: true,
						tempo: true,
					},
				],
				tempos: [
					{
						stave: midSystem,
						tempo: {
							duration: 'q',
							dots: 0,
							bpm: 132,
							duration2: null,
							dots2: 0,
							parenthesis: false,
							justify: null,
							position: null,
						},
						modulations: [],
						justify: null,
						position: null,
					},
				],
			}),
		);

		const repeatLeft = 104 + openingRepeatLeftOffset();
		expect(texts.map(({ text, x }) => ({ text, x }))).toEqual([
			{ text: 'Animando', x: repeatLeft },
			{ text: 'Allegro', x: 88 },
			{ text: 'Più mosso', x: 140 },
		]);
		expect(spills.filter((_, i) => i === 2 || i === 4).map((s) => s.x)).toEqual(
			[repeatLeft, 40 + 50 + 10],
		);
	});

	it('places a metronome mark inline on the same baseline after a preceding tempo word in the same direction', () => {
		const { placer, spills } = makePlacer();
		const noopContext = {
			save() {},
			restore() {},
			setFont() {},
			fillText() {},
		};
		const s = Object.assign(stave(), {
			getModifierXShift: () => 50,
			checkContext: () => noopContext,
		});
		const sharedDirection = {} as Direction;
		placer.placeColumn(
			column({
				words: [
					{
						stave: s,
						text: 'Tempo I',
						anchor: note(100, s),
						placement: 'above',
						opensBar: true,
						tempo: true,
						tempoDirection: sharedDirection,
					},
				],
				tempos: [
					{
						stave: s,
						direction: sharedDirection,
						tempo: {
							duration: 'q',
							dots: 0,
							bpm: 72,
							duration2: null,
							dots2: 0,
							parenthesis: true,
							justify: null,
							position: null,
						},
						modulations: [],
						justify: null,
						position: null,
					},
				],
			}),
		);
		const [wordSpill, tempoSpill] = spills;
		expect(wordSpill).toBeDefined();
		expect(tempoSpill).toBeDefined();
		expect(tempoSpill?.x).toBe(
			(wordSpill?.right ?? 0) + TEMPO_WORD_METRONOME_GAP,
		);
		// Without an obstacle under the metronome, its baseline stays at wordSpill.bottom
		// instead of stacking vertically above Tempo I.
		expect(tempoSpill?.bottom).toBeCloseTo(wordSpill?.bottom ?? 0, 5);
	});

	it('centres the equals sign of a mid-system tempo equation over the barline, leaving system-start equations aligned normally', () => {
		const drawnEquals: number[] = [];
		const recordingContext = {
			save() {},
			restore() {},
			scale() {},
			setFont() {},
			fillText(text: string, x: number) {
				if (text === '=') {
					drawnEquals.push(x);
				}
			},
		};
		const withTimeSig = Object.assign(
			stave([
				{
					position: StaveModifierPosition.BEGIN,
					category: TimeSignature.CATEGORY,
					x: 92,
				},
			]),
			{ getModifierXShift: () => 50, checkContext: () => recordingContext },
		);
		const eqWidth = new Element('StaveTempo').setText('=').getWidth();
		const { placer, spills } = makePlacer();
		// Mid-system beat-unit equation: "=" centred over stave.getX() (40), even with a time signature.
		placer.placeColumn(
			column({
				isSystemStart: false,
				tempos: [
					{
						stave: withTimeSig,
						tempo: {
							duration: 'half',
							dots: 0,
							bpm: 120,
							duration2: 'quarter',
							dots2: 0,
							parenthesis: false,
							justify: null,
							position: null,
						},
						modulations: [],
						justify: null,
						position: null,
					},
				],
			}),
		);
		// System-start beat-unit equation: stays aligned with the opening time signature (92).
		placer.placeColumn(
			column({
				isSystemStart: true,
				tempos: [
					{
						stave: withTimeSig,
						tempo: {
							duration: 'half',
							dots: 0,
							bpm: 120,
							duration2: 'quarter',
							dots2: 0,
							parenthesis: false,
							justify: null,
							position: null,
						},
						modulations: [],
						justify: null,
						position: null,
					},
				],
			}),
		);
		// Mid-system equation sits straddling the barline at x = 40; system-start sits at x = 92.
		expect(spills[0]?.x).toBeLessThan(40);
		expect(spills[0]?.right).toBeGreaterThan(40);
		expect(spills[1]?.x).toBe(92);
		// The mid-system "=" centre in canvas coordinates lands on the barline at x = 40.
		expect(drawnEquals[0]).toBeDefined();
		expect(((drawnEquals[0] ?? 0) + eqWidth / 2) * TEMPO_SCALE).toBeCloseTo(
			40,
			5,
		);
	});

	it('places a below-stave dynamic above lyrics and asks the lyrics to drop below it', () => {
		const { placer, drops, lyricDrops, resolver } = makePlacer();
		const anchorStave = stave();
		// A lyric syllable already pinned below the stave in band 3.
		resolver.add({
			rect: new Rect(90, 150, 30, 11),
			kind: 'lyric',
			band: 3,
		});
		placer.placeColumn(
			column({
				dynamics: [
					{
						stave: anchorStave,
						text: 'p',
						glyph: true,
						anchor: note(100, anchorStave),
						placement: 'below',
					},
				],
			}),
		);
		// Dynamic sits at its natural below-stave offset instead of dropping below the lyric.
		expect(drops[0]?.y).toBe(140 + WORDS_Y_OFFSET);
		expect(lyricDrops).toHaveLength(1);
		expect(lyricDrops[0]?.stave).toBe(anchorStave);
		expect(lyricDrops[0]?.rect).toEqual(drops[0]);
	});

	it('stacks above-stave words above co-located above-stave dynamics while preserving word order', () => {
		const { placer, texts } = makePlacer();
		const anchorStave = stave();
		const beat1 = note(100, anchorStave);
		const beat3 = note(220, anchorStave);
		placer.placeColumn(
			column({
				words: [
					{
						stave: anchorStave,
						text: 'Lights dim.',
						anchor: beat1,
						placement: 'above',
					},
					{
						stave: anchorStave,
						text: 'Allegro molto',
						anchor: beat1,
						placement: 'above',
					},
					{
						stave: anchorStave,
						text: 'ANN (to Jack)',
						anchor: beat3,
						placement: 'above',
					},
				],
				dynamics: [
					{
						stave: anchorStave,
						text: 'pp',
						glyph: true,
						anchor: beat3,
						placement: 'above',
					},
				],
			}),
		);
		const byText = (t: string) => texts.find((entry) => entry.text === t);
		const pp = byText(new DynamicGlyphs().spell('pp'));
		const ann = byText('ANN (to Jack)');
		const lights = byText('Lights dim.');
		const allegro = byText('Allegro molto');
		expect(pp).toBeDefined();
		expect(ann).toBeDefined();
		expect(lights).toBeDefined();
		expect(allegro).toBeDefined();
		if (!pp || !ann || !lights || !allegro) {
			throw new Error('expected all directions to be drawn');
		}
		// Character text sits above pp (smaller y), while Allegro molto stacks above Lights dim.
		expect(ann.y).toBeLessThan(pp.y);
		expect(allegro.y).toBeLessThan(lights.y);
	});

	it('centers grand-staff harp pedal diagrams between staves and clears low upper notes', () => {
		const upper = stave();
		const lower = {
			...stave(),
			getYForLine: () => 200,
			getBottomLineY: () => 240,
		} as unknown as Stave;
		const anchor = note(120, upper);
		const glyphs = '\uE680\uE681\uE682\uE683\uE681\uE682\uE680\uE681';

		// Open gap: upper bottom line 140, lower top line 200 -> midpoint 170.
		const clean = makePlacer();
		clean.placer.placeColumn(
			column({
				harpPedals: [
					{
						stave: upper,
						lowerStave: lower,
						glyphs,
						anchor,
						placement: 'below',
					},
				],
			}),
		);
		expect(clean.drops).toHaveLength(1);
		const cleanBox = clean.drops[0];
		expect(cleanBox).toBeDefined();
		if (!cleanBox) {
			throw new Error('expected harp pedal drop rect');
		}
		expect(cleanBox.y).toBeGreaterThan(upper.getBottomLineY());
		expect(cleanBox.bottom).toBeLessThan(lower.getYForLine(0));
		expect(cleanBox.y + cleanBox.h / 2).toBeCloseTo(170, 1);

		// Low upper-stave note reaching down to y=170 pushes the diagram down and reports the drop.
		const crowded = makePlacer();
		crowded.resolver.add({
			rect: new Rect(100, 140, 40, 30),
			kind: 'note',
			band: 3,
		});
		crowded.placer.placeColumn(
			column({
				harpPedals: [
					{
						stave: upper,
						lowerStave: lower,
						glyphs,
						anchor,
						placement: 'below',
					},
				],
			}),
		);
		const crowdedBox = crowded.drops[0];
		expect(crowdedBox).toBeDefined();
		if (!crowdedBox) {
			throw new Error('expected crowded harp pedal drop rect');
		}
		expect(crowdedBox.y).toBeGreaterThanOrEqual(170 + WORDS_NOTE_CLEARANCE);
	});

	it('centers grand-staff harp damping signs between staves and anchors downbeat whole-rest damp after the barline', () => {
		const upper = stave();
		const lower = {
			...stave(),
			getYForLine: () => 200,
			getBottomLineY: () => 240,
		} as unknown as Stave;

		// Beat-2 <damp-all/> between staves, centered on its anchor.
		const midBar = makePlacer();
		midBar.placer.placeColumn(
			column({
				symbols: [
					{
						stave: upper,
						lowerStave: lower,
						glyph: '\uE639',
						anchor: note(160, upper),
						placement: 'below',
						opensBar: false,
					},
				],
			}),
		);
		const midBox = midBar.drops[0];
		expect(midBox).toBeDefined();
		if (!midBox) {
			throw new Error('expected damp-all drop rect');
		}
		expect(midBox.y).toBeGreaterThan(upper.getBottomLineY());
		expect(midBox.bottom).toBeLessThan(lower.getYForLine(0));
		expect(midBox.y + midBox.h / 2).toBeCloseTo(170, 1);

		// Downbeat <damp/> on a centered whole-measure rest (x=220) anchors at getNoteStartX() (60).
		const downbeat = makePlacer();
		downbeat.placer.placeColumn(
			column({
				symbols: [
					{
						stave: upper,
						lowerStave: lower,
						glyph: '\uE638',
						anchor: note(220, upper, true),
						placement: 'below',
						opensBar: true,
					},
				],
			}),
		);
		const downbeatBox = downbeat.drops[0];
		expect(downbeatBox).toBeDefined();
		if (!downbeatBox) {
			throw new Error('expected downbeat damp drop rect');
		}
		expect(downbeatBox.y).toBeGreaterThan(upper.getBottomLineY());
		expect(downbeatBox.bottom).toBeLessThan(lower.getYForLine(0));
		expect(downbeatBox.x).toBe(upper.getNoteStartX());
	});
});
