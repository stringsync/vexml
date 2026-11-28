import type { StaveNote } from 'vexflow/core';
export interface VexmlNoteOverrides {
    extraDotGap: number;
    ledgerLinesShown: boolean;
    hiddenNoteHeads: ReadonlySet<number>;
    keyAlters: readonly (number | undefined)[];
    formatterRightShiftOverlap: number;
}
export declare const NO_HIDDEN_NOTE_HEADS: ReadonlySet<number>;
export declare function drawVisibleNoteHeads(note: StaveNote, hidden: ReadonlySet<number>): void;
export declare function trimFormatterRightShiftOverlap<T extends {
    modRightPx: number;
}>(metrics: T, overlap: number): T;
