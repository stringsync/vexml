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

/* What a decoration paints. The Decorator draws the halo from the element's box, but the color is
 * the element's own job: only it knows what it is — a notehead glyph (Note), a fret number
 * (TabPosition), or a plain box (the filled-ellipse fallback). So the Decorator hands over the
 * overlay ctx and the chosen color and the element stamps itself recolored. */
export interface Decoratable extends Bounded {
	drawColor(ctx: CanvasRenderingContext2D, color: string): void;
}

/* A reversible on/off effect carrying an optional value (color string, etc.). `off()` is the
 * whole undo — these are view state, not document edits, so there is no history. */
export interface Toggle<T = void> {
	on(value: T): void;
	off(): void;
	readonly active: boolean;
}

export type DecorationKind = 'color' | 'halo';

/*
 * The decoration seam. An element's color/halo toggles delegate here rather than drawing
 * themselves, so the drawing surface stays out of the model. Production: DefaultDecorator (owns
 * the overlay layers, repaints from the active sets). Tests: a FakeDecorator that records state.
 */
export interface Decorator {
	setColor(target: Decoratable, color: string | null): void;
	setHalo(target: Decoratable, color: string | null): void;
	isColored(target: Decoratable): boolean;
	isHaloed(target: Decoratable): boolean;
}

/* An element that can be visually marked: color recolors its own glyph/box, halo glows behind it. */
export interface Highlightable {
	readonly color: Toggle<string>;
	readonly halo: Toggle<string>;
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

/* The color decoration as an on/off toggle, delegating to the Decorator. */
export class ColorToggle implements Toggle<string> {
	constructor(
		private readonly target: Decoratable,
		private readonly decorator: Decorator,
	) {}
	on(color: string): void {
		this.decorator.setColor(this.target, color);
	}
	off(): void {
		this.decorator.setColor(this.target, null);
	}
	get active(): boolean {
		return this.decorator.isColored(this.target);
	}
}

/* The halo decoration as an on/off toggle carrying its color, delegating to the Decorator. */
export class HaloToggle implements Toggle<string> {
	constructor(
		private readonly target: Decoratable,
		private readonly decorator: Decorator,
	) {}
	on(color: string): void {
		this.decorator.setHalo(this.target, color);
	}
	off(): void {
		this.decorator.setHalo(this.target, null);
	}
	get active(): boolean {
		return this.decorator.isHaloed(this.target);
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
