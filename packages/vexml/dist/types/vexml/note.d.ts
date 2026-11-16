import type { Note as MNote } from '@stringsync/mdom';
import type { Rect } from '../core/geometry/index.js';
import type { Decorations } from './decoration.js';
import { Element, type Highlightable, type Playable } from './element.js';
import type { NoteGlyph } from './geometry-collector.js';
import type { Measure } from './measure.js';
import type { TabPosition } from './tab-position.js';
import { Toggle } from './toggle.js';
import type { Viewport } from './viewport.js';
export interface NoteLookup {
    get(key: NoteKey): Note | undefined;
}
export interface TabLookup {
    get(key: NoteKey): TabPosition | undefined;
}
export type NoteKey = object;
export interface NoteDeps {
    key: NoteKey;
    source: MNote | null;
    facts: NoteFacts;
    rect: Rect;
    ink: Rect;
    viewport: Viewport;
    decorations: Decorations;
    measure: Measure;
    chord: readonly NoteKey[];
    notes: NoteLookup;
    tabs: TabLookup;
    glyph: NoteGlyph | null;
}
export declare class Note extends Element implements Highlightable, Playable {
    private readonly deps;
    readonly type = "note";
    readonly color: Toggle;
    readonly halo: Toggle;
    private ink;
    private glyph;
    constructor(deps: NoteDeps);
    drawn(raw: {
        rect: Rect;
        ink: Rect;
        glyph: NoteGlyph | null;
    }): void;
    getSources(): readonly MNote[];
    drawColor(ctx: CanvasRenderingContext2D, color: string): void;
    getPitch(): string | null;
    getDurationBeats(): number;
    getArticulations(): string[];
    isGrace(): boolean;
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
    isSwingExempt(): boolean;
    getGraceNotes(): Note[];
    /**
     * Everything drawn for this note on its line except stems and beams, in score space: the
     * head, its accidentals and other left marks (parentheses, the chord's arpeggio), its dots
     * and flag, and the grace notes in front of its chord. Wider than `rect`, which is the head
     * alone: this is the box to keep clear of when marking just short of a note.
     */
    getInkRect(): Rect;
    isChordMember(): boolean;
    getChordSiblings(opts: ChordSiblingsOptions): Note[];
    getMeasure(): Measure;
    getTabPosition(): TabPosition | null;
}
export interface NoteFacts {
    readonly pitch: string | null;
    readonly beats: number;
    readonly articulations: readonly string[];
    readonly grace: boolean;
    readonly swingExempt: boolean;
    readonly chordMember: boolean;
    readonly graces: readonly NoteKey[];
}
export interface ChordSiblingsOptions {
    includeSelf: boolean;
}
