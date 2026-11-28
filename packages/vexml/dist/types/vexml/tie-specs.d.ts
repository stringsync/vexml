import type { StaveNote, TabNote, TieNotes } from 'vexflow/core';
export declare function tieSpecs(firstNote: StaveNote | TabNote, lastNote: StaveNote | TabNote, firstIndexes: number[], lastIndexes: number[], wraps?: boolean): TieNotes[];
