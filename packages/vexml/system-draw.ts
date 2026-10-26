import type { Score } from '@stringsync/mdom';
import { CanvasContext } from 'vexflow/core';
import { Rect } from 'webappwiz/geometry';
import type { BarlineTranslator } from './barline-translator';
import type { ChordTranslator } from './chord-translator';
import type { Config } from './config';
import {
	LEDGER_HEADROOM,
	PAGE_MARGIN_BOTTOM,
	PAGE_MARGIN_TOP,
} from './constants';
import { DrawPass, type DrawPassResult, type SystemMark } from './draw-pass';
import { FontFamilies } from './font-families';
import type { Gaps } from './gaps';
import type { RawNote } from './geometry-collector';
import { Ink } from './ink';
import type { PageFrame, ScoreLayout } from './layout-planner';
import { PagePlanner, type PageWalk } from './page-planner';
import { PaintContext } from './paint-context';
import { PaintList } from './paint-list';
import type { PaintOp } from './paint-op';
import type { PaintProbe } from './paint-probe';
import type { DrawResult, Engraving, RawGeometry } from './score-drawer';
import type { ScoreReader } from './score-reader';
import { SignatureFold } from './signature-fold';
import type { SignatureTranslator } from './signature-translator';
import type { SpannerBuilder } from './spanner-builder';
import type { HairpinBand } from './spanner-resolver';
import type { SpillResolver } from './spill-resolver';
import type { StavePlan } from './stave-plan';
import type { TabVoiceTranslator } from './tab-voice-translator';
import type { VoiceTranslator } from './voice-translator';

/* The collaborators a draw builds its pass from: the ScoreDrawer's own. */
export interface SystemDrawDeps {
	config: Config;
	translator: VoiceTranslator;
	chords: ChordTranslator;
	tab: TabVoiceTranslator;
	signatures: SignatureTranslator;
	staves: StavePlan;
	barlines: BarlineTranslator;
	reader: ScoreReader;
	spanners: SpannerBuilder;
	gaps: Gaps;
	spillResolver: SpillResolver;
}

/*
 * One draw of a laid-out score, a system at a time: drawNext() draws the next system and settles
 * it (see below), and result() crops what is settled so far into final score space, so a caller
 * can show the first systems before the rest are drawn. Drawing every system and taking the
 * result is the whole draw (ScoreDrawer.draw).
 *
 * Two clashes only show up once the music is drawn: a system's notes rising above its top stave
 * into the system before it, and a stave's notes spilling into the stave below it (the layout
 * planner's stave gaps are fixed, so dense/extreme parts collide). Each system is drawn once and
 * weighed on its own; one that needs more room is rewound and drawn again with the space
 * reserved, then placed for good. The systems above it never move, the ones below start where
 * it ends. A paged layout is settled the same way: a system that would cross its page's bottom
 * margin is drawn again pushed onto the next page.
 */
export class SystemDraw {
	private readonly layout: ScoreLayout;
	private readonly drawing: DrawPass;
	private readonly list = new PaintList();
	private readonly systems: number[];
	private readonly systemCount: number;
	private readonly topSlack = LEDGER_HEADROOM;
	private readonly walk: PageWalk | null;
	private readonly topOverflow = new Map<number, number>();
	private readonly systemStaveOffsets: Map<number, number[]>;
	// The document's own stave gaps per system, when the layout follows the document: each
	// system's planned floor (see SpillResolver.revise).
	private readonly plannedStaveOffsets:
		| ReadonlyMap<number, number[]>
		| undefined;
	// The document's gaps a 'strict' layout keeps however far the music reaches.
	private readonly fixedGaps: Map<number, boolean[]> | undefined;
	private readonly lyricDrops = new Map<string, number>();
	private readonly voltaLifts = new Map<number, number>();
	private readonly hairpinBands = new Map<number, HairpinBand[]>();
	private readonly marks = new Map<number, SystemMark>();
	// Grows as systems are re-spaced; the crop reads it.
	private activeFloorHeight: number;
	// How many of `systems` are settled: drawn, weighed, and placed for good.
	private settled = 0;
	// Whether the system after the settled ones is already drawn (ahead, for the spanners that
	// wrap into it: see drawNext).
	private drawnAhead = false;
	// The header's ops, drawn once the first system is placed and kept apart from the systems'
	// so a system rewound after it leaves it be; they lead the engraving.
	private headerOps: PaintOp[] = [];
	private finished: ReturnType<DrawPass['finish']> | null = null;

