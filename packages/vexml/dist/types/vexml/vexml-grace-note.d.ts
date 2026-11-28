import { GraceNote, type GraceNoteStruct, type Stave } from 'vexflow/core';
import { type VexmlNoteOverrides } from './vexml-overrides.js';
export declare class VexmlGraceNote extends GraceNote implements VexmlNoteOverrides {
    extraDotGap: number;
    ledgerLinesShown: boolean;
    hiddenNoteHeads: ReadonlySet<number>;
    keyAlters: readonly (number | undefined)[];
    formatterRightShiftOverlap: number;
    constructor(noteStruct: GraceNoteStruct);
    getFirstDotPx(): number;
    getMetrics(): import("vexflow/core").NoteMetrics;
    drawLedgerLines(): void;
    drawNoteHeads(): void;
    setStave(stave: Stave): this;
    getStemExtension(): number;
    getSlash(): {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    } | undefined;
    private refreshStemExtension;
    private stemSideLedgerBoundary;
}
