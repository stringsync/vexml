import type { Note as MNote } from '@stringsync/mdom';
import type { Rect } from './geometry';

/*
 * The interaction model: vexml-owned objects a caller gets from hit-testing a rendered score.
 * They wrap the underlying @stringsync/mdom nodes but never expose them — a caller is coupled
 * to these types only. Every target is laid out (Bounded) and built once during rendering, so
 * identities are stable for the lifetime of a Score (reference equality works).
 */

/* Something with a known box. `rect` is in score space; getBoundingClientRect() maps it to the
 * page through the live scroll/zoom transform (mirrors DOM Element.getBoundingClientRect). */
export interface Bounded {
	readonly rect: Rect;
	getBoundingClientRect(): DOMRect;
}

/* A note's engraved glyph, captured so a decoration can re-stamp it in color on an overlay: the
 * SMuFL text, the exact CSS font vexflow drew it with, and its baseline position in score space.
 * Replaying vexflow's own fillText reproduces the notehead precisely — hollow notes stay hollow. */
export interface NoteGlyph {
	readonly text: string;
	readonly font: string;
	readonly x: number;
	readonly y: number;
}

/* Replay a captured glyph (a notehead or a tab fret) recolored on the overlay: vexflow's own
 * text, font, and left/alphabetic baseline, exactly as it engraved it, so the color stamp
 * overlays the original precisely instead of being centered by a different rule. */
