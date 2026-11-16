import { type Barline as MBarline, type MDocument, type Measure as MMeasure, Note as MNote, type Part as MPart } from '@stringsync/mdom';
import { type Resource } from '../core/disposable/index.js';
import { type Eventful } from '../core/events/index.js';
import type { EditingCaret } from './editing-caret.js';
import type { Element } from './element.js';
import type { ElementIndex } from './element-index.js';
import type { Note } from './note.js';
import { type PitchInput } from './pitch-edit.js';
import { type TabPositionInput } from './tab-position-edit.js';
export interface SelectionOptions {
    /** Extend from the fixed anchor within the selection's part and scope. */
    extend?: boolean;
}
export type EditingMove = 'next' | 'previous' | 'higher' | 'lower';
export interface EditingVoice {
    readonly part: MPart;
    readonly voice: string;
}
export type BarlineLocation = 'left' | 'right' | 'middle';
export interface EditingBarline {
    readonly measure: MMeasure;
    readonly location: BarlineLocation;
    readonly barline: MBarline | null;
}
export type EditingStructuralTarget = MMeasure | EditingBarline;
export type EditingSessionEvents = {
    selectionchange: undefined;
    caretchange: undefined;
    voicechange: undefined;
    documentchange: undefined;
};
/** Select notes, measures and barlines on an mdom document and run undoable edits. */
export declare class EditingSession implements Eventful<EditingSessionEvents>, Resource {
    readonly document: MDocument;
    private readonly disposer;
    private readonly dispatcher;
    readonly events: import("../core/events/index.js").Events<EditingSessionEvents>;
    private activeVoice;
    private focus;
    private anchor;
    private selected;
    private structuralFocus;
    private structuralAnchor;
    private selectedMeasures;
    private selectedBarline;
    private caret;
    constructor(document: MDocument);
    /** The document's native mdom history. Use edit() for any supported mutation. */
    get history(): import("@stringsync/mdom").MHistory;
    /** Release this session's listeners. The caller retains ownership of document history. */
    dispose(): void;
    /** Voices in first-written order, deduplicated across measures and staves. */
    getVoices(): readonly EditingVoice[];
    getActiveVoice(): EditingVoice | null;
    /** Changes navigation context without moving focus or altering selection. */
    setActiveVoice(voice: EditingVoice): void;
    clearSelection(): void;
    getCaret(): EditingCaret | null;
    /** Move the insertion target without editing the document or creating history. */
    setCaret(caret: EditingCaret): void;
    moveCaret(onset: number): boolean;
    clearCaret(): void;
    /** Whether a gesture can extend the existing range without crossing voices. */
    canExtendTo(note: MNote): boolean;
    private selectionChanged;
    getFocus(): MNote | null;
    getSelection(): readonly MNote[];
    getStructuralFocus(): EditingStructuralTarget | null;
    getStructuralAnchor(): EditingStructuralTarget | null;
    getSelectedMeasures(): readonly MMeasure[];
    getSelectedBarline(): EditingBarline | null;
    /** Select a measure or extend the fixed measure anchor within one part. */
    selectMeasure(measure: MMeasure, opts?: SelectionOptions): void;
    /** Select a barline by measure and location, retaining its mdom node when present. */
    selectBarline(target: EditingBarline): void;
    /** Selecting a note starts a selection; extend: true extends the existing voice range.
     * Chord members, grace notes and invisible notes remain individual targets. */
    select(note: MNote, opts?: SelectionOptions): void;
    /** Explicit sets may cross parts/voices. The final supplied note becomes focus and anchor. */
    selectNotes(notes: readonly MNote[]): void;
    toggle(note: MNote): void;
    /** Bridge point/marquee hits to document targets. Background boxes are ignored;
     * a notehead and its tab fret collapse to one note. */
    selectElements(elements: readonly Element[]): void;
    /** Resolve against the CURRENT render after editing, resizing or changing layout. */
    getSelectedElements(index: ElementIndex): readonly Note[];
    /** Left/right follow the written voice across measures, including cross-staff notes, landing on chord leads.
     * Up/down visit pitches within the current chord. Boundaries clamp. */
    move(direction: EditingMove, opts?: SelectionOptions): boolean;
    /** One group edit is one undo step. Returns false for an empty or unchanged selection. */
    setPitch(spec: PitchInput): boolean;
    /** Set pitch and fingering together. Tied notes are rejected before the group changes. */
    setTabPosition(spec: TabPositionInput): boolean;
    undo(): boolean;
    redo(): boolean;
    private clearNoteSelection;
    private clearStructuralSelection;
    private contains;
    private containsStructuralTarget;
    private isBarlineTarget;
    private requireElement;
    private requireNote;
    private requireCaret;
    private voiceNotes;
}
