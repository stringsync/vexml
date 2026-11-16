import { type StaveNote } from 'vexflow/core';
export declare class SlurObstacles {
    cheaperSide(from: StaveNote, to: StaveNote, span: StaveNote[], preferUp: boolean): boolean;
    noteExtents(note: StaveNote): {
        top: number;
        bottom: number;
    };
    marksOnSide(note: StaveNote, above: boolean): {
        top: number;
        bottom: number;
    } | null;
    accidentalBoxes(note: StaveNote): import("vexflow/core").BoundingBox[];
}
