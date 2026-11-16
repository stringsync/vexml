import { type CurveOptions, type StaveNote } from 'vexflow/core';
import { CrispCurve } from './crisp-curve.js';
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
            start: boolean;
            end: boolean;
        };
        openX?: number;
    });
    draw(): boolean;
}
