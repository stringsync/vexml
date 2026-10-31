import { beforeEach, describe, expect, it } from 'bun:test';
import { Rect } from 'core/geometry';
import {
	Barline,
	type BarlineType,
	GraceNoteGroup,
	Modifier,
	type RenderContext,
	type Stave,
	type StaveNote,
	TimeSignature,
	type Voice,
} from 'vexflow/core';
import type { ChordTranslator } from './chord-translator';
import { CollisionResolver } from './collision-resolver';
import { DEFAULT_CONFIG, DEFAULT_STANDARD_LAYOUT } from './config';
import type { ConnectorDrawer } from './connector-drawer';
import { DefaultScoreParser } from './default-score-parser';
import { DetachedViewport } from './detached-viewport';
import { DynamicGlyphs } from './dynamic-glyphs';
import { ElementFactory } from './element-factory';
import { FakePaintProbe } from './fake-paint-probe';
import { FakeTechnicalMark } from './fake-technical-mark';
import { GapInserter } from './gap-inserter';
import { Gaps } from './gaps';
import { InertDecoration } from './inert-decoration';
import type { LyricPlacer } from './lyric-placer';
import { ScoreEngraver } from './score-engraver';
import { ScoreReader } from './score-reader';
import { SequenceFactory } from './sequence-factory';
import type { SpannerBuilder } from './spanner-builder';
import { SpillTracker } from './spill-tracker';
import { SystemFormatter } from './system-formatter';
import type { VoiceTranslator } from './voice-translator';

