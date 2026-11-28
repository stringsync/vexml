import type { StaveNote } from 'vexflow/core';
export declare function otherVoiceLedgerBands(rowNotes: readonly {
    note: StaveNote;
    voice: string;
}[], voice: string, from: StaveNote, to: StaveNote, space: number): [number, number][];
export declare function addedAccidentalHitsSide(to: StaveNote, tiedToIndices: ReadonlySet<number>, line: number, dir: number, lengthInSpaces: number): boolean;
