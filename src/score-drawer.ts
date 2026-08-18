import type { Score } from '@stringsync/mdom';
import { Renderer } from 'vexflow';
import type { Config } from './config';
import {
	LEDGER_HEADROOM,
	PAGE_MARGIN_BOTTOM,
	PAGE_MARGIN_TOP,
} from './constants';
import { DrawPass, type DrawPassOptions } from './draw-pass';
import type { Gaps } from './gaps';
import { Rect } from './geometry';
import type {
	RawChordDiagram,
	RawMeasure,
	RawNote,
} from './geometry-collector';
import type { ScoreLayout } from './layout-planner';
import type { NoteTranslator } from './note-translator';
import type { ScoreReader } from './score-reader';
import type { SpannerBuilder } from './spanner-builder';
import type { SpillResolver } from './spill-resolver';

/* Everything the draw pass emits for the index, in score space (crop already applied). */
export interface RawGeometry {
	bounds: Rect;
	notes: RawNote[];
	measures: RawMeasure[];
	chordDiagrams: RawChordDiagram[];
}

/*
 * Draws the laid-out score onto the caller's canvas: the scratch-canvas setup, the
 * two-pass driver (each pass is a fresh DrawPass), and the crop/blit into final
 * score space.
 */
export class ScoreDrawer {
	constructor(
		private config: Config,
		private translator: NoteTranslator,
		private reader: ScoreReader,
		private spanners: SpannerBuilder,
		private gaps: Gaps,
		private spillResolver: SpillResolver,
	) {}

