import type { Note } from '@stringsync/mdom';
import type { EditingLayout } from './editing-layout.js';
import type { EditingSession, EditingVoice, SelectionOptions } from './editing-session.js';
export interface EditingNavigation {
    unit: 'note' | 'measure' | 'voice' | 'chordPitch' | 'vertical';
    direction: -1 | 1;
}
/** Resolves musical targets, independent of keys, pixels, playback and mutation history. */
export declare class EditingNavigator {
    private readonly editor;
    private readonly layout?;
    private readonly chordOrder;
    constructor(editor: EditingSession, layout?: EditingLayout | undefined);
    move(move: EditingNavigation, opts?: SelectionOptions): boolean;
    /** Select an explicit chord from the side approached by a vertical gesture. */
    selectChordEdge(note: Note, edge: 'top' | 'bottom'): boolean;
    selectVoice(voice: EditingVoice): boolean;
    /** A measure steps through its part, empty bars included, extending from the anchor;
     * a barline steps through its part's barlines; vertical moves change part at the same bar. */
    private moveStructural;
    /** A part's barlines in written order: each measure's explicit left and middle ones, then
     * its right edge, explicit or implicit. */
    private barlines;
    private isBarline;
    private notes;
    private nextNote;
    private nextMeasure;
    private nextVoice;
    private groups;
    private closest;
    /** Visit every chord member before leaving its voice. Enter the next chord
     * from above when descending and below when ascending. */
    private nextVertical;
    private nextPitch;
    private pitchNumber;
}
