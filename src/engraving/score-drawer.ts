import type { MElement, Note as MNote, Part } from '@stringsync/mdom';
import { Renderer } from 'vexflow';
import type { Config } from '../config';
import {
	LEDGER_HEADROOM,
	PAGE_MARGIN_BOTTOM,
	PAGE_MARGIN_TOP,
} from '../constants';
import { Rect } from '../geometry';
import type { ChordFrame } from './chord-diagram-glyph';
import { DrawPass } from './draw-pass';
import type { ScoreLayout } from './layout-planner';
import type { NoteTranslator } from './note-translator';
import type { ScoreReader } from './score-reader';
import type { SpannerBuilder } from './spanner-builder';

/* A note's engraved glyph, captured so a decoration can re-stamp it in color on an overlay: the
 * SMuFL text, the exact CSS font vexflow drew it with, and its baseline position in score space.
 * Replaying vexflow's own fillText reproduces the notehead precisely — hollow notes stay hollow. */
export interface NoteGlyph {
	readonly text: string;
	readonly font: string;
	readonly x: number;
	readonly y: number;
}

/* A notehead or fret the draw pass laid out, in score space. `tab` is set when this is a tab
 * fret rendering (the note's string/fret, plus the fret as drawn and its font so a decoration can
 * recolor the digit); null for a notation notehead. `chord` lists every mdom note sharing this
 * note's onset so chordmates resolve. mnote stays internal. */
export interface RawNote {
	mnote: MNote;
	rect: Rect;
	chord: MNote[];
	measureIndex: number;
	tab: { string: number; fret: number } | null;
	/* The engraved glyph for recoloring — a notehead, or a tab fret; null for a rest. */
	glyph: NoteGlyph | null;
}

export interface RawMeasure {
	rect: Rect;
	index: number;
	/* The MusicXML measure number (a string — handles pickups, "X1" etc.). */
	number: string;
	/* The system (line) this measure column was laid out on. */
	systemIndex: number;
}

/* A chord diagram (fret box) the draw pass placed, in score space. The rect spans the whole
 * drawn extent (title included). */
export interface RawChordDiagram {
	rect: Rect;
	/* The raw <harmony> MElement that produced this diagram (mdom doesn't type harmony). */
	harmonySource: MElement;
	measureIndex: number;
	frame: ChordFrame;
	title: string | null;
}

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
		parts: Part[],
		layout: ScoreLayout,
	): RawGeometry {
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
		const scratchHeight = layout.top + topSlack + systemCount * perSystem;

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

		// Multi-system scores can clash where a system's notes rise above its top stave into
		// the previous system's depth. Pass one measures that per-system overflow; if any is
		// found, pass two redraws (onto the freshly cleared scratch) with the overflow reserved
		// above each system. Single-system scores never stack, so one pass suffices.
		let pass = new DrawPass(
			this.translator,
			this.reader,
			this.spanners,
			this.config,
			context,
			parts,
			layout,
			labelFont,
			topSlack,
			scratchHeight,
			new Map(),
		).run();
		if (
			systemCount > 1 &&
			[...pass.observedOverflow.values()].some((v) => v > 0)
		) {
			renderer.resize(width, scratchHeight);
			pass = new DrawPass(
				this.translator,
				this.reader,
				this.spanners,
				this.config,
				context,
				parts,
				layout,
				labelFont,
				topSlack,
				scratchHeight,
				pass.observedOverflow,
			).run();
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
			Math.max(floorHeight + topSlack, pageBottom + PAGE_MARGIN_BOTTOM) -
			cropTop;
		const dpr = scratch.width / parseFloat(scratch.style.width);
		canvas.width = scratch.width;
		canvas.height = Math.round(cssHeight * dpr);
		canvas.style.width = scratch.style.width;
		canvas.style.height = `${cssHeight}px`;
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
