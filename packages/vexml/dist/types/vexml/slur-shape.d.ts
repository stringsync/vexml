import type { StaveNote } from 'vexflow/core';
import type { SlurBow } from './slur-bow.js';
export type SlurChord = {
    xL: number;
    xR: number;
    yL: number;
    yR: number;
};
export declare class SlurShape {
    readonly cpY: number;
    readonly yShift: number;
    readonly shoulder: number;
    readonly width: number;
    readonly blocked: boolean;
    constructor(bow: SlurBow, spanNotes: StaveNote[], chord: SlurChord);
}
