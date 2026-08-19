import type {
	Harmony,
	Measure as MMeasure,
	Note as MNote,
	Part as MPart,
} from '@stringsync/mdom';
import type { Rect } from 'webappwiz/geometry';
import type { Decoratable, Decoration } from './decoration';
import type { NoteGlyph } from './geometry-collector';
import type { Viewport } from './viewport';

/*
 * The interaction model: vexml-owned objects a caller gets from hit-testing a rendered score.
 * They wrap the underlying @stringsync/mdom nodes (reachable via getSources()) and are built once
 * during rendering, so identities are stable for the lifetime of a Score (reference equality
 * works).
 */

/** The mdom nodes a vexml Element can be built from. */
export type MSource = MNote | MMeasure | MPart | Harmony;

/* An element that can be visually marked: color recolors its own glyph/box, halo glows behind it. */
export interface Highlightable {
	readonly color: Toggle;
	readonly halo: Toggle;
}

/* An element that sounds: what playback needs to voice it. */
export interface Playable {
	/* The sounding pitch as a vexflow key ("E/4"), or null for a rest. */
	getPitch(): string | null;
	/* Duration in quarter-note beats; 0 for a grace note (which steals time — see isGrace). */
	getDurationBeats(): number;
	/* Articulation marking names (staccato, accent, ...) from <notations><articulations>. */
	getArticulations(): string[];
	isGrace(): boolean;
}

export function isHighlightable(el: Element): el is Element & Highlightable {
	return 'color' in el && 'halo' in el;
}

export function isPlayable(el: Element): el is Element & Playable {
	return 'getPitch' in el;
}

/* A reversible on/off effect carrying its color, delegating to the Decoration's store. `off()`
 * is the whole undo — this is view state, not a document edit, so there is no history. */
export class Toggle {
	constructor(
		private readonly target: Decoratable,
		private readonly decoration: Decoration,
	) {}
	on(color: string): void {
		this.decoration.set(this.target, color);
	}
	off(): void {
		this.decoration.set(this.target, null);
	}
	get active(): boolean {
		return this.decoration.has(this.target);
	}
}

/* Shared base for every element: the score-space rect (mapped to the page on demand through the
 * Viewport), the `type` discriminant, and provenance back to the mutable mdom nodes that caused
 * it. The default color is a filled ellipse over the box — the fallback for an element with no
 * glyph or text of its own (a rest, a measure). Note and TabPosition override it with their own
 * stamp. */
export abstract class Element implements Decoratable {
	abstract readonly type: string;

	constructor(
		readonly rect: Rect,
		protected readonly viewport: Viewport,
	) {}

	/* The mutable mdom nodes this element was built from (a Note's MNote, a MeasureBox's one mdom
	 * Measure per part, a ChordDiagram's Harmony). */
	abstract getSources(): readonly MSource[];

	drawColor(ctx: CanvasRenderingContext2D, color: string): void {
		const r = this.rect;
		ctx.save();
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.ellipse(
			r.x + r.w / 2,
			r.y + r.h / 2,
			r.w / 2,
			r.h / 2,
			0,
			0,
			2 * Math.PI,
		);
		ctx.fill();
		ctx.restore();
	}

	getBoundingClientRect(): DOMRect {
		return this.viewport.clientRectOf(this.rect);
	}

	/* Replay a captured glyph (a notehead or a tab fret) recolored on the overlay: vexflow's own
	 * text, font, and left/alphabetic baseline, exactly as it engraved it, so the color stamp
	 * overlays the original precisely instead of being centered by a different rule. */
	protected stampGlyph(
		ctx: CanvasRenderingContext2D,
		glyph: NoteGlyph,
		color: string,
	): void {
		ctx.save();
		ctx.fillStyle = color;
		ctx.font = glyph.font;
		ctx.textAlign = 'left';
		ctx.textBaseline = 'alphabetic';
		ctx.fillText(glyph.text, glyph.x, glyph.y);
		ctx.restore();
	}
}
