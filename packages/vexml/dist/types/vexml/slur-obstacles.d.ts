import { type StaveNote } from 'vexflow/core';
export declare class SlurObstacles {
    cheaperSide(from: StaveNote, to: StaveNote, span: StaveNote[], preferUp: boolean): boolean;
    noteExtents(note: StaveNote): {
        top: number;
        bottom: number;
    };
    marksOnSide(note: StaveNote, above: boolean, includeOutsideSlur?: boolean): {
        top: number;
        bottom: number;
    } | null;
    /** Bounding boxes of any fermatas attached on the given side of `note`. */
    fermataBoxes(note: StaveNote, above: boolean): import("vexflow/core").BoundingBox[];
    /** Whether `note` carries a tenuto line on the given side (Behind Bars p. 122). */
    hasTenutoOnSide(note: StaveNote, above: boolean): boolean;
    accidentalBoxes(note: StaveNote): import("vexflow/core").BoundingBox[];
}
