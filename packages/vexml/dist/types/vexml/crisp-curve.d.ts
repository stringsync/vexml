import { Curve, type CurveOptions, type Note as VexNote } from 'vexflow/core';
import type { DocumentBezier } from './score-reader.js';
export declare const CURVE_THICKNESS = 2.93;
export declare const CURVE_TIP = 1.25;
export declare function curveThickness(middle: number): number;
export declare class CrispCurve extends Curve {
    private tip;
    private readonly bezier;
    private readonly reach;
    private readonly openX;
    constructor(from: VexNote | undefined, to: VexNote | undefined, opts: CurveOptions & {
        bezier?: DocumentBezier | null;
        /** Which ends run to their notehead's centre instead of stopping at its edge. */
        reach?: {
            start: boolean;
            end: boolean;
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
