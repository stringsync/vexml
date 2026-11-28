import { Curve, type CurveOptions, type Note as VexNote } from 'vexflow/core';
import type { DocumentBezier } from './score-reader.js';
export declare const CURVE_THICKNESS = 2.93;
export declare const CURVE_TIP = 1.25;
/** Where one end of a curve lands horizontally on its note. */
export type CurveReach = 'edge' | 'head' | 'stem';
export declare function curveThickness(middle: number): number;
export declare class CrispCurve extends Curve {
    private tip;
    private readonly bezier;
    private readonly reach;
    private readonly openX;
    constructor(from: VexNote | undefined, to: VexNote | undefined, opts: CurveOptions & {
        bezier?: DocumentBezier | null;
        /** Where each end lands horizontally: vexflow's tie edge, the notehead centre, or the stem centre. */
        reach?: {
            start: CurveReach;
            end: CurveReach;
        };
        /** Where a missing end lands, when it is not its stave's own edge: the system's. */
        openX?: number;
    });
    setTip(tip: number | null): this;
    renderCurve(params: {
        firstX: number;
        lastX: number;
        firstY: number;
        lastY: number;
        direction: number;
    }): void;
    private reachedEnds;
    private paintCurve;
    private renderTipped;
}