	constructor(
		private readonly deps: SystemDrawDeps,
		probe: PaintProbe,
		private readonly score: Score,
		layout: ScoreLayout,
	) {
		const { config } = deps;
		const { boxes, systemGap, floorHeight } = layout;
		// The page height is only discovered while drawing (systems stack downward, deep ledger
		// lines extend further), so the pass draws into an oversized page and the result is
		// cropped to content afterwards.
		this.systemCount =
			boxes.reduce((n, b) => (b ? Math.max(n, b.systemIndex + 1) : n), 0) || 1;
		const perSystem = floorHeight - layout.top + systemGap + LEDGER_HEADROOM;
		// A system can still grow when its staves are re-spaced or a paged layout pushes it onto
		// the next page, neither known before it is drawn, so the scratch page is sized for systems
		// twice as tall and, when paged, a page of push apiece. The final crop trims it back.
		const tallestPage = Math.max(
			layout.page?.height ?? 0,
			...(layout.documentSystems ?? []).map((s) => s.page?.height ?? 0),
		);
		const pageHeight =
			layout.top +
			this.topSlack +
			this.systemCount * 2 * perSystem +
			(layout.page ? this.systemCount * tallestPage : 0);
		this.activeFloorHeight = floorHeight;
		this.plannedStaveOffsets = layout.systemStaveOffsets;
		// Seeded with the document's own stave gaps, when the layout follows the document.
		this.systemStaveOffsets = new Map(layout.systemStaveOffsets ?? []);
		this.fixedGaps = layout.documentSystems
			? new Map(
					layout.documentSystems.map((system, s) => [s, system.fixedGaps]),
				)
			: undefined;

		// Recorded, not drawn: a canvas the size of a long score goes blank past the browser's
		// per-side cap (and vexflow crops one at 32767px), so the ops are kept and the stage replays
		// them into tiles. Recording needs no final height up front, which a canvas did.
		const context = new CanvasContext(
			new PaintContext(
				this.list,
				probe,
				null,
			) as unknown as CanvasRenderingContext2D,
		);

		// Part labels and words use the text font, and the few glyphs vexml types itself out of
		// SMuFL codepoints rather than getting from a vexflow element (dynamics markings today)
		// the music font: the same family lists the font loader puts on the container, taken from
		// config so a draw with no DOM engraves alike.
		const families = new FontFamilies(config.fonts);

		// The layout the systems draw with: the staves re-spaced where a system needed it.
		this.layout = { ...layout, systemStaveOffsets: this.systemStaveOffsets };
		this.drawing = new DrawPass(
			deps.translator,
			deps.chords,
			deps.tab,
			deps.signatures,
			deps.staves,
			deps.barlines,
			deps.reader,
			deps.spanners,
			config,
			deps.gaps,
			context,
			score,
			this.layout,
			families.textStack,
			families.notationStack,
			this.topSlack,
			pageHeight,
			this.topOverflow,
			this.list,
			{
				lyricDrops: this.lyricDrops,
				voltaLifts: this.voltaLifts,
				hairpinBands: this.hairpinBands,
			},
		);
		const { page } = layout;
		this.walk = page
			? new PagePlanner(page.height, page.marginTop, page.marginBottom).walk()
			: null;
		this.systems = this.drawing.systems();
	}

	/* Whether every system is settled. */
	done(): boolean {
		return this.settled >= this.systems.length;
	}

