import type { Harmony, Note as MNote, Score } from '@stringsync/mdom';
import { Renderer } from 'vexflow';
import type { ChordFrame } from './chord-diagram-glyph';
import type { Config } from './config';
import {
	LEDGER_HEADROOM,
	PAGE_MARGIN_BOTTOM,
	PAGE_MARGIN_TOP,
	STAVE_CLEARANCE,
} from './constants';
import { DrawPass, type DrawPassOptions, type StaveSpill } from './draw-pass';
import { Rect } from './geometry';
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
	/* The <harmony> that produced this diagram. */
	harmonySource: Harmony;
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
 * Re-space each system's staves around the music actually drawn on them. The layout planner
 * gaps staves by fixed constants, which is right until a part's content spills far enough
 * past its staff lines to reach the next stave (deep ledger lines, tall chords, a words
 * direction or chord symbol riding above it). Given pass one's measured spill, widen any
 * gap that has to grow so the lower stave's highest content clears the upper stave's
 * lowest by STAVE_CLEARANCE. Gaps that already fit are left exactly as planned, so
 * ordinary scores keep their planned spacing.
 *
 * Resolved PER SYSTEM, which is what a reference engraving does: a piano's two staves ride
 * close together through a plain bar and open up under a bar that needs it, on the same
 * page. Sharing one worst case across the score instead would let the densest measure in
 * the piece set the gap for every line of it.
 *
 * Within a system, gaps planned at the same size stay the same size: the planned size is
 * what says whether a gap is within a part or between two of them, so widening one for a
 * single stave's chord symbol — and leaving its siblings alone — would read as uneven part
 * spacing rather than as room made for the symbol. Different planned sizes stay
 * independent, so a grand staff's inner gap doesn't drag the gaps around it open with it.
 */
/*
 * How far two staves' content reaches into the gap between them, at the worst single x.
 * `drop` is the upper stave's profile below its bottom line, `rise` the lower stave's above
 * its top line, both columned by SPILL_COLUMN.
 *
 * Summed per column, not overall: the whole point is that a deep stem hanging over an empty
 * patch of the stave below costs nothing. Taking the two maxima independently would size
 * every gap for a collision that never happens — the run beamed low in bar 3 against the
 * chord reaching high in bar 9. Columns absent from a map contribute 0, so a lone extreme
 * still gets its own clearance and a gap with nothing in it comes out at 0 (the caller
 * floors that at the planned spacing).
 */
function worstColumn(
	drop: ReadonlyMap<number, number>,
	rise: ReadonlyMap<number, number>,
): number {
	let worst = 0;
	for (const [column, px] of drop) {
		worst = Math.max(worst, px + (rise.get(column) ?? 0));
	}
	for (const [column, px] of rise) {
		worst = Math.max(worst, px + (drop.get(column) ?? 0));
	}
	return worst;
}

export function spacedOffsets(
	planned: number[],
	spillBySystem: ReadonlyMap<number, ReadonlyMap<number, StaveSpill>>,
): Map<number, number[]> {
	const bySystem = new Map<number, number[]>();
	for (const [system, spill] of spillBySystem) {
		bySystem.set(system, systemOffsets(planned, spill));
	}
	return bySystem;
}

/* One system's stave offsets, from the spill measured on that system alone. */
function systemOffsets(
	planned: number[],
	spill: ReadonlyMap<number, StaveSpill>,
): number[] {
	// planned gap size -> the widest any gap of that size turned out to need.
	const resolved = new Map<number, number>();
	const plannedGaps: number[] = [];
	for (let i = 1; i < planned.length; i++) {
		const above = spill.get(i - 1);
		const below = spill.get(i);
		const plannedGap = (planned[i] ?? 0) - (planned[i - 1] ?? 0);
		// Content bottom of the upper stave, and content top of the lower one, both
		// relative to their own stave y — so their difference is the gap they need.
		const needed =
			above && below
				? above.lineBottom +
					worstColumn(above.drop, below.rise) +
					STAVE_CLEARANCE -
					below.lineTop
				: plannedGap;
		plannedGaps.push(plannedGap);
		resolved.set(
			plannedGap,
			Math.max(resolved.get(plannedGap) ?? plannedGap, needed),
		);
	}

	const offsets = [planned[0] ?? 0];
	for (const plannedGap of plannedGaps) {
		offsets.push(
			(offsets.at(-1) ?? 0) + (resolved.get(plannedGap) ?? plannedGap),
		);
	}
	return offsets;
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
		const systemStaveOffsets = spacedOffsets(
			layout.staveOffsets,
			pass.observedStaveSpill,
		);
		const respace = [...systemStaveOffsets.values()].some((offsets) =>
			offsets.some((o, i) => o !== layout.staveOffsets[i]),
		);
		const needsOverflow =
			systemCount > 1 && [...pass.observedOverflow.values()].some((v) => v > 0);
		// A verse hangs at one height per system, but each measure column is formatted alone
		// and can only see its own notes — so a system whose columns wanted different heights
		// drew a stepped verse, and pass two pins the whole row to the deepest of them.
		const needsLyricPin = pass.lyricsStepped;
		// A volta bracket is drawn with its stave, before the notes it spans are formatted, so
		// a measure whose notes climb through it is only visible after the fact. Pass two
		// redraws the brackets lifted clear.
		const needsVoltaLift = pass.voltasLifted;
		if (respace || needsOverflow || needsLyricPin || needsVoltaLift) {
			// Re-spacing makes a system taller, so the page floor and the scratch canvas both
			// have to grow before the redraw. Sized off the system that grew MOST — systems
			// now grow by different amounts, and every one of them has to fit. Over-allocating
			// costs nothing: the crop below trims back to the content actually drawn.
			const grew = Math.max(
				0,
				...[...systemStaveOffsets.values()].map(
					(offsets) =>
						(offsets.at(-1) ?? 0) - (layout.staveOffsets.at(-1) ?? 0),
				),
			);
			activeFloorHeight = floorHeight + grew;
			scratchHeight = layout.top + topSlack + systemCount * (perSystem + grew);
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
