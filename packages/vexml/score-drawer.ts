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
	PAGE_MARGIN_X,
} from './constants';
import { DrawPass, type SystemMark } from './draw-pass';
import type { Fold } from './fold';
import { FontFamilies } from './font-families';
import type { Gaps } from './gaps';
import type {
	RawChordDiagram,
	RawMeasure,
	RawNote,
} from './geometry-collector';
import { Ink } from './ink';
import type { ScoreLayout } from './layout-planner';
import { PagePlanner } from './page-planner';
import { PaintContext } from './paint-context';
import { PaintList } from './paint-list';
import type { PaintOp } from './paint-op';
import type { PaintProbe } from './paint-probe';
import type { ScoreReader } from './score-reader';
import { SignatureFold } from './signature-fold';
import type { SignatureTranslator } from './signature-translator';
import type { SpannerBuilder } from './spanner-builder';
import type { HairpinBand } from './spanner-resolver';
import type { SpillResolver } from './spill-resolver';
import type { StavePlan } from './stave-plan';
import type { TabVoiceTranslator } from './tab-voice-translator';
import type { GridOrigin } from './tile-grid';
import type { VoiceTranslator } from './voice-translator';

/* Everything the draw pass emits for the index, in score space (crop already applied). */
export interface RawGeometry {
	bounds: Rect;
	notes: RawNote[];
	measures: RawMeasure[];
	chordDiagrams: RawChordDiagram[];
}

/* The engraving as recorded ops, ready for the stage to replay: its size in score px, where
 * the recording's origin lands in score space (the headroom above the first system is cropped;
 * exact, the stage snaps it to its device pixels), and the CSS px each score px is shown at (a
 * panoramic scale or fitHeight; 1 otherwise). */
export interface Engraving {
	ops: readonly PaintOp[];
	width: number;
	height: number;
	origin: GridOrigin;
	scale: number;
	/* Names the ops, for a snapshot's: a paint of the same snapshot carries it, and the stage
	 * adopts that paint's tiles (see Stage.engrave). */
	fingerprint?: string;
}

/* What a draw hands back: the hit-index geometry, the engraving, the sticky panoramic fold
 * when the config asks for one, and each page's box in score space (none unless paged). */
export interface DrawResult {
	geometry: RawGeometry;
	engraving: Engraving;
	fold: Fold | null;
	pages: Rect[];
}

/*
 * Draws the laid-out score into a recording: the driver that draws each system and settles it
 * (see draw) and the crop into final score space. The stage replays the recording into tiles.
 */
export class ScoreDrawer {
	constructor(
		private config: Config,
		private translator: VoiceTranslator,
		private chords: ChordTranslator,
		private tab: TabVoiceTranslator,
		private signatures: SignatureTranslator,
		private staves: StavePlan,
		private barlines: BarlineTranslator,
		private reader: ScoreReader,
		private spanners: SpannerBuilder,
		private gaps: Gaps,
		private spillResolver: SpillResolver,
	) {}