	/* The systems settled so far, in order. */
	settledSystems(): number[] {
		return this.systems.slice(0, this.settled);
	}

	/* The system measure `m` is drawn on. */
	systemOfMeasure(m: number): number {
		return this.drawing.systemOfMeasure(m);
	}

	/*
	 * Draw and settle the next system; returns it, or null once every system is. A slur or
	 * hairpin wrapping off the end of a system is drawn and measured with the next one, so the
	 * next is drawn ahead before this one is weighed. A system that needs room is drawn again,
	 * and the one drawn ahead with it, once this one is placed.
	 */
	drawNext(): number | null {
		const system = this.systems[this.settled];
		if (system === undefined) {
			return null;
		}
		const next = this.systems[this.settled + 1];
		if (!this.drawnAhead) {
			this.draw(system);
		}
		this.drawnAhead = next !== undefined;
		if (next !== undefined) {
			this.draw(next);
		}
		const seen = this.weigh(system);
		if (seen.revision.needed) {
			this.reserve(system, seen);
			this.redraw(system, next ?? system);
			this.drawnAhead = false;
		}
		// Fit onto its page: one that would cross a page's bottom margin is pushed to the next
		// page by widening the gap above it. The push changes no system's own drawing, only
		// where it sits. Following the document, it fits by its staff lines and opens a page
		// where it says.
		const lines = this.drawing.linesOf(system);
		const document = this.layout.documentSystems?.[system];
		const push = this.walk?.place(
			this.drawing.extentOf(system, next === undefined),
			lines && document ? { lines, system: document } : undefined,
		);
		if (push) {
			this.topOverflow.set(system, (this.topOverflow.get(system) ?? 0) + push);
			this.redraw(
				system,
				this.drawnAhead && next !== undefined ? next : system,
			);
			this.drawnAhead = false;
		}
		this.settled++;
		if (this.settled === 1) {
			this.drawHeader();
		}
		return system;
	}

	/* The bottom of `system`'s content in final score space, once it is settled. */
	bottomOf(system: number): number {
		const isLast = system === this.systems[this.systems.length - 1];
		return this.drawing.extentOf(system, isLast).bottom - this.cropTop();
	}

	/*
	 * What is settled so far, in final score space: the hit-index geometry (notehead/fret/measure
	 * boxes) of the settled systems, the engraving of their ops, the sticky fold when a panoramic
	 * layout asks for one, and the pages once a paged draw is done. The height is the layout's
	 * planned height for the whole score, grown where a system needed room, so it holds still as
	 * the rest arrives.
	 */
	result(): DrawResult {
		const { layout: layoutConfig } = this.deps.config;
		const pass = this.done() ? this.finish() : this.collected();
		const ops = [...this.headerOps, ...this.settledOps()];
		const { page } = this.layout;
		if (this.walk && page && this.done()) {
			const { cropTop, pageHeights } = this.walk.result();
			return this.paged(ops, pass, page, cropTop, pageHeights);
		}
		const { pageTop, pageBottom } = pass;
		const { width } = this.layout;

		// Crop to the lowest thing actually drawn so deep ledger lines in the bottom
		// system aren't clipped and there's no trailing whitespace.
		let cropTop = this.cropTop();
		let cssHeight =
			Math.max(
				this.activeFloorHeight + this.topSlack,
				pageBottom + PAGE_MARGIN_BOTTOM,
			) - cropTop;
		let scale = layoutConfig.type === 'panoramic' ? layoutConfig.scale : 1;
		// A fitHeight strip crops the margins off instead: the staves' middle at its middle, and
		// half its height whatever ink reaches furthest from there, so nothing drawn is cut.
		const lines = pass.staveLines.get(0);
		if (
			layoutConfig.type === 'panoramic' &&
			layoutConfig.fitHeight !== null &&
			lines &&
			pageTop !== Infinity
		) {
			const middle = (lines.top + lines.bottom) / 2;
			const half = Math.max(
				middle - Math.min(pageTop, lines.top),
				Math.max(pageBottom, lines.bottom) - middle,
			);
			cropTop = middle - half;
			cssHeight = 2 * half;
			scale = layoutConfig.fitHeight / cssHeight;
		}
		const engraving: Engraving = {
			ops,
			width,
			height: cssHeight,
			origin: { x: 0, y: -cropTop },
			scale,
		};
		const geometry = this.toScore(
			pass,
			new Rect(0, 0, width, cssHeight),
			0,
			cropTop,
		);
		const sticky =
			layoutConfig.type === 'panoramic' && layoutConfig.stickySignatures;
		if (!sticky) {
			return { geometry, engraving, fold: null, pages: [] };
		}
		// The first system's staves, where the draw pass put them (its top is layout.top +
		// topSlack), shifted by the same crop as everything else.
		const offsets =
			this.layout.systemStaveOffsets?.get(0) ?? this.layout.staveOffsets;
		const fold = new SignatureFold(
			this.deps.signatures,
			this.deps.reader,
			this.deps.staves,
			this.score,
			{
				boxes: this.layout.boxes,
				rowYs: offsets.map(
					(offset) => this.layout.top + this.topSlack + offset - cropTop,
				),
				totalStaves: this.layout.totalStaves,
				height: cssHeight,
				notationColor: Ink.NOTATION,
				textColor: Ink.TEXT,
			},
		);
		return { geometry, engraving, fold, pages: [] };
	}

