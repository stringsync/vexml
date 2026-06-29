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

/* What a decoration paints: a target's box (for the halo) and its glyph (to recolor the notehead),
 * the glyph being null when there is none (a measure, a rest). The decoration seam operates on
 * this rather than bare Bounded so it can stamp the actual notehead glyph. */
export interface Decoratable extends Bounded {
	readonly glyph: NoteGlyph | null;
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
	setHalo(target: Decoratable, on: boolean): void;
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

/* The halo decoration as an on/off toggle, delegating to the Decorator. */
class HaloToggle implements Toggle {
	constructor(
		private readonly target: Decoratable,
		private readonly decorator: Decorator,
	) {}
	on(): void {
		this.decorator.setHalo(this.target, true);
	}
	off(): void {
		this.decorator.setHalo(this.target, false);
	}
	get active(): boolean {
		return this.decorator.isHaloed(this.target);
	}
}

/* Shared base for every target: holds the score-space rect and maps it to the page on demand.
 * Decoratable with no glyph by default; Note overrides glyph with its notehead stamp. */
abstract class BoundedTarget implements Decoratable {
	constructor(
		readonly rect: Rect,
		protected readonly viewport: Viewport,
	) {}
	get glyph(): NoteGlyph | null {
		return null;
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
	readonly halo: Toggle;

	constructor(private readonly deps: NoteDeps) {
		super(deps.rect, deps.viewport);
		this.color = new ColorToggle(this, deps.decorator);
		this.halo = new HaloToggle(this, deps.decorator);
	}

	/* The engraved notehead glyph (for recoloring), or null for a rest. */
	override get glyph(): NoteGlyph | null {
		return this.deps.glyph;
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
}

/* A fret number on a tab string. The same note can render as both a Note (notehead) and a
 * TabPosition (fret); they cross-reference via Note.getTabPosition() / TabPosition.getNote(). */
export class TabPosition extends BoundedTarget {
	readonly type = 'tab-position';

	constructor(
		rect: Rect,
		viewport: Viewport,
		private readonly opts: { string: number; fret: number; note: Note },
	) {
		super(rect, viewport);
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
