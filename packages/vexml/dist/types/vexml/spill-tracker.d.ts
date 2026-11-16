import type { Rect } from '../core/geometry/index.js';
/**
 * How far one stave row's drawn content spilled past its staff lines, plus where those
 * lines sit relative to the stave's y (what a stave offset positions). Measured on a
 * first draw pass so a second can re-space the staves around the actual music instead of
 * a fixed gap: the vertical analog of the per-system topOverflow feedback.
 */
export type StaveSpill = {
    /** Px the content rose above the top staff line, per x column (see SPILL_COLUMN):
     * `Math.floor(x / SPILL_COLUMN)` -> the worst rise anything covering that column had.
     * A column nothing reached over is absent rather than 0. */
    rise: Map<number, number>;
    /** Px the content dropped below the bottom staff line, columned the same way. */
    drop: Map<number, number>;
    /** Top staff line, relative to the stave's y. */
    lineTop: number;
    /** Bottom staff line, relative to the stave's y. */
    lineBottom: number;
};
export interface SpillStave {
    getY(): number;
    getYForLine(line: number): number;
    getBottomLineY(): number;
}
export declare class SpillTracker {
    private readonly staveSpill;
    private readonly systemTopByIndex;
    private readonly systemHighestTop;
    private readonly systemDecorationTop;
    forgetSystem(system: number): void;
    recordStave(system: number, row: number, stave: SpillStave, rect: Rect): void;
    recordRise(system: number, row: number, stave: SpillStave, rect: Rect): void;
    recordDrop(system: number, row: number, stave: SpillStave, rect: Rect): void;
    seedRow(system: number, row: number, stave: SpillStave): void;
    recordSystemTop(system: number, topY: number): void;
    growHighestTop(system: number, top: number): void;
    growDecorationTop(system: number, top: number): void;
    decorationTopOf(system: number): number | undefined;
    observedStaveSpill(): Map<number, Map<number, StaveSpill>>;
    observedOverflow(): Map<number, number>;
    systemTops(): Map<number, number>;
    private spillOf;
    private bandSpill;
}