function stampGlyph(
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

/* What a decoration paints. The Decorator draws the halo from the target's box, but the color is
 * the target's own job: only it knows what it is — a notehead glyph (Note), a fret number
 * (TabPosition), or a plain box (the filled-ellipse fallback). So the Decorator hands over the
 * overlay ctx and the chosen color and the target stamps itself recolored. */
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

/*
 * The coordinate authority: converts between score space (where rects live) and client/page
 * space (where pointer events and DOM popups live). The stage implements it for real; tests
 * inject a fake. The target wrappers are its first consumers, so the interface lives here.
 */
export interface Viewport {
	clientRectOf(rect: Rect): DOMRect;
	toScoreSpace(clientX: number, clientY: number): { x: number; y: number };
}

export type DecorationKind = 'color' | 'halo';

/*
 * The decoration seam. A target's color/halo toggles delegate here rather than drawing
 * themselves, so the drawing surface stays out of the model. Production: Decorations (owns the
 * overlay layer, repaints from the active set). Tests: a FakeDecorator that records state.
 */
export interface Decorator {
	setColor(target: Decoratable, color: string | null): void;
	setHalo(target: Decoratable, color: string | null): void;
	isColored(target: Decoratable): boolean;
	isHaloed(target: Decoratable): boolean;
}

/*
 * Resolves an mdom note to the wrapper built for it. The targets reference one another (a note
 * to its chordmates, a note to its tab fret), which would be circular at construction; instead
 * each holds a lookup and resolves on demand, once the builder has registered every wrapper. A
 * Map<MNote, …> is the production implementer; tests pass their own.
 */
export interface NoteLookup {
	get(mnote: MNote): Note | undefined;
}
export interface TabLookup {
	get(mnote: MNote): TabPosition | undefined;
}

/* The color decoration as an on/off toggle, delegating to the Decorator. */
class ColorToggle implements Toggle<string> {
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
class HaloToggle implements Toggle<string> {
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

/* Shared base for every target: holds the score-space rect and maps it to the page on demand.
 * The default color is a filled ellipse over the box — the fallback for a target with no glyph or
 * text of its own (a rest, a measure). Note and TabPosition override it with their own stamp. */
abstract class BoundedTarget implements Decoratable {
	constructor(
		readonly rect: Rect,
		protected readonly viewport: Viewport,
	) {}
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

/* MusicXML <pitch> -> vexflow key string, e.g. {step:'B', alter:-1, octave:3} -> "Bb/3". */
function pitchToKey(p: {
	step: string;
	octave: number;
	alter: number;
}): string {
	const n = Math.round(p.alter);
	const accidental = n > 0 ? '#'.repeat(n) : n < 0 ? 'b'.repeat(-n) : '';
	return `${p.step}${accidental}/${p.octave}`;
}

/* The dependencies a Note needs. Cross-links resolve through the lookups (see NoteLookup), so
 * construction stays single-phase despite the mutual references. mnote is private — never exposed. */
export interface NoteDeps {
	mnote: MNote;
	rect: Rect;
	viewport: Viewport;
	decorator: Decorator;
	measure: Measure;
	/* Every mdom note in this note's chord, including itself (a solo note is a 1-member chord). */
	chord: MNote[];
	/* Resolves chord members to their Notes, and this note's mnote to its tab fret rendering. */
	notes: NoteLookup;
	tabs: TabLookup;
	/* The engraved notehead glyph, for recoloring; null for a rest (no notehead). */
	glyph: NoteGlyph | null;
}

/* A single musical note (one notehead). The unit of selection, playback, and editing. */
export class Note extends BoundedTarget {
	readonly type = 'note';
	readonly color: Toggle<string>;
	readonly halo: Toggle<string>;

	constructor(private readonly deps: NoteDeps) {
		super(deps.rect, deps.viewport);
		this.color = new ColorToggle(this, deps.decorator);
		this.halo = new HaloToggle(this, deps.decorator);
	}

	/* The glyph case: replay vexflow's own notehead (same glyph text, font, baseline) in the
	 * chosen color, so the actual head recolors and a hollow head stays hollow. A rest has no
	 * glyph, so it falls back to the base ellipse. */
	override drawColor(ctx: CanvasRenderingContext2D, color: string): void {
		if (this.deps.glyph) {
			stampGlyph(ctx, this.deps.glyph, color);
		} else {
			super.drawColor(ctx, color);
		}
	}

	/* The sounding pitch as a vexflow key ("E/4"), or null for a rest. */
	getPitch(): string | null {
		const pitch = this.deps.mnote.pitch;
		return pitch ? pitchToKey(pitch) : null;
	}

	/* Duration in quarter-note beats; 0 for a grace note (which steals time — see isGrace). */
	getBeats(): number {
		return this.deps.mnote.beats ?? 0;
	}

	isGrace(): boolean {
		return this.deps.mnote.isGrace;
	}

	/* True when this note is part of a chord of two or more notes (the lead counts too). */
	isChordMember(): boolean {
		return this.deps.chord.length > 1;
	}

	getChordSiblings(opts: { includeSelf: boolean }): Note[] {
		const all: Note[] = [];
		for (const mnote of this.deps.chord) {
			const note = this.deps.notes.get(mnote);
			if (note) {
				all.push(note);
			}
		}
		return opts.includeSelf ? all : all.filter((n) => n !== this);
	}

	getMeasure(): Measure {
		return this.deps.measure;
	}

	getTabPosition(): TabPosition | null {
		return this.deps.tabs.get(this.deps.mnote) ?? null;
	}
}

/* A measure's box — the background target, hit when a pointer lands on staff space (not a note). */
export class Measure extends BoundedTarget {
	readonly type = 'measure';

	constructor(
		rect: Rect,
		viewport: Viewport,
		private readonly number: string,
	) {
		super(rect, viewport);
	}

	/* The MusicXML measure number, e.g. "1" (or "0" for a pickup). */
	getNumber(): string {
		return this.number;
	}
}

/* A fret number on a tab string. The same note can render as both a Note (notehead) and a
 * TabPosition (fret); they cross-reference via Note.getTabPosition() / TabPosition.getNote(). */
export class TabPosition extends BoundedTarget {
	readonly type = 'tab-position';
	readonly color: Toggle<string>;
	readonly halo: Toggle<string>;

	constructor(
		rect: Rect,
		viewport: Viewport,
		private readonly opts: {
			string: number;
			fret: number;
			note: Note;
			decorator: Decorator;
			/* The engraved fret glyph ("5", "<7>", "(2)", "✕") captured with vexflow's exact
			 * baseline, so a decoration replays the digit recolored; null falls back to an ellipse. */
			glyph: NoteGlyph | null;
		},
	) {
		super(rect, viewport);
		this.color = new ColorToggle(this, opts.decorator);
		this.halo = new HaloToggle(this, opts.decorator);
	}

	/* Replay vexflow's own fret glyph recolored so the digit lights up exactly where it was
	 * engraved, rather than vanishing under a filled ellipse. Same approach as a notehead. */
	override drawColor(ctx: CanvasRenderingContext2D, color: string): void {
		if (this.opts.glyph) {
			stampGlyph(ctx, this.opts.glyph, color);
		} else {
			super.drawColor(ctx, color);
		}
	}

	getString(): number {
		return this.opts.string;
	}

	getFret(): number {
		return this.opts.fret;
	}

	getNote(): Note {
		return this.opts.note;
	}
}

export type PointerTarget = Note | Measure | TabPosition;
