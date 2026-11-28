import { Dot, type StaveNote } from 'vexflow/core';
/** A chord dot keeps VexFlow's horizontal formatting and uses a chosen space row. */
export declare class ChordDot extends Dot {
    private readonly rowShift;
    private readonly columnDot?;
    constructor(rowShift: number, columnDot?: ChordDot | undefined);
    setXShift(shift: number): this;
    getInkBounds(): import("vexflow/core").BoundingBox;
    draw(): void;
    /** Place a unison pair or a run of adjacent notes, including across ledger lines. */
    static attach(note: StaveNote, dotsPerRow: number, placeAdjacentRows: boolean): boolean;
    /** Pack sorted head lines into distinct half-integer staff spaces. */
    static spaceRows(sortedLines: number[]): number[];
    private static packColumns;
    private static column;
}
