import type { NoteHead, StaveNoteStruct } from 'vexflow/core';
import { VexmlStaveNote } from './vexml-stave-note.js';
export declare class AlteredUnisonNote extends VexmlStaveNote {
    private readonly groups;
    constructor(struct: StaveNoteStruct, groups: readonly number[][]);
    buildNoteHeads(): NoteHead[];
    private distance;
    calcNoteDisplacements(): void;
    preFormat(): void;
}
