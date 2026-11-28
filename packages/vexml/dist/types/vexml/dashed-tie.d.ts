import { Rect } from '../core/geometry/index.js';
import { StaveTie, type TieNotes } from 'vexflow/core';
import type { DocumentBezier } from './score-reader.js';
export type DashedTieOptions = {
    dash?: number[] | null;
    /** Width of a solid tie at its ends, from `<line-width type="tie tip">`; null tapers it to a point. */
    tip?: number | null;
    bezier?: DocumentBezier | null;
    /** Draw a solid tie in the engraved shape rather than vexflow's two parabolas. */
    fit?: boolean;
    /** Extra stave-spaces to push a chord tie outward when an inner tie curving the same way claims its space. */
    extraOff?: number;
};
export declare const TIE_OFF_LINE = 0.32;
export declare const TIE_OFF_DISPLACED: number;
export declare const TIE_LV_LENGTH = 2;
export declare class DashedTie extends StaveTie {
    inkBounds: Rect | null;
    private readonly dash;
    private readonly tip;
    private readonly bezier;
    private readonly fit;
    private readonly extraOff;
    constructor(notes: TieNotes, opts?: DashedTieOptions);
    getLastX(): number;
    renderTie(params: {
        firstX: number;
        lastX: number;
        firstYs: number[];
        lastYs: number[];
        direction: number;
    }): void;
    private renderFitted;
    private offHead;
    private endObstacle;
    private lineRightEdge;
    private lineLeftEdge;
    private startX;
    private endX;
    private accidentalClearance;
    private renderTipped;
}
export declare function tieLineBand(line: number, dir: number, chord: boolean, lengthInSpaces: number): [number, number];
