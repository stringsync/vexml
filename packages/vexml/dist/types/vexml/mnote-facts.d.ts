import type { Note as MNote } from '@stringsync/mdom';
import type { NoteFacts } from './note.js';
export declare class MNoteFacts implements NoteFacts {
    private readonly mnote;
    private readonly chord;
    constructor(mnote: MNote, chord: readonly MNote[]);
    get pitch(): string | null;
    get beats(): number;
    get articulations(): readonly string[];
    get grace(): boolean;
    get swingExempt(): boolean;
    get chordMember(): boolean;
    get graces(): readonly MNote[];
    private pitchToKey;
}
