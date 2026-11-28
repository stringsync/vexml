import { Dot, type StaveNote } from 'vexflow/core';
/**
 * A lower voice's dot on a line note uses the space below its head (Behind Bars
 * p. 56), whatever the upper voice is doing at the time. VexFlow picks a dot row
 * only from the dotted heads formatted together, so it would put the dot above
 * whenever the upper voice rests or sustains. The row is applied at draw time,
 * after the formatter has run, so formatting order cannot undo it.
 */
export declare class LowerVoiceDot extends Dot {
    private below;
    /** Attach one dot per head, pinning line-note dots below when no heads are a second apart. */
    static attach(note: StaveNote, count: number): void;
    /** Release the note's dots to VexFlow's own row, as crossed voices need. */
    static release(note: StaveNote): void;
    getInkBounds(): import("vexflow/core").BoundingBox;
    draw(): void;
    private pin;
}
