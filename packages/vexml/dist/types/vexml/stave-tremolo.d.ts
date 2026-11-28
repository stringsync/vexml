import { type Stave, StaveNote, type StemmableNote, Tremolo } from 'vexflow/core';
export declare class StaveTremolo extends Tremolo {
    readonly strokeCount: number;
    constructor(num: number);
    static extendStem(note: StaveNote, num: number, staffSpace?: number): void;
    static minBeamReach(note: StemmableNote, beamDepth: number): number | null;
    strokeYs(note: StaveNote, stave: Stave): number[];
    strokeX(note: StaveNote): number;
    draw(): void;
}
