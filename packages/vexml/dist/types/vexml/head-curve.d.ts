import { type CurveOptions, StaveNote } from 'vexflow/core';
import { CrispCurve, type CurveReach } from './crisp-curve.js';
import type { DocumentBezier } from './score-reader.js';
export declare class HeadCurve extends CrispCurve {
    private readonly fromY;
    private readonly toY;
    constructor(opts: CurveOptions & {
        from: StaveNote | undefined;
        to: StaveNote | undefined;
        fromY: number;
        toY: number;
        bezier?: DocumentBezier | null;
        reach?: {
            start: CurveReach;
            end: CurveReach;
        };
        openX?: number;
    });
    draw(): boolean;
}
