import { describe, expect, it } from 'bun:test';
import type { Chord, Note } from '@stringsync/mdom';
import type { RenderContext, Stave, StaveNote, TabNote } from 'vexflow';
import { Rect } from 'webappwiz/geometry';
import { WORDS_NOTE_CLEARANCE } from './constants';
import type { DirectionLineTask, DirectionPlacer } from './direction-placer';
import type { Hairpin } from './hairpin';
import type { DirectionLineSpan, PedalMark, WedgeMark } from './score-reader';
import type { SpannerBuilder } from './spanner-builder';
import {
	SpannerResolver,
	type SpannerResolverOptions,
} from './spanner-resolver';
import { SpillTracker } from './spill-tracker';
import type { VoiceTranslator } from './voice-translator';

describe('SpannerResolver', () => {
	// A drawable the builder fakes hand back: setContext(...).draw() logs its label, which
	// is all the resolver does with a built tie/slide/glissando/wavy line.
	const drawable = (drawn: string[], label: string) => ({
		setContext: () => ({ draw: () => drawn.push(label) }),
	});

	// The stave surface the real SpillTracker (and the pedal drop) reads.
	const stave = (opts: StaveOptions = {}) =>
		({
			getY: () => opts.y ?? 90,
			getYForLine: () => opts.lineTop ?? 100,
			getBottomLineY: () => opts.lineBottom ?? 140,
			getYForBottomText: () => (opts.lineBottom ?? 140) + 20,
			getSpacingBetweenLines: () => 10,
		}) as unknown as Stave;

	interface StaveOptions {
		y?: number;
		lineTop?: number;
		lineBottom?: number;
	}

	// A slur the way buildSlurs reports one: a curve to draw plus the bow's extent.
	const slur = (drawn: string[], opts: SlurOptions = {}) => ({
		curve: { setContext: () => ({ drawWithStyle: () => drawn.push('slur') }) },
		stave: opts.stave,
		top: opts.top ?? 80,
		bottom: opts.bottom ?? 150,
		left: 10,
		right: 60,
		crossStave: opts.crossStave ?? false,
	});

	interface SlurOptions {
		stave?: Stave;
		top?: number;
		bottom?: number;
		crossStave?: boolean;
	}

	// A tie the way buildTies reports one: a StaveTie from one B4 notehead (y=100) to the next,
	// bowing up (direction -1) with vexflow's default ribbon geometry.
	const tie = (drawn: string[], opts: TieOptions = {}) => ({
		setContext: () => ({ draw: () => drawn.push('tie') }),
		getNotes: () => ({
			firstNote: opts.stave && { checkStave: () => opts.stave },
		}),
		getFirstX: () => 10,
		getLastX: () => 60,
		getFirstYs: () => [100],
		getLastYs: () => [100],
		getDirection: () => -1,
		renderOptions: { cp2: 12, cp2Short: 8, shortTieCutoff: 10, yShift: 7 },
	});

	interface TieOptions {
		stave?: Stave;
	}

	// Every builder method answers empty so a test only overrides the paths it exercises.
	const builder = (overrides: Partial<SpannerBuilder> = {}) =>
		({
			buildTies: () => [],
			buildSlurs: () => [],
			buildHammerPulls: () => [],
			buildSlides: () => [],
			buildGlissandos: () => [],
			buildWavyLines: () => [],
			buildWedges: () => [],
			buildPedals: () => [],
			...overrides,
		}) as unknown as SpannerBuilder;

	const resolverOf = (
		spanners: Partial<SpannerBuilder> = {},
		opts: Partial<SpannerResolverOptions> = {},
	) => {
		const spill = new SpillTracker();
		const directionLines: DirectionLineTask[] = [];
		// The crop growth and note obstacles the resolver reports back to its driver.
		const page = { top: Infinity, bottom: 0 };
		const obstacles = new Map<StaveNote, Rect>();
		const resolver = new SpannerResolver(
			{} as unknown as RenderContext,
			builder(spanners),
			{ noteheadHalfWidth: () => 5 } as unknown as VoiceTranslator,
			spill,
			{
				drawDirectionLines: (tasks: readonly DirectionLineTask[]) =>
					directionLines.push(...tasks),
			} as unknown as DirectionPlacer,
			{
				noteObstacle: (note: StaveNote) =>
					obstacles.get(note) ?? new Rect(0, 0, 0, 0),
				growPageTop: (top: number) => {
					page.top = Math.min(page.top, top);
				},
				growPageBottom: (bottom: number) => {
					page.bottom = Math.max(page.bottom, bottom);
				},
			},
			{
				octaveShiftSpans: [],
				directionLineSpans: [],
				showTabSlideText: true,
				scratchViewport: new Rect(0, 0, 1000, 1000),
				...opts,
			},
		);
		return { resolver, spill, directionLines, page, obstacles };
	};

	const anchors = (
		byLead: Map<Note, StaveNote> = new Map(),
		byTabLead: Map<Note, TabNote> = new Map(),
	) => ({ byLead, byTabLead });

	it('hands every recorded chord and the lead map to the notation builders', () => {
		const drawn: string[] = [];
		const seen: Chord[][] = [];
		const byLead = new Map<Note, StaveNote>();
		const { resolver } = resolverOf({
			buildTies: (chords: Chord[], map: Map<Note, StaveNote>) => {
				seen.push([...chords]);
				expect(map).toBe(byLead);
				return [tie(drawn)];
			},
			buildGlissandos: () => [drawable(drawn, 'gliss')],
			buildWavyLines: () => [drawable(drawn, 'wavy')],
		} as unknown as Partial<SpannerBuilder>);
		const a = {} as Chord;
		const b = {} as Chord;
		const c = {} as Chord;
		resolver.addChords([a, b]);
		resolver.addChords([c]);
		resolver.resolve(anchors(byLead));
		expect(seen).toEqual([[a, b, c]]);
		expect(drawn).toEqual(['tie', 'gliss', 'wavy']);
	});

	it('routes tab chords, the tab lead map, and the slide-text flag to the tab builders', () => {
		const drawn: string[] = [];
		const byTabLead = new Map<Note, TabNote>();
		const tab = {} as Chord;
		let slideText: boolean | undefined;
		const { resolver } = resolverOf({
			buildHammerPulls: (chords: Chord[], map: Map<Note, TabNote>) => {
				expect(chords).toEqual([tab]);
				expect(map).toBe(byTabLead);
				return [drawable(drawn, 'hammer')];
			},
			buildSlides: (
				_chords: Chord[],
				_map: Map<Note, TabNote>,
				showText: boolean,
			) => {
				slideText = showText;
				return [drawable(drawn, 'slide')];
			},
		} as unknown as Partial<SpannerBuilder>);
		resolver.addTabChords([tab]);
		resolver.resolve(anchors(new Map(), byTabLead));
		expect(drawn).toEqual(['hammer', 'slide']);
		expect(slideText).toBe(true);
	});

	it('reports a slur bow as spill on its registered row and headroom on its system', () => {
		const drawn: string[] = [];
		const s = stave({ y: 90, lineTop: 100 });
		const { resolver, spill, page } = resolverOf({
			buildSlurs: () => [slur(drawn, { stave: s, top: 80, bottom: 150 })],
		} as unknown as Partial<SpannerBuilder>);
		resolver.registerStave(s, 2, 1);
		spill.recordSystemTop(1, 95);
		resolver.resolve(anchors());
		expect(drawn).toEqual(['slur']);
		// The bow reached 20px over the top staff line, banded on system 1 / row 2.
		const rise = spill.observedStaveSpill().get(1)?.get(2)?.rise;
		expect(rise ? Math.max(...rise.values()) : undefined).toBe(20);
		// And 15px over the system's placed top, reserved against the system above.
		expect(spill.observedOverflow().get(1)).toBe(15);
		expect(page.top).toBe(80);
		expect(page.bottom).toBe(150);
	});

	it("reports a tie's arc as spill on its stave", () => {
		const drawn: string[] = [];
		const s = stave({ y: 90, lineTop: 100 });
		const { resolver, spill, page } = resolverOf({
			buildTies: () => [tie(drawn, { stave: s })],
		} as unknown as Partial<SpannerBuilder>);
		resolver.registerStave(s, 2, 1);
		resolver.resolve(anchors());
		expect(drawn).toEqual(['tie']);
		// Each end starts yShift (7) over its notehead and the arc peaks cp2/2 (6) further:
		// 13px over the top staff line.
		const rise = spill.observedStaveSpill().get(1)?.get(2)?.rise;
		expect(rise ? Math.max(...rise.values()) : undefined).toBe(13);
		expect(page.top).toBe(87);
	});

	it('keeps a cross-stave bow out of the stave spill but in the page and headroom', () => {
		const drawn: string[] = [];
		const s = stave();
		const { resolver, spill, page } = resolverOf({
			buildSlurs: () => [
				slur(drawn, { stave: s, top: 80, bottom: 150, crossStave: true }),
			],
		} as unknown as Partial<SpannerBuilder>);
		resolver.registerStave(s, 2, 1);
		spill.recordSystemTop(1, 95);
		resolver.resolve(anchors());
		expect(spill.observedStaveSpill().size).toBe(0);
		expect(spill.observedOverflow().get(1)).toBe(15);
		expect(page.top).toBe(80);
	});

	it('pushes a below-stave wedge down past a slur bowing into its band', () => {
		const drawn: string[] = [];
		const s = stave();
		let offset: number | undefined;
		const wedge = {
			stave: s,
			above: false,
			rect: new Rect(20, 210, 30, 10),
			bounds: { top: 210, bottom: 220 },
			setOffset: (o: number) => {
				offset = o;
			},
			getOffset: () => offset ?? 0,
			setContext() {
				return this;
			},
			draw() {},
		} as unknown as Hairpin;
		const { resolver } = resolverOf({
			// The bow dips to y=220 in the wedge's column, so the wedge must drop below it.
			buildSlurs: () => [slur(drawn, { stave: s, top: 190, bottom: 220 })],
			buildWedges: () => [wedge],
		} as unknown as Partial<SpannerBuilder>);
		resolver.addWedges([{} as WedgeMark]);
		resolver.resolve(anchors());
		// dropClear lands the wedge top a clearance gap under the bow's bottom.
		expect(offset).toBe(220 + WORDS_NOTE_CLEARANCE - 210);
	});

	it('leaves a wedge alone when the only bow sits on another stave', () => {
		const drawn: string[] = [];
		let offset: number | undefined;
		const wedge = {
			stave: stave(),
			above: false,
			rect: new Rect(20, 210, 30, 10),
			bounds: { top: 210, bottom: 220 },
			setOffset: (o: number) => {
				offset = o;
			},
			getOffset: () => offset ?? 0,
			setContext() {
				return this;
			},
			draw() {},
		} as unknown as Hairpin;
		const { resolver } = resolverOf({
			buildSlurs: () => [
				slur(drawn, { stave: stave(), top: 190, bottom: 220 }),
			],
			buildWedges: () => [wedge],
		} as unknown as Partial<SpannerBuilder>);
		resolver.resolve(anchors());
		expect(offset).toBe(0);
	});

	it('drops a below-stave wedge under a ledger-line note it spans', () => {
		const s = stave();
		const note = {
			getStave: () => s,
			getTuplet: () => undefined,
		} as unknown as StaveNote;
		let offset: number | undefined;
		const wedge = {
			stave: s,
			above: false,
			rect: new Rect(20, 210, 30, 10),
			bounds: { top: 210, bottom: 220 },
			setOffset: (o: number) => {
				offset = o;
			},
			getOffset: () => offset ?? 0,
			setContext() {
				return this;
			},
			draw() {},
		} as unknown as Hairpin;
		const { resolver, obstacles } = resolverOf({
			buildWedges: () => [wedge],
		} as unknown as Partial<SpannerBuilder>);
		// The note hangs to y=225 inside the wedge's column.
		obstacles.set(note, new Rect(30, 180, 10, 45));
		resolver.resolve(anchors(new Map([[{} as Note, note]])));
		expect(offset).toBe(225 + WORDS_NOTE_CLEARANCE - 210);
	});

	it('puts a crescendo and the diminuendo it runs into on one line', () => {
		const s = stave();
		const offsets = new Map<string, number>();
		const wedge = (name: string, left: number) =>
			({
				stave: s,
				above: false,
				rect: new Rect(left, 210, 30, 10),
				bounds: { top: 210, bottom: 220 },
				setOffset: (o: number) => {
					offsets.set(name, o);
				},
				getOffset: () => offsets.get(name) ?? 0,
				setContext() {
					return this;
				},
				draw() {},
			}) as unknown as Hairpin;
		const note = {
			getStave: () => s,
			getTuplet: () => undefined,
		} as unknown as StaveNote;
		const { resolver, obstacles } = resolverOf({
			buildWedges: () => [wedge('cresc', 20), wedge('dim', 50)],
		} as unknown as Partial<SpannerBuilder>);
		// Only the crescendo's column has a low note; the diminuendo follows it down anyway.
		obstacles.set(note, new Rect(30, 180, 10, 45));
		resolver.resolve(anchors(new Map([[{} as Note, note]])));
		expect(offsets.get('cresc')).toBe(225 + WORDS_NOTE_CLEARANCE - 210);
		expect(offsets.get('dim')).toBe(offsets.get('cresc'));
	});

	it('drops a pedal band below its own low notes and grows the crop under it', () => {
		const s = stave({ lineBottom: 140 }); // pedal baseline = 160
		const note = {
			getStave: () => s,
			getAbsoluteX: () => 100,
		} as unknown as StaveNote;
		let line: number | undefined;
		const marking = {
			setLine: (l: number) => {
				line = l;
			},
			setContext() {
				return this;
			},
			draw() {},
		};
		const { resolver, page, obstacles } = resolverOf({
			buildPedals: () => [{ marking, notes: [note] }],
		} as unknown as Partial<SpannerBuilder>);
		// A low note reaching to y=190, well under the pedal's natural band (136..160).
		obstacles.set(note, new Rect(95, 130, 10, 60));
		resolver.resolve(anchors());
		// The band top lands a clearance gap under the note (204), 68px below its natural
		// top at 136: 6.8 stave lines at 10px spacing.
		expect(line).toBe(6.8);
		// placed bottom (204 + 24 rise) plus the pedal bottom margin.
		expect(page.bottom).toBe(240);
	});

	it('grows the bottom crop under every pedal marker lead', () => {
		const s = stave({ lineBottom: 140 }); // bottom text baseline = 160
		const lead = {} as Note;
		const note = { getStave: () => s } as unknown as StaveNote;
		const { resolver, page } = resolverOf();
		resolver.addPedals([{ lead } as PedalMark]);
		resolver.resolve(anchors(new Map([[lead, note]])));
		expect(page.bottom).toBe(160 + 12);
	});

	it('resolves direction-line endpoints through the lead map', () => {
		const from = {} as Note;
		const to = {} as Note;
		const start = {} as StaveNote;
		const span = { from, to } as DirectionLineSpan;
		const { resolver, directionLines } = resolverOf(
			{},
			{ directionLineSpans: [span] },
		);
		// Only the start resolves; a stop on a hidden staff stays undefined.
		resolver.resolve(anchors(new Map([[from, start]])));
		expect(directionLines).toEqual([{ span, start, stop: undefined }]);
	});

	it('answers system lookups only for registered staves', () => {
		const { resolver } = resolverOf();
		const s = stave();
		expect(resolver.systemOf(s)).toBeUndefined();
		resolver.registerStave(s, 0, 3);
		expect(resolver.systemOf(s)).toBe(3);
	});
});
