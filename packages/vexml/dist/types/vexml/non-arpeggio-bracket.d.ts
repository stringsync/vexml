import type { Note as VexNote } from 'vexflow/core';
import { Stroke } from 'vexflow/core';
export type NonArpeggioEnd = 'top' | 'bottom' | 'both';
export declare class NonArpeggioBracket extends Stroke {
    private readonly lowIndex;
    private readonly highIndex;
    readonly end: NonArpeggioEnd;
    readonly number: number;
    private readonly below;
    private drawsBracket;
    constructor(lowIndex: number, highIndex: number, end?: NonArpeggioEnd, number?: number);
    join(lower: NonArpeggioBracket, lowerNote: VexNote): void;
    private spannedYs;
    private bracketX;
    draw(): void;
}