	private draw(system: number): void {
		this.marks.set(system, this.drawing.mark(system));
		this.drawing.drawSystem(system);
	}

	private redraw(system: number, through: number): void {
		const mark = this.marks.get(system);
		if (mark) {
			this.drawing.rewind(mark, through);
		}
		this.drawing.drawSystem(system);
	}

	// Weigh `system` as drawn: what its redraw would be given, and whether it needs one.
	private weigh(system: number) {
		const seen = this.drawing.observe(system);
		const revision = this.deps.spillResolver.revise(
			this.layout.staveOffsets,
			{
				observedStaveSpill: new Map(
					seen.staveSpill ? [[system, seen.staveSpill]] : [],
				),
				observedOverflow: new Map([[system, seen.overflow]]),
				lyricsStepped: seen.lyricsStepped,
				voltasLifted: seen.voltasLifted,
				hairpinsStacked: seen.hairpinsStacked,
			},
			this.systemCount,
			this.plannedStaveOffsets,
			this.fixedGaps,
		);
		return { seen, revision };
	}

	// Reserve what `system` was seen to need, for its redraw.
	private reserve(
		system: number,
		{ seen, revision }: ReturnType<SystemDraw['weigh']>,
	): void {
		const offsets = revision.systemStaveOffsets.get(system);
		if (offsets) {
			this.systemStaveOffsets.set(system, offsets);
		}
		this.activeFloorHeight = Math.max(
			this.activeFloorHeight,
			this.layout.floorHeight + revision.grewBy,
		);
		this.topOverflow.set(system, seen.overflow);
		for (const [key, drop] of seen.lyricDrops) {
			this.lyricDrops.set(key, drop);
		}
		if (seen.voltaLift !== undefined) {
			this.voltaLifts.set(system, seen.voltaLift);
		}
		if (seen.hairpinBands) {
			this.hairpinBands.set(system, seen.hairpinBands);
		}
	}

	// The header hangs off the first system once it is placed. Its ops come out of the list so
	// the mark of the system drawn ahead still counts the ops before that system, and the mark
	// learns the page top the header lowered, which its rewind would otherwise put back.
	private drawHeader(): void {
		const at = this.list.ops.length;
		this.drawing.drawHeader();
		this.headerOps = this.list.ops.splice(at);
		const { pageTop } = this.drawing.collected();
		for (const mark of this.marks.values()) {
			mark.pageTop = Math.min(mark.pageTop, pageTop);
		}
	}

