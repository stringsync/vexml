import type { StaveNote } from 'vexflow/core';
import type { SlurBow } from './slur-bow.js';
export type SlurChord = {
    xL: number;
    xR: number;
    yL: number;
    yR: number;
};
export type SlurObstaclePoint = {
    x: number;
    y: number;
    gap: number;
};
export declare class SlurShape {
    readonly cpY: number;
    readonly yShift: number;
    readonly shoulder: number;
    readonly width: number;
    readonly blocked: boolean;
    constructor(bow: SlurBow, spanNotes: StaveNote[], chord: SlurChord, extraObstacles?: readonly SlurObstaclePoint[], minYShift?: number);
    /** How far the curve's near edge stands off its raw chord at horizontal fraction `s`. */
    riseAt(s: number): number;
}
