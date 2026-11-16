import { Stroke } from 'vexflow/core';
export declare class NonArpeggioBracket extends Stroke {
    private readonly lowIndex;
    private readonly highIndex;
    constructor(lowIndex: number, highIndex: number);
    draw(): void;
}
