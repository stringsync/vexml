import type { MElement } from '@stringsync/mdom';
import type { NoteGlyph } from '../engraving/score-drawer';
import type { Rect } from '../geometry';
import type { Viewport } from '../host/stage';

/*
 * The interaction model: vexml-owned objects a caller gets from hit-testing a rendered score.
 * They wrap the underlying @stringsync/mdom nodes (reachable via getSources()) and are built once
 * during rendering, so identities are stable for the lifetime of a Score (reference equality
 * works).
 */

/* Something with a known box. `rect` is in score space; getBoundingClientRect() maps it to the
 * page through the live scroll/zoom transform (mirrors DOM Element.getBoundingClientRect). */
export interface Bounded {
	readonly rect: Rect;
	getBoundingClientRect(): DOMRect;
}

/* What a decoration paints. HaloStyle draws from the element's box alone, but the color is the
 * element's own job: only it knows what it is — a notehead glyph (Note), a fret number
 * (TabPosition), or a plain box (the filled-ellipse fallback). So ColorStyle hands over the
 * overlay ctx and the chosen color and the element stamps itself recolored. */
export interface Decoratable extends Bounded {
	drawColor(ctx: CanvasRenderingContext2D, color: string): void;
}

/*
 * One decoration kind's store — the seam an element's toggle delegates to, so the drawing surface
 * stays out of the model. Production: DefaultDecoration (paints its overlay layer from the active
 * set). Tests: a FakeDecoration that records state.
 */
export interface Decoration {
	set(target: Decoratable, color: string | null): void;
	has(target: Decoratable): boolean;
}

/* The decoration stores an element wires its toggles to, one per kind. */
export interface Decorations {
	readonly color: Decoration;
	readonly halo: Decoration;
}

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

/* Replay a captured glyph (a notehead or a tab fret) recolored on the overlay: vexflow's own
 * text, font, and left/alphabetic baseline, exactly as it engraved it, so the color stamp
 * overlays the original precisely instead of being centered by a different rule. */
export function stampGlyph(
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

	/* The mutable mdom nodes this element was built from (a Note's MNote, a Measure's one mdom
	 * Measure per part, a ChordDiagram's raw <harmony> element). */
	abstract getSources(): readonly MElement[];

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
}