	/*
	 * Draw the whole score: one stave per part-staff per measure,
	 * placed at the boxes computed by the layout planner, with clefs/keys/time
	 * signatures, notes, and the brace/barline connectors that group parts into
	 * systems. Returns the hit-index geometry (notehead/fret/measure boxes) in final
	 * score space, the engraving, and the sticky fold when a panoramic layout asks for one.
	 * `probe` answers the text measurements the recording needs.
	 */
	draw(probe: PaintProbe, score: Score, layout: ScoreLayout): DrawResult {
		const _parts = score.parts;
		const { boxes, systemGap, width, floorHeight } = layout;

		// The page height is only discovered while drawing (systems stack downward, deep ledger
		// lines extend further), so the passes draw into an oversized page and the result is
		// cropped to content afterwards.
		const systemCount =
			boxes.reduce((n, b) => (b ? Math.max(n, b.systemIndex + 1) : n), 0) || 1;
		const perSystem = floorHeight - layout.top + systemGap + LEDGER_HEADROOM;
		// The first system starts this far down so notes/beams that rise above its top
		// staff have room instead of being clipped off the canvas top. The unused slack is
		// cropped back out afterwards (mirrors how LEDGER_HEADROOM gives the bottom slack).
		const topSlack = LEDGER_HEADROOM;
		const { layout: layoutConfig } = this.config;
		// A system can still grow when its staves are re-spaced or a paged layout pushes it onto
		// the next page, neither known before it is drawn, so the scratch page is sized for systems
		// twice as tall and, when paged, a page of push apiece. The final crop trims it back.
		const pageHeight =
			layout.top +
			topSlack +
			systemCount * 2 * perSystem +
			(layoutConfig.type === 'paged'
				? systemCount * layoutConfig.pageHeight
				: 0);
		// Grows as systems are re-spaced (see below); the crop below reads it.
		let activeFloorHeight = floorHeight;

		// Recorded, not drawn: a canvas the size of a long score goes blank past the browser's
		// per-side cap (and vexflow crops one at 32767px), so the ops are kept and the stage replays
		// them into tiles. Recording needs no final height up front, which a canvas did.
		const list = new PaintList();
		const context = new CanvasContext(
			new PaintContext(
				list,
				probe,
				null,
			) as unknown as CanvasRenderingContext2D,
		);

		// Part labels and words use the text font, and the few glyphs vexml types itself out of
		// SMuFL codepoints rather than getting from a vexflow element (dynamics markings today)
		// the music font: the same family lists the font loader puts on the container, taken from
		// config so a draw with no DOM engraves alike.
		const families = new FontFamilies(this.config.fonts);
		const labelFont = families.textStack;
		const notationFont = families.notationStack;

		// Two clashes only show up once the music is drawn: a system's notes rising above its
		// top stave into the system before it, and a stave's notes spilling into the stave
		// below it (the layout planner's stave gaps are fixed, so dense/extreme parts collide).
		// Each system is drawn once and weighed on its own; one that needs more room is
		// rewound and drawn again with the space reserved, then placed for good. The systems
		// above it never move, the ones below start where it ends. A paged layout is settled
		// the same way: a system that would cross its page's bottom margin is drawn again
		// pushed onto the next page.
		const topOverflow = new Map<number, number>();
		const systemStaveOffsets = new Map<number, number[]>();
		const lyricDrops = new Map<string, number>();
		const voltaLifts = new Map<number, number>();
		const hairpinBands = new Map<number, HairpinBand[]>();
		// The layout the systems draw with: the staves re-spaced where a system needed it.
		const drawnLayout: ScoreLayout = { ...layout, systemStaveOffsets };
		const drawing = new DrawPass(
			this.translator,
			this.chords,
			this.tab,
			this.signatures,
			this.staves,
			this.barlines,
			this.reader,
			this.spanners,
			this.config,
			this.gaps,
			context,
			score,
			drawnLayout,
			labelFont,
			notationFont,
			topSlack,
			pageHeight,
			topOverflow,
			list,
			{ lyricDrops, voltaLifts, hairpinBands },
		);
		const walk =
			layoutConfig.type === 'paged'
				? new PagePlanner(layoutConfig.pageHeight, layoutConfig.margin).walk()
				: null;
		const systems = drawing.systems();
		// Weigh `system` as drawn: what its redraw would be given, and whether it needs one.
		const weigh = (system: number) => {
			const seen = drawing.observe(system);
			const revision = this.spillResolver.revise(
				layout.staveOffsets,
				{
					observedStaveSpill: new Map(
						seen.staveSpill ? [[system, seen.staveSpill]] : [],
					),
					observedOverflow: new Map([[system, seen.overflow]]),
					lyricsStepped: seen.lyricsStepped,
					voltasLifted: seen.voltasLifted,
					hairpinsStacked: seen.hairpinsStacked,
				},
				systemCount,
			);
			return { seen, revision };
		};
		// Reserve what `system` was seen to need, for its redraw.
		const reserve = (
			system: number,
			{ seen, revision }: ReturnType<typeof weigh>,
		) => {
			const offsets = revision.systemStaveOffsets.get(system);
			if (offsets) {
				systemStaveOffsets.set(system, offsets);
			}
			activeFloorHeight = Math.max(
				activeFloorHeight,
				floorHeight + revision.grewBy,
			);
			topOverflow.set(system, seen.overflow);
			for (const [key, drop] of seen.lyricDrops) {
				lyricDrops.set(key, drop);
			}
			if (seen.voltaLift !== undefined) {
				voltaLifts.set(system, seen.voltaLift);
			}
			if (seen.hairpinBands) {
				hairpinBands.set(system, seen.hairpinBands);
			}
		};
		const marks = new Map<number, SystemMark>();
		const draw = (system: number) => {
			marks.set(system, drawing.mark(system));
			drawing.drawSystem(system);
		};
		const redraw = (system: number, through: number) => {
			const mark = marks.get(system);
			if (mark) {
				drawing.rewind(mark, through);
			}
			drawing.drawSystem(system);
		};
		// Whether the system after the one being settled is already drawn.
		let drawnAhead = false;
		for (const [index, system] of systems.entries()) {
			if (!drawnAhead) {
				draw(system);
			}
			const next = systems[index + 1];
			// A slur or hairpin wrapping off the end of a system is drawn and measured with the
			// next one, so the next is drawn ahead before this one is weighed. A system that needs
			// room is drawn again, and the one drawn ahead with it, once this one is placed.
			drawnAhead = next !== undefined;
			if (next !== undefined) {
				draw(next);
			}
			const seen = weigh(system);
			if (seen.revision.needed) {
				reserve(system, seen);
				redraw(system, next ?? system);
				drawnAhead = false;
			}
			// Fit onto its page: one that would cross a page's bottom margin is pushed to the next
			// page by widening the gap above it. The push changes no system's own drawing, only
			// where it sits.
			const push = walk?.place(drawing.extentOf(system, next === undefined));
			if (push) {
				topOverflow.set(system, (topOverflow.get(system) ?? 0) + push);
				redraw(system, drawnAhead && next !== undefined ? next : system);
				drawnAhead = false;
			}
		}
		const pass = drawing.finish();
		if (walk) {
			const { cropTop, pageCount } = walk.result();
			return this.paged(list.ops, pass, cropTop, pageCount);
		}
		const { pageTop, pageBottom } = pass;

		// Crop to the lowest thing actually drawn so deep ledger lines in the bottom
		// system aren't clipped and there's no trailing whitespace.
		// Crop the top slack back out: keep PAGE_MARGIN_TOP above the highest content, but
		// never crop past the slack (so a normal score keeps its usual top margin; this is
		// then a pure shift-and-crop, leaving its output unchanged). Only scores whose first
		// system rises into the slack show extra headroom.
		let cropTop =
			pageTop === Infinity
				? topSlack
				: Math.max(0, Math.min(topSlack, pageTop - PAGE_MARGIN_TOP));
		let cssHeight =
			Math.max(activeFloorHeight + topSlack, pageBottom + PAGE_MARGIN_BOTTOM) -
			cropTop;
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
			ops: list.ops,
			width,
			height: cssHeight,
			origin: { x: 0, y: -cropTop },
			scale,
		};

