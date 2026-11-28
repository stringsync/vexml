import { StaveNote } from 'vexflow/core';
import { type VexmlNoteOverrides } from './vexml-overrides.js';
export declare class VexmlStaveNote extends StaveNote implements VexmlNoteOverrides {
    extraDotGap: number;
    ledgerLinesShown: boolean;
    hiddenNoteHeads: ReadonlySet<number>;
    keyAlters: readonly (number | undefined)[];
    formatterRightShiftOverlap: number;
    getFirstDotPx(): number;
    getMetrics(): import("vexflow/core").NoteMetrics;
    drawLedgerLines(): void;
    drawNoteHeads(): void;
}