describe('SystemFormatter', () => {
	const makeFormatter = () =>
		new SystemFormatter(
			{} as unknown as RenderContext,
			{ noteheadHalfWidth: () => 5 } as unknown as VoiceTranslator,
			{} as unknown as ChordTranslator,
			{} as unknown as SpannerBuilder,
			{} as unknown as ConnectorDrawer,
			{} as unknown as LyricPlacer,
			new CollisionResolver(new Rect(0, 0, 2000, 2000), {}),
			new SpillTracker(),
			{ systemOf: () => 0 },
			{
				reader: new ScoreReader(new DynamicGlyphs()),
				documentPositions: false,
				softmaxFactor: 100,
				notationColor: '#000000',
				byLead: new Map(),
				crossStaveNotes: new Set(),
			},
		);

	// The note surface noteRect reads: notehead bounds, stem extents, and modifiers.
	const note = (opts: NoteOptions = {}) =>
		({
			getAbsoluteX: () => opts.x ?? 100,
			getNoteHeadBounds: () => ({ yTop: 50, yBottom: 70 }),
			getStem: () => opts.stem ?? null,
			getStemExtents: () => opts.stem,
			getModifiers: () => opts.modifiers ?? [],
		}) as unknown as StaveNote;

	interface NoteOptions {
		x?: number;
		stem?: { topY: number; baseY: number };
		modifiers?: unknown[];
	}

	const articulation = (position: number, y: number) => ({
		getCategory: () => 'Articulation',
		getPosition: () => position,
		getBoundingBox: () => ({ getY: () => y }),
	});

	it('boxes a stemless note one notehead wide from head top to head bottom', () => {
		expect(makeFormatter().noteRect(note())).toMatchObject({
			x: 95,
			y: 50,
			w: 10,
			h: 20,
		});
	});

	it('reaches the stem tip past the noteheads on both sides', () => {
		const rect = makeFormatter().noteRect(
			note({ stem: { topY: 30, baseY: 80 } }),
		);
		expect(rect).toMatchObject({ y: 30, h: 50 });
	});

	it('lifts the top to above-side articulations and technical marks', () => {
		const rect = makeFormatter().noteRect(
			note({
				modifiers: [
					articulation(Modifier.Position.ABOVE, 25),
					new FakeTechnicalMark({ top: 15 }),
				],
			}),
		);
		expect(rect).toMatchObject({ y: 15, h: 55 });
	});

	it('ignores below-side marks and non-above articulations', () => {
		const rect = makeFormatter().noteRect(
			note({
				modifiers: [
					articulation(Modifier.Position.BELOW, 10),
					new FakeTechnicalMark({ below: true, top: 90 }),
				],
			}),
		);
		expect(rect).toMatchObject({ y: 50, h: 20 });
	});

	it('reports no extent for a column with no pending staves', () => {
		const extent = makeFormatter().formatAndDraw([], {
			systemIndex: 0,
			measureLeadingPad: 0,
			measureTrailingPad: 0,
		});
		expect(extent).toEqual({ top: Infinity, bottom: 0 });
	});

	// A grace cluster the way closeGraceGaps sees one: position plus mutable spacing.
	const graceGroup = (position: number, spacing: number) => {
		const group = {
			spacing,
			getCategory: () => GraceNoteGroup.CATEGORY,
			getPosition: () => position,
			getSpacingFromNextModifier: () => group.spacing,
			setSpacingFromNextModifier: (next: number) => {
				group.spacing = next;
			},
		};
		return group;
	};

	// closeGraceGaps runs inside formatAndDraw right after the vexflow format pass; reach
	// past the private marker to exercise its arithmetic without a full render.
	const closeGraceGaps = (voices: unknown[]) =>
		(
			makeFormatter() as unknown as {
				closeGraceGaps(voices: Voice[]): void;
			}
		).closeGraceGaps(voices as Voice[]);

	let leading: ReturnType<typeof graceGroup>;
	let formatter: SystemFormatter;

	beforeEach(() => {
		formatter = makeFormatter();
		leading = graceGroup(Modifier.Position.LEFT, 4);
	});

	it('hands a double-graced note reserved right shift back to its leading cluster', () => {
		const trailing = graceGroup(Modifier.Position.RIGHT, 9);
		const tickable = {
			getModifiers: () => [leading, trailing],
			checkTickContext: () => ({ getMetrics: () => ({ modRightPx: 30 }) }),
		};
		closeGraceGaps([{ getTickables: () => [tickable] }]);
		expect(leading.spacing).toBe(34);
		expect(trailing.spacing).toBe(9);
	});

	it('leaves a lone grace cluster where the formatter put it', () => {
		const tickable = {
			getModifiers: () => [leading],
			checkTickContext: () => {
				throw new Error('single-cluster notes never read the tick context');
			},
		};
		closeGraceGaps([{ getTickables: () => [tickable] }]);
		expect(leading.spacing).toBe(4);
	});

	// A real begin modifier: alignBegModifiers groups repeats by instanceof, and the time
	// signature beside them by category alone (so that one stays a plain object).
	const _repeat = (x: number, type: BarlineType) => {
		const barline = new Barline(type);
		barline.setX(x);
		return barline;
	};

	const timeSig = (x: number) => {
		const sig = {
			x,
			moved: false,
			getCategory: () => TimeSignature.CATEGORY,
			getX: () => sig.x,
			setX: (next: number) => {
				sig.x = next;
				sig.moved = true;
			},
		};
		return sig;
	};

	const fakeStave = (modifiers: unknown[]) =>
		({
			format: () => {},
			getModifiers: () => modifiers,
		}) as unknown as Stave;

	it('squares repeats and time signatures to their own widest x and returns the repeat x', () => {
		const repeats = [
			_repeat(10, Barline.type.REPEAT_BEGIN),
			_repeat(25, Barline.type.REPEAT_BEGIN),
		];
		const sigs = [timeSig(30), timeSig(22)];
		const x = formatter.alignBegModifiers([
			fakeStave([repeats[0], sigs[0]]),
			fakeStave([repeats[1], sigs[1]]),
		]);
		expect(x).toBe(25);
		expect(repeats.map((r) => r.getX())).toEqual([25, 25]);
		expect(sigs.map((s) => s.x)).toEqual([30, 30]);
	});

	it('returns null and leaves a lone time signature alone without an opening repeat', () => {
		const sig = timeSig(30);
		// A plain barline is not an opening repeat, so it grouped nothing.
		const x = formatter.alignBegModifiers([
			fakeStave([_repeat(10, Barline.type.SINGLE), sig]),
		]);
		expect(x).toBeNull();
		expect(sig.moved).toBe(false);
	});

	// Exercise the real parse/layout/draw pipeline: these positions must reach the hit
	// geometry too.
	it.each(['follow', 'strict'] as const)(
		'keeps supplied measure widths and note x in %s',
		async (mode) => {
			const geometry = await horizontalGeometry(mode, 320);
			const box = geometry.measures[0]?.rect;
			expect(box?.w).toBe(320);
			expect(geometry.notes.map((n) => n.rect.x)).toEqual([
				expect.closeTo((box?.x ?? 0) + 110),
				expect.closeTo((box?.x ?? 0) + 240),
			]);
		},
	);

	it('ignores supplied measure widths and note x by default', async () => {
		const geometry = await horizontalGeometry('ignore', 320);
		const box = geometry.measures[0]?.rect;
		expect(box?.w).not.toBe(320);
		expect(geometry.notes[0]?.rect.x).not.toBeCloseTo((box?.x ?? 0) + 110);
	});

	it('does not move an unpositioned note sharing a tick with a positioned note', async () => {
		const body = `<note default-x="160"><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
		<backup><duration>4</duration></backup>
		<note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>2</voice><type>whole</type></note>`;
		const followed = await horizontalGeometry('follow', 320, { body });
		const ignored = await horizontalGeometry('ignore', 320, { body });
		expect(followed.notes[0]?.rect.x).toBeCloseTo(
			(followed.measures[0]?.rect.x ?? 0) + 160,
		);
		expect(followed.notes[1]?.rect.x).toBeCloseTo(
			ignored.notes[1]?.rect.x ?? 0,
		);
	});

	it('keeps a lower voice rest below every head of a low chord', async () => {
		const geometry = await horizontalGeometry('ignore', 320, {
			body: `<note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
			<note><chord/><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
			<note><chord/><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
			<backup><duration>4</duration></backup>
			<note><rest/><duration>1</duration><voice>2</voice><type>quarter</type></note>`,
		});
		expect(geometry.notes).toHaveLength(4);
		expect(geometry.notes[3]?.ink.y).toBeGreaterThanOrEqual(
			geometry.notes[0]?.ink.bottom ?? Infinity,
		);
	});

	it('keeps an upper voice rest above a high chord', async () => {
		const geometry = await horizontalGeometry('ignore', 320, {
			body: `<note><rest/><duration>1</duration><voice>1</voice><type>quarter</type></note>
			<forward><duration>3</duration></forward>
			<backup><duration>4</duration></backup>
			<note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><voice>2</voice><type>whole</type></note>
			<note><chord/><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><voice>2</voice><type>whole</type></note>
			<note><chord/><pitch><step>F</step><octave>5</octave></pitch><duration>4</duration><voice>2</voice><type>whole</type></note>`,
		});
		expect(geometry.notes).toHaveLength(4);
		expect(geometry.notes[0]?.ink.bottom).toBeLessThanOrEqual(
			geometry.notes[3]?.ink.y ?? -Infinity,
		);
	});

	it('keeps a strict document line unbroken when its exact widths overrun the page', async () => {
		const following = `<measure number="2" width="400"><print new-system="no"/>
		<note default-x="100"><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure>`;
		const strict = await horizontalGeometry('strict', 600, { following });
		const follow = await horizontalGeometry('follow', 600, { following });
		expect(
			strict.measures.map((m) => ({ width: m.rect.w, system: m.systemIndex })),
		).toEqual([
			{ width: 600, system: 0 },
			{ width: 400, system: 0 },
		]);
		expect(follow.measures.map((m) => m.systemIndex)).toEqual([0, 1]);
	});

	it('floors a followed width at the music minimum but keeps a strict width exact', async () => {
		const follow = await horizontalGeometry('follow', 90);
		const strict = await horizontalGeometry('strict', 90);
		expect(follow.measures[0]?.rect.w).toBeGreaterThan(90);
		expect(strict.measures[0]?.rect.w).toBe(90);
	});
});

async function horizontalGeometry(
	mode: 'ignore' | 'follow' | 'strict',
	width: number,
	opts: HorizontalGeometryOptions = {},
) {
	const { body, following = '' } = opts;
	const config = {
		...DEFAULT_CONFIG,
		layout: { ...DEFAULT_STANDARD_LAYOUT, documentLayout: mode },
	};
	const reader = new ScoreReader(new DynamicGlyphs());
	const gaps = new Gaps([], new GapInserter(reader));
	const engraver = ScoreEngraver.create(
		config,
		reader,
		gaps,
		new ElementFactory(),
		new SequenceFactory(reader, gaps),
	);
	const document =
		await new DefaultScoreParser().parse(`<score-partwise version="4.0">
	<part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
	<part id="P1"><measure number="1" width="${width}">
	<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
	${
		body ??
		`<note default-x="110"><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note>
	<note default-x="240"><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note>`
	}
	</measure>${following}</part></score-partwise>`);
	return engraver.engrave(
		document,
		new FakePaintProbe(),
		new DetachedViewport(),
		{ color: new InertDecoration(), halo: new InertDecoration() },
	).drawn.geometry;
}

interface HorizontalGeometryOptions {
	body?: string;
	following?: string;
}
