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
import { DrawPass, type DrawPassOptions } from './draw-pass';
import type { Fold } from './fold';
import type { Gaps } from './gaps';
import type {
	RawChordDiagram,
	RawMeasure,
	RawNote,
} from './geometry-collector';
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
 * Draws the laid-out score into a recording: the two-pass driver (each pass is a fresh DrawPass)
 * and the crop into final score space. The stage replays the recording into tiles.
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
	 * `host` is the in-DOM element the font CSS vars are read off; `probe` answers the text
	 * measurements the recording needs.
	 */
	draw(
		host: HTMLElement,
		probe: PaintProbe,
		score: Score,
		layout: ScoreLayout,
	): DrawResult {
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
		let pageHeight = layout.top + topSlack + systemCount * perSystem;
		// Grows if pass two re-spaces the staves (see below); the crop below reads it.
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

		// Part labels use the text font set on the container by loadFonts() (the only
		// reader of --vexml-font-text). Falls back to Arial if unset (e.g. SSR/no fonts).
		// Read from the in-DOM host: the vars are scoped to the container.
		const labelFont =
			getComputedStyle(host).getPropertyValue('--vexml-font-text').trim() ||
			'Arial';

		// The music font, for the few glyphs vexml types itself out of SMuFL codepoints
		// rather than getting from a vexflow element (dynamics markings today). Same
		// container-scoped CSS var loadFonts() sets, read off the host like labelFont.
		const notationFont =
			getComputedStyle(host).getPropertyValue('--vexml-font-notation').trim() ||
			'Bravura';

		// Two clashes only show up once the music is drawn: a system's notes rising above its
		// top stave into the system before it, and a stave's notes spilling into the stave
		// below it (the layout planner's stave gaps are fixed, so dense/extreme parts collide).
		// Pass one measures both; if either needs more room, pass two redraws (into the
		// emptied recording) with the space reserved.
		const runPass = (
			activeLayout: ScoreLayout,
			topOverflow: Map<number, number>,
			height: number,
			opts: DrawPassOptions,
		) =>
			new DrawPass(
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
				activeLayout,
				labelFont,
				notationFont,
				topSlack,
				height,
				topOverflow,
				opts,
			).run();

		// The layout the final pass drew with: pass two re-spaces the staves.
		let drawnLayout = layout;
		// What the final pass was given, so a paged layout can redraw it with systems pushed down.
		let drawnOverflow = new Map<number, number>();
		let drawnOpts: DrawPassOptions = {};
		let pass = runPass(layout, drawnOverflow, pageHeight, drawnOpts);
		const revision = this.spillResolver.revise(
			layout.staveOffsets,
			pass,
			systemCount,
		);
		if (revision.needed) {
			const { systemStaveOffsets, grewBy } = revision;
			activeFloorHeight = floorHeight + grewBy;
			pageHeight = layout.top + topSlack + systemCount * (perSystem + grewBy);
			list.reset();
			drawnLayout = {
				...layout,
				systemStaveOffsets,
				floorHeight: activeFloorHeight,
			};
			drawnOverflow = pass.observedOverflow;
			drawnOpts = {
				lyricDrops: pass.observedLyricDrops,
				voltaLifts: pass.observedVoltaLifts,
				hairpinBands: pass.observedHairpinBands,
			};
			pass = runPass(drawnLayout, drawnOverflow, pageHeight, drawnOpts);
		}
		const { layout: layoutConfig } = this.config;
		if (layoutConfig.type === 'paged') {
			// Fit the systems onto pages: one that would cross a page's bottom margin is pushed to
			// the next page by widening the gap above it, and a third pass draws them there. The
			// push changes no system's own drawing, only where it sits.
			const plan = new PagePlanner(
				layoutConfig.pageHeight,
				layoutConfig.margin,
			).plan(
				[...pass.systemExtents]
					.sort(([a], [b]) => a - b)
					.map(([, extent]) => extent),
			);
			if (plan.pushes.size > 0) {
				const overflow = new Map(drawnOverflow);
				let pushed = 0;
				for (const [system, push] of plan.pushes) {
					overflow.set(system, (overflow.get(system) ?? 0) + push);
					pushed += push;
				}
				list.reset();
				pass = runPass(drawnLayout, overflow, pageHeight + pushed, drawnOpts);
			}
			return this.paged(list.ops, pass, plan.cropTop, plan.pageCount);
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
				notationColor: this.config.fonts.notation?.color ?? '#000000',
				textColor: this.config.fonts.text?.color ?? '#000000',
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
		pass: ReturnType<DrawPass['run']>,
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
