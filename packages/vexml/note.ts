import type { Note as MNote } from '@stringsync/mdom';
import type { Rect } from 'webappwiz/geometry';
import type { Decorations } from './decoration';
import { Element, type Highlightable, type Playable } from './element';
import type { NoteGlyph } from './geometry-collector';
import type { Measure } from './measure';
import type { TabPosition } from './tab-position';
import { Toggle } from './toggle';
import type { Viewport } from './viewport';

/*
 * Resolves a note's key to the wrapper built for it. The elements reference one another (a note
 * to its chordmates, a note to its tab fret), which would be circular at construction; instead
 * each holds a lookup and resolves on demand, once the factory has registered every wrapper. A
 * Map<NoteKey, …> is the production implementer; tests pass their own.
 */
export interface NoteLookup {
	get(key: NoteKey): Note | undefined;
}
export interface TabLookup {
	get(key: NoteKey): TabPosition | undefined;
}

/* What a note is looked up by: its mdom note in a full render, and a stand-in object of its
 * own when built from a snapshot, which holds no document. */
export type NoteKey = object;

/* The dependencies a Note needs. Cross-links resolve through the lookups (see NoteLookup), so
 * construction stays single-phase despite the mutual references. */
export interface NoteDeps {
	key: NoteKey;
	/* Its mdom note, or null when built from a snapshot. */
	source: MNote | null;
	facts: NoteFacts;
	rect: Rect;
	/* The note's drawn extent on its line, its grace notes aside: see RawNote.ink. */
	ink: Rect;
	viewport: Viewport;
	decorations: Decorations;
	/* This note's own part's measure (the musical node, not the cross-part column). */
	measure: Measure;
	/* Every note in this note's chord, including itself (a solo note is a 1-member chord). */
	chord: readonly NoteKey[];
	/* Resolves chord members to their Notes, and this note's mnote to its tab fret rendering. */
	notes: NoteLookup;
	tabs: TabLookup;
	/* The engraved notehead glyph, for recoloring; null for a rest (no notehead). */
	glyph: NoteGlyph | null;
}

/* A single musical note (one notehead). The unit of selection, playback, and editing. */
export class Note extends Element implements Highlightable, Playable {
	readonly type = 'note';
	readonly color: Toggle;
	readonly halo: Toggle;

	constructor(private readonly deps: NoteDeps) {
		super(deps.rect, deps.viewport);
		this.color = new Toggle(this, deps.decorations.color);
		this.halo = new Toggle(this, deps.decorations.halo);
	}

	/* Empty when the score was rendered from a snapshot, which holds no document. */
	getSources(): readonly MNote[] {
		return this.deps.source ? [this.deps.source] : [];
	}

	/* Replay vexflow's own notehead (same glyph text, font, baseline) in the chosen color, so the
	 * actual head recolors and a hollow head stays hollow. No glyph means nothing was engraved (a rest, or a tie-stop tab string whose fret is omitted), so draw nothing rather than stamping
	 * a phantom ellipse blip where there's no notehead. */
	override drawColor(ctx: CanvasRenderingContext2D, color: string): void {
		if (this.deps.glyph) {
			this.stampGlyph(ctx, this.deps.glyph, color);
		}
	}

	/* The sounding pitch as a vexflow key ("E/4"), or null for a rest. */
	getPitch(): string | null {
		return this.deps.facts.pitch;
	}

	/* Duration in quarter-note beats; 0 for a grace note (which steals time: see isGrace). */
	getDurationBeats(): number {
		return this.deps.facts.beats;
	}

	getArticulations(): string[] {
		return [...this.deps.facts.articulations];
	}

	isGrace(): boolean {
		return this.deps.facts.grace;
	}

	/**
	 * Whether swing leaves this note alone. MusicXML exempts notes with no `<type>`, grace notes,
	 * and (the one that matters in practice) notes whose sounding duration isn't the nominal one
	 * for their type, i.e. anything carrying a `<time-modification>`.
	 *
	 * This is not a nicety. Arrangers of swung music routinely write the guitar or piano part as
	 * explicit triplets rather than leaning on the swing marking, so a score can hold both
	 * notations at once: plain eighths in the vocal line that must swing, and written-out triplets
	 * underneath that must not be swung a SECOND time. Without this, those triplets come out as
	 * neither an even triplet nor a swung pair.
	 */
	isSwingExempt(): boolean {
		return this.deps.facts.swingExempt;
	}

	/* The grace notes ornamenting this note, in play order: the run of grace notes immediately
	 * preceding it in the measure. Each plays in its own cursor step, usually on this note's beat
	 * (see SequenceFactory.placeGraces). Empty for most notes. ponytail: a grace chord comes back as a fast run, not a
	 * simultaneity. */
	getGraceNotes(): Note[] {
		return this.deps.facts.graces
			.map((g) => this.deps.notes.get(g))
			.filter((n) => !!n);
	}

	/**
	 * Everything drawn for this note on its line except stems and beams, in score space: the
	 * head, its accidentals and other left marks (parentheses, the chord's arpeggio), its dots
	 * and flag, and the grace notes in front of its chord. Wider than `rect`, which is the head
	 * alone: this is the box to keep clear of when marking just short of a note.
	 */
	getInkRect(): Rect {
		let ink = this.deps.ink;
		for (const sibling of this.getChordSiblings({ includeSelf: true })) {
			for (const grace of sibling.getGraceNotes()) {
				ink = ink.union(grace.deps.ink);
			}
		}
		return ink;
	}

	/* True when this note is part of a chord of two or more notes (the lead counts too). */
	isChordMember(): boolean {
		return this.deps.facts.chordMember;
	}

	getChordSiblings(opts: ChordSiblingsOptions): Note[] {
		const all: Note[] = [];
		for (const key of this.deps.chord) {
			const note = this.deps.notes.get(key);
			if (note) {
				all.push(note);
			}
		}
		return opts.includeSelf ? all : all.filter((n) => n !== this);
	}

	/* This note's own part's measure; the column/system are one hop away via getBox(). */
	getMeasure(): Measure {
		return this.deps.measure;
	}

	getTabPosition(): TabPosition | null {
		return this.deps.tabs.get(this.deps.key) ?? null;
	}
}

/* What a note says about its music: read off its mdom note (MNoteFacts), or carried by a
 * snapshot. */
export interface NoteFacts {
	/* The sounding pitch as a vexflow key ("E/4"), or null for a rest. */
	readonly pitch: string | null;
	readonly beats: number;
	readonly articulations: readonly string[];
	readonly grace: boolean;
	readonly swingExempt: boolean;
	/* Whether its chord has two or more notes, engraved or not. */
	readonly chordMember: boolean;
	/* The grace notes before it, in play order. */
	readonly graces: readonly NoteKey[];
}

/* Whether the note asking counts as one of its own chord siblings. */
export interface ChordSiblingsOptions {
	includeSelf: boolean;
}
