import { type MElement, Note as MNote } from '@stringsync/mdom';
import type { NoteGlyph } from '../engraving/score-drawer';
import type { Rect } from '../geometry';
import type { Viewport } from '../host/stage';
import {
	type Decorations,
	DecorationToggle,
	Element,
	type Highlightable,
	type Playable,
	stampGlyph,
	type Toggle,
} from './element';
import type { Measure } from './measure';
import type { TabPosition } from './tab-position';

/*
 * Resolves an mdom note to the wrapper built for it. The elements reference one another (a note
 * to its chordmates, a note to its tab fret), which would be circular at construction; instead
 * each holds a lookup and resolves on demand, once the factory has registered every wrapper. A
 * Map<MNote, …> is the production implementer; tests pass their own.
 */
export interface NoteLookup {
	get(mnote: MNote): Note | undefined;
}
export interface TabLookup {
	get(mnote: MNote): TabPosition | undefined;
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
 * construction stays single-phase despite the mutual references. */
export interface NoteDeps {
	mnote: MNote;
	rect: Rect;
	viewport: Viewport;
	decorations: Decorations;
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
export class Note extends Element implements Highlightable, Playable {
	readonly type = 'note';
	readonly color: Toggle<string>;
	readonly halo: Toggle<string>;

	constructor(private readonly deps: NoteDeps) {
		super(deps.rect, deps.viewport);
		this.color = new DecorationToggle(this, deps.decorations.color);
		this.halo = new DecorationToggle(this, deps.decorations.halo);
	}

	getSources(): readonly MElement[] {
		return [this.deps.mnote];
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
	getDurationBeats(): number {
		return this.deps.mnote.beats ?? 0;
	}

	getArticulations(): string[] {
		return this.deps.mnote.articulations;
	}

	isGrace(): boolean {
		return this.deps.mnote.isGrace;
	}

	/* The grace notes ornamenting this note, in play order: the run of grace notes immediately
	 * preceding it in the measure (grace notes steal no timeline time, so they never surface as a
	 * cursor onset on their own). Empty for most notes; a caller can sound them just before this
	 * one. ponytail: a grace chord comes back as a fast run, not a simultaneity. */
	getGraceNotes(): Note[] {
		const siblings = this.deps.mnote.parent?.childrenOfType(MNote) ?? [];
		const i = siblings.indexOf(this.deps.mnote);
		const graces: Note[] = [];
		for (let j = i - 1; j >= 0; j--) {
			const sibling = siblings[j];
			if (!sibling?.isGrace) {
				break;
			}
			const note = this.deps.notes.get(sibling);
			if (note) {
				graces.unshift(note);
			}
		}
		return graces;
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
