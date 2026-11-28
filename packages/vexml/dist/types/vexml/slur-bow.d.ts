import { type StaveNote } from 'vexflow/core';
import type { SlurObstacles } from './slur-obstacles.js';
export type SlurBowOptions = {
    from: StaveNote;
    to: StaveNote;
    isGrace: boolean;
    crossStave: boolean;
    mayGhost: boolean;
    bulgeUp: boolean;
    ghost: boolean;
    tiedFrom: boolean;
    tiedTo: boolean;
    nestedLiftFrom?: number;
    nestedLiftTo?: number;
};
export declare class SlurBow {
    readonly obstacles: SlurObstacles;
    readonly from: StaveNote;
    readonly to: StaveNote;
    readonly isGrace: boolean;
    readonly crossStave: boolean;
    readonly mayGhost: boolean;
    bulgeUp: boolean;
    dir: number;
    ghost: boolean;
    private readonly tiedFrom;
    private readonly tiedTo;
    private readonly nestedLiftFrom;
    private readonly nestedLiftTo;
    private readonly useStemTips;
    constructor(obstacles: SlurObstacles, opts: SlurBowOptions);
    takeSide(up: boolean): void;
    ghostOf(n: StaveNote): StaveNote;
    towardBulge(note: StaveNote): boolean;
    metric(note: StaveNote): number;
    /** Whether this end sits at the note's stem tip rather than its notehead. */
    atStemTip(note: StaveNote): boolean;
    /** Whether `note` carries a tenuto line on the bulge side (between stem and slur). */
    hasTenuto(note: StaveNote): boolean;
    anchorY(note: StaveNote): number;
    extentsOf(n: StaveNote): {
        top: number;
        bottom: number;
    };
    get baseYShift(): number;
    noteEndY(note: StaveNote): number;
    markLift(note: StaveNote): number;
    tieLift(note: StaveNote): number;
    nestedLift(note: StaveNote): number;
    endpointY(note: StaveNote): number;
    private stemTipsAreLevel;
}