	/*
	 * Draw the whole score onto the element: one SVG stave per part-staff per measure,
	 * placed at the boxes computed by the layout planner, with clefs/keys/time
	 * signatures, notes, and the brace/barline connectors that group parts into
	 * systems. Returns the hit-index geometry (notehead/fret/measure boxes) in final
	 * score space.
	 */
	draw(
		canvas: HTMLCanvasElement,
		score: Score,
		layout: ScoreLayout,
	): RawGeometry {
		const _parts = score.parts;
		const { boxes, systemGap, width, floorHeight } = layout;

		// Canvas is immediate-mode: resizing a canvas clears its bitmap, so the final
		// page height must be known before drawing — but it's only discovered while
		// drawing (systems stack downward, deep ledger lines extend further). So draw
		// once onto an oversized offscreen canvas, then blit the used region into the
		// real canvas cropped to content. SVG could grow after drawing; canvas can't.
		const systemCount =
			boxes.reduce((n, b) => (b ? Math.max(n, b.systemIndex + 1) : n), 0) || 1;
		const perSystem = floorHeight - layout.top + systemGap + LEDGER_HEADROOM;
		// The first system starts this far down so notes/beams that rise above its top
		// staff have room instead of being clipped off the canvas top. The unused slack is
		// cropped back out in the blit (mirrors how LEDGER_HEADROOM gives the bottom slack).
		const topSlack = LEDGER_HEADROOM;
		let scratchHeight = layout.top + topSlack + systemCount * perSystem;
		// Grows if pass two re-spaces the staves (see below); the crop below reads it.
		let activeFloorHeight = floorHeight;

		const scratch = document.createElement('canvas');
		const renderer = new Renderer(scratch, Renderer.Backends.CANVAS);
		const context = renderer.getContext();
		renderer.resize(width, scratchHeight);

		// Part labels use the text font set on the container by loadFonts() (the only
		// reader of --vexml-font-text). Falls back to Arial if unset (e.g. SSR/no fonts).
		// Read from the real (in-DOM) canvas — the offscreen scratch has no CSS vars.
		const labelFont =
			getComputedStyle(canvas).getPropertyValue('--vexml-font-text').trim() ||
			'Arial';

		// The music font, for the few glyphs vexml types itself out of SMuFL codepoints
		// rather than getting from a vexflow element — dynamics markings today. Same
		// container-scoped CSS var loadFonts() sets, read off the real canvas like labelFont.
		const notationFont =
			getComputedStyle(canvas)
				.getPropertyValue('--vexml-font-notation')
				.trim() || 'Bravura';

		// Two clashes only show up once the music is drawn: a system's notes rising above its
		// top stave into the system before it, and a stave's notes spilling into the stave
		// below it (the layout planner's stave gaps are fixed, so dense/extreme parts collide).
		// Pass one measures both; if either needs more room, pass two redraws (onto the
		// freshly cleared scratch) with the space reserved.
		const runPass = (
			activeLayout: ScoreLayout,
			topOverflow: Map<number, number>,
			height: number,
			opts: DrawPassOptions = {},
		) =>
			new DrawPass(
				this.translator,
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

		let pass = runPass(layout, new Map(), scratchHeight);
		const revision = this.spillResolver.revise(
			layout.staveOffsets,
			pass,
			systemCount,
		);
		if (revision.needed) {
			const { systemStaveOffsets, grewBy } = revision;
			activeFloorHeight = floorHeight + grewBy;
			scratchHeight =
				layout.top + topSlack + systemCount * (perSystem + grewBy);
			renderer.resize(width, scratchHeight);
			pass = runPass(
				{ ...layout, systemStaveOffsets, floorHeight: activeFloorHeight },
				pass.observedOverflow,
				scratchHeight,
				{
					lyricDrops: pass.observedLyricDrops,
					voltaLifts: pass.observedVoltaLifts,
				},
			);
		}
		const { pageTop, pageBottom } = pass;

		// Crop to the lowest thing actually drawn so deep ledger lines in the bottom
		// system aren't clipped and there's no trailing whitespace. Sizing the real
		// canvas resets it to an identity transform, so the blit copies device pixels
		// 1:1 from the scratch's top-left; the unused bottom is simply not copied.
		// Crop the top slack back out: keep PAGE_MARGIN_TOP above the highest content, but
		// never crop past the slack (so a normal score keeps its usual top margin — this is
		// then a pure shift-and-crop, leaving its output unchanged). Only scores whose first
		// system rises into the slack show extra headroom.
		const cropTop =
			pageTop === Infinity
				? topSlack
				: Math.max(0, Math.min(topSlack, pageTop - PAGE_MARGIN_TOP));
		const cssHeight =
			Math.max(activeFloorHeight + topSlack, pageBottom + PAGE_MARGIN_BOTTOM) -
			cropTop;
		const dpr = scratch.width / parseFloat(scratch.style.width);
		canvas.width = scratch.width;
		canvas.height = Math.round(cssHeight * dpr);
		// Publish the score-space (intrinsic) CSS size as custom properties rather than as inline
		// width/height. The stage's default `:where(.vexml-canvas)` rule consumes them for the on-screen
		// size, but at zero specificity — so a caller's own `.vexml-canvas { width: 100% }` overrides it
		// without `!important`, letting the score scale to its container. frame()/sizeBitmap read these
		// same properties for the intrinsic dimensions the score<->client transform needs.
		//
		// --vexml-aspect is the exact score-space width/height ratio (unitless, from the pre-round CSS
		// dims — NOT the integer-rounded bitmap ratio). The fit rule uses it as `aspect-ratio` so a
		// height:auto canvas keeps a byte-identical box at full size (height resolves back to cssHeight,
		// so the score<->client scale stays exactly 1) yet still scales proportionally when narrowed.
		const cssWidth = parseFloat(scratch.style.width);
		canvas.style.setProperty('--vexml-width', scratch.style.width);
		canvas.style.setProperty('--vexml-height', `${cssHeight}px`);
		canvas.style.setProperty('--vexml-aspect', `${cssWidth / cssHeight}`);
		canvas
			.getContext('2d')
			?.drawImage(
				scratch,
				0,
				Math.round(cropTop * dpr),
				scratch.width,
				canvas.height,
				0,
				0,
				scratch.width,
				canvas.height,
			);

		// The geometry was collected in scratch space; the blit shifts content up by cropTop, so
		// translate every box into final score space (the canvas's own coordinates). dpr stays out —
		// these are CSS px, like getAbsoluteX/getYs.
		const toScore = (r: Rect) => r.translate(0, -cropTop);
		const toScoreGlyph = (g: RawNote['glyph']) =>
			g ? { ...g, y: g.y - cropTop } : null;
		return {
			bounds: new Rect(0, 0, width, cssHeight),
			notes: pass.rawNotes.map((n) => ({
				...n,
				rect: toScore(n.rect),
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
}