	// The ops of the settled systems: everything before the system drawn ahead, whose draw may
	// yet be rewound.
	private settledOps(): PaintOp[] {
		const ahead = this.drawnAhead
			? this.marks.get(this.systems[this.settled] ?? -1)
			: undefined;
		return ahead ? this.list.ops.slice(0, ahead.ops) : this.list.ops;
	}

	private finish(): ReturnType<DrawPass['finish']> {
		this.finished ??= this.drawing.finish();
		return this.finished;
	}

	// The collected geometry, less the system drawn ahead.
	private collected(): DrawPassResult {
		const pass = this.drawing.collected();
		if (!this.drawnAhead) {
			return pass;
		}
		const ahead = this.systems[this.settled];
		return {
			...pass,
			rawNotes: pass.rawNotes.filter(
				(n) => this.systemOfMeasure(n.measureIndex) !== ahead,
			),
			rawMeasures: pass.rawMeasures.filter((m) => m.systemIndex !== ahead),
			rawChordDiagrams: pass.rawChordDiagrams.filter(
				(d) => this.systemOfMeasure(d.measureIndex) !== ahead,
			),
		};
	}

	// Crop the top slack back out: keep PAGE_MARGIN_TOP above the highest content, but never
	// crop past the slack (so a normal score keeps its usual top margin; this is then a pure
	// shift-and-crop, leaving its output unchanged). Only scores whose first system rises into
	// the slack show extra headroom. Final once the first system and the header are placed.
	private cropTop(): number {
		const { pageTop } = this.drawing.collected();
		return pageTop === Infinity
			? this.topSlack
			: Math.max(0, Math.min(this.topSlack, pageTop - PAGE_MARGIN_TOP));
	}

	// The geometry was collected in the uncropped page; translate every box into final score
	// space. These are CSS px, like getAbsoluteX/getYs.
	private toScore(
		pass: DrawPassResult,
		bounds: Rect,
		dx: number,
		cropTop: number,
	): RawGeometry {
		const toScore = (r: Rect) => r.translate(dx, -cropTop);
		const toScoreGlyph = (g: RawNote['glyph']) =>
			g ? { ...g, x: g.x + dx, y: g.y - cropTop } : null;
		return {
			bounds,
			notes: pass.rawNotes.map((n) => ({
				...n,
				rect: toScore(n.rect),
				ink: toScore(n.ink),
				glyph: toScoreGlyph(n.glyph),
			})),
			measures: pass.rawMeasures.map((mm) => ({
				...mm,
				rect: toScore(mm.rect),
			})),
			chordDiagrams: pass.rawChordDiagrams.map((d) => ({
				...d,
				rect: toScore(d.rect),
			})),
		};
	}

	/*
	 * The paged result: score space is the pages stacked edge to edge, each page wide. The
	 * drawing shifts right so its staves sit between the side margins (see PageFrame.offsetX),
	 * and up by the plan's crop so the first system starts at the top margin.
	 */
	private paged(
		ops: readonly PaintOp[],
		pass: DrawPassResult,
		page: PageFrame,
		cropTop: number,
		pageHeights: readonly number[],
	): DrawResult {
		const { width: pageWidth, offsetX: dx } = page;
		const height = pageHeights.reduce((sum, h) => sum + h, 0);
		return {
			geometry: this.toScore(
				pass,
				new Rect(0, 0, pageWidth, height),
				dx,
				cropTop,
			),
			engraving: {
				ops,
				width: pageWidth,
				height,
				origin: { x: dx, y: -cropTop },
				scale: 1,
			},
			fold: null,
			pages: pageHeights.map((pageHeight, index) => {
				const top = pageHeights.slice(0, index).reduce((sum, h) => sum + h, 0);
				return new Rect(0, top, pageWidth, pageHeight);
			}),
		};
	}
}
