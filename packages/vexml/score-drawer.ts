import type { Score } from '@stringsync/mdom';
import { Renderer } from 'vexflow';
import { Rect } from 'webappwiz/geometry';
import type { BarlineTranslator } from './barline-translator';
import type { ChordTranslator } from './chord-translator';
import type { Config } from './config';
import {
	LEDGER_HEADROOM,
	MAX_CANVAS_AREA,
	PAGE_MARGIN_BOTTOM,
	PAGE_MARGIN_TOP,
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
import type { ScoreReader } from './score-reader';
import { SignatureFold } from './signature-fold';
import type { SignatureTranslator } from './signature-translator';
import type { SpannerBuilder } from './spanner-builder';
import type { SpillResolver } from './spill-resolver';
import type { StavePlan } from './stave-plan';
import type { TabVoiceTranslator } from './tab-voice-translator';
import type { VoiceTranslator } from './voice-translator';

/* Everything the draw pass emits for the index, in score space (crop already applied). */
export interface RawGeometry {
	bounds: Rect;
	notes: RawNote[];
	measures: RawMeasure[];
	chordDiagrams: RawChordDiagram[];
}

/* What a draw hands back: the hit-index geometry, and the sticky panoramic fold when the
 * config asks for one. */
export interface DrawResult {
	geometry: RawGeometry;
	fold: Fold | null;
}

/*
 * Draws the laid-out score onto the caller's canvas: the scratch-canvas setup, the
 * two-pass driver (each pass is a fresh DrawPass), and the crop/blit into final
 * score space.
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
	 * Draw the whole score onto the element: one SVG stave per part-staff per measure,
	 * placed at the boxes computed by the layout planner, with clefs/keys/time
	 * signatures, notes, and the brace/barline connectors that group parts into
	 * systems. Returns the hit-index geometry (notehead/fret/measure boxes) in final
	 * score space, and the sticky fold when a panoramic layout asks for one.
	 */
	draw(
		canvas: HTMLCanvasElement,
		score: Score,
		layout: ScoreLayout,
	): DrawResult {
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
		let pass = runPass(layout, new Map(), scratchHeight, {});
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
			drawnLayout = {
				...layout,
				systemStaveOffsets,
				floorHeight: activeFloorHeight,
			};
			pass = runPass(drawnLayout, pass.observedOverflow, scratchHeight, {
				lyricDrops: pass.observedLyricDrops,
				voltaLifts: pass.observedVoltaLifts,
			});
		}
		const { pageTop, pageBottom } = pass;

		// Crop to the lowest thing actually drawn so deep ledger lines in the bottom
		// system aren't clipped and there's no trailing whitespace. Sizing the real
		// canvas resets it to an identity transform, so the blit copies device pixels
		// from the scratch's top-left (scaled down if the area cap bites); the unused bottom is
		// simply not copied.
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
		const cssWidth = parseFloat(scratch.style.width);
		const dpr = scratch.width / cssWidth;
		// The kept bitmap's pixel ratio: the screen's, lowered just enough to keep it under
		// MAX_CANVAS_AREA — a long score on a dpr 3 phone would otherwise hold a bitmap iOS kills the
		// page over. Never below 1, which would blur the score even on a 1x screen. Sized off the
		// cropped result, not the oversized scratch, so the cap takes no more than it must.
		const ratio = Math.max(
			1,
			Math.min(dpr, Math.sqrt(MAX_CANVAS_AREA / (cssWidth * cssHeight))),
		);
		canvas.width = Math.round(cssWidth * ratio);
		canvas.height = Math.round(cssHeight * ratio);
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
		canvas.style.setProperty('--vexml-width', scratch.style.width);
		canvas.style.setProperty('--vexml-height', `${cssHeight}px`);
		canvas.style.setProperty('--vexml-aspect', `${cssWidth / cssHeight}`);
		const target = canvas.getContext('2d');
		if (target) {
			// At full ratio this is a 1:1 copy; under the cap it downsamples, smoothed at the best
			// quality the browser has.
			target.imageSmoothingQuality = 'high';
			target.drawImage(
				scratch,
				0,
				Math.round(cropTop * dpr),
				scratch.width,
				Math.round(cssHeight * dpr),
				0,
				0,
				canvas.width,
				canvas.height,
			);
		}
		// Release the scratch bitmap now rather than at the next GC: it's as big as the score, and
		// iOS WebKit counts a dropped canvas against its memory limit until it's collected.
		scratch.width = 0;
		scratch.height = 0;

		// The geometry was collected in scratch space; the blit shifts content up by cropTop, so
		// translate every box into final score space (the canvas's own coordinates). dpr stays out —
		// these are CSS px, like getAbsoluteX/getYs.
		const toScore = (r: Rect) => r.translate(0, -cropTop);
		const toScoreGlyph = (g: RawNote['glyph']) =>
			g ? { ...g, y: g.y - cropTop } : null;
		const geometry: RawGeometry = {
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
		const { layout: layoutConfig } = this.config;
		const sticky =
			layoutConfig.type === 'panoramic' && layoutConfig.stickySignatures;
		if (!sticky) {
			return { geometry, fold: null };
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
		return { geometry, fold };
	}
}
