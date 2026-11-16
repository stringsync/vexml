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
};
export declare class DashedTie extends StaveTie {
    inkBounds: Rect | null;
    private readonly dash;
    private readonly tip;
    private readonly bezier;
    private readonly fit;
    constructor(notes: TieNotes, opts?: DashedTieOptions);
    renderTie(params: {
        firstX: number;
        lastX: number;
        firstYs: number[];
        lastYs: number[];
        direction: number;
    }): void;
    private renderFitted;
    private offHead;
    private blocked;
    private startX;
    private endX;
    private renderTipped;
}
