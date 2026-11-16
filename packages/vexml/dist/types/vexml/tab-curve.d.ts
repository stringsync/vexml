import type { TieNotes } from 'vexflow/core';
import { CrispCurve } from './crisp-curve.js';
export declare class TabCurve extends CrispCurve {
    private readonly notes;
    private readonly firstIndex;
    private readonly lastIndex;
    constructor(notes: TieNotes, firstIndex: number, lastIndex: number);
    draw(): boolean;
}
