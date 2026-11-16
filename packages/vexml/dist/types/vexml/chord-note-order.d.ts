import type { Note } from '@stringsync/mdom';
/** Chord members from top to bottom: staff, then written line/space.
 * Accidentals do not move a note on the staff. Equal positions retain document
 * order; a note without a displayed position sorts below positioned notes. */
export declare class ChordNoteOrder {
    of(focus: Note): readonly Note[];
    private position;
}