		// The geometry was collected in the uncropped page; translate every box into final score
		// space. These are CSS px, like getAbsoluteX/getYs.
		const toScore = (r: Rect) => r.translate(0, -cropTop);
		const toScoreGlyph = (g: RawNote['glyph']) =>
			g ? { ...g, y: g.y - cropTop } : null;
		const geometry: RawGeometry = {
			bounds: new Rect(0, 0, width, cssHeight),
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
		const sticky =
			layoutConfig.type === 'panoramic' && layoutConfig.stickySignatures;
		if (!sticky) {
			return { geometry, engraving, fold: null, pages: [] };
		}
		// The first system's staves, where the draw pass put them (its top is layout.top +
		// topSlack), shifted by the same crop as everything else.
		const offsets =
			drawnLayout.systemStaveOffsets?.get(0) ?? drawnLayout.staveOffsets;
		const fold = new SignatureFold(
			this.signatures,
			this.reader,
			this.staves,
			score,
			{
				boxes,
				rowYs: offsets.map(
					(offset) => layout.top + topSlack + offset - cropTop,
				),
				totalStaves: layout.totalStaves,
				height: cssHeight,
				notationColor: Ink.NOTATION,
				textColor: Ink.TEXT,
			},
		);
		return { geometry, engraving, fold, pages: [] };
	}

	/*
	 * The paged result: score space is the pages stacked edge to edge, each pageWidth wide. The
	 * drawing shifts right so its staves sit between the side margins (it was laid out with its own
	 * PAGE_MARGIN_X), and up by the plan's crop so the first system starts at the top margin.
	 */
	private paged(
		ops: readonly PaintOp[],
		pass: ReturnType<DrawPass['finish']>,
		cropTop: number,
		pageCount: number,
	): DrawResult {
		const { layout } = this.config;
		if (layout.type !== 'paged') {
			throw new Error('vexml: not a paged layout');
		}
		const { pageWidth, pageHeight, margin } = layout;
		const dx = margin - PAGE_MARGIN_X;
		const height = pageCount * pageHeight;
		const toScore = (r: Rect) => r.translate(dx, -cropTop);
		return {
			geometry: {
				bounds: new Rect(0, 0, pageWidth, height),
				notes: pass.rawNotes.map((n) => ({
					...n,
					rect: toScore(n.rect),
					ink: toScore(n.ink),
					glyph: n.glyph
						? { ...n.glyph, x: n.glyph.x + dx, y: n.glyph.y - cropTop }
						: null,
				})),
				measures: pass.rawMeasures.map((mm) => ({
					...mm,
					rect: toScore(mm.rect),
				})),
				chordDiagrams: pass.rawChordDiagrams.map((d) => ({
					...d,
					rect: toScore(d.rect),
				})),
			},
			engraving: {
				ops,
				width: pageWidth,
				height,
				origin: { x: dx, y: -cropTop },
				scale: 1,
			},
			fold: null,
			pages: Array.from(
				{ length: pageCount },
				(_, index) => new Rect(0, index * pageHeight, pageWidth, pageHeight),
			),
		};
	}
}
